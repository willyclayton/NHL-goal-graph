import type { GoalRecord } from "./dashboard-types";

export interface CareerSeasonData {
  careerYear: number;   // 0, 1, 2, ...
  season: number;       // actual season start year
  goals: number;
}

export interface PlayerCareerArc {
  playerId: number;
  playerName: string;
  data: CareerSeasonData[];
}

/**
 * Build career arc data for a set of players from the goals dataset.
 * X-axis is normalized to "career year" (Year 0 = first season with a goal).
 */
export function buildCareerArcs(
  goals: GoalRecord[],
  playerIds: number[],
  playerNames: Map<number, string>
): PlayerCareerArc[] {
  // Count goals per (scorer, season)
  const goalsByScorerSeason = new Map<string, number>();
  const scorerSeasons = new Map<number, Set<number>>();

  for (const g of goals) {
    if (!playerIds.includes(g.s)) continue;
    const key = `${g.s}_${g.sn}`;
    goalsByScorerSeason.set(key, (goalsByScorerSeason.get(key) ?? 0) + 1);

    if (!scorerSeasons.has(g.s)) scorerSeasons.set(g.s, new Set());
    scorerSeasons.get(g.s)!.add(g.sn);
  }

  return playerIds.map((pid) => {
    const seasons = scorerSeasons.get(pid);
    if (!seasons || seasons.size === 0) {
      return {
        playerId: pid,
        playerName: playerNames.get(pid) ?? `Player ${pid}`,
        data: [],
      };
    }

    const sortedSeasons = Array.from(seasons).sort((a, b) => a - b);
    const firstSeason = sortedSeasons[0];

    // Build data for every season from first to last (including gaps with 0 goals)
    const lastSeason = sortedSeasons[sortedSeasons.length - 1];
    const data: CareerSeasonData[] = [];

    for (let sn = firstSeason; sn <= lastSeason; sn++) {
      const key = `${pid}_${sn}`;
      data.push({
        careerYear: sn - firstSeason,
        season: sn,
        goals: goalsByScorerSeason.get(key) ?? 0,
      });
    }

    return {
      playerId: pid,
      playerName: playerNames.get(pid) ?? `Player ${pid}`,
      data,
    };
  });
}

// Colors for multi-player comparison
export const PLAYER_COLORS = [
  "#5cc0d8", // teal
  "#e89858", // amber
  "#7dd87d", // green
  "#d87dd8", // purple
  "#d8d05c", // yellow
  "#d85c5c", // red
  "#5c8ad8", // blue
  "#d8a05c", // orange
  "#8a5cd8", // violet
  "#5cd8a0", // mint
];
