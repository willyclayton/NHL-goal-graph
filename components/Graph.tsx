"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { zoom as d3Zoom, zoomIdentity, ZoomTransform } from "d3-zoom";
import { select } from "d3-selection";
import { quadtree, Quadtree } from "d3-quadtree";
import type { GraphNode, GraphEdge, GraphData } from "@/lib/types";
import { nodeColor } from "@/lib/colors";
import { bfs } from "@/lib/pathfinding";
import {
  BG_COLOR,
  ZOOM_MIN,
  ZOOM_MAX,
  LABEL_ZOOM_THRESHOLD,
  EDGE_ALPHA,
  EDGE_COLOR,
  EDGE_WIDTH,
  PATH_COLOR,
  PATH_WIDTH,
  PATH_ALPHA,
  NODE_MIN_RADIUS,
  NODE_RADIUS_SCALE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MOBILE_EDGE_CULL_NODE_THRESHOLD,
} from "@/lib/constants";
import PlayerTooltip from "./PlayerTooltip";
import PathDisplay from "./PathDisplay";
import SearchBar from "./SearchBar";
import Timeline from "./Timeline";
import Legend from "./Legend";

interface GraphProps {
  data: GraphData;
}

function nodeRadius(count: number): number {
  return Math.max(NODE_MIN_RADIUS, Math.sqrt(count) * NODE_RADIUS_SCALE);
}

