"use client";

import { useMemo } from "react";
import type { GraphData } from "@/lib/types";

interface StatsPanelProps {
  data: GraphData;
  visible: boolean;
  onToggle: () => void;
}

export default function StatsPanel({ data, visible, onToggle }: StatsPanelProps) {
  const stats = useMemo(() => {
    const scorers = data.nodes.filter((n) => n.type === "scorer");
    const goalies = data.nodes.filter((n) => n.type === "goalie");

    // Most connected
    const byConnections = data.nodes
      .map((n) => ({ node: n, connections: data.adjacency.get(n.id)?.length ?? 0 }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 5);

    // Most goals
    const topScorers = [...scorers].sort((a, b) => b.count - a.count).slice(0, 5);

    // Avg degree
    let totalDegree = 0;
    for (const [, neighbors] of data.adjacency) {
      totalDegree += neighbors.length;
    }
    const avgDegree = data.nodes.length > 0 ? (totalDegree / data.nodes.length).toFixed(1) : "0";

    return {
      totalNodes: data.nodes.length,
      scorerCount: scorers.length,
      goalieCount: goalies.length,
      edgeCount: data.edges.length,
      avgDegree,
      byConnections,
      topScorers,
    };
  }, [data]);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-30 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <span className="hidden sm:inline">Stats</span>
      </button>

      {/* Panel */}
      {visible && (
        <div className="fixed top-14 left-4 z-40 w-60 bg-[#0b1620]/95 backdrop-blur-md border border-[#6aaab8]/12 rounded-xl shadow-2xl overflow-hidden">
          {/* Network section */}
          <div className="p-3 border-b border-white/5">
            <div className="text-[10px] text-[#c8d8e0]/35 uppercase tracking-wide mb-2">
              Network
            </div>
            <div className="space-y-1">
              <Row label="Total players" value={stats.totalNodes.toLocaleString()} />
              <Row label="Scorers" value={stats.scorerCount.toLocaleString()} valueClass="text-[#6aaab8]" />
              <Row label="Goalies" value={stats.goalieCount.toLocaleString()} valueClass="text-[#d9956a]" />
              <Row label="Connections" value={stats.edgeCount.toLocaleString()} />
              <Row label="Avg. degree" value={stats.avgDegree} />
            </div>
          </div>

          {/* Most connected */}
          <div className="p-3 border-b border-white/5">
            <div className="text-[10px] text-[#c8d8e0]/35 uppercase tracking-wide mb-2">
              Most connected
            </div>
            {stats.byConnections.map((item, i) => (
              <div key={item.node.id} className="flex items-center gap-2 py-1">
                <span className="text-[11px] text-[#c8d8e0]/20 w-4 text-right">{i + 1}</span>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: item.node.type === "goalie" ? "#d9956a" : "#6aaab8",
                  }}
                />
                <span className="text-xs text-[#c8d8e0] flex-1 truncate">{item.node.name}</span>
                <span className="text-xs text-[#e8d8c0] font-medium tabular-nums">
                  {item.connections.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Top scorers */}
          <div className="p-3">
            <div className="text-[10px] text-[#c8d8e0]/35 uppercase tracking-wide mb-2">
              Most goals
            </div>
            {stats.topScorers.map((node, i) => (
              <div key={node.id} className="flex items-center gap-2 py-1">
                <span className="text-[11px] text-[#c8d8e0]/20 w-4 text-right">{i + 1}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#6aaab8]" />
                <span className="text-xs text-[#c8d8e0] flex-1 truncate">{node.name}</span>
                <span className="text-xs text-[#e8d8c0] font-medium tabular-nums">
                  {node.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Row({
  label,
  value,
  valueClass = "text-[#e8d8c0]",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-xs text-[#c8d8e0]/50">{label}</span>
      <span className={`text-xs font-medium tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
