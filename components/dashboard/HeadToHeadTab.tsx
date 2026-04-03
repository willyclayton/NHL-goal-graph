"use client";

import { useState, useMemo } from "react";
import type { PlayerEnriched } from "@/lib/dashboard-types";
import { useHeadToHead } from "@/lib/use-head-to-head";
import PlayerSearch from "./PlayerSearch";
import RinkCanvas from "./RinkCanvas";
import { RinkSkeleton, StatCardSkeleton } from "./LoadingState";
import { Card, CardContent } from "@/components/ui/card";

export default function HeadToHeadTab() {
  const [scorer, setScorer] = useState<PlayerEnriched | null>(null);
  const [goalie, setGoalie] = useState<PlayerEnriched | null>(null);

  const { data, loading } = useHeadToHead(
    scorer?.id ?? null,
    goalie?.id ?? null
  );

  const goalPoints = useMemo(
    () =>
      data?.goals
        .filter((r) => r.x !== undefined && r.y !== undefined)
        .map((r) => ({ x: r.x!, y: r.y! })) ?? [],
    [data]
  );

  const savePoints = useMemo(
    () =>
      data?.saves
        .filter((r) => r.x !== undefined && r.y !== undefined)
        .map((r) => ({ x: r.x!, y: r.y! })) ?? [],
    [data]
  );

  const stats = useMemo(() => {
    if (!data) return null;

    const totalGoals = data.goals.length;
    const totalShots = data.goals.length + data.saves.length;
    const savePct =
      totalShots > 0
        ? (((totalShots - totalGoals) / totalShots) * 100).toFixed(1)
        : "0.0";
    const shootPct =
      totalShots > 0
        ? ((totalGoals / totalShots) * 100).toFixed(1)
        : "0.0";

    const byShotType = new Map<string, number>();
    for (const g of data.goals) {
      byShotType.set(g.st, (byShotType.get(g.st) ?? 0) + 1);
    }
    const shotTypeEntries = Array.from(byShotType.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    const byPeriod = new Map<number, number>();
    for (const g of data.goals) {
      byPeriod.set(g.p, (byPeriod.get(g.p) ?? 0) + 1);
    }

    const bySeason = new Map<number, number>();
    for (const g of data.goals) {
      bySeason.set(g.sn, (bySeason.get(g.sn) ?? 0) + 1);
    }
    const seasonEntries = Array.from(bySeason.entries()).sort(
      (a, b) => a[0] - b[0]
    );

    return {
      totalGoals,
      totalShots,
      savePct,
      shootPct,
      shotTypeEntries,
      byPeriod,
      seasonEntries,
    };
  }, [data]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Player selectors */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 max-w-2xl">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Scorer
          </label>
          <PlayerSearch
            mode="single"
            positionFilter="scorer"
            selected={scorer ? [scorer] : []}
            onSelect={(players) => setScorer(players[0] ?? null)}
            placeholder="Search scorers..."
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Goalie
          </label>
          <PlayerSearch
            mode="single"
            positionFilter="goalie"
            selected={goalie ? [goalie] : []}
            onSelect={(players) => setGoalie(players[0] ?? null)}
            placeholder="Search goalies..."
          />
        </div>
      </div>

      {/* Empty state */}
      {(!scorer || !goalie) && !loading && (
        <div className="flex items-center justify-center py-16 md:py-24">
          <div className="text-center text-muted-foreground max-w-xs">
            <svg
              className="w-10 h-10 mx-auto mb-3 opacity-30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p className="text-sm mb-1">Select a scorer and a goalie</p>
            <p className="text-xs opacity-70">
              See goals and saves in head-to-head matchups
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && scorer && goalie && (
        <div className="space-y-4 lg:flex lg:gap-6 lg:space-y-0">
          <div className="lg:flex-1">
            <RinkSkeleton />
          </div>
          <div className="lg:w-72 space-y-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </div>
      )}

      {/* Results */}
      {stats && scorer && goalie && !loading && (
        <>
          {/* Overview stats — always visible on top for mobile */}
          <div className="grid grid-cols-4 gap-2 md:hidden">
            <div className="bg-card/70 rounded-lg p-2.5 text-center border border-border/20">
              <div className="text-lg font-bold tabular-nums" style={{ color: "#f0c050" }}>
                {stats.totalGoals}
              </div>
              <div className="text-[10px] text-muted-foreground">Goals</div>
            </div>
            <div className="bg-card/70 rounded-lg p-2.5 text-center border border-border/20">
              <div className="text-lg font-bold tabular-nums">
                {stats.totalShots}
              </div>
              <div className="text-[10px] text-muted-foreground">Shots</div>
            </div>
            <div className="bg-card/70 rounded-lg p-2.5 text-center border border-border/20">
              <div className="text-lg font-bold text-primary tabular-nums">
                {stats.shootPct}%
              </div>
              <div className="text-[10px] text-muted-foreground">Shoot %</div>
            </div>
            <div className="bg-card/70 rounded-lg p-2.5 text-center border border-border/20">
              <div className="text-lg font-bold tabular-nums" style={{ color: "#5a8a9a" }}>
                {stats.savePct}%
              </div>
              <div className="text-[10px] text-muted-foreground">Save %</div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Mini rink */}
            <div className="lg:flex-1">
              <div className="bg-card/50 rounded-xl border border-border/30 p-2 md:p-4">
                <div className="flex items-center gap-3 mb-2 text-xs md:text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#f0c050" }} />
                    <span>Goals ({stats.totalGoals})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 flex items-center justify-center text-[#5a8a9a] font-bold text-[8px]">
                      &times;
                    </div>
                    <span>Saves ({stats.totalShots - stats.totalGoals})</span>
                  </div>
                </div>
                <RinkCanvas
                  goals={goalPoints}
                  saves={savePoints}
                  goalColor="#f0c050"
                  saveColor="#5a8a9a"
                  goalRadius={5}
                  saveRadius={4}
                />
              </div>
            </div>

            {/* Stat cards — desktop sidebar, stacked on mobile */}
            <div className="lg:w-72 space-y-3 md:space-y-4">
              {/* Overview — desktop only (mobile shows compact version above) */}
              <Card className="bg-card/70 border-border/30 hidden md:block">
                <CardContent className="pt-5 pb-4">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    {scorer.name} vs {goalie.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold tabular-nums" style={{ color: "#f0c050" }}>
                        {stats.totalGoals}
                      </div>
                      <div className="text-xs text-muted-foreground">Goals</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold tabular-nums">
                        {stats.totalShots}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Shots</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary tabular-nums">
                        {stats.shootPct}%
                      </div>
                      <div className="text-xs text-muted-foreground">Shooting %</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold tabular-nums" style={{ color: "#5a8a9a" }}>
                        {stats.savePct}%
                      </div>
                      <div className="text-xs text-muted-foreground">Save %</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shot type + period side by side on mobile */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-4">
                {/* Shot type breakdown */}
                {stats.shotTypeEntries.length > 0 && (
                  <Card className="bg-card/70 border-border/30">
                    <CardContent className="pt-4 pb-3 md:pt-5 md:pb-4">
                      <h3 className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 md:mb-3">
                        By Shot Type
                      </h3>
                      <div className="space-y-1.5 md:space-y-2.5">
                        {stats.shotTypeEntries.map(([type, count]) => {
                          const pct =
                            stats.totalGoals > 0
                              ? (count / stats.totalGoals) * 100
                              : 0;
                          return (
                            <div key={type} className="flex items-center gap-1.5 md:gap-2">
                              <span className="text-[10px] md:text-xs w-14 md:w-20 capitalize truncate text-muted-foreground">
                                {type.replace("-", " ")}
                              </span>
                              <div className="flex-1 h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] md:text-xs text-muted-foreground w-4 text-right tabular-nums">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Period breakdown */}
                <Card className="bg-card/70 border-border/30">
                  <CardContent className="pt-4 pb-3 md:pt-5 md:pb-4">
                    <h3 className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 md:mb-3">
                      By Period
                    </h3>
                    <div className="flex gap-2 md:gap-3">
                      {[1, 2, 3, 4].map((p) => {
                        const count = stats.byPeriod.get(p) ?? 0;
                        if (p === 4 && count === 0) return null;
                        return (
                          <div key={p} className="text-center flex-1">
                            <div className="text-base md:text-lg font-bold tabular-nums">
                              {count}
                            </div>
                            <div className="text-[10px] md:text-xs text-muted-foreground">
                              {p <= 3
                                ? `${p}${p === 1 ? "st" : p === 2 ? "nd" : "rd"}`
                                : "OT"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Season breakdown */}
              {stats.seasonEntries.length > 0 && (
                <Card className="bg-card/70 border-border/30">
                  <CardContent className="pt-4 pb-3 md:pt-5 md:pb-4">
                    <h3 className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 md:mb-3">
                      By Season
                    </h3>
                    <div className="space-y-1.5 md:space-y-2">
                      {stats.seasonEntries.map(([sn, count]) => {
                        const maxCount = Math.max(
                          ...stats.seasonEntries.map(([, c]) => c)
                        );
                        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={sn} className="flex items-center gap-1.5 md:gap-2">
                            <span className="text-[10px] md:text-xs text-muted-foreground w-12 md:w-14 shrink-0 tabular-nums">
                              {sn}-{String(sn + 1).slice(2)}
                            </span>
                            <div className="flex-1 h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: "#f0c050",
                                }}
                              />
                            </div>
                            <span className="text-[10px] md:text-xs font-medium w-3 md:w-4 text-right tabular-nums">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
