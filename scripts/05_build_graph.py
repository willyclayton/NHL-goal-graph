"""
Step 5: Build graph JSON from goals.csv and players.csv.

Creates nodes (scorers + goalies with prefixed IDs) and binary edges.

Output:
  - public/data/nodes.json
  - public/data/edges.json
"""

import csv
import json
import os
from collections import defaultdict

GOALS_CSV = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "goals.csv")
PLAYERS_CSV = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "players.csv")
NODES_OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data", "nodes.json")
EDGES_OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data", "edges.json")


def main():
    os.makedirs(os.path.dirname(NODES_OUT), exist_ok=True)

    # Load player names
    player_names = {}
    with open(PLAYERS_CSV, "r") as f:
        for row in csv.DictReader(f):
            player_names[row["player_id"]] = row["name"]

    # Process goals
    scorer_goals = defaultdict(int)    # scorer_id -> count
    goalie_goals = defaultdict(int)    # goalie_id -> count
    scorer_years = defaultdict(list)   # scorer_id -> [seasons]
    goalie_years = defaultdict(list)   # goalie_id -> [seasons]
    edges_set = set()                  # (s_id, g_id) pairs

    with open(GOALS_CSV, "r") as f:
        for row in csv.DictReader(f):
            sid = row["scorer_id"]
            gid = row["goalie_id"]
            season = row["season"]
            year = int(season[:4])

            scorer_goals[sid] += 1
            goalie_goals[gid] += 1
            scorer_years[sid].append(year)
            goalie_years[gid].append(year)
            edges_set.add((f"s_{sid}", f"g_{gid}"))

    # Build nodes
    nodes = []

    for sid, count in scorer_goals.items():
        years = scorer_years[sid]
        first = min(years)
        last = max(years)
        nodes.append({
            "id": f"s_{sid}",
            "name": player_names.get(sid, f"Unknown ({sid})"),
            "type": "scorer",
            "count": count,
            "firstYear": first,
            "lastYear": last,
            "midYear": round((first + last) / 2),
        })

    for gid, count in goalie_goals.items():
        years = goalie_years[gid]
        first = min(years)
        last = max(years)
        nodes.append({
            "id": f"g_{gid}",
            "name": player_names.get(gid, f"Unknown ({gid})"),
            "type": "goalie",
            "count": count,
            "firstYear": first,
            "lastYear": last,
            "midYear": round((first + last) / 2),
        })

    # Build edges
    edges = [{"source": s, "target": t} for s, t in sorted(edges_set)]

    # Write JSON (compact)
    with open(NODES_OUT, "w") as f:
        json.dump(nodes, f, separators=(",", ":"))

    with open(EDGES_OUT, "w") as f:
        json.dump(edges, f, separators=(",", ":"))

    # Stats
    scorers = sum(1 for n in nodes if n["type"] == "scorer")
    goalies = sum(1 for n in nodes if n["type"] == "goalie")
    print(f"Nodes: {len(nodes)} ({scorers} scorers, {goalies} goalies)")
    print(f"Edges: {len(edges)}")
    print(f"nodes.json: {os.path.getsize(NODES_OUT) / 1024:.0f} KB")
    print(f"edges.json: {os.path.getsize(EDGES_OUT) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
