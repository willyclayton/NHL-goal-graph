export interface GoalRecord {
  s: number;   // scorer_id
  g: number;   // goalie_id
  gm: number;  // game_id
  sn: number;  // season start year
  gt: number;  // game_type (2=regular, 3=playoffs)
  p: number;   // period
  t: string;   // timeInPeriod "MM:SS"
  st: string;  // shotType
  sc: string;  // situationCode
  d: string;   // gameDate "YYYY-MM-DD"
  ht: string;  // home team abbrev
  at: string;  // away team abbrev
  tm: string;  // scoring team abbrev
  x?: number;  // xCoord (may be missing)
  y?: number;  // yCoord (may be missing)
}

export interface H2HRecord {
  g: number;     // goalie_id
  sn: number;    // season
  p: number;     // period
  t: string;     // timeInPeriod
  st: string;    // shotType
  type: "goal" | "save";
  x?: number;
  y?: number;
}

export interface H2HIndexEntry {
  goals: number;
  shots: number;
}

export interface PlayerEnriched {
  id: number;
  name: string;
  pos: string;
  birthYear?: number;
  teams?: string[];
  totalGoals?: number;
  goalsAgainst?: number;
  firstSeason?: number;
  lastSeason?: number;
}

export interface H2HResponse {
  goals: H2HRecord[];
  saves: H2HRecord[];
}