export default function Graph({ data }: GraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const dirtyRef = useRef(true);
  const rafRef = useRef<number>(0);
  const isMobileRef = useRef(false);

  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedA, setSelectedA] = useState<GraphNode | null>(null);
  const [selectedB, setSelectedB] = useState<GraphNode | null>(null);
  const [path, setPath] = useState<string[] | null>(null);
  const [yearRange, setYearRange] = useState<[number, number]>([2010, 2026]);

  // Build quadtree for hit testing
  const qtRef = useRef<Quadtree<GraphNode> | null>(null);

  // Pre-compute node colors
  const nodeColorsRef = useRef<Map<string, string>>(new Map());

  // Visible nodes/edges based on timeline
  const visibleRef = useRef<{
    nodes: GraphNode[];
    edges: GraphEdge[];
    visibleSet: Set<string>;
  }>({ nodes: data.nodes, edges: data.edges, visibleSet: new Set(data.nodes.map((n) => n.id)) });

  // Build edge lookup for highlighting
  const edgesByNodeRef = useRef<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    isMobileRef.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  // Pre-compute colors and edge lookup
  useEffect(() => {
    const colors = new Map<string, string>();
    for (const node of data.nodes) {
      colors.set(node.id, nodeColor(node.type, node.midYear));
    }
    nodeColorsRef.current = colors;

    const edgeMap = new Map<string, Set<string>>();
    for (const node of data.nodes) {
      edgeMap.set(node.id, new Set());
    }
    for (const edge of data.edges) {
      edgeMap.get(edge.source)?.add(edge.target);
      edgeMap.get(edge.target)?.add(edge.source);
    }
    edgesByNodeRef.current = edgeMap;
  }, [data]);

  // Update visible nodes/edges when yearRange changes
  useEffect(() => {
    const visibleSet = new Set<string>();
    const nodes = data.nodes.filter((n) => {
      const visible = n.lastYear >= yearRange[0] && n.firstYear <= yearRange[1];
      if (visible) visibleSet.add(n.id);
      return visible;
    });
    const edges = data.edges.filter(
      (e) => visibleSet.has(e.source) && visibleSet.has(e.target)
    );
    visibleRef.current = { nodes, edges, visibleSet };

    // Rebuild quadtree
    qtRef.current = quadtree<GraphNode>()
      .x((d) => d.x * WORLD_WIDTH)
      .y((d) => d.y * WORLD_HEIGHT)
      .addAll(nodes);

    dirtyRef.current = true;
  }, [data, yearRange]);

  // Run pathfinding when both players selected
  useEffect(() => {
    if (selectedA && selectedB) {
      const result = bfs(selectedA.id, selectedB.id, data.adjacency);
      setPath(result);
    } else {
      setPath(null);
    }
  }, [selectedA, selectedB, data.adjacency]);

  // Path node set for rendering
  const pathSetRef = useRef<Set<string>>(new Set());
  const pathEdgeSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const nodeSet = new Set<string>();
    const edgeSet = new Set<string>();
    if (path) {
      for (const id of path) nodeSet.add(id);
      for (let i = 0; i < path.length - 1; i++) {
        edgeSet.add(`${path[i]}-${path[i + 1]}`);
        edgeSet.add(`${path[i + 1]}-${path[i]}`);
      }
    }
    pathSetRef.current = nodeSet;
    pathEdgeSetRef.current = edgeSet;
    dirtyRef.current = true;
  }, [path]);

  // Mark dirty on selection/hover changes
  useEffect(() => {
    dirtyRef.current = true;
  }, [hoveredNode, selectedA, selectedB]);

  // Canvas setup + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    let width = 0;
    let height = 0;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      dirtyRef.current = true;
    }

    resize();
    window.addEventListener("resize", resize);

    // d3 zoom
    const zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([ZOOM_MIN, ZOOM_MAX])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        dirtyRef.current = true;
      });

    select(canvas).call(zoomBehavior);

    // Center the graph initially
    const initialK = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT) * 0.9;
    const initialX = (width - WORLD_WIDTH * initialK) / 2;
    const initialY = (height - WORLD_HEIGHT * initialK) / 2;
    const initialTransform = zoomIdentity.translate(initialX, initialY).scale(initialK);
    select(canvas).call(zoomBehavior.transform, initialTransform);

    function render() {
      if (!dirtyRef.current) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      dirtyRef.current = false;

      const t = transformRef.current;
      const k = t.k;
      const { nodes, edges, visibleSet } = visibleRef.current;
      const isMobile = isMobileRef.current;
      const pathNodes = pathSetRef.current;
      const pathEdges = pathEdgeSetRef.current;
      const hasPath = pathNodes.size > 0;
      const hovered = hoveredNode;
      const selA = selectedA;
      const selB = selectedB;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Clear
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, width, height);

      // Apply zoom transform
      ctx.translate(t.x, t.y);
      ctx.scale(k, k);

      // Viewport bounds in world coords (for frustum culling)
      const vx0 = -t.x / k;
      const vy0 = -t.y / k;
      const vx1 = (width - t.x) / k;
      const vy1 = (height - t.y) / k;

      // --- Draw edges ---
      const skipEdges = isMobile && nodes.length > MOBILE_EDGE_CULL_NODE_THRESHOLD && k < 1;

      if (!skipEdges) {
        ctx.globalAlpha = EDGE_ALPHA;
        ctx.strokeStyle = EDGE_COLOR;
        ctx.lineWidth = EDGE_WIDTH / k;
        ctx.beginPath();

        for (const edge of edges) {
          const sn = data.nodeMap.get(edge.source);
          const tn = data.nodeMap.get(edge.target);
          if (!sn || !tn) continue;

          const sx = sn.x * WORLD_WIDTH;
          const sy = sn.y * WORLD_HEIGHT;
          const tx = tn.x * WORLD_WIDTH;
          const ty = tn.y * WORLD_HEIGHT;

          // Frustum cull: skip if both endpoints outside viewport
          if (
            (sx < vx0 && tx < vx0) ||
            (sx > vx1 && tx > vx1) ||
            (sy < vy0 && ty < vy0) ||
            (sy > vy1 && ty > vy1)
          ) continue;

          // Dim non-path edges when path is active
          ctx.moveTo(sx, sy);
          ctx.lineTo(tx, ty);
        }
        ctx.stroke();
      }

      // --- Draw highlighted path edges ---
      if (hasPath && path) {
        ctx.globalAlpha = PATH_ALPHA;
        ctx.strokeStyle = PATH_COLOR;
        ctx.lineWidth = PATH_WIDTH / k;
        ctx.beginPath();
        for (let i = 0; i < path.length - 1; i++) {
          const sn = data.nodeMap.get(path[i]);
          const tn = data.nodeMap.get(path[i + 1]);
          if (!sn || !tn) continue;
          ctx.moveTo(sn.x * WORLD_WIDTH, sn.y * WORLD_HEIGHT);
          ctx.lineTo(tn.x * WORLD_WIDTH, tn.y * WORLD_HEIGHT);
        }
        ctx.stroke();
      }

      // --- Draw hovered node connections ---
      if (hovered && !hasPath) {
        const connections = edgesByNodeRef.current.get(hovered.id);
        if (connections) {
          ctx.globalAlpha = 0.3;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 0.8 / k;
          ctx.beginPath();
          const hx = hovered.x * WORLD_WIDTH;
          const hy = hovered.y * WORLD_HEIGHT;
          for (const nid of connections) {
            if (!visibleRef.current.visibleSet.has(nid)) continue;
            const n = data.nodeMap.get(nid);
            if (!n) continue;
            ctx.moveTo(hx, hy);
            ctx.lineTo(n.x * WORLD_WIDTH, n.y * WORLD_HEIGHT);
          }
          ctx.stroke();
        }
      }

      // --- Draw nodes ---
      ctx.globalAlpha = 1;
      for (const node of nodes) {
        const nx = node.x * WORLD_WIDTH;
        const ny = node.y * WORLD_HEIGHT;

        // Frustum cull
        if (nx < vx0 - 10 || nx > vx1 + 10 || ny < vy0 - 10 || ny > vy1 + 10) continue;

        const r = nodeRadius(node.count);
        const isOnPath = pathNodes.has(node.id);
        const isSelected = node.id === selA?.id || node.id === selB?.id;
        const isHovered = node.id === hovered?.id;

        // Dim nodes when path is active (but not path nodes)
        if (hasPath && !isOnPath) {
          ctx.globalAlpha = 0.15;
        } else {
          ctx.globalAlpha = 1;
        }

        ctx.fillStyle = nodeColorsRef.current.get(node.id) || "#ffffff";
        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fill();

        // Highlight ring for selected/hovered/path nodes
        if (isOnPath || isSelected || isHovered) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = isOnPath ? PATH_COLOR : isSelected ? "#ffffff" : "#ffffffcc";
          ctx.lineWidth = (isOnPath ? 2 : 1.5) / k;
          ctx.beginPath();
          ctx.arc(nx, ny, r + 2 / k, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // --- Draw labels at high zoom ---
      if (k > LABEL_ZOOM_THRESHOLD) {
        ctx.globalAlpha = 0.9;
        const fontSize = Math.max(8, 12 / k);
        ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";

        // Only label nodes above a count threshold that scales with zoom
        const countThreshold = Math.max(1, Math.floor(30 / k));

        for (const node of nodes) {
          if (node.count < countThreshold) continue;
          const nx = node.x * WORLD_WIDTH;
          const ny = node.y * WORLD_HEIGHT;
          if (nx < vx0 || nx > vx1 || ny < vy0 || ny > vy1) continue;

          const r = nodeRadius(node.count);
          ctx.fillText(node.name, nx + r + 3 / k, ny);
        }
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Mouse/touch interaction
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isMobileRef.current) return; // mobile uses tap only

      const t = transformRef.current;
      const wx = (e.clientX - t.x) / t.k;
      const wy = (e.clientY - t.y) / t.k;

      const qt = qtRef.current;
      if (!qt) return;

      const hitRadius = 15 / t.k;
      const found = qt.find(wx, wy, hitRadius);

      setHoveredNode(found || null);
      setMousePos({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const handlePointerLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const t = transformRef.current;
      const wx = (e.clientX - t.x) / t.k;
      const wy = (e.clientY - t.y) / t.k;

      const qt = qtRef.current;
      if (!qt) return;

      const hitRadius = 15 / t.k;
      const found = qt.find(wx, wy, hitRadius);

      if (!found) {
        // Click empty space — clear selections
        setSelectedA(null);
        setSelectedB(null);
        setPath(null);
        return;
      }

      if (!selectedA) {
        setSelectedA(found);
      } else if (!selectedB && found.id !== selectedA.id) {
        setSelectedB(found);
      } else {
        // Third click or same node — start fresh
        setSelectedA(found);
        setSelectedB(null);
        setPath(null);
      }
    },
    [selectedA, selectedB]
  );

  // Select node from search or path display
  const handleSelectNode = useCallback(
    (node: GraphNode) => {
      if (!selectedA) {
        setSelectedA(node);
      } else if (!selectedB && node.id !== selectedA.id) {
        setSelectedB(node);
      } else {
        setSelectedA(node);
        setSelectedB(null);
        setPath(null);
      }

      // Zoom to node
      const canvas = canvasRef.current;
      if (!canvas) return;
      const zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>().scaleExtent([ZOOM_MIN, ZOOM_MAX]);
      const targetK = 3;
      const nx = node.x * WORLD_WIDTH;
      const ny = node.y * WORLD_HEIGHT;
      const tx = window.innerWidth / 2 - nx * targetK;
      const ty = window.innerHeight / 2 - ny * targetK;
      const targetTransform = zoomIdentity.translate(tx, ty).scale(targetK);

      select(canvas)
        .transition()
        .duration(750)
        .call(zoomBehavior.transform, targetTransform);
    },
    [selectedA, selectedB]
  );

  const handleClearPath = useCallback(() => {
    setSelectedA(null);
    setSelectedB(null);
    setPath(null);
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 cursor-grab active:cursor-grabbing"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      />

      <SearchBar nodes={data.nodes} onSelect={handleSelectNode} />

      {hoveredNode && (
        <PlayerTooltip node={hoveredNode} x={mousePos.x} y={mousePos.y} />
      )}

      {path && path.length > 0 && (
        <PathDisplay
          path={path}
          nodeMap={data.nodeMap}
          onClickNode={handleSelectNode}
          onClose={handleClearPath}
        />
      )}

      <Timeline yearRange={yearRange} onChange={setYearRange} />
      <Legend />

      {selectedA && !selectedB && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm pointer-events-none">
          Select a second player to find path
        </div>
      )}
    </>
  );
}
