"use client";

import { useState, useMemo, useEffect } from "react";
import { useGoalsData } from "@/lib/use-goals-data";
import type { GoalRecord, PlayerEnriched } from "@/lib/dashboard-types";
import RinkCanvas from "./RinkCanvas";
import PlayerSearch from "./PlayerSearch";
import { RinkSkeleton, FiltersSkeleton } from "./LoadingState";
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
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

function FiltersPanel({
  filters,
  setFilters,
  teams,
  seasonRange,
  hasActiveFilters,
  clearFilters,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  teams: string[];
  seasonRange: { min: number; max: number };
  hasActiveFilters: boolean;
  clearFilters: () => void;
}) {
  const toggleShotType = (st: string) => {
    setFilters((prev) => {
      const next = new Set(prev.shotTypes);
      if (next.has(st)) next.delete(st);
      else next.add(st);
      return { ...prev, shotTypes: next };
    });
  };

  return (
    <div className="space-y-5">
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
  );
}

export default function GoalHeatmapTab() {
  const { goals, loading } = useGoalsData();
  const [teams, setTeams] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    player: null,
    team: "all",
    seasonMin: 2010,
    seasonMax: 2025,
    shotTypes: new Set(SHOT_TYPES),
  });

  useEffect(() => {
    fetch("/data/team_list.json")
      .then((res) => res.json())
      .then(setTeams)
      .catch(() => {});
  }, []);

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
    () =>
      filteredGoals.filter(
        (g) => g.x !== undefined && g.y !== undefined
      ) as Array<GoalRecord & { x: number; y: number }>,
    [filteredGoals]
  );

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

  const activeFilterCount = [
    filters.player !== null,
    filters.team !== "all",
    filters.seasonMin !== seasonRange.min || filters.seasonMax !== seasonRange.max,
    filters.shotTypes.size !== SHOT_TYPES.length,
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        <div className="lg:w-72 shrink-0 hidden lg:block">
          <FiltersSkeleton />
        </div>
        <div className="flex-1">
          <RinkSkeleton />
        </div>
      </div>
    );
  }

  const filterProps = {
    filters,
    setFilters,
    teams,
    seasonRange,
    hasActiveFilters,
    clearFilters,
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Desktop filters sidebar */}
      <div className="hidden lg:block lg:w-72 shrink-0">
        <FiltersPanel {...filterProps} />
      </div>

      {/* Rink visualization */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Stats bar + mobile filter button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="text-foreground font-semibold tabular-nums">
                {goalPoints.length.toLocaleString()}
              </span>{" "}
              goals
            </span>
            {filters.player && (
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-destructive/20"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, player: null }))
                }
              >
                {filters.player.name} &times;
              </Badge>
            )}
            {filters.team !== "all" && (
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-destructive/20"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, team: "all" }))
                }
              >
                {filters.team} &times;
              </Badge>
            )}
          </div>

          {/* Mobile filter button */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger
              className="lg:hidden inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-muted/50 border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="16" y2="12" />
                <line x1="4" y1="18" x2="12" y2="18" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center font-medium">
                  {activeFilterCount}
                </span>
              )}
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-auto p-0">
              <SheetHeader className="border-b border-border/30">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <FiltersPanel {...filterProps} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex-1 bg-card/50 rounded-xl border border-border/30 p-3 md:p-4 flex items-center justify-center">
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
