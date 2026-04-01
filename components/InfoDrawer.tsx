"use client";

import { useMemo, useRef, useEffect } from "react";
import type { GraphNode, GraphData } from "@/lib/types";
import { nodeColor } from "@/lib/colors";
import { WORLD_WIDTH, WORLD_HEIGHT } from "@/lib/constants";
import { ZoomTransform } from "d3-zoom";

interface InfoDrawerProps {
  node: GraphNode;
  data: GraphData;
  transformRef: React.RefObject<ZoomTransform>;
  onClickNode: (node: GraphNode) => void;
  onJump: (worldX: number, worldY: number) => void;
  onClose: () => void;
}

const MAP_W = 130;
const MAP_H = 100;

export default function InfoDrawer({
  node,
  data,
  transformRef,
  onClickNode,
  onJump,
  onClose,
}: InfoDrawerProps) {
  const isGoalie = node.type === "goalie";
  const connections = data.adjacency.get(node.id) ?? [];
  const connectedNodes = useMemo(
    () =>
      connections
        .map((id) => data.nodeMap.get(id))
        .filter((n): n is GraphNode => n !== undefined)
        .sort((a, b) => b.count - a.count),
    [connections, data.nodeMap]
  );

  const topConnections = connectedNodes.slice(0, 6);

  // Neighborhood: 2-hop
  const { hop1, hop2 } = useMemo(() => {
    const hop1Ids = data.adjacency.get(node.id) ?? [];
    const hop1Nodes = hop1Ids
      .map((id) => data.nodeMap.get(id))
      .filter((n): n is GraphNode => n !== undefined)
      .sort((a, b) => b.count - a.count);

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

  // Stats
  const stats = useMemo(() => {
    const scorers = data.nodes.filter((n) => n.type === "scorer");
    const goalies = data.nodes.filter((n) => n.type === "goalie");
    const byConnections = data.nodes
      .map((n) => ({ node: n, connections: data.adjacency.get(n.id)?.length ?? 0 }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 4);
    let totalDegree = 0;
    for (const [, neighbors] of data.adjacency) totalDegree += neighbors.length;
    const avgDegree = data.nodes.length > 0 ? (totalDegree / data.nodes.length).toFixed(1) : "0";
    return {
      totalNodes: data.nodes.length,
      scorerCount: scorers.length,
      goalieCount: goalies.length,
      edgeCount: data.edges.length,
      avgDegree,
      byConnections,
    };
  }, [data]);

  const initials = node.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hop1Type = isGoalie ? "scorers" : "goalies";
  const hop2Type = isGoalie ? "goalies" : "scorers";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300">
      {/* Drag handle / close bar */}
      <div className="flex justify-center py-1.5">
        <button
          onClick={onClose}
          className="w-10 h-1 rounded-full bg-[#c8d8e0]/15 hover:bg-[#c8d8e0]/30 transition-colors cursor-pointer"
          aria-label="Close drawer"
        />
      </div>

      <div className="bg-[#0b1620]/96 backdrop-blur-md border-t border-[#6aaab8]/10 grid grid-cols-[1fr_1fr_1fr_150px] divide-x divide-white/[0.04]">
        {/* Column 1: Player Detail */}
        <div className="p-3 overflow-hidden">
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#0b1620] flex-shrink-0 ${
                isGoalie
                  ? "bg-gradient-to-br from-[#d9956a] to-[#a06030]"
                  : "bg-gradient-to-br from-[#6aaab8] to-[#3a6878]"
              }`}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[#c8d8e0] truncate">{node.name}</div>
              <div className="text-[10px] text-[#c8d8e0]/40">
                <span className={isGoalie ? "text-[#d9956a]" : "text-[#6aaab8]"}>
                  {isGoalie ? "Goalie" : "Scorer"}
                </span>
                {" · "}
                {node.firstYear}–{node.lastYear}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 mb-2.5">
            <StatBox value={node.count.toLocaleString()} label={isGoalie ? "GA" : "Goals"} />
            <StatBox value={connections.length.toString()} label="Connections" />
          </div>

          <div className="text-[9px] text-[#c8d8e0]/30 uppercase tracking-wide mb-1">
            {isGoalie ? "Most scored on by" : "Most scored on"}
          </div>
          <div className="flex flex-wrap gap-0.5">
            {topConnections.map((cn) => (
              <button
                key={cn.id}
                onClick={() => onClickNode(cn)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  cn.type === "goalie"
                    ? "bg-[#d9956a]/10 text-[#d9956a] hover:bg-[#d9956a]/20"
                    : "bg-[#6aaab8]/10 text-[#6aaab8] hover:bg-[#6aaab8]/20"
                }`}
              >
                {cn.name}
              </button>
            ))}
            {connectedNodes.length > 6 && (
              <span className="text-[10px] px-1.5 py-0.5 text-[#c8d8e0]/20">
                +{connectedNodes.length - 6}
              </span>
            )}
          </div>
        </div>

        {/* Column 2: Neighborhood */}
        <div className="p-3 overflow-hidden">
          <div className="text-[9px] text-[#c8d8e0]/30 uppercase tracking-wide mb-1.5">
            Neighborhood
          </div>

          <div className="text-[9px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1">
            1 hop — {hop1.length.toLocaleString()} {hop1Type}
          </div>
          <div className="flex flex-wrap gap-0.5 mb-2.5 max-h-[52px] overflow-hidden">
            {hop1.slice(0, 8).map((n) => (
              <button
                key={n.id}
                onClick={() => onClickNode(n)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[#e8d8c0]/8 text-[#e8d8c0] hover:bg-[#e8d8c0]/16 transition-colors cursor-pointer truncate max-w-[100px]"
              >
                {n.name}
              </button>
            ))}
            {hop1.length > 8 && (
              <span className="text-[10px] px-1.5 py-0.5 text-[#c8d8e0]/15">
                +{hop1.length - 8}
              </span>
            )}
          </div>

          <div className="text-[9px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1">
            2 hops — {hop2.length.toLocaleString()} {hop2Type}
          </div>
          <div className="flex flex-wrap gap-0.5 max-h-[44px] overflow-hidden">
            {hop2.slice(0, 6).map((n) => (
              <button
                key={n.id}
                onClick={() => onClickNode(n)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[#e8d8c0]/4 text-[#e8d8c0]/50 hover:bg-[#e8d8c0]/10 hover:text-[#e8d8c0] transition-colors cursor-pointer truncate max-w-[100px]"
              >
                {n.name}
              </button>
            ))}
            {hop2.length > 6 && (
              <span className="text-[10px] px-1.5 py-0.5 text-[#c8d8e0]/10">
                +{hop2.length - 6}
              </span>
            )}
          </div>
        </div>

        {/* Column 3: Stats */}
        <div className="p-3 overflow-hidden">
          <div className="text-[9px] text-[#c8d8e0]/30 uppercase tracking-wide mb-1.5">
            Graph Stats
          </div>
          <div className="space-y-0.5 mb-2.5">
            <StatRow label="Players" value={stats.totalNodes.toLocaleString()} />
            <StatRow label="Scorers" value={stats.scorerCount.toLocaleString()} valueClass="text-[#6aaab8]" />
            <StatRow label="Goalies" value={stats.goalieCount.toLocaleString()} valueClass="text-[#d9956a]" />
            <StatRow label="Connections" value={stats.edgeCount.toLocaleString()} />
            <StatRow label="Avg. degree" value={stats.avgDegree} />
          </div>

          <div className="text-[9px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1">
            Most connected
          </div>
          {stats.byConnections.map((item, i) => (
            <div key={item.node.id} className="flex items-center gap-1.5 py-0.5">
              <span className="text-[10px] text-[#c8d8e0]/15 w-3 text-right">{i + 1}</span>
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: item.node.type === "goalie" ? "#d9956a" : "#6aaab8" }}
              />
              <span className="text-[11px] text-[#c8d8e0] flex-1 truncate">{item.node.name}</span>
              <span className="text-[11px] text-[#e8d8c0] font-medium tabular-nums">
                {item.connections.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Column 4: Mini Map */}
        <div className="p-2 flex items-center justify-center">
          <MiniMapCanvas
            data={data}
            transformRef={transformRef}
            onJump={onJump}
          />
        </div>
      </div>
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center py-1.5 rounded-md bg-white/[0.02]">
      <div className="text-base font-bold text-[#e8d8c0]">{value}</div>
      <div className="text-[9px] text-[#c8d8e0]/30 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function StatRow({
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
      <span className="text-[11px] text-[#c8d8e0]/40">{label}</span>
      <span className={`text-[11px] font-medium tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function MiniMapCanvas({
  data,
  transformRef,
  onJump,
}: {
  data: GraphData;
  transformRef: React.RefObject<ZoomTransform>;
  onJump: (worldX: number, worldY: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MAP_W * dpr;
    canvas.height = MAP_H * dpr;

    function render() {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, MAP_W, MAP_H);

      const sx = MAP_W / WORLD_WIDTH;
      const sy = MAP_H / WORLD_HEIGHT;

      for (const node of data.nodes) {
        const x = node.x * WORLD_WIDTH * sx;
        const y = node.y * WORLD_HEIGHT * sy;
        const r = Math.max(0.8, Math.sqrt(node.count) * 0.15);
        ctx.fillStyle = nodeColor(node.type, node.midYear);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const t = transformRef.current;
      if (t) {
        const vx = (-t.x / t.k) * sx;
        const vy = (-t.y / t.k) * sy;
        const vw = (window.innerWidth / t.k) * sx;
        const vh = (window.innerHeight / t.k) * sy;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#e8d8c0";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(vx, vy, vw, vh);
        ctx.fillStyle = "rgba(232,216,192,0.04)";
        ctx.fillRect(vx, vy, vw, vh);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [data, transformRef]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    onJump((mx / MAP_W) * WORLD_WIDTH, (my / MAP_H) * WORLD_HEIGHT);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width: MAP_W, height: MAP_H, display: "block", borderRadius: 6, cursor: "pointer" }}
      onClick={handleClick}
    />
  );
}
