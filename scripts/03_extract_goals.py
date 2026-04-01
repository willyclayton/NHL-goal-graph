"""
Step 3: Extract goal events from play-by-play JSONs.

Parses each PBP file, finds goal events, and extracts scorer/goalie pairs.
Filters out empty-net goals and shootout goals.

Output:
  - data/processed/goals.csv (scorer_id, goalie_id, game_id, season, game_type)
  - data/processed/player_ids.txt (unique player IDs for step 4)
"""

import csv
import json
import os
from pathlib import Path

PBP_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "pbp")
GOALS_CSV = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "goals.csv")
PLAYER_IDS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "player_ids.txt")


def parse_season_from_id(game_id: str) -> str:
    """Extract season from game ID. E.g., '2023020001' -> '20232024'."""
    year = int(game_id[:4])
    return f"{year}{year + 1}"


def parse_game_type(game_id: str) -> str:
    """Extract game type. '02' = regular season, '03' = playoffs."""
    return game_id[4:6]


def extract_goals_from_game(filepath: str) -> list[dict]:
    """Parse a PBP JSON and extract valid goal events."""
    with open(filepath, "r") as f:
        data = json.load(f)

    game_id = str(data.get("id", Path(filepath).stem))
    goals = []

    for play in data.get("plays", []):
        # Must be a goal
        if play.get("typeDescKey") != "goal":
            continue

        # Skip shootout goals
        period_desc = play.get("periodDescriptor", {})
        period_type = period_desc.get("periodType", "")
        if period_type in ("SO", "SHOOTOUT"):
            continue

        details = play.get("details", {})

        # Get scorer ID
        scorer_id = details.get("scoringPlayerId")
        if not scorer_id:
            continue

        # Get goalie ID — skip empty net
        goalie_id = details.get("goalieInNetId")
        if not goalie_id:
            continue

        goals.append({
            "scorer_id": scorer_id,
            "goalie_id": goalie_id,
            "game_id": game_id,
            "season": parse_season_from_id(game_id),
            "game_type": parse_game_type(game_id),
        })

    return goals


def main():
    os.makedirs(os.path.dirname(GOALS_CSV), exist_ok=True)

    pbp_files = sorted(Path(PBP_DIR).glob("*.json"))
    print(f"Found {len(pbp_files)} PBP files")

    all_goals = []
    player_ids = set()
    errors = 0

    for i, filepath in enumerate(pbp_files):
        try:
            goals = extract_goals_from_game(str(filepath))
            all_goals.extend(goals)
            for g in goals:
                player_ids.add(g["scorer_id"])
                player_ids.add(g["goalie_id"])
        except Exception as e:
            errors += 1
            if errors <= 10:
                print(f"  Error parsing {filepath.name}: {e}")

        if (i + 1) % 2000 == 0:
            print(f"  Processed {i + 1}/{len(pbp_files)} files, {len(all_goals)} goals so far")

    # Write goals CSV
    with open(GOALS_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["scorer_id", "goalie_id", "game_id", "season", "game_type"])
        writer.writeheader()
        writer.writerows(all_goals)

    # Write unique player IDs
    with open(PLAYER_IDS_FILE, "w") as f:
        for pid in sorted(player_ids):
            f.write(f"{pid}\n")

    print(f"\nDone!")
    print(f"  Goals: {len(all_goals)}")
    print(f"  Unique players: {len(player_ids)}")
    print(f"  Parse errors: {errors}")
    print(f"  Output: {GOALS_CSV}")


if __name__ == "__main__":
    main()
