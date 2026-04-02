// Canvas
export const BG_COLOR = "#090e16";

// Zoom
export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 20;
export const LABEL_ZOOM_THRESHOLD = 2.5;

// Edges (radial gradient style)
export const EDGE_ALPHA = 0.015;
export const EDGE_COLOR = "#8abcd2";
export const EDGE_WIDTH = 0.3;
export const EDGE_GLOW_WIDTH = 3.5;
export const EDGE_SHARP_WIDTH = 0.5;
export const EDGE_ALPHA_MIN = 0.06;
export const EDGE_ALPHA_MAX = 0.25;
export const EDGE_GLOW_ALPHA_MIN = 0.008;
export const EDGE_GLOW_ALPHA_MAX = 0.026;
export const EDGE_COLOR_SCORER = "90,180,205";
export const EDGE_COLOR_GOALIE = "230,150,85";

// Radial layout
export const RADIAL_INNER_RATIO = 0.17; // goalie ring as fraction of half-height
export const RADIAL_OUTER_RATIO = 0.42; // scorer ring
export const RADIAL_GOALIE_JITTER = 0.005; // normalized jitter
export const RADIAL_SCORER_JITTER = 0.009;
export const RADIAL_CURVE_PULL = 0.3; // bezier pull toward center

// Highlighted path
export const PATH_COLOR = "#e8d8c0";
export const PATH_WIDTH = 2.5;
export const PATH_ALPHA = 0.9;

// Nodes — Polar Twilight (flipped): scorers=steel blue, goalies=warm amber
export const NODE_MIN_RADIUS = 0.8;
export const NODE_RADIUS_SCALE = 0.4;

// Colors
export const GOALIE_COLOR_START = "#e89858";
export const GOALIE_COLOR_END = "#a06030";
export const SCORER_COLOR_START = "#5cc0d8";
export const SCORER_COLOR_END = "#3a6878";

// Data year range
export const YEAR_MIN = 2010;
export const YEAR_MAX = 2026;

// World space (positions normalized [0,1] are scaled to this)
export const WORLD_WIDTH = 4000;
export const WORLD_HEIGHT = 3000;

// Mobile
export const MOBILE_EDGE_CULL_NODE_THRESHOLD = 3000;
