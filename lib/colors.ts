import { interpolateRgb } from "d3-interpolate";
import {
  GOALIE_COLOR_START,
  GOALIE_COLOR_END,
  SCORER_COLOR_START,
  SCORER_COLOR_END,
  YEAR_MIN,
  YEAR_MAX,
} from "./constants";

const goalieScale = interpolateRgb(GOALIE_COLOR_START, GOALIE_COLOR_END);
const scorerScale = interpolateRgb(SCORER_COLOR_START, SCORER_COLOR_END);

export function nodeColor(type: "scorer" | "goalie", midYear: number): string {
  const t = Math.max(0, Math.min(1, (midYear - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)));
  return type === "goalie" ? goalieScale(t) : scorerScale(t);
}
