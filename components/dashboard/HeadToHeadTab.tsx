"use client";

import { useState, useMemo } from "react";
import type { PlayerEnriched, H2HRecord } from "@/lib/dashboard-types";
import { useHeadToHead } from "@/lib/use-head-to-head";
import PlayerSearch from "./PlayerSearch";
import RinkCanvas from "./RinkCanvas";
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

  // Stat computations
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

    // Goals by shot type
    const byShotType = new Map<string, number>();
    for (const g of data.goals) {
      byShotType.set(g.st, (byShotType.get(g.st) ?? 0) + 1);
    }
    const shotTypeEntries = Array.from(byShotType.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    // Goals by period
    const byPeriod = new Map<number, number>();
    for (const g of data.goals) {
      byPeriod.set(g.p, (byPeriod.get(g.p) ?? 0) + 1);
    }

    // Goals by season
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
    <div className="flex flex-col h-full gap-6">
      {/* Player selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
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
      {(!scorer || !goalie) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg mb-1">Select a scorer and a goalie</p>
            <p className="text-sm">
              See where goals were scored and saved in head-to-head matchups
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && scorer && goalie && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground animate-pulse">
            Loading matchup data...
          </div>
        </div>
      )}

      {/* Results */}
      {stats && scorer && goalie && !loading && (
        <div className="flex flex-col lg:flex-row gap-6 flex-1">
          {/* Mini rink */}
          <div className="lg:flex-1">
            <div className="bg-card/50 rounded-xl border border-border/30 p-4">
              <div className="flex items-center gap-4 mb-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-goal-dot" />
                  <span>Goals ({stats.totalGoals})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 flex items-center justify-center text-save-dot font-bold text-[10px]">
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
                className="max-w-xl"
              />
            </div>
          </div>

          {/* Stat cards */}
          <div className="lg:w-80 space-y-4">
            {/* Overview card */}
            <Card className="bg-card/70 border-border/30">
              <CardContent className="pt-5 pb-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Overview
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-goal-dot">
                      {stats.totalGoals}
                    </div>
                    <div className="text-xs text-muted-foreground">Goals</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.totalShots}</div>
                    <div className="text-xs text-muted-foreground">
                      Total Shots
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {stats.shootPct}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Shooting %
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-save-dot">
                      {stats.savePct}%
                    </div>
                    <div className="text-xs text-muted-foreground">Save %</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shot type breakdown */}
            <Card className="bg-card/70 border-border/30">
              <CardContent className="pt-5 pb-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Goals by Shot Type
                </h3>
                <div className="space-y-2">
                  {stats.shotTypeEntries.map(([type, count]) => {
                    const pct =
                      stats.totalGoals > 0
                        ? (count / stats.totalGoals) * 100
                        : 0;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-xs w-20 capitalize truncate">
                          {type.replace("-", " ")}
                        </span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-6 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Period breakdown */}
            <Card className="bg-card/70 border-border/30">
              <CardContent className="pt-5 pb-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Goals by Period
                </h3>
                <div className="flex gap-3">
                  {[1, 2, 3, 4].map((p) => {
                    const count = stats.byPeriod.get(p) ?? 0;
                    if (p === 4 && count === 0) return null;
                    return (
                      <div key={p} className="text-center flex-1">
                        <div className="text-lg font-bold">{count}</div>
                        <div className="text-xs text-muted-foreground">
                          {p <= 3 ? `${p}${p === 1 ? "st" : p === 2 ? "nd" : "rd"}` : "OT"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Season breakdown */}
            {stats.seasonEntries.length > 0 && (
              <Card className="bg-card/70 border-border/30">
                <CardContent className="pt-5 pb-4">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Goals by Season
                  </h3>
                  <div className="space-y-1.5">
                    {stats.seasonEntries.map(([sn, count]) => (
                      <div
                        key={sn}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {sn}-{String(sn + 1).slice(2)}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {Array.from({ length: count }).map((_, i) => (
                              <div
                                key={i}
                                className="w-2 h-2 rounded-full bg-goal-dot"
                              />
                            ))}
                          </div>
                          <span className="font-medium w-4 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
