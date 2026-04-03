import type { GraphNode } from "./types";
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  RADIAL_INNER_RATIO,
  RADIAL_OUTER_RATIO,
  RADIAL_GOALIE_JITTER,
  RADIAL_SCORER_JITTER,
} from "./constants";

export type LayoutType = "rings" | "bullseye" | "waves";

export const LAYOUT_OPTIONS: { value: LayoutType; label: string }[] = [
  { value: "rings", label: "Rings" },
  { value: "bullseye", label: "Bullseye" },
  { value: "waves", label: "Waves" },
];

const PHI = 0.618033988749895;

function interleave<T>(arr: T[]): T[] {
  const out = new Array<T>(arr.length);
  for (let i = 0; i < arr.length; i++) {
    const slot = Math.round((i * arr.length * PHI) % arr.length);
    let s = slot;
    while (out[s] !== undefined) s = (s + 1) % arr.length;
    out[s] = arr[i];
  }
  return out;
}

function splitAndSort(nodes: GraphNode[]) {
  const goalies = nodes.filter((n) => n.type === "goalie");
  const scorers = nodes.filter((n) => n.type === "scorer");
  goalies.sort((a, b) => b.count - a.count);
  scorers.sort((a, b) => b.count - a.count);
  return { goalies: interleave(goalies), scorers: interleave(scorers), rawGoalies: goalies };
}

/**
 * Concentric Rings: goalies inner ring, scorers outer ring.
 */
function layoutRings(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const { goalies, scorers } = splitAndSort(nodes);
  const pos = new Map<string, { x: number; y: number }>();
  const cx = WORLD_WIDTH / 2, cy = WORLD_HEIGHT / 2;
  const half = Math.min(WORLD_WIDTH, WORLD_HEIGHT) / 2;
  const innerR = half * RADIAL_INNER_RATIO, outerR = half * RADIAL_OUTER_RATIO;

  for (let i = 0; i < goalies.length; i++) {
    const angle = (i / goalies.length) * Math.PI * 2 - Math.PI / 2;
    const jr = (Math.random() - 0.5) * 2 * RADIAL_GOALIE_JITTER * half;
    const ja = (Math.random() - 0.5) * 0.02;
    pos.set(goalies[i].id, {
      x: cx + Math.cos(angle + ja) * (innerR + jr),
      y: cy + Math.sin(angle + ja) * (innerR + jr),
    });
  }
  for (let i = 0; i < scorers.length; i++) {
    const angle = (i / scorers.length) * Math.PI * 2 - Math.PI / 2;
    const jr = (Math.random() - 0.5) * 2 * RADIAL_SCORER_JITTER * half;
    const ja = (Math.random() - 0.5) * 0.01;
    pos.set(scorers[i].id, {
      x: cx + Math.cos(angle + ja) * (outerR + jr),
      y: cy + Math.sin(angle + ja) * (outerR + jr),
    });
  }
  return pos;
}

/**
 * Bullseye: 3 concentric rings — hub goalies center, other goalies middle, scorers outer.
 */
function layoutBullseye(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const { goalies, scorers, rawGoalies } = splitAndSort(nodes);
  const pos = new Map<string, { x: number; y: number }>();
  const cx = WORLD_WIDTH / 2, cy = WORLD_HEIGHT / 2;
  const half = Math.min(WORLD_WIDTH, WORLD_HEIGHT) / 2;

  // Top 20% of goalies by count go to center ring
  const hubCount = Math.max(10, Math.floor(rawGoalies.length * 0.2));
  const hubIds = new Set(rawGoalies.slice(0, hubCount).map((n) => n.id));

  const hubGoalies = goalies.filter((n) => hubIds.has(n.id));
  const restGoalies = goalies.filter((n) => !hubIds.has(n.id));
  const spreadHub = interleave(hubGoalies);
  const spreadRest = interleave(restGoalies);

  const r1 = half * 0.1, r2 = half * 0.25, r3 = half * 0.45;

  for (let i = 0; i < spreadHub.length; i++) {
    const angle = (i / spreadHub.length) * Math.PI * 2 - Math.PI / 2;
    const jr = (Math.random() - 0.5) * half * 0.01;
    pos.set(spreadHub[i].id, {
      x: cx + Math.cos(angle) * (r1 + jr),
      y: cy + Math.sin(angle) * (r1 + jr),
    });
  }
  for (let i = 0; i < spreadRest.length; i++) {
    const angle = (i / spreadRest.length) * Math.PI * 2 - Math.PI / 2;
    const jr = (Math.random() - 0.5) * half * 0.015;
    pos.set(spreadRest[i].id, {
      x: cx + Math.cos(angle) * (r2 + jr),
      y: cy + Math.sin(angle) * (r2 + jr),
    });
  }
  for (let i = 0; i < scorers.length; i++) {
    const angle = (i / scorers.length) * Math.PI * 2 - Math.PI / 2;
    const jr = (Math.random() - 0.5) * half * 0.02;
    pos.set(scorers[i].id, {
      x: cx + Math.cos(angle) * (r3 + jr),
      y: cy + Math.sin(angle) * (r3 + jr),
    });
  }
  return pos;
}

/**
 * Parallel Waves: two sine waves flowing left to right.
 */
function layoutWaves(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const { goalies, scorers } = splitAndSort(nodes);
  const pos = new Map<string, { x: number; y: number }>();
  const margin = WORLD_WIDTH * 0.05;
  const usableW = WORLD_WIDTH - 2 * margin;
  const amp = WORLD_HEIGHT * 0.18;

  for (let i = 0; i < goalies.length; i++) {
    const t = i / goalies.length;
    pos.set(goalies[i].id, {
      x: margin + t * usableW,
      y: WORLD_HEIGHT * 0.35 + Math.sin(t * Math.PI * 3) * amp + (Math.random() - 0.5) * 30,
    });
  }
  for (let i = 0; i < scorers.length; i++) {
    const t = i / scorers.length;
    pos.set(scorers[i].id, {
      x: margin + t * usableW,
      y: WORLD_HEIGHT * 0.65 + Math.sin(t * Math.PI * 3 + 0.5) * amp + (Math.random() - 0.5) * 30,
    });
  }
  return pos;
}

export function computeLayout(
  layout: LayoutType,
  nodes: GraphNode[]
): Map<string, { x: number; y: number }> {
  switch (layout) {
    case "rings": return layoutRings(nodes);
    case "bullseye": return layoutBullseye(nodes);
    case "waves": return layoutWaves(nodes);
  }
}
