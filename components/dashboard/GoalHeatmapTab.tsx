"use client";

import { useState, useMemo, useEffect } from "react";
import { useGoalsData } from "@/lib/use-goals-data";
import type { GoalRecord, PlayerEnriched } from "@/lib/dashboard-types";
import RinkCanvas from "./RinkCanvas";
import PlayerSearch from "./PlayerSearch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SHOT_TYPES = [
  "wrist",
  "slap",
  "snap",
  "backhand",
  "tip-in",
  "deflected",
  "wrap-around",
  "bat",
];

interface Filters {
  player: PlayerEnriched | null;
  team: string;
  seasonMin: number;
  seasonMax: number;
  shotTypes: Set<string>;
}

export default function GoalHeatmapTab() {
  const { goals, loading } = useGoalsData();
  const [teams, setTeams] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    player: null,
    team: "all",
    seasonMin: 2010,
    seasonMax: 2025,
    shotTypes: new Set(SHOT_TYPES),
  });

  // Load team list
  useEffect(() => {
    fetch("/data/team_list.json")
      .then((res) => res.json())
      .then(setTeams)
      .catch(() => {});
  }, []);

  // Derive season range from data
  const seasonRange = useMemo(() => {
    if (goals.length === 0) return { min: 2010, max: 2025 };
    let min = Infinity,
      max = -Infinity;
    for (const g of goals) {
      if (g.sn < min) min = g.sn;
      if (g.sn > max) max = g.sn;
    }
    return { min, max };
  }, [goals]);

  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      if (g.x === undefined || g.y === undefined) return false;
      if (filters.player && g.s !== filters.player.id) return false;
      if (filters.team !== "all" && g.tm !== filters.team) return false;
      if (g.sn < filters.seasonMin || g.sn > filters.seasonMax) return false;
      if (!filters.shotTypes.has(g.st)) return false;
      return true;
    });
  }, [goals, filters]);

  const goalPoints = useMemo(
    () => filteredGoals.filter((g) => g.x !== undefined && g.y !== undefined) as Array<GoalRecord & { x: number; y: number }>,
    [filteredGoals]
  );

  const toggleShotType = (st: string) => {
    setFilters((prev) => {
      const next = new Set(prev.shotTypes);
      if (next.has(st)) next.delete(st);
      else next.add(st);
      return { ...prev, shotTypes: next };
    });
  };

  const clearFilters = () => {
    setFilters({
      player: null,
      team: "all",
      seasonMin: seasonRange.min,
      seasonMax: seasonRange.max,
      shotTypes: new Set(SHOT_TYPES),
    });
  };

  const hasActiveFilters =
    filters.player !== null ||
    filters.team !== "all" ||
    filters.seasonMin !== seasonRange.min ||
    filters.seasonMax !== seasonRange.max ||
    filters.shotTypes.size !== SHOT_TYPES.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground animate-pulse">
          Loading goal data...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Filters panel */}
      <div className="lg:w-72 shrink-0 space-y-5">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Player
          </label>
          <PlayerSearch
            mode="single"
            positionFilter="scorer"
            selected={filters.player ? [filters.player] : []}
            onSelect={(players) =>
              setFilters((prev) => ({
                ...prev,
                player: players[0] ?? null,
              }))
            }
            placeholder="All players"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Team
          </label>
          <Select
            value={filters.team}
            onValueChange={(v) =>
              setFilters((prev) => ({ ...prev, team: v ?? "all" }))
            }
          >
            <SelectTrigger className="bg-muted/50 border-border/50">
              <SelectValue placeholder="All teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Season Range
          </label>
          <div className="flex items-center gap-2">
            <Select
              value={String(filters.seasonMin)}
              onValueChange={(v) => {
                if (v == null) return;
                setFilters((prev) => ({
                  ...prev,
                  seasonMin: parseInt(v),
                }));
              }}
            >
              <SelectTrigger className="bg-muted/50 border-border/50 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(
                  { length: seasonRange.max - seasonRange.min + 1 },
                  (_, i) => seasonRange.min + i
                ).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}-{String(y + 1).slice(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-sm">to</span>
            <Select
              value={String(filters.seasonMax)}
              onValueChange={(v) => {
                if (v == null) return;
                setFilters((prev) => ({
                  ...prev,
                  seasonMax: parseInt(v),
                }));
              }}
            >
              <SelectTrigger className="bg-muted/50 border-border/50 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(
                  { length: seasonRange.max - seasonRange.min + 1 },
                  (_, i) => seasonRange.min + i
                ).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}-{String(y + 1).slice(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Shot Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SHOT_TYPES.map((st) => (
              <label
                key={st}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={filters.shotTypes.has(st)}
                  onCheckedChange={() => toggleShotType(st)}
                />
                <span className="capitalize">{st.replace("-", " ")}</span>
              </label>
            ))}
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground w-full"
          >
            Clear all filters
          </Button>
        )}
      </div>

      {/* Rink visualization */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="text-foreground font-medium">
                {goalPoints.length.toLocaleString()}
              </span>{" "}
              goals
            </span>
            {filters.player && (
              <Badge variant="secondary" className="text-xs">
                {filters.player.name}
              </Badge>
            )}
            {filters.team !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {filters.team}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-1 bg-card/50 rounded-xl border border-border/30 p-4 flex items-center justify-center">
          <RinkCanvas
            goals={goalPoints}
            goalColor="#f0c050"
            goalRadius={filters.player ? 4.5 : 2.5}
            className="max-w-2xl"
          />
        </div>
      </div>
    </div>
  );
}
