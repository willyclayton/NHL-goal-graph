"use client";

import { useState, useMemo } from "react";
import { useGoalsData } from "@/lib/use-goals-data";
import { usePlayersData } from "@/lib/use-players-data";
import type { PlayerEnriched } from "@/lib/dashboard-types";
import { buildCareerArcs, PLAYER_COLORS } from "@/lib/career-arc-utils";
import PlayerSearch from "./PlayerSearch";
import CareerArcChart from "./CareerArcChart";

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
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground animate-pulse">
          Loading data...
        </div>
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
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg mb-1">Select players to compare</p>
            <p className="text-sm">
              Search and add players to see their career goal trajectories
              side by side
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-card/50 rounded-xl border border-border/30 p-4 md:p-6 min-h-[400px]">
          <CareerArcChart
            arcs={arcs}
            colors={PLAYER_COLORS}
          />
        </div>
      )}

      {/* Legend */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-4 justify-center">
          {arcs.map((arc, i) => (
            <div key={arc.playerId} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
              />
              <span className="text-sm">{arc.playerName}</span>
              <span className="text-xs text-muted-foreground">
                ({arc.data.reduce((sum, d) => sum + d.goals, 0)} total goals)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
