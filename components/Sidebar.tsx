"use client";

import { useState, useEffect, useRef, useMemo, useCallback, useTransition } from "react";
import Fuse from "fuse.js";
import type { GraphNode, GraphData } from "@/lib/types";
import { bfs } from "@/lib/pathfinding";
import { YEAR_MIN, YEAR_MAX } from "@/lib/constants";

type Tab = "explore" | "path" | "stats";
type ExploreView = "home" | "degree" | "hubs";

interface SidebarProps {
  data: GraphData;
  selectedA: GraphNode | null;
  selectedB: GraphNode | null;
  path: string[] | null;
  yearRange: [number, number];
  onSelectNode: (node: GraphNode) => void;
  onSetPath: (a: GraphNode, b: GraphNode, path: string[]) => void;
  onClearPath: () => void;
  onYearRangeChange: (range: [number, number]) => void;
}

export default function Sidebar({
  data,
  selectedA,
  selectedB,
  path,
  yearRange,
  onSelectNode,
  onSetPath,
  onClearPath,
  onYearRangeChange,
}: SidebarProps) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("explore");
  const [exploreView, setExploreView] = useState<ExploreView>("home");

  // Path tab state
  const [pathSearchA, setPathSearchA] = useState("");
  const [pathSearchB, setPathSearchB] = useState("");
  const [pathPickingSlot, setPathPickingSlot] = useState<"a" | "b" | null>(null);

  // Degree challenge state
  const [targetDegree, setTargetDegree] = useState(3);
  const [challengeResult, setChallengeResult] = useState<{ a: GraphNode; b: GraphNode; path: string[] } | null>(null);
  const [challengeCount, setChallengeCount] = useState(0);

  // Fuse search
  const fuse = useMemo(() => new Fuse(data.nodes, { keys: ["name"], threshold: 0.3 }), [data.nodes]);

  const searchResults = useCallback(
    (query: string) => {
      if (!query.trim()) return [];
      return fuse.search(query, { limit: 6 }).map((r) => r.item);
    },
    [fuse]
  );

  const pathResultsA = useMemo(() => searchResults(pathSearchA), [searchResults, pathSearchA]);
  const pathResultsB = useMemo(() => searchResults(pathSearchB), [searchResults, pathSearchB]);

  // Stats
  const stats = useMemo(() => {
    const scorers = data.nodes.filter((n) => n.type === "scorer");
    const goalies = data.nodes.filter((n) => n.type === "goalie");
    const byConnections = data.nodes
      .map((n) => ({ node: n, conn: data.adjacency.get(n.id)?.length ?? 0 }))
      .sort((a, b) => b.conn - a.conn)
      .slice(0, 7);
    const topScorers = [...scorers].sort((a, b) => b.count - a.count).slice(0, 5);
    let totalDeg = 0;
    for (const [, n] of data.adjacency) totalDeg += n.length;
    return {
      total: data.nodes.length,
      scorerCount: scorers.length,
      goalieCount: goalies.length,
      edgeCount: data.edges.length,
      avgDegree: data.nodes.length > 0 ? (totalDeg / data.nodes.length).toFixed(1) : "0",
      byConnections,
      topScorers,
    };
  }, [data]);

  // Hub players (filtered)
  const [hubFilter, setHubFilter] = useState<"all" | "goalie" | "scorer">("all");
  const hubPlayers = useMemo(() => {
    return data.nodes
      .filter((n) => hubFilter === "all" || n.type === hubFilter)
      .map((n) => ({ node: n, conn: data.adjacency.get(n.id)?.length ?? 0 }))
      .sort((a, b) => b.conn - a.conn)
      .slice(0, 15);
  }, [data, hubFilter]);

  // Recent paths
  const [recentPaths, setRecentPaths] = useState<{ a: string; b: string; deg: number }[]>([]);

  // When path is found externally, record it
  useEffect(() => {
    if (path && selectedA && selectedB) {
      setRecentPaths((prev) => {
        const entry = { a: selectedA.name, b: selectedB.name, deg: path.length - 1 };
        return [entry, ...prev.filter((p) => p.a !== entry.a || p.b !== entry.b)].slice(0, 5);
      });
    }
  }, [path, selectedA, selectedB]);

  // --- Actions ---

  const doFindPath = useCallback(() => {
    if (!selectedA || !selectedB) return;
    const result = bfs(selectedA.id, selectedB.id, data.adjacency);
    if (result) onSetPath(selectedA, selectedB, result);
  }, [selectedA, selectedB, data.adjacency, onSetPath]);

  const doRandomPath = useCallback(() => {
    const candidates = data.nodes.filter((n) => n.count > 10);
    if (candidates.length < 2) return;
    for (let i = 0; i < 30; i++) {
      const a = candidates[Math.floor(Math.random() * candidates.length)];
      const b = candidates[Math.floor(Math.random() * candidates.length)];
      if (a.id === b.id) continue;
      const result = bfs(a.id, b.id, data.adjacency);
      if (result && result.length >= 3) {
        onSetPath(a, b, result);
        setTab("path");
        return;
      }
    }
  }, [data, onSetPath]);

  const doDegreeChallenge = useCallback(() => {
    const candidates = data.nodes.filter((n) => n.count > 5);
    for (let i = 0; i < 50; i++) {
      const a = candidates[Math.floor(Math.random() * candidates.length)];
      const b = candidates[Math.floor(Math.random() * candidates.length)];
      if (a.id === b.id) continue;
      const result = bfs(a.id, b.id, data.adjacency);
      if (result && result.length - 1 === targetDegree) {
        onSetPath(a, b, result);
        setChallengeResult({ a, b, path: result });
        setChallengeCount((c) => c + 1);
        return;
      }
    }
  }, [data, targetDegree, onSetPath]);

  const selectPathPlayer = useCallback(
    (node: GraphNode, slot: "a" | "b") => {
      if (slot === "a") {
        onSelectNode(node);
        setPathSearchA("");
        setPathPickingSlot(null);
      } else {
        // Set B by calling onSetPath if A exists
        if (selectedA) {
          const result = bfs(selectedA.id, node.id, data.adjacency);
          if (result) onSetPath(selectedA, node, result);
        }
        setPathSearchB("");
        setPathPickingSlot(null);
      }
    },
    [selectedA, data.adjacency, onSelectNode, onSetPath]
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-30 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white transition-colors flex items-center gap-2"
      >
        <span>☰</span> Menu
      </button>
    );
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 z-40 w-[310px] bg-[#0b1620]/97 backdrop-blur-md border-l border-[#6aaab8]/10 flex flex-col overflow-hidden">
      {/* Close button */}
      <button
        onClick={() => setOpen(false)}
        className="absolute top-3 right-3 z-10 text-[#c8d8e0]/20 hover:text-[#c8d8e0]/60 transition-colors text-sm"
      >
        ✕
      </button>

      {/* Tabs */}
      <div className="flex border-b border-white/5 flex-shrink-0">
        {(["explore", "path", "stats"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "explore") setExploreView("home"); }}
            className={`flex-1 text-center py-2.5 text-[11px] capitalize border-b-2 transition-colors ${
              tab === t
                ? "text-[#6aaab8] border-[#6aaab8]"
                : "text-[#c8d8e0]/25 border-transparent hover:text-[#c8d8e0]/40"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ===== EXPLORE TAB ===== */}
        {tab === "explore" && exploreView === "home" && (
          <div className="p-3">
            <div className="text-[10px] text-[#c8d8e0]/25 uppercase tracking-wide mb-2">What do you want to do?</div>
            <div className="flex flex-col gap-0.5">
              <ScenarioCard icon="🔍" title="Find a Path" desc="Connect any two players" onClick={() => setTab("path")} />
              <ScenarioCard icon="🎲" title="Random Path" desc="Surprise me with a connection" onClick={doRandomPath} />
              <ScenarioCard icon="🎯" title="Degree Challenge" desc="Find a pair with exactly N° separation" onClick={() => setExploreView("degree")} />
              <ScenarioCard icon="⭐" title="Hub Players" desc="Most connected players in the graph" onClick={() => setExploreView("hubs")} />
              <ScenarioCard icon="📅" title="Time Machine" desc="Filter by era or decade" onClick={() => setTab("stats")} />
            </div>

            {recentPaths.length > 0 && (
              <>
                <div className="h-px bg-white/[0.03] my-3" />
                <div className="text-[10px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1.5">Recent Paths</div>
                {recentPaths.map((rp, i) => (
                  <div key={i} className="text-[11px] text-[#c8d8e0]/20 py-1">
                    <span className="text-[#6aaab8]">{rp.a}</span>
                    {" → "}
                    <span className="text-[#d9956a]">{rp.b}</span>
                    {" "}
                    <span className="text-[#e8d8c0] text-[10px]">({rp.deg}°)</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Degree Challenge */}
        {tab === "explore" && exploreView === "degree" && (
          <div className="p-3">
            <button onClick={() => setExploreView("home")} className="text-[11px] text-[#c8d8e0]/25 hover:text-[#c8d8e0]/50 mb-3 flex items-center gap-1">
              ← Explore
            </button>
            <div className="text-center mb-3">
              <div className="text-[11px] text-[#c8d8e0]/30 mb-2">Find a pair with exactly</div>
              <div className="flex justify-center gap-1.5 mb-1">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => setTargetDegree(d)}
                    className={`text-[12px] px-3 py-1.5 rounded-md transition-colors ${
                      targetDegree === d
                        ? "bg-[#6aaab8]/20 text-[#6aaab8] font-semibold"
                        : "bg-white/[0.03] text-[#c8d8e0]/25 hover:text-[#c8d8e0]/40"
                    }`}
                  >
                    {d}°
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-[#c8d8e0]/20">degrees of separation</div>
            </div>
            <button onClick={doDegreeChallenge} className="w-full py-2 rounded-lg bg-[#6aaab8]/15 border border-[#6aaab8]/20 text-[#6aaab8] text-[12px] hover:bg-[#6aaab8]/25 transition-colors">
              🎯 Find a {targetDegree}° Pair
            </button>

            {challengeResult && (
              <>
                <div className="h-px bg-white/[0.03] my-3" />
                <div className="text-[10px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1.5">Found!</div>
                <PathPreview path={challengeResult.path} nodeMap={data.nodeMap} />
                <button onClick={doDegreeChallenge} className="w-full mt-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[#c8d8e0]/40 text-[11px] hover:text-[#c8d8e0]/60 transition-colors">
                  🎯 Find Another
                </button>
              </>
            )}

            {challengeCount > 0 && (
              <>
                <div className="h-px bg-white/[0.03] my-3" />
                <div className="text-[10px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1.5">Session Stats</div>
                <div className="grid grid-cols-2 gap-2">
                  <StatBox value={challengeCount.toString()} label="Pairs found" />
                  <StatBox value={`${targetDegree}°`} label="Target" />
                </div>
              </>
            )}
          </div>
        )}

        {/* Hub Players */}
        {tab === "explore" && exploreView === "hubs" && (
          <div className="p-3">
            <button onClick={() => setExploreView("home")} className="text-[11px] text-[#c8d8e0]/25 hover:text-[#c8d8e0]/50 mb-3 flex items-center gap-1">
              ← Explore
            </button>
            <div className="flex gap-1 mb-3">
              {(["all", "goalie", "scorer"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setHubFilter(f)}
                  className={`text-[10px] px-2.5 py-1 rounded-md capitalize transition-colors ${
                    hubFilter === f ? "bg-[#6aaab8]/15 text-[#6aaab8]" : "bg-white/[0.03] text-[#c8d8e0]/25"
                  }`}
                >
                  {f === "all" ? "All" : f === "goalie" ? "Goalies" : "Scorers"}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1">Most Connections</div>
            {hubPlayers.map((item, i) => (
              <button
                key={item.node.id}
                onClick={() => onSelectNode(item.node)}
                className="flex items-center gap-1.5 py-1 w-full text-left hover:bg-white/[0.03] rounded px-1 transition-colors"
              >
                <span className="text-[10px] text-[#c8d8e0]/15 w-4 text-right">{i + 1}</span>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.node.type === "goalie" ? "#d9956a" : "#6aaab8" }} />
                <span className="text-[11px] text-[#c8d8e0] flex-1 truncate">{item.node.name}</span>
                <span className="text-[10px] text-[#e8d8c0] font-medium tabular-nums">{item.conn.toLocaleString()}</span>
              </button>
            ))}
            <div className="text-[9px] text-[#c8d8e0]/15 mt-2">Click any player to highlight on graph</div>
          </div>
        )}

        {/* ===== PATH TAB ===== */}
        {tab === "path" && (
          <div className="p-3">
            {/* Player A */}
            <div className="text-[10px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1.5">Player A</div>
            {selectedA && pathPickingSlot !== "a" ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#6aaab8]/5 border border-[#6aaab8]/15 mb-1">
                <span className="text-[10px] font-bold text-[#6aaab8] bg-[#6aaab8]/15 w-5 h-5 rounded flex items-center justify-center">A</span>
                <span className="text-[12px] text-[#c8d8e0] flex-1 truncate">{selectedA.name}</span>
                <button onClick={() => { onClearPath(); setPathPickingSlot("a"); }} className="text-[#c8d8e0]/20 hover:text-[#c8d8e0]/50 text-[10px]">✕</button>
              </div>
            ) : (
              <div className="relative mb-1">
                <input
                  type="text"
                  value={pathSearchA}
                  onChange={(e) => { setPathSearchA(e.target.value); setPathPickingSlot("a"); }}
                  onFocus={() => setPathPickingSlot("a")}
                  placeholder="Search player..."
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-[#c8d8e0] outline-none placeholder:text-[#c8d8e0]/20 focus:border-[#6aaab8]/30"
                />
                {pathPickingSlot === "a" && pathResultsA.length > 0 && (
                  <SearchDropdown results={pathResultsA} onSelect={(n) => selectPathPlayer(n, "a")} />
                )}
              </div>
            )}

            {/* Swap */}
            <div className="flex justify-center py-0.5">
              <button className="w-6 h-6 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#c8d8e0]/20 hover:text-[#6aaab8] hover:bg-[#6aaab8]/10 transition-colors text-[12px]">
                ↕
              </button>
            </div>

            {/* Player B */}
            <div className="text-[10px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1.5">Player B</div>
            {selectedB && pathPickingSlot !== "b" ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#d9956a]/5 border border-[#d9956a]/15 mb-2">
                <span className="text-[10px] font-bold text-[#d9956a] bg-[#d9956a]/15 w-5 h-5 rounded flex items-center justify-center">B</span>
                <span className="text-[12px] text-[#c8d8e0] flex-1 truncate">{selectedB.name}</span>
                <button onClick={() => setPathPickingSlot("b")} className="text-[#c8d8e0]/20 hover:text-[#c8d8e0]/50 text-[10px]">✕</button>
              </div>
            ) : (
              <div className="relative mb-2">
                <input
                  type="text"
                  value={pathSearchB}
                  onChange={(e) => { setPathSearchB(e.target.value); setPathPickingSlot("b"); }}
                  onFocus={() => setPathPickingSlot("b")}
                  placeholder="Search player..."
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-[#c8d8e0] outline-none placeholder:text-[#c8d8e0]/20 focus:border-[#d9956a]/30"
                />
                {pathPickingSlot === "b" && pathResultsB.length > 0 && (
                  <SearchDropdown results={pathResultsB} onSelect={(n) => selectPathPlayer(n, "b")} />
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-1.5 mb-3">
              <button onClick={doRandomPath} className="flex-1 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[#c8d8e0]/35 text-[11px] hover:text-[#c8d8e0]/55 transition-colors">
                🎲 Random
              </button>
            </div>

            {/* Result */}
            {path && path.length > 0 && (
              <>
                <div className="h-px bg-white/[0.03] mb-3" />
                <div className="text-[10px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1.5">Result</div>
                <PathPreview path={path} nodeMap={data.nodeMap} />

                <div className="h-px bg-white/[0.03] my-3" />
                <div className="text-[10px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1.5">Path Players</div>
                {path.map((id) => {
                  const node = data.nodeMap.get(id);
                  if (!node) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => onSelectNode(node)}
                      className="flex items-center gap-1.5 py-1 w-full text-left hover:bg-white/[0.03] rounded px-1 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: node.type === "goalie" ? "#d9956a" : "#6aaab8" }} />
                      <span className="text-[11px] text-[#c8d8e0] flex-1">{node.name}</span>
                      <span className="text-[10px] text-[#e8d8c0]/50">{node.type === "goalie" ? "G" : "S"} · {node.count}</span>
                    </button>
                  );
                })}

                <button onClick={onClearPath} className="w-full mt-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[#c8d8e0]/30 text-[11px] hover:text-[#c8d8e0]/50 transition-colors">
                  Clear Path
                </button>
              </>
            )}
          </div>
        )}

        {/* ===== STATS TAB ===== */}
        {tab === "stats" && (
          <div className="p-3">
            {/* Era filter */}
            <div className="text-[10px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1.5">Era Filter</div>
            <div className="flex gap-1 flex-wrap mb-2">
              {[
                { label: "All Time", range: [YEAR_MIN, YEAR_MAX] as [number, number] },
                { label: "2010–14", range: [2010, 2014] as [number, number] },
                { label: "2015–20", range: [2015, 2020] as [number, number] },
                { label: "2020–26", range: [2020, 2026] as [number, number] },
              ].map((era) => (
                <button
                  key={era.label}
                  onClick={() => onYearRangeChange(era.range)}
                  className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${
                    yearRange[0] === era.range[0] && yearRange[1] === era.range[1]
                      ? "bg-[#6aaab8]/15 text-[#6aaab8]"
                      : "bg-white/[0.03] text-[#c8d8e0]/25 hover:text-[#c8d8e0]/40"
                  }`}
                >
                  {era.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 items-center mb-3">
              <input
                type="text"
                value={yearRange[0]}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || YEAR_MIN;
                  onYearRangeChange([v, yearRange[1]]);
                }}
                className="w-16 bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-1.5 text-[11px] text-[#c8d8e0] text-center outline-none"
              />
              <span className="text-[#c8d8e0]/15 text-[10px]">–</span>
              <input
                type="text"
                value={yearRange[1]}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || YEAR_MAX;
                  onYearRangeChange([yearRange[0], v]);
                }}
                className="w-16 bg-white/[0.03] border border-white/[0.06] rounded-md px-2 py-1.5 text-[11px] text-[#c8d8e0] text-center outline-none"
              />
            </div>

            <div className="h-px bg-white/[0.03] mb-3" />

            {/* Network overview */}
            <div className="text-[10px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1.5">Network Overview</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <StatBox value={stats.total.toLocaleString()} label="Players" />
              <StatBox value={stats.edgeCount.toLocaleString()} label="Connections" />
            </div>
            <div className="space-y-0.5 mb-3">
              <StatsRow label="Scorers" value={stats.scorerCount.toLocaleString()} cls="text-[#6aaab8]" />
              <StatsRow label="Goalies" value={stats.goalieCount.toLocaleString()} cls="text-[#d9956a]" />
              <StatsRow label="Avg. degree" value={stats.avgDegree} cls="text-[#e8d8c0]" />
            </div>

            <div className="h-px bg-white/[0.03] mb-3" />

            {/* Top connected */}
            <div className="text-[10px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1">Most Connected</div>
            {stats.byConnections.slice(0, 5).map((item, i) => (
              <button
                key={item.node.id}
                onClick={() => onSelectNode(item.node)}
                className="flex items-center gap-1.5 py-1 w-full text-left hover:bg-white/[0.03] rounded px-1 transition-colors"
              >
                <span className="text-[10px] text-[#c8d8e0]/15 w-3 text-right">{i + 1}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.node.type === "goalie" ? "#d9956a" : "#6aaab8" }} />
                <span className="text-[11px] text-[#c8d8e0] flex-1 truncate">{item.node.name}</span>
                <span className="text-[10px] text-[#e8d8c0] font-medium tabular-nums">{item.conn.toLocaleString()}</span>
              </button>
            ))}

            <div className="h-px bg-white/[0.03] my-3" />

            <div className="text-[10px] text-[#c8d8e0]/25 uppercase tracking-wide mb-1">Most Goals</div>
            {stats.topScorers.map((node, i) => (
              <button
                key={node.id}
                onClick={() => onSelectNode(node)}
                className="flex items-center gap-1.5 py-1 w-full text-left hover:bg-white/[0.03] rounded px-1 transition-colors"
              >
                <span className="text-[10px] text-[#c8d8e0]/15 w-3 text-right">{i + 1}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#6aaab8]" />
                <span className="text-[11px] text-[#c8d8e0] flex-1 truncate">{node.name}</span>
                <span className="text-[10px] text-[#e8d8c0] font-medium tabular-nums">{node.count.toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function ScenarioCard({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-[#6aaab8]/5 transition-colors w-full text-left">
      <span className="w-8 h-8 rounded-lg bg-[#6aaab8]/8 flex items-center justify-center text-[15px] flex-shrink-0">{icon}</span>
      <div>
        <div className="text-[12px] text-[#c8d8e0] font-medium">{title}</div>
        <div className="text-[10px] text-[#c8d8e0]/30">{desc}</div>
      </div>
    </button>
  );
}

function PathPreview({ path, nodeMap }: { path: string[]; nodeMap: Map<string, GraphNode> }) {
  const deg = path.length - 1;
  return (
    <div className="px-3 py-2.5 rounded-lg bg-[#e8d8c0]/[0.03] border border-[#e8d8c0]/[0.08]">
      <div className="text-[12px] text-center leading-relaxed">
        {path.map((id, i) => {
          const node = nodeMap.get(id);
          if (!node) return null;
          return (
            <span key={id}>
              <span className={node.type === "goalie" ? "text-[#d9956a]" : "text-[#6aaab8]"}>{node.name}</span>
              {i < path.length - 1 && <span className="text-[#e8d8c0]/40 mx-1">→</span>}
            </span>
          );
        })}
      </div>
      <div className="text-[10px] text-[#c8d8e0]/30 text-center mt-1">{deg} degree{deg !== 1 ? "s" : ""} of separation</div>
    </div>
  );
}

function SearchDropdown({ results, onSelect }: { results: GraphNode[]; onSelect: (n: GraphNode) => void }) {
  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0e1a28] border border-[#6aaab8]/12 rounded-lg shadow-xl overflow-hidden z-50">
      {results.map((node) => (
        <button
          key={node.id}
          onClick={() => onSelect(node)}
          className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full" style={{ background: node.type === "goalie" ? "#d9956a" : "#6aaab8" }} />
          <span className="text-[12px] text-[#c8d8e0] truncate">{node.name}</span>
          <span className="text-[10px] text-[#c8d8e0]/25 ml-auto">{node.count}</span>
        </button>
      ))}
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center py-2 rounded-lg bg-white/[0.02]">
      <div className="text-lg font-bold text-[#e8d8c0]">{value}</div>
      <div className="text-[9px] text-[#c8d8e0]/25 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function StatsRow({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[11px] text-[#c8d8e0]/35">{label}</span>
      <span className={`text-[11px] font-medium tabular-nums ${cls}`}>{value}</span>
    </div>
  );
}
