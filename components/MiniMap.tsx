"use client";

import { useRef, useEffect } from "react";
import type { GraphData } from "@/lib/types";
import { nodeColor } from "@/lib/colors";
import { WORLD_WIDTH, WORLD_HEIGHT } from "@/lib/constants";
import { ZoomTransform } from "d3-zoom";

interface MiniMapProps {
  data: GraphData;
  transformRef: React.RefObject<ZoomTransform>;
  onJump: (worldX: number, worldY: number) => void;
}

const MAP_W = 160;
const MAP_H = 120;

export default function MiniMap({ data, transformRef, onJump }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MAP_W * dpr;
    canvas.height = MAP_H * dpr;
    ctx.scale(dpr, dpr);

    function render() {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, MAP_W, MAP_H);

      const sx = MAP_W / WORLD_WIDTH;
      const sy = MAP_H / WORLD_HEIGHT;

      // Draw nodes
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

      // Draw viewport rectangle
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
    const worldX = (mx / MAP_W) * WORLD_WIDTH;
    const worldY = (my / MAP_H) * WORLD_HEIGHT;
    onJump(worldX, worldY);
  };

  return (
    <div className="fixed bottom-20 left-4 z-30 rounded-lg overflow-hidden border border-[#6aaab8]/12 shadow-xl cursor-pointer hidden sm:block">
      <canvas
        ref={canvasRef}
        style={{ width: MAP_W, height: MAP_H, display: "block" }}
        onClick={handleClick}
      />
    </div>
  );
}
