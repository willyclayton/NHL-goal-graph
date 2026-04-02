// Canvas
export const BG_COLOR = "#090e16";

// Zoom
export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 20;
export const LABEL_ZOOM_THRESHOLD = 2.5;

// Edges
export const EDGE_ALPHA = 0.04;
export const EDGE_COLOR = "#8abcd2";
export const EDGE_WIDTH = 1;
export const EDGE_CANVAS_SCALE = 0.25; // render edges at 1/4 res (1000x750)
export const EDGE_FADE_START = 2.0;    // start fading edges at this zoom
export const EDGE_FADE_END = 3.5;      // edges fully hidden at this zoom

// Radial layout
export const RADIAL_INNER_RATIO = 0.25; // goalie ring as fraction of half-height
export const RADIAL_OUTER_RATIO = 0.45; // scorer ring
export const RADIAL_GOALIE_JITTER = 0.008; // normalized jitter
export const RADIAL_SCORER_JITTER = 0.012;
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
