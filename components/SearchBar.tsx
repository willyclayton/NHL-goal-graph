"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Fuse from "fuse.js";
import type { GraphNode } from "@/lib/types";

interface SearchBarProps {
  nodes: GraphNode[];
  onSelect: (node: GraphNode) => void;
}

type PositionFilter = "all" | "F" | "D" | "G";

const POSITION_OPTIONS: { value: PositionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "F", label: "Forward" },
  { value: "D", label: "Defense" },
  { value: "G", label: "Goalie" },
];

function matchesPosition(node: GraphNode, filter: PositionFilter): boolean {
  if (filter === "all") return true;
  if (filter === "G") return node.type === "goalie" || node.position === "G";
  if (filter === "F") return ["C", "L", "R", "LW", "RW"].includes(node.position);
  if (filter === "D") return node.position === "D";
  return true;
}

export default function SearchBar({ nodes, onSelect }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState<PositionFilter>("all");
  const [yearMin, setYearMin] = useState<string>("");
  const [yearMax, setYearMax] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(
    () => new Fuse(nodes, { keys: ["name"], threshold: 0.3 }),
    [nodes]
  );

  const results = useMemo(() => {
    let candidates: GraphNode[];

    if (query.trim()) {
      candidates = fuse.search(query, { limit: 50 }).map((r) => r.item);
    } else {
      // No query — show top players by count
      candidates = [...nodes].sort((a, b) => b.count - a.count).slice(0, 50);
    }

    // Apply position filter
    if (posFilter !== "all") {
      candidates = candidates.filter((n) => matchesPosition(n, posFilter));
    }

    // Apply year filter
    const yMin = yearMin ? parseInt(yearMin) : 0;
    const yMax = yearMax ? parseInt(yearMax) : 9999;
    if (yMin > 0 || yMax < 9999) {
      candidates = candidates.filter(
        (n) => n.lastYear >= yMin && n.firstYear <= yMax
      );
    }

    return candidates.slice(0, 8);
  }, [fuse, nodes, query, posFilter, yearMin, yearMax]);

  // Cmd+K / Ctrl+K to toggle
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setPosFilter("all");
      setYearMin("");
      setYearMax("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSelect = useCallback(
    (node: GraphNode) => {
      onSelect(node);
      setOpen(false);
    },
    [onSelect]
  );

  const positionLabel = (pos: string): string => {
    switch (pos) {
      case "C": return "Center";
      case "L": case "LW": return "Left Wing";
      case "R": case "RW": return "Right Wing";
      case "D": return "Defense";
      case "G": return "Goalie";
      default: return pos;
    }
  };

  return (
    <>
      {/* Search button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-30 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline text-xs bg-white/10 rounded px-1.5 py-0.5 ml-1">⌘K</kbd>
      </button>

      {/* Search modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#0e1a28]/97 backdrop-blur-md border border-[#6aaab8]/12 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-transparent border-b border-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25 text-[15px]"
            />

            {/* Filter chips */}
            <div className="px-4 py-2 flex items-center gap-3 border-b border-white/5">
              {/* Position filter */}
              <div className="flex gap-1">
                {POSITION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPosFilter(opt.value)}
                    className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                      posFilter === opt.value
                        ? "bg-[#6aaab8]/20 text-[#6aaab8]"
                        : "bg-white/[0.03] text-[#c8d8e0]/40 hover:text-[#c8d8e0]/60"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Year range */}
              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="text"
                  value={yearMin}
                  onChange={(e) => setYearMin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="From"
                  className="w-14 bg-white/[0.03] text-[#c8d8e0] text-[11px] px-2 py-1 rounded-md outline-none placeholder:text-[#c8d8e0]/25 text-center"
                />
                <span className="text-[#c8d8e0]/20 text-[10px]">–</span>
                <input
                  type="text"
                  value={yearMax}
                  onChange={(e) => setYearMax(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="To"
                  className="w-14 bg-white/[0.03] text-[#c8d8e0] text-[11px] px-2 py-1 rounded-md outline-none placeholder:text-[#c8d8e0]/25 text-center"
                />
              </div>
            </div>

            {/* Results */}
            {results.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto py-1">
                {results.map((node) => (
                  <li key={node.id}>
                    <button
                      onClick={() => handleSelect(node)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-3"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          background: node.type === "goalie" ? "#d9956a" : "#6aaab8",
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-medium truncate text-[14px]">
                          {node.name}
                        </div>
                        <div className="text-[#c8d8e0]/35 text-xs">
                          {positionLabel(node.position)} · {node.count}{" "}
                          {node.type === "goalie" ? "GA" : "G"} · {node.firstYear}–
                          {node.lastYear}
                        </div>
                      </div>
                      <span className="text-[#e8d8c0] text-sm font-medium tabular-nums">
                        {node.count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center text-[#c8d8e0]/25 text-sm">
                No players found
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
