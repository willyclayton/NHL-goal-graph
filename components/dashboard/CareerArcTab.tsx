"use client";

import { useState, useMemo } from "react";
import { useGoalsData } from "@/lib/use-goals-data";
import { usePlayersData } from "@/lib/use-players-data";
import type { PlayerEnriched } from "@/lib/dashboard-types";
import { buildCareerArcs, PLAYER_COLORS } from "@/lib/career-arc-utils";
import PlayerSearch from "./PlayerSearch";
import CareerArcChart from "./CareerArcChart";
import { ChartSkeleton } from "./LoadingState";

export default function CareerArcTab() {
  const { goals, loading: goalsLoading } = useGoalsData();
  const { players, loading: playersLoading } = usePlayersData();
  const [selected, setSelected] = useState<PlayerEnriched[]>([]);

  const playerNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of players) {
      map.set(p.id, p.name);
    }
    return map;
  }, [players]);

  const arcs = useMemo(() => {
    if (selected.length === 0 || goals.length === 0) return [];
    return buildCareerArcs(
      goals,
      selected.map((p) => p.id),
      playerNames
    );
  }, [goals, selected, playerNames]);

  const loading = goalsLoading || playersLoading;

  if (loading) {
    return (
      <div className="flex flex-col h-full gap-6">
        <div className="max-w-md space-y-2">
          <div className="h-3 w-28 bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted/50 rounded-md animate-pulse" />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="max-w-md">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Compare Players
        </label>
        <PlayerSearch
          mode="multi"
          positionFilter="scorer"
          selected={selected}
          onSelect={setSelected}
          placeholder="Search players to compare..."
        />
      </div>

      {selected.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground max-w-xs">
            <svg
              className="w-12 h-12 mx-auto mb-4 opacity-30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <p className="text-base mb-1">Select players to compare</p>
            <p className="text-sm opacity-70">
              Search and add players to see their career goal trajectories
              normalized to the same starting point
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-card/50 rounded-xl border border-border/30 p-3 md:p-6 min-h-[350px] md:min-h-[400px] overflow-x-auto">
          <div className="min-w-[500px] h-full">
            <CareerArcChart arcs={arcs} colors={PLAYER_COLORS} />
          </div>
        </div>
      )}

      {/* Legend */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-3 md:gap-4 justify-center pb-2">
          {arcs.map((arc, i) => (
            <div key={arc.playerId} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    PLAYER_COLORS[i % PLAYER_COLORS.length],
                }}
              />
              <span className="text-sm whitespace-nowrap">
                {arc.playerName}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                ({arc.data.reduce((sum, d) => sum + d.goals, 0)}G)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
