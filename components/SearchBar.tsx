"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Fuse from "fuse.js";
import type { GraphNode } from "@/lib/types";

interface SearchBarProps {
  nodes: GraphNode[];
  onSelect: (node: GraphNode) => void;
}

export default function SearchBar({ nodes, onSelect }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(nodes, {
        keys: ["name"],
        threshold: 0.3,
      }),
    [nodes]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query, { limit: 8 }).map((r) => r.item);
  }, [fuse, query]);

  // Cmd+K / Ctrl+K to toggle
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function handleSelect(node: GraphNode) {
    onSelect(node);
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      {/* Search button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-30 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline text-xs bg-white/10 rounded px-1.5 py-0.5 ml-1">
          ⌘K
        </kbd>
      </button>

      {/* Search modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#1a1e3a]/95 backdrop-blur-md border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-transparent border-b border-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30"
            />
            {results.length > 0 && (
              <ul className="max-h-80 overflow-y-auto py-1">
                {results.map((node) => (
                  <li key={node.id}>
                    <button
                      onClick={() => handleSelect(node)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-3"
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          node.type === "goalie" ? "bg-blue-400" : "bg-pink-400"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">
                          {node.name}
                        </div>
                        <div className="text-white/40 text-xs">
                          {node.type === "goalie" ? "Goalie" : "Scorer"} &middot;{" "}
                          {node.count} {node.type === "goalie" ? "GA" : "G"} &middot;{" "}
                          {node.firstYear}–{node.lastYear}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {query.trim() && results.length === 0 && (
              <div className="px-4 py-6 text-center text-white/30 text-sm">
                No players found
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
