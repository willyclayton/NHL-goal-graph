export interface GraphNode {
  id: string; // "s_8471214" or "g_8470594"
  name: string;
  type: "scorer" | "goalie";
  count: number; // total goals scored / allowed
  firstYear: number;
  lastYear: number;
  midYear: number;
  x: number;
  y: number;
}

export interface GraphEdge {
  source: string; // node id
  target: string; // node id
}

export interface Positions {
  [nodeId: string]: { x: number; y: number };
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  adjacency: Map<string, string[]>;
  nodeMap: Map<string, GraphNode>;
}
