"""
Step 7: Extract detailed goal and shot data for the dashboard visualizations.

Single pass over all PBP files. Produces:
  - public/data/goals_detailed.json   (all goals with coordinates, shot type, time, teams)
  - data/processed/h2h/{scorerId}.json (per-scorer shots + goals for head-to-head)
  - public/data/h2h_index.json        (scorer-goalie pair summary counts)
  - public/data/players_enriched.json  (players with teams and goal counts)
  - public/data/team_list.json         (sorted list of team abbreviations)
"""

import csv
import json
import os
from collections import defaultdict
from pathlib import Path

BASE = os.path.join(os.path.dirname(__file__), "..")
PBP_DIR = os.path.join(BASE, "data", "raw", "pbp")
PLAYERS_CSV = os.path.join(BASE, "data", "processed", "players.csv")
GOALS_OUT = os.path.join(BASE, "public", "data", "goals_detailed.json")
H2H_DIR = os.path.join(BASE, "data", "processed", "h2h")
H2H_INDEX_OUT = os.path.join(BASE, "public", "data", "h2h_index.json")
PLAYERS_OUT = os.path.join(BASE, "public", "data", "players_enriched.json")
TEAMS_OUT = os.path.join(BASE, "public", "data", "team_list.json")


def parse_season_year(game_id: str) -> int:
    """Extract season start year from game ID. E.g., '2023020001' -> 2023."""
    return int(game_id[:4])


def parse_game_type(game_id: str) -> int:
    """Extract game type as int. 2 = regular season, 3 = playoffs."""
    return int(game_id[4:6])


def get_scorer_team_abbrev(event_owner_team_id, home_team, away_team):
    """Determine the team abbreviation for the scoring team."""
    if event_owner_team_id == home_team.get("id"):
        return home_team.get("abbrev", "")
    elif event_owner_team_id == away_team.get("id"):
        return away_team.get("abbrev", "")
    return ""


def process_game(filepath: str):
    """Parse a PBP JSON and extract goals and shots-on-goal."""
    with open(filepath, "r") as f:
        data = json.load(f)

    game_id = str(data.get("id", Path(filepath).stem))
    game_date = data.get("gameDate", "")
    home_team = data.get("homeTeam", {})
    away_team = data.get("awayTeam", {})
    ht_abbrev = home_team.get("abbrev", "")
    at_abbrev = away_team.get("abbrev", "")

    season = parse_season_year(game_id)
    game_type = parse_game_type(game_id)

    goals = []
    shots = []  # shots-on-goal (saves)

    for play in data.get("plays", []):
        type_key = play.get("typeDescKey")
        if type_key not in ("goal", "shot-on-goal"):
            continue

        # Skip shootout events
        period_desc = play.get("periodDescriptor", {})
        period_type = period_desc.get("periodType", "")
        if period_type in ("SO", "SHOOTOUT"):
            continue

        details = play.get("details", {})
        period = period_desc.get("number", 0)
        time_in_period = play.get("timeInPeriod", "")

        x = details.get("xCoord")
        y = details.get("yCoord")
        shot_type = details.get("shotType", "")
        situation_code = play.get("situationCode", "")

        if type_key == "goal":
            scorer_id = details.get("scoringPlayerId")
            goalie_id = details.get("goalieInNetId")
            if not scorer_id or not goalie_id:
                continue  # skip empty net / missing data

            event_owner = details.get("eventOwnerTeamId")
            scorer_team = get_scorer_team_abbrev(event_owner, home_team, away_team)

            goal_record = {
                "s": scorer_id,
                "g": goalie_id,
                "gm": int(game_id),
                "sn": season,
                "gt": game_type,
                "p": period,
                "t": time_in_period,
                "st": shot_type,
                "sc": situation_code,
                "d": game_date,
                "ht": ht_abbrev,
                "at": at_abbrev,
                "tm": scorer_team,
            }

            # Only include coordinates if present
            if x is not None and y is not None:
                goal_record["x"] = x
                goal_record["y"] = y

            goals.append(goal_record)

        elif type_key == "shot-on-goal":
            shooter_id = details.get("shootingPlayerId")
            goalie_id = details.get("goalieInNetId")
            if not shooter_id or not goalie_id:
                continue

            shot_record = {
                "shooter": shooter_id,
                "g": goalie_id,
                "sn": season,
                "p": period,
                "t": time_in_period,
                "st": shot_type,
                "type": "save",
            }

            if x is not None and y is not None:
                shot_record["x"] = x
                shot_record["y"] = y

            shots.append(shot_record)

    return goals, shots


