"""
Generate placeholder graph data with real NHL player names for UI testing.
Creates nodes.json, edges.json, and positions.json in public/data/.
"""

import json
import os
import random
import math

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")

# Real scorers (id, name, goals_approx, first_year, last_year)
SCORERS = [
    (8471214, "Alex Ovechkin", 850, 2010, 2025),
    (8478402, "Connor McDavid", 335, 2015, 2025),
    (8471675, "Sidney Crosby", 560, 2010, 2025),
    (8474141, "Patrick Kane", 480, 2010, 2024),
    (8477492, "Nathan MacKinnon", 310, 2013, 2025),
    (8473546, "Nikita Kucherov", 310, 2014, 2025),
    (8477934, "Leon Draisaitl", 320, 2014, 2025),
    (8475166, "Steven Stamkos", 520, 2010, 2025),
    (8474564, "John Tavares", 420, 2010, 2025),
    (8471676, "Evgeni Malkin", 440, 2010, 2025),
    (8478483, "Auston Matthews", 300, 2016, 2025),
    (8476453, "Jamie Benn", 340, 2010, 2025),
    (8475786, "Tyler Seguin", 320, 2011, 2025),
    (8474870, "Jordan Eberle", 260, 2010, 2025),
    (8471218, "Brad Marchand", 380, 2010, 2025),
    (8476346, "Jonathan Huberdeau", 240, 2013, 2025),
    (8477956, "David Pastrnak", 290, 2014, 2025),
    (8478427, "Mitch Marner", 180, 2016, 2025),
    (8475455, "Mark Scheifele", 260, 2012, 2025),
    (8471685, "Phil Kessel", 400, 2010, 2023),
    (8475791, "Anze Kopitar", 360, 2010, 2025),
    (8476882, "Vladimir Tarasenko", 270, 2013, 2025),
    (8471677, "Joe Pavelski", 430, 2010, 2024),
    (8479318, "Mathew Barzal", 140, 2017, 2025),
    (8480012, "Cale Makar", 100, 2019, 2025),
    (8473419, "Claude Giroux", 300, 2010, 2025),
    (8474151, "Jeff Skinner", 340, 2011, 2025),
    (8475913, "Max Pacioretty", 300, 2010, 2024),
    (8474590, "Kyle Palmieri", 210, 2012, 2025),
    (8476456, "Tomas Hertl", 180, 2013, 2025),
]

# Real goalies (id, name, goals_against_approx, first_year, last_year)
GOALIES = [
    (8471469, "Henrik Lundqvist", 2200, 2010, 2020),
    (8470594, "Marc-Andre Fleury", 2400, 2010, 2023),
    (8471750, "Braden Holtby", 1600, 2010, 2022),
    (8476883, "Andrei Vasilevskiy", 1400, 2015, 2025),
    (8476945, "Connor Hellebuyck", 1500, 2015, 2025),
    (8471695, "Carey Price", 1800, 2010, 2022),
    (8474593, "Frederik Andersen", 1200, 2014, 2025),
    (8477465, "John Gibson", 1300, 2014, 2025),
    (8475717, "Sergei Bobrovsky", 1800, 2010, 2025),
    (8470645, "Tuukka Rask", 1400, 2010, 2022),
    (8475660, "Robin Lehner", 1100, 2013, 2022),
    (8478048, "Igor Shesterkin", 600, 2020, 2025),
    (8476341, "Jacob Markstrom", 1200, 2013, 2025),
    (8478024, "Juuse Saros", 1000, 2016, 2025),
    (8471734, "Pekka Rinne", 1800, 2010, 2021),
    (8476999, "Matt Murray", 800, 2016, 2023),
    (8470660, "Jonathan Quick", 1700, 2010, 2024),
    (8479496, "Jake Oettinger", 500, 2021, 2025),
    (8475883, "Jordan Binnington", 700, 2018, 2025),
    (8474596, "Semyon Varlamov", 1500, 2010, 2024),
]

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    random.seed(42)

    nodes = []
    edges_set = set()

    # Build scorer nodes
    for pid, name, count, fy, ly in SCORERS:
        nodes.append({
            "id": f"s_{pid}",
            "name": name,
            "type": "scorer",
            "count": count,
            "firstYear": fy,
            "lastYear": ly,
            "midYear": round((fy + ly) / 2),
        })

    # Build goalie nodes
    for pid, name, count, fy, ly in GOALIES:
        nodes.append({
            "id": f"g_{pid}",
            "name": name,
            "type": "goalie",
            "count": count,
            "firstYear": fy,
            "lastYear": ly,
            "midYear": round((fy + ly) / 2),
        })

    # Generate edges: each scorer connects to 5-15 goalies whose years overlap
    for pid, name, count, fy, ly in SCORERS:
        sid = f"s_{pid}"
        eligible = [
            f"g_{gid}" for gid, _, _, gfy, gly in GOALIES
            if max(fy, gfy) <= min(ly, gly)  # overlapping years
        ]
        n_edges = min(len(eligible), random.randint(5, 15))
        for gid in random.sample(eligible, n_edges):
            edges_set.add((sid, gid))

    edges = [{"source": s, "target": t} for s, t in sorted(edges_set)]

    # Compute positions: goalies left, scorers right, with some spread
    positions = {}
    scorer_nodes = [n for n in nodes if n["type"] == "scorer"]
    goalie_nodes = [n for n in nodes if n["type"] == "goalie"]

    # Arrange in a rough circle/arc per side for visual interest
    for i, node in enumerate(scorer_nodes):
        t = i / max(1, len(scorer_nodes) - 1)
        # Arc on right side
        angle = (t - 0.5) * math.pi * 0.8
        x = 0.72 + math.cos(angle) * 0.15
        y = 0.5 + math.sin(angle) * 0.35
        # Add slight randomness
        x += random.uniform(-0.03, 0.03)
        y += random.uniform(-0.02, 0.02)
        positions[node["id"]] = {"x": round(x, 4), "y": round(y, 4)}

    for i, node in enumerate(goalie_nodes):
        t = i / max(1, len(goalie_nodes) - 1)
        angle = (t - 0.5) * math.pi * 0.8
        x = 0.28 + math.cos(angle) * 0.12
        y = 0.5 + math.sin(angle) * 0.35
        x += random.uniform(-0.03, 0.03)
        y += random.uniform(-0.02, 0.02)
        positions[node["id"]] = {"x": round(x, 4), "y": round(y, 4)}

    # Write files
    with open(os.path.join(OUT_DIR, "nodes.json"), "w") as f:
        json.dump(nodes, f, separators=(",", ":"))

    with open(os.path.join(OUT_DIR, "edges.json"), "w") as f:
        json.dump(edges, f, separators=(",", ":"))

    with open(os.path.join(OUT_DIR, "positions.json"), "w") as f:
        json.dump(positions, f, separators=(",", ":"))

    print(f"Nodes: {len(nodes)} ({len(scorer_nodes)} scorers, {len(goalie_nodes)} goalies)")
    print(f"Edges: {len(edges)}")
    print(f"Written to {OUT_DIR}")


if __name__ == "__main__":
    main()
