"use client";

import { useCallback } from "react";
import type { GraphNode, GraphData } from "@/lib/types";
import { bfs } from "@/lib/pathfinding";

interface RandomPathButtonProps {
  data: GraphData;
  onPathFound: (nodeA: GraphNode, nodeB: GraphNode, path: string[]) => void;
}

export default function RandomPathButton({ data, onPathFound }: RandomPathButtonProps) {
  const handleClick = useCallback(() => {
    // Pick two random nodes with count > 10 for interesting results
    const candidates = data.nodes.filter((n) => n.count > 10);
    if (candidates.length < 2) return;

    let attempts = 0;
    while (attempts < 20) {
      const a = candidates[Math.floor(Math.random() * candidates.length)];
      const b = candidates[Math.floor(Math.random() * candidates.length)];
      if (a.id === b.id) { attempts++; continue; }

      const path = bfs(a.id, b.id, data.adjacency);
      if (path && path.length >= 3) {
        onPathFound(a, b, path);
        return;
      }
      attempts++;
    }
  }, [data, onPathFound]);

  return (
    <button
      onClick={handleClick}
      className="fixed top-4 right-32 sm:right-36 z-30 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors flex items-center gap-2"
      title="Find a random path between two players"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span className="hidden sm:inline">Random Path</span>
    </button>
  );
}
