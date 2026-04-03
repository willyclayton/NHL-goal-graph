"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PlayerEnriched } from "@/lib/dashboard-types";
import { usePlayersData } from "@/lib/use-players-data";
import { Badge } from "@/components/ui/badge";

interface PlayerSearchProps {
  mode?: "single" | "multi";
  positionFilter?: "scorer" | "goalie" | "all";
  selected: PlayerEnriched[];
  onSelect: (players: PlayerEnriched[]) => void;
  placeholder?: string;
  className?: string;
}

export default function PlayerSearch({
  mode = "single",
  positionFilter = "all",
  selected,
  onSelect,
  placeholder = "Search players...",
  className = "",
}: PlayerSearchProps) {
  const { fuse, loading } = usePlayersData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results =
    query.length > 0
      ? fuse.search(query, { limit: 20 }).map((r) => r.item)
      : [];

  const filteredResults = results.filter((p) => {
    if (positionFilter === "scorer") return p.pos !== "G";
    if (positionFilter === "goalie") return p.pos === "G";
    return true;
  });

  const handleSelect = useCallback(
    (player: PlayerEnriched) => {
      if (mode === "single") {
        onSelect([player]);
        setOpen(false);
        setQuery("");
      } else {
        const isSelected = selected.some((p) => p.id === player.id);
        if (isSelected) {
          onSelect(selected.filter((p) => p.id !== player.id));
        } else {
          onSelect([...selected, player]);
        }
        setQuery("");
      }
    },
    [mode, selected, onSelect]
  );

  const removePlayer = useCallback(
    (id: number) => {
      onSelect(selected.filter((p) => p.id !== id));
    },
    [selected, onSelect]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue =
    mode === "single" && selected.length > 0 && !open
      ? selected[0].name
      : query;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          if (mode === "single" && selected.length > 0) {
            setQuery("");
          }
        }}
        placeholder={loading ? "Loading players..." : placeholder}
        className="w-full h-10 px-3 rounded-md bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
        disabled={loading}
      />

      {/* Dropdown */}
      {open && filteredResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border/50 rounded-lg shadow-xl max-h-64 overflow-auto overscroll-contain">
          {filteredResults.map((player) => {
            const isActive = selected.some((p) => p.id === player.id);
            return (
              <button
                key={player.id}
                onClick={() => handleSelect(player)}
                className={`w-full text-left px-3 py-2.5 md:py-2 text-sm hover:bg-muted/50 active:bg-muted/70 transition-colors flex items-center justify-between gap-2 ${
                  isActive ? "bg-primary/10" : ""
                }`}
              >
                <div className="min-w-0">
                  <span className="font-medium">{player.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {player.pos}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {player.totalGoals
                    ? `${player.totalGoals} G`
                    : player.goalsAgainst
                      ? `${player.goalsAgainst} GA`
                      : ""}
                  {player.teams && player.teams.length > 0 && (
                    <span className="ml-1 hidden sm:inline">
                      {player.teams.slice(0, 3).join(", ")}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open && query.length > 0 && filteredResults.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border/50 rounded-lg shadow-xl p-3 text-sm text-muted-foreground">
          No players found.
        </div>
      )}

      {/* Multi-select chips */}
      {mode === "multi" && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((player, i) => (
            <Badge
              key={player.id}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/20 transition-colors"
              style={{
                borderColor: `hsl(${(i * 137.5) % 360}, 60%, 55%)`,
                borderWidth: 1,
              }}
              onClick={() => removePlayer(player.id)}
            >
              {player.name}
              <span className="ml-1 text-muted-foreground">&times;</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
