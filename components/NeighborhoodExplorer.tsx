"use client";

import { useMemo } from "react";
import type { GraphNode, GraphData } from "@/lib/types";

interface NeighborhoodExplorerProps {
  node: GraphNode;
  data: GraphData;
  onClickNode: (node: GraphNode) => void;
  onClose: () => void;
}

export default function NeighborhoodExplorer({
  node,
  data,
  onClickNode,
  onClose,
}: NeighborhoodExplorerProps) {
  const { hop1, hop2 } = useMemo(() => {
    // 1-hop: direct connections
    const hop1Ids = data.adjacency.get(node.id) ?? [];
    const hop1Nodes = hop1Ids
      .map((id) => data.nodeMap.get(id))
      .filter((n): n is GraphNode => n !== undefined)
      .sort((a, b) => b.count - a.count);

    // 2-hop: connections of connections (excluding node itself and hop1)
    const hop1Set = new Set(hop1Ids);
    hop1Set.add(node.id);
    const hop2Set = new Set<string>();
    for (const h1Id of hop1Ids) {
      for (const h2Id of data.adjacency.get(h1Id) ?? []) {
        if (!hop1Set.has(h2Id)) hop2Set.add(h2Id);
      }
    }
    const hop2Nodes = [...hop2Set]
      .map((id) => data.nodeMap.get(id))
      .filter((n): n is GraphNode => n !== undefined)
      .sort((a, b) => b.count - a.count);

    return { hop1: hop1Nodes, hop2: hop2Nodes };
  }, [node, data]);

  const isGoalie = node.type === "goalie";
  const hop1Type = isGoalie ? "scorers" : "goalies";
  const hop2Type = isGoalie ? "goalies" : "scorers";

  return (
    <div className="fixed top-4 right-4 z-40 w-72 bg-[#0b1620]/95 backdrop-blur-md border border-[#6aaab8]/12 rounded-xl shadow-2xl overflow-hidden sm:right-4 sm:top-16">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-[#c8d8e0]/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="3" />
            <path
              strokeLinecap="round"
              d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0l-2.83-2.83M9.76 9.76L6.93 6.93"
            />
          </svg>
          <span className="text-[13px] font-semibold text-[#c8d8e0]">Neighborhood</span>
        </div>
        <button
          onClick={onClose}
          className="text-[#c8d8e0]/30 hover:text-[#c8d8e0] transition-colors text-lg leading-none"
        >
          &times;
        </button>
      </div>

      {/* Center node */}
      <div className="mx-3 mt-3 mb-2 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#6aaab8]/8">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: isGoalie ? "#d9956a" : "#6aaab8" }}
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#c8d8e0] truncate">{node.name}</div>
          <div className="text-[11px] text-[#c8d8e0]/40">
            {isGoalie ? "Goalie" : "Scorer"} · {(data.adjacency.get(node.id) ?? []).length} connections
          </div>
        </div>
      </div>

      {/* 1-hop */}
      <div className="px-3 pt-2 pb-1">
        <div className="text-[10px] text-[#c8d8e0]/30 uppercase tracking-wide mb-1.5">
          1 hop — {hop1.length.toLocaleString()} {hop1Type}
        </div>
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
          {hop1.slice(0, 12).map((n) => (
            <button
              key={n.id}
              onClick={() => onClickNode(n)}
              className="text-[10px] px-2 py-0.5 rounded bg-[#e8d8c0]/10 text-[#e8d8c0] hover:bg-[#e8d8c0]/20 transition-colors cursor-pointer truncate max-w-[120px]"
            >
              {n.name}
            </button>
          ))}
          {hop1.length > 12 && (
            <span className="text-[10px] px-2 py-0.5 text-[#c8d8e0]/20">
              +{hop1.length - 12} more
            </span>
          )}
        </div>
      </div>

      {/* 2-hop */}
      <div className="px-3 pt-2 pb-3">
        <div className="text-[10px] text-[#c8d8e0]/30 uppercase tracking-wide mb-1.5">
          2 hops — {hop2.length.toLocaleString()} {hop2Type}
        </div>
        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
          {hop2.slice(0, 10).map((n) => (
            <button
              key={n.id}
              onClick={() => onClickNode(n)}
              className="text-[10px] px-2 py-0.5 rounded bg-[#e8d8c0]/5 text-[#e8d8c0]/50 hover:bg-[#e8d8c0]/10 hover:text-[#e8d8c0] transition-colors cursor-pointer truncate max-w-[120px]"
            >
              {n.name}
            </button>
          ))}
          {hop2.length > 10 && (
            <span className="text-[10px] px-2 py-0.5 text-[#c8d8e0]/15">
              +{hop2.length - 10} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
