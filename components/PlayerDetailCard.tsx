"use client";

import type { GraphNode, GraphData } from "@/lib/types";

interface PlayerDetailCardProps {
  node: GraphNode;
  data: GraphData;
  onClickNode: (node: GraphNode) => void;
  onClose: () => void;
}

export default function PlayerDetailCard({
  node,
  data,
  onClickNode,
  onClose,
}: PlayerDetailCardProps) {
  const connections = data.adjacency.get(node.id) ?? [];
  const connectedNodes = connections
    .map((id) => data.nodeMap.get(id))
    .filter((n): n is GraphNode => n !== undefined)
    .sort((a, b) => b.count - a.count);

  const topConnections = connectedNodes.slice(0, 8);
  const initials = node.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isGoalie = node.type === "goalie";
  const avgDegree =
    connections.length > 0
      ? (
          connections.reduce((sum, id) => {
            const n = data.adjacency.get(id);
            return sum + (n ? n.length : 0);
          }, 0) / connections.length
        ).toFixed(1)
      : "—";

  return (
    <div className="fixed top-4 left-4 z-40 w-72 bg-[#0b1620]/95 backdrop-blur-md border border-[#6aaab8]/12 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-[#0b1620] flex-shrink-0 ${
            isGoalie
              ? "bg-gradient-to-br from-[#d9956a] to-[#a06030]"
              : "bg-gradient-to-br from-[#6aaab8] to-[#3a6878]"
          }`}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[#c8d8e0] truncate">{node.name}</div>
          <div className="text-xs text-[#c8d8e0]/45 mt-0.5">
            <span className={isGoalie ? "text-[#d9956a]" : "text-[#6aaab8]"}>
              {isGoalie ? "Goalie" : "Scorer"}
            </span>
            {" · "}
            {node.firstYear}–{node.lastYear}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[#c8d8e0]/30 hover:text-[#c8d8e0] transition-colors text-lg leading-none"
        >
          &times;
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
        <div className="py-3 text-center">
          <div className="text-xl font-bold text-[#e8d8c0]">{node.count.toLocaleString()}</div>
          <div className="text-[10px] text-[#c8d8e0]/35 uppercase tracking-wide mt-0.5">
            {isGoalie ? "GA" : "Goals"}
          </div>
        </div>
        <div className="py-3 text-center">
          <div className="text-xl font-bold text-[#e8d8c0]">{connections.length}</div>
          <div className="text-[10px] text-[#c8d8e0]/35 uppercase tracking-wide mt-0.5">
            {isGoalie ? "Scorers" : "Goalies"}
          </div>
        </div>
        <div className="py-3 text-center">
          <div className="text-xl font-bold text-[#e8d8c0]">{avgDegree}</div>
          <div className="text-[10px] text-[#c8d8e0]/35 uppercase tracking-wide mt-0.5">
            Avg Deg.
          </div>
        </div>
      </div>

      {/* Top Connections */}
      {topConnections.length > 0 && (
        <div className="p-3">
          <div className="text-[10px] text-[#c8d8e0]/35 uppercase tracking-wide mb-2">
            {isGoalie ? "Most scored on by" : "Most scored on"}
          </div>
          <div className="flex flex-wrap gap-1">
            {topConnections.map((cn) => (
              <button
                key={cn.id}
                onClick={() => onClickNode(cn)}
                className={`text-[11px] px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  cn.type === "goalie"
                    ? "bg-[#d9956a]/10 text-[#d9956a] hover:bg-[#d9956a]/20"
                    : "bg-[#6aaab8]/10 text-[#6aaab8] hover:bg-[#6aaab8]/20"
                }`}
              >
                {cn.name}
              </button>
            ))}
            {connectedNodes.length > 8 && (
              <span className="text-[11px] px-2 py-1 text-[#c8d8e0]/25">
                +{connectedNodes.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
