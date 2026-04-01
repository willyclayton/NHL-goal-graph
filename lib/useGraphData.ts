"use client";

import { useState, useEffect } from "react";
import type { GraphNode, GraphEdge, Positions, GraphData } from "./types";

interface UseGraphDataResult {
  data: GraphData | null;
  loading: boolean;
  error: string | null;
}

export function useGraphData(): UseGraphDataResult {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [nodesRes, edgesRes, positionsRes] = await Promise.all([
          fetch("/data/nodes.json"),
          fetch("/data/edges.json"),
          fetch("/data/positions.json"),
        ]);

        if (!nodesRes.ok || !edgesRes.ok || !positionsRes.ok) {
          throw new Error("Failed to load graph data");
        }

        const [rawNodes, edges, positions]: [GraphNode[], GraphEdge[], Positions] =
          await Promise.all([
            nodesRes.json(),
            edgesRes.json(),
            positionsRes.json(),
          ]);

        // Merge positions into nodes
        const nodes: GraphNode[] = rawNodes.map((node) => {
          const pos = positions[node.id];
          return {
            ...node,
            x: pos?.x ?? 0.5,
            y: pos?.y ?? 0.5,
          };
        });

        // Build adjacency list
        const adjacency = new Map<string, string[]>();
        const nodeMap = new Map<string, GraphNode>();

        for (const node of nodes) {
          adjacency.set(node.id, []);
          nodeMap.set(node.id, node);
        }

        for (const edge of edges) {
          adjacency.get(edge.source)?.push(edge.target);
          adjacency.get(edge.target)?.push(edge.source);
        }

        if (!cancelled) {
          setData({ nodes, edges, adjacency, nodeMap });
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
