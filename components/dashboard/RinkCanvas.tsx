"use client";

import { useRef, useEffect, useCallback } from "react";
import {
  drawRink,
  drawDots,
  drawSaveMarks,
  computeRinkTransform,
  normalizeToAttackingHalf,
  nhlToCanvas,
} from "@/lib/rink-renderer";

interface RinkPoint {
  x: number;
  y: number;
}

interface RinkCanvasProps {
  goals?: RinkPoint[];
  saves?: RinkPoint[];
  width?: number;
  height?: number;
  goalColor?: string;
  saveColor?: string;
  goalRadius?: number;
  saveRadius?: number;
  className?: string;
  onHover?: (point: RinkPoint | null, type: "goal" | "save") => void;
}

export default function RinkCanvas({
  goals = [],
  saves = [],
  goalColor = "#f0c050",
  saveColor = "#5a8a9a",
  goalRadius = 3.5,
  saveRadius = 3,
  className = "",
  onHover,
}: RinkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const w = rect.width;
    // Maintain rink aspect ratio: 100 x 85 (width x height)
    const h = Math.min(rect.height, w * (85 / 100));

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Draw rink markings
    drawRink(ctx, w, h);

    // Draw save marks first (underneath goals)
    if (saves.length > 0) {
      drawSaveMarks(ctx, saves, w, h, {
        color: saveColor,
        radius: saveRadius,
        alpha: 0.5,
      });
    }

    // Draw goal dots on top
    if (goals.length > 0) {
      drawDots(ctx, goals, w, h, {
        color: goalColor,
        radius: goalRadius,
        alpha: goals.length > 500 ? 0.4 : goals.length > 100 ? 0.6 : 0.85,
      });
    }
  }, [goals, saves, goalColor, saveColor, goalRadius, saveRadius]);

  // Render on mount and when data changes
  useEffect(() => {
    render();
  }, [render]);

  // ResizeObserver for responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      render();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  // Mouse hover for tooltips
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onHover) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;

      const t = computeRinkTransform(w, h);
      const hitRadius = 8;

      // Check goals first
      for (const pt of goals) {
        const norm = normalizeToAttackingHalf(pt.x, pt.y);
        const { px, py } = nhlToCanvas(norm.x, norm.y, t);
        if (Math.abs(px - mx) < hitRadius && Math.abs(py - my) < hitRadius) {
          onHover(pt, "goal");
          return;
        }
      }

      // Then saves
      for (const pt of saves) {
        const norm = normalizeToAttackingHalf(pt.x, pt.y);
        const { px, py } = nhlToCanvas(norm.x, norm.y, t);
        if (Math.abs(px - mx) < hitRadius && Math.abs(py - my) < hitRadius) {
          onHover(pt, "save");
          return;
        }
      }

      onHover(null, "goal");
    },
    [goals, saves, onHover]
  );

  // Touch support for mobile — tap shows tooltip
  const handleTouch = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!onHover) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const touch = e.touches[0];
      if (!touch) return;

      const rect = canvas.getBoundingClientRect();
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;

      const t = computeRinkTransform(w, h);
      const hitRadius = 14; // Larger hit target for touch

      for (const pt of goals) {
        const norm = normalizeToAttackingHalf(pt.x, pt.y);
        const { px, py } = nhlToCanvas(norm.x, norm.y, t);
        if (Math.abs(px - mx) < hitRadius && Math.abs(py - my) < hitRadius) {
          onHover(pt, "goal");
          return;
        }
      }
      for (const pt of saves) {
        const norm = normalizeToAttackingHalf(pt.x, pt.y);
        const { px, py } = nhlToCanvas(norm.x, norm.y, t);
        if (Math.abs(px - mx) < hitRadius && Math.abs(py - my) < hitRadius) {
          onHover(pt, "save");
          return;
        }
      }
      onHover(null, "goal");
    },
    [goals, saves, onHover]
  );

  return (
    <div
      ref={containerRef}
      className={`w-full aspect-[100/85] ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHover?.(null, "goal")}
        onTouchStart={handleTouch}
        onTouchEnd={() => onHover?.(null, "goal")}
      />
    </div>
  );
}