def load_players():
    """Load players.csv into a dict keyed by player_id."""
    players = {}
    with open(PLAYERS_CSV, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = int(row["player_id"])
            players[pid] = {
                "id": pid,
                "name": row["name"],
                "pos": row["position"],
                "birthYear": int(row["birth_year"]) if row["birth_year"] else None,
            }
    return players


def main():
    # Ensure output directories exist
    os.makedirs(os.path.dirname(GOALS_OUT), exist_ok=True)
    os.makedirs(H2H_DIR, exist_ok=True)

    pbp_files = sorted(Path(PBP_DIR).glob("*.json"))
    print(f"Found {len(pbp_files)} PBP files")

    all_goals = []
    # h2h_data: scorer_id -> list of (goal records + save records) for that scorer
    h2h_data = defaultdict(list)
    # Track stats for enriched players
    scorer_goals = defaultdict(int)
    scorer_teams = defaultdict(set)
    scorer_seasons = defaultdict(set)
    goalie_goals_against = defaultdict(int)
    goalie_teams = defaultdict(set)
    goalie_seasons = defaultdict(set)
    all_teams = set()
    # h2h pair counts
    pair_goals = defaultdict(int)    # (scorer, goalie) -> goal count
    pair_shots = defaultdict(int)    # (scorer, goalie) -> total shot count (goals + saves)

    errors = 0
    goals_missing_coords = 0
    shots_missing_coords = 0

    for i, filepath in enumerate(pbp_files):
        try:
            goals, shots = process_game(str(filepath))

            for g in goals:
                all_goals.append(g)
                sid = g["s"]
                gid = g["g"]
                scorer_goals[sid] += 1
                scorer_teams[sid].add(g["tm"])
                scorer_seasons[sid].add(g["sn"])
                goalie_goals_against[gid] += 1
                goalie_seasons[gid].add(g["sn"])
                if g["tm"]:
                    all_teams.add(g["tm"])
                    # Goalie's team is the opponent
                    opp = g["at"] if g["tm"] == g["ht"] else g["ht"]
                    if opp:
                        goalie_teams[gid].add(opp)

                if "x" not in g:
                    goals_missing_coords += 1

                # Add to h2h as a goal event
                h2h_record = {
                    "g": gid,
                    "sn": g["sn"],
                    "p": g["p"],
                    "t": g["t"],
                    "st": g["st"],
                    "type": "goal",
                }
                if "x" in g and "y" in g:
                    h2h_record["x"] = g["x"]
                    h2h_record["y"] = g["y"]
                h2h_data[sid].append(h2h_record)

                pair_goals[(sid, gid)] += 1
                pair_shots[(sid, gid)] += 1

            for s in shots:
                sid = s["shooter"]
                gid = s["g"]

                h2h_record = {
                    "g": gid,
                    "sn": s["sn"],
                    "p": s["p"],
                    "t": s["t"],
                    "st": s["st"],
                    "type": "save",
                }
                if "x" in s and "y" in s:
                    h2h_record["x"] = s["x"]
                    h2h_record["y"] = s["y"]
                else:
                    shots_missing_coords += 1
                h2h_data[sid].append(h2h_record)

                pair_shots[(sid, gid)] += 1

        except Exception as e:
            errors += 1
            if errors <= 10:
                print(f"  Error parsing {filepath.name}: {e}")

        if (i + 1) % 2000 == 0:
            print(f"  Processed {i + 1}/{len(pbp_files)} files, {len(all_goals)} goals so far")

    print(f"\nExtraction complete.")
    print(f"  Total goals: {len(all_goals)}")
    print(f"  Goals missing coordinates: {goals_missing_coords}")
    print(f"  Shots missing coordinates: {shots_missing_coords}")
    print(f"  Unique scorers in h2h: {len(h2h_data)}")
    print(f"  Unique teams: {len(all_teams)}")
    print(f"  Parse errors: {errors}")

    # --- Output A: goals_detailed.json ---
    print(f"\nWriting {GOALS_OUT}...")
    with open(GOALS_OUT, "w") as f:
        json.dump(all_goals, f, separators=(",", ":"))
    size_mb = os.path.getsize(GOALS_OUT) / (1024 * 1024)
    print(f"  {len(all_goals)} goals, {size_mb:.1f} MB")

    # --- Output B: per-scorer h2h files ---
    print(f"\nWriting per-scorer H2H files to {H2H_DIR}/...")
    for scorer_id, records in h2h_data.items():
        outpath = os.path.join(H2H_DIR, f"{scorer_id}.json")
        with open(outpath, "w") as f:
            json.dump(records, f, separators=(",", ":"))
    print(f"  {len(h2h_data)} scorer files written")

    # --- Output: h2h_index.json ---
    print(f"\nWriting {H2H_INDEX_OUT}...")
    h2h_index = {}
    for (sid, gid), goal_count in pair_goals.items():
        shot_count = pair_shots[(sid, gid)]
        key = f"{sid}_{gid}"
        h2h_index[key] = {"goals": goal_count, "shots": shot_count}
    with open(H2H_INDEX_OUT, "w") as f:
        json.dump(h2h_index, f, separators=(",", ":"))
    size_kb = os.path.getsize(H2H_INDEX_OUT) / 1024
    print(f"  {len(h2h_index)} pairs, {size_kb:.0f} KB")

    # --- Output C: players_enriched.json ---
    print(f"\nWriting {PLAYERS_OUT}...")
    players = load_players()
    enriched = []
    for pid, info in players.items():
        entry = {
            "id": pid,
            "name": info["name"],
            "pos": info["pos"],
        }
        if info["birthYear"]:
            entry["birthYear"] = info["birthYear"]

        if pid in scorer_goals:
            entry["totalGoals"] = scorer_goals[pid]
            entry["teams"] = sorted(scorer_teams[pid])
            seasons = scorer_seasons[pid]
            entry["firstSeason"] = min(seasons)
            entry["lastSeason"] = max(seasons)
        elif pid in goalie_goals_against:
            entry["goalsAgainst"] = goalie_goals_against[pid]
            entry["teams"] = sorted(goalie_teams[pid])
            seasons = goalie_seasons[pid]
            entry["firstSeason"] = min(seasons)
            entry["lastSeason"] = max(seasons)

        enriched.append(entry)

    # Sort by total goals descending for scorers, then by name
    enriched.sort(key=lambda x: (-x.get("totalGoals", 0), x["name"]))

    with open(PLAYERS_OUT, "w") as f:
        json.dump(enriched, f, separators=(",", ":"))
    size_kb = os.path.getsize(PLAYERS_OUT) / 1024
    print(f"  {len(enriched)} players, {size_kb:.0f} KB")

    # --- Output D: team_list.json ---
    print(f"\nWriting {TEAMS_OUT}...")
    team_list = sorted(all_teams)
    with open(TEAMS_OUT, "w") as f:
        json.dump(team_list, f, separators=(",", ":"))
    print(f"  {len(team_list)} teams")

    # --- Validation summary ---
    print(f"\n{'='*50}")
    print(f"VALIDATION SUMMARY")
    print(f"{'='*50}")
    season_counts = defaultdict(int)
    for g in all_goals:
        season_counts[g["sn"]] += 1
    print(f"\nGoals per season:")
    for sn in sorted(season_counts):
        print(f"  {sn}-{sn+1}: {season_counts[sn]:,}")
    print(f"\nTotal goals: {len(all_goals):,}")
    print(f"Total h2h pairs: {len(h2h_index):,}")
    print(f"Total scorer files: {len(h2h_data):,}")
    print(f"Total players: {len(enriched):,}")
    print(f"Total teams: {len(team_list)}")


if __name__ == "__main__":
    main()
