"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import type { PlayerCareerArc, CareerSeasonData } from "@/lib/career-arc-utils";

interface CareerArcChartProps {
  arcs: PlayerCareerArc[];
  colors: string[];
}

interface TooltipData {
  x: number;
  y: number;
  playerName: string;
  season: number;
  careerYear: number;
  goals: number;
  color: string;
}

export default function CareerArcChart({ arcs, colors }: CareerArcChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(300, entry.contentRect.height),
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const renderChart = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || arcs.length === 0) return;

    const { width, height } = dimensions;
    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    // Clear previous
    d3.select(svg).selectAll("*").remove();

    // Compute scales
    const maxYear = d3.max(arcs, (a) =>
      d3.max(a.data, (d) => d.careerYear)
    ) ?? 10;
    const maxGoals = d3.max(arcs, (a) =>
      d3.max(a.data, (d) => d.goals)
    ) ?? 50;

    const xScale = d3
      .scaleLinear()
      .domain([0, maxYear])
      .range([0, innerW]);

    const yScale = d3
      .scaleLinear()
      .domain([0, maxGoals * 1.1])
      .range([innerH, 0]);

    const g = d3
      .select(svg)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(yScale.ticks(6))
      .join("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "rgba(255,255,255,0.06)")
      .attr("stroke-dasharray", "2,4");

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(Math.min(maxYear, 15))
          .tickFormat((d) => `Yr ${d}`)
      )
      .call((g) => g.select(".domain").attr("stroke", "rgba(255,255,255,0.15)"))
      .call((g) =>
        g.selectAll(".tick text").attr("fill", "rgba(255,255,255,0.5)").attr("font-size", "11px")
      )
      .call((g) =>
        g.selectAll(".tick line").attr("stroke", "rgba(255,255,255,0.15)")
      );

    // X axis label
    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 40)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(255,255,255,0.4)")
      .attr("font-size", "12px")
      .text("Career Year");

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(6))
      .call((g) => g.select(".domain").attr("stroke", "rgba(255,255,255,0.15)"))
      .call((g) =>
        g.selectAll(".tick text").attr("fill", "rgba(255,255,255,0.5)").attr("font-size", "11px")
      )
      .call((g) =>
        g.selectAll(".tick line").attr("stroke", "rgba(255,255,255,0.15)")
      );

    // Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -38)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(255,255,255,0.4)")
      .attr("font-size", "12px")
      .text("Goals");

    // Line generator
    const line = d3
      .line<CareerSeasonData>()
      .x((d) => xScale(d.careerYear))
      .y((d) => yScale(d.goals))
      .curve(d3.curveMonotoneX);

    // Draw lines and dots for each player
    arcs.forEach((arc, i) => {
      const color = colors[i % colors.length];

      // Line
      g.append("path")
        .datum(arc.data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2.5)
        .attr("stroke-opacity", 0.85)
        .attr("d", line);

      // Dots
      g.selectAll(`.dot-${i}`)
        .data(arc.data)
        .join("circle")
        .attr("cx", (d) => xScale(d.careerYear))
        .attr("cy", (d) => yScale(d.goals))
        .attr("r", 4)
        .attr("fill", color)
        .attr("stroke", "rgba(0,0,0,0.3)")
        .attr("stroke-width", 1)
        .attr("cursor", "pointer")
        .on("mouseenter", (event, d) => {
          const rect = svg.getBoundingClientRect();
          setTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top - 10,
            playerName: arc.playerName,
            season: d.season,
            careerYear: d.careerYear,
            goals: d.goals,
            color,
          });
        })
        .on("mouseleave", () => setTooltip(null));
    });
  }, [arcs, colors, dimensions]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  return (
    <div ref={containerRef} className="w-full h-full relative min-h-[300px]">
      <svg ref={svgRef} className="w-full h-full" />

      {tooltip && (
        <div
          className="absolute pointer-events-none bg-popover/95 backdrop-blur border border-border rounded-lg px-3 py-2 text-sm shadow-lg z-10"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tooltip.color }}
            />
            <span className="font-medium">{tooltip.playerName}</span>
          </div>
          <div className="text-muted-foreground text-xs">
            Year {tooltip.careerYear} ({tooltip.season}-
            {String(tooltip.season + 1).slice(2)}) &mdash;{" "}
            <span className="text-foreground font-medium">
              {tooltip.goals} goals
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
