"use client";

import type { GraphNode } from "@/lib/types";

interface PlayerTooltipProps {
  node: GraphNode;
  x: number;
  y: number;
}

export default function PlayerTooltip({ node, x, y }: PlayerTooltipProps) {
  // Position tooltip to avoid going off screen
  const offsetX = x > window.innerWidth - 220 ? -210 : 15;
  const offsetY = y > window.innerHeight - 100 ? -90 : 15;

  return (
    <div
      className="fixed pointer-events-none z-50 bg-black/85 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-sm shadow-xl"
      style={{ left: x + offsetX, top: y + offsetY }}
    >
      <div className="font-semibold text-white">{node.name}</div>
      <div className="flex items-center gap-2 mt-1 text-white/70">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            node.type === "goalie" ? "bg-blue-400" : "bg-pink-400"
          }`}
        />
        <span className="capitalize">{node.type}</span>
        <span className="text-white/40">|</span>
        <span>
          {node.count} {node.type === "goalie" ? "GA" : "G"}
        </span>
      </div>
      <div className="text-white/50 text-xs mt-0.5">
        {node.firstYear}–{node.lastYear}
      </div>
    </div>
  );
}
