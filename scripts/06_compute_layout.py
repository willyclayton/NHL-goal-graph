"""
Step 6: Pre-compute node positions using force-directed layout.

Uses networkx spring_layout with bipartite initialization:
  - Goalies on the left (x: 0.0-0.5)
  - Scorers on the right (x: 0.5-1.0)

Output: public/data/positions.json
"""

import json
import os
import random

try:
    import networkx as nx
except ImportError:
    print("ERROR: networkx is required. Install with: pip install networkx")
    exit(1)

NODES_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "data", "nodes.json")
EDGES_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "data", "edges.json")
POSITIONS_OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data", "positions.json")


def main():
    with open(NODES_FILE, "r") as f:
        nodes = json.load(f)
    with open(EDGES_FILE, "r") as f:
        edges = json.load(f)

    print(f"Loaded {len(nodes)} nodes, {len(edges)} edges")

    # Build networkx graph
    G = nx.Graph()
    node_types = {}
    for node in nodes:
        G.add_node(node["id"])
        node_types[node["id"]] = node["type"]
    for edge in edges:
        G.add_edge(edge["source"], edge["target"])

    # Initialize positions with bipartite separation
    random.seed(42)
    init_pos = {}
    for node_id, ntype in node_types.items():
        if ntype == "goalie":
            init_pos[node_id] = (random.uniform(0.05, 0.45), random.uniform(0.05, 0.95))
        else:
            init_pos[node_id] = (random.uniform(0.55, 0.95), random.uniform(0.05, 0.95))

    print("Running spring layout (1000 iterations)...")
    pos = nx.spring_layout(
        G,
        pos=init_pos,
        k=0.1,
        iterations=1000,
        seed=42,
    )

    # Normalize to [0, 1]
    xs = [p[0] for p in pos.values()]
    ys = [p[1] for p in pos.values()]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    range_x = max_x - min_x if max_x > min_x else 1
    range_y = max_y - min_y if max_y > min_y else 1

    positions = {}
    for node_id, (x, y) in pos.items():
        positions[node_id] = {
            "x": round((x - min_x) / range_x, 4),
            "y": round((y - min_y) / range_y, 4),
        }

    with open(POSITIONS_OUT, "w") as f:
        json.dump(positions, f, separators=(",", ":"))

    print(f"positions.json: {os.path.getsize(POSITIONS_OUT) / 1024:.0f} KB")
    print("Done!")


if __name__ == "__main__":
    main()
