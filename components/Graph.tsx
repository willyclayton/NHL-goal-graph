"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { zoom as d3Zoom, zoomIdentity, ZoomTransform } from "d3-zoom";
import { select } from "d3-selection";
import { quadtree, Quadtree } from "d3-quadtree";
import type { GraphNode, GraphData } from "@/lib/types";
import { nodeColor } from "@/lib/colors";
import { bfs } from "@/lib/pathfinding";
import {
  BG_COLOR,
  ZOOM_MIN,
  ZOOM_MAX,
  PATH_COLOR,
  PATH_WIDTH,
  PATH_ALPHA,
  NODE_MIN_RADIUS,
  NODE_RADIUS_SCALE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  EDGE_ALPHA,
  EDGE_COLOR,
  EDGE_WIDTH,
  EDGE_CANVAS_SCALE,
  EDGE_FADE_START,
  EDGE_FADE_END,
  RADIAL_INNER_RATIO,
  RADIAL_OUTER_RATIO,
  RADIAL_GOALIE_JITTER,
  RADIAL_SCORER_JITTER,
  RADIAL_CURVE_PULL,
} from "@/lib/constants";
import Sidebar from "./Sidebar";

interface GraphProps {
  data: GraphData;
}

function nodeRadius(count: number): number {
  return Math.max(NODE_MIN_RADIUS, Math.sqrt(count) * NODE_RADIUS_SCALE);
}

const LANDMARK_COUNT = 20;
const MAX_LABELS_ZOOMED = 40;

export default function Graph({ data }: GraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const dirtyRef = useRef(true);
  const rafRef = useRef<number>(0);

  const [selectedA, setSelectedA] = useState<GraphNode | null>(null);
  const [selectedB, setSelectedB] = useState<GraphNode | null>(null);
  const [path, setPath] = useState<string[] | null>(null);
  const [yearRange, setYearRange] = useState<[number, number]>([2010, 2026]);

  // Refs for render loop (avoids stale closures)
  const selectedARef = useRef<GraphNode | null>(null);
  const selectedBRef = useRef<GraphNode | null>(null);
  const pathRef = useRef<string[] | null>(null);

  const qtRef = useRef<Quadtree<GraphNode> | null>(null);

  // Pre-baked node render data
  const nodeRenderRef = useRef<{
    xs: Float32Array;
    ys: Float32Array;
    radii: Float32Array;
    colors: string[];
    ids: string[];
    names: string[];
    counts: number[];
  } | null>(null);

  // Pre-sorted landmark indices (top N nodes by count, for always-visible labels)
  const landmarkIndicesRef = useRef<number[]>([]);

  // Pre-sorted all node indices by count descending (for zoomed-in labels)
  const sortedByCountRef = useRef<number[]>([]);

  // Visible set for timeline filtering
  const visibleSetRef = useRef<Set<string>>(new Set());

  // *** A1: Pre-rendered edge layer (offscreen canvas) ***
  const edgeLayerRef = useRef<HTMLCanvasElement | null>(null);
  const edgeLayerDirtyRef = useRef(true);

  // Path rendering
  const pathSetRef = useRef<Set<string>>(new Set());
  const pathCoordsRef = useRef<Float32Array>(new Float32Array(0));

  // Adjacency for drawer
  const edgesByNodeRef = useRef<Map<string, Set<string>>>(new Map());

  // Sync refs on state change
  useEffect(() => { selectedARef.current = selectedA; dirtyRef.current = true; }, [selectedA]);
  useEffect(() => { selectedBRef.current = selectedB; dirtyRef.current = true; }, [selectedB]);
  useEffect(() => { pathRef.current = path; dirtyRef.current = true; }, [path]);

  // Pre-compute all baked data on data load (with radial layout)
  useEffect(() => {
    const colors = new Map<string, string>();
    for (const node of data.nodes) {
      colors.set(node.id, nodeColor(node.type, node.midYear));
    }

    // Edge lookup for drawer
    const edgeMap = new Map<string, Set<string>>();
    for (const node of data.nodes) edgeMap.set(node.id, new Set());
    for (const edge of data.edges) {
      edgeMap.get(edge.source)?.add(edge.target);
      edgeMap.get(edge.target)?.add(edge.source);
    }
    edgesByNodeRef.current = edgeMap;

    // --- Compute radial ring layout ---
    const centerX = WORLD_WIDTH / 2;
    const centerY = WORLD_HEIGHT / 2;
    const halfSize = Math.min(WORLD_WIDTH, WORLD_HEIGHT) / 2;
    const innerR = halfSize * RADIAL_INNER_RATIO;
    const outerR = halfSize * RADIAL_OUTER_RATIO;

    const goalies = data.nodes.filter((n) => n.type === "goalie");
    const scorers = data.nodes.filter((n) => n.type === "scorer");

    // Sort by count descending so high-count nodes are distributed evenly
    goalies.sort((a, b) => b.count - a.count);
    scorers.sort((a, b) => b.count - a.count);

    const radialPositions = new Map<string, { x: number; y: number }>();

    for (let i = 0; i < goalies.length; i++) {
      const angle = (i / goalies.length) * Math.PI * 2 - Math.PI / 2;
      const jitterR = (Math.random() - 0.5) * 2 * RADIAL_GOALIE_JITTER * halfSize;
      const jitterA = (Math.random() - 0.5) * 0.02;
      radialPositions.set(goalies[i].id, {
        x: centerX + Math.cos(angle + jitterA) * (innerR + jitterR),
        y: centerY + Math.sin(angle + jitterA) * (innerR + jitterR),
      });
    }

    for (let i = 0; i < scorers.length; i++) {
      const angle = (i / scorers.length) * Math.PI * 2 - Math.PI / 2;
      const jitterR = (Math.random() - 0.5) * 2 * RADIAL_SCORER_JITTER * halfSize;
      const jitterA = (Math.random() - 0.5) * 0.01;
      radialPositions.set(scorers[i].id, {
        x: centerX + Math.cos(angle + jitterA) * (outerR + jitterR),
        y: centerY + Math.sin(angle + jitterA) * (outerR + jitterR),
      });
    }

    // Bake node render arrays using radial positions
    const n = data.nodes.length;
    const xs = new Float32Array(n);
    const ys = new Float32Array(n);
    const radii = new Float32Array(n);
    const nodeColors: string[] = new Array(n);
    const ids: string[] = new Array(n);
    const names: string[] = new Array(n);
    const counts: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const node = data.nodes[i];
      const pos = radialPositions.get(node.id);
      xs[i] = pos ? pos.x : node.x * WORLD_WIDTH;
      ys[i] = pos ? pos.y : node.y * WORLD_HEIGHT;
      // Also update the node's x/y for pathfinding zoom-to
      node.x = xs[i] / WORLD_WIDTH;
      node.y = ys[i] / WORLD_HEIGHT;
      radii[i] = nodeRadius(node.count);
      nodeColors[i] = colors.get(node.id) || "#ffffff";
      ids[i] = node.id;
      names[i] = node.name;
      counts[i] = node.count;
    }
    nodeRenderRef.current = { xs, ys, radii, colors: nodeColors, ids, names, counts };

    // Pre-sort all indices by count descending
    const sorted = Array.from({ length: n }, (_, i) => i);
    sorted.sort((a, b) => counts[b] - counts[a]);
    sortedByCountRef.current = sorted;
    landmarkIndicesRef.current = sorted.slice(0, LANDMARK_COUNT);

    // Create offscreen edge canvas at reduced resolution
    const offscreen = document.createElement("canvas");
    offscreen.width = WORLD_WIDTH * EDGE_CANVAS_SCALE;
    offscreen.height = WORLD_HEIGHT * EDGE_CANVAS_SCALE;
    edgeLayerRef.current = offscreen;
    edgeLayerDirtyRef.current = true;
  }, [data]);

  // Rebuild edge layer + visible set when yearRange changes (debounced to avoid blocking UI)
  const yearRangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Update visible set immediately (cheap — just a Set build)
    const visibleSet = new Set<string>();
    for (const n of data.nodes) {
      if (n.lastYear >= yearRange[0] && n.firstYear <= yearRange[1]) {
        visibleSet.add(n.id);
      }
    }
    visibleSetRef.current = visibleSet;
    dirtyRef.current = true;

    // Debounce the expensive work (quadtree + edge layer)
    if (yearRangeTimerRef.current) clearTimeout(yearRangeTimerRef.current);
    yearRangeTimerRef.current = setTimeout(() => {
      // Rebuild quadtree
      const visible = data.nodes.filter((n) => visibleSet.has(n.id));
      qtRef.current = quadtree<GraphNode>()
        .x((d) => d.x * WORLD_WIDTH)
        .y((d) => d.y * WORLD_HEIGHT)
        .addAll(visible);

      // Render edges to offscreen canvas (reduced resolution, batched)
      const offscreen = edgeLayerRef.current;
      if (offscreen) {
        const ectx = offscreen.getContext("2d")!;
        const sw = WORLD_WIDTH * EDGE_CANVAS_SCALE;
        const sh = WORLD_HEIGHT * EDGE_CANVAS_SCALE;
        ectx.clearRect(0, 0, sw, sh);

        ectx.globalAlpha = EDGE_ALPHA;
        ectx.strokeStyle = EDGE_COLOR;
        ectx.lineWidth = EDGE_WIDTH * EDGE_CANVAS_SCALE;
        ectx.beginPath();
        for (const edge of data.edges) {
          if (!visibleSet.has(edge.source) || !visibleSet.has(edge.target)) continue;
          const sn = data.nodeMap.get(edge.source);
          const tn = data.nodeMap.get(edge.target);
          if (!sn || !tn) continue;
          ectx.moveTo(sn.x * sw, sn.y * sh);
          ectx.lineTo(tn.x * sw, tn.y * sh);
        }
        ectx.stroke();
      }

      dirtyRef.current = true;
    }, 400);

    return () => {
      if (yearRangeTimerRef.current) clearTimeout(yearRangeTimerRef.current);
    };
  }, [data, yearRange]);

  // Pathfinding
  useEffect(() => {
    if (selectedA && selectedB) {
      setPath(bfs(selectedA.id, selectedB.id, data.adjacency));
    } else {
      setPath(null);
    }
  }, [selectedA, selectedB, data.adjacency]);

  // Pre-bake path data when path changes
  useEffect(() => {
    const nodeSet = new Set<string>();
    if (path) {
      for (const id of path) nodeSet.add(id);
      // Pre-bake path coordinates
      const coords = new Float32Array(path.length * 2);
      for (let i = 0; i < path.length; i++) {
        const n = data.nodeMap.get(path[i]);
        if (n) {
          coords[i * 2] = n.x * WORLD_WIDTH;
          coords[i * 2 + 1] = n.y * WORLD_HEIGHT;
        }
      }
      pathCoordsRef.current = coords;
    } else {
      pathCoordsRef.current = new Float32Array(0);
    }
    pathSetRef.current = nodeSet;
    dirtyRef.current = true;
  }, [path, data.nodeMap]);

  // *** RENDER LOOP ***
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

    const zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([ZOOM_MIN, ZOOM_MAX])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        dirtyRef.current = true;
      });

    select(canvas).call(zoomBehavior);

    // Center graph
    const initialK = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT) * 0.9;
    const initialX = (width - WORLD_WIDTH * initialK) / 2;
    const initialY = (height - WORLD_HEIGHT * initialK) / 2;
    select(canvas).call(zoomBehavior.transform, zoomIdentity.translate(initialX, initialY).scale(initialK));

    function render() {
      if (!dirtyRef.current) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      dirtyRef.current = false;

      const t = transformRef.current;
      const k = t.k;
      const nr = nodeRenderRef.current;
      const pathNodes = pathSetRef.current;
      const hasPath = pathNodes.size > 0;
      const pCoords = pathCoordsRef.current;
      const selAId = selectedARef.current?.id;
      const selBId = selectedBRef.current?.id;
      const visibleSet = visibleSetRef.current;

      // Set transform once (no save/restore overhead)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, width, height);

      // Viewport in world coords
      const vx0 = -t.x / k;
      const vy0 = -t.y / k;
      const vx1 = (width - t.x) / k;
      const vy1 = (height - t.y) / k;

      // Apply world transform
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * t.x, dpr * t.y);

      // --- Draw edges from pre-rendered offscreen canvas (zoom-faded) ---
      const edgeLayer = edgeLayerRef.current;
      if (edgeLayer && k < EDGE_FADE_END) {
        const edgeAlpha = k < EDGE_FADE_START ? 1
          : 1 - (k - EDGE_FADE_START) / (EDGE_FADE_END - EDGE_FADE_START);
        ctx.globalAlpha = edgeAlpha;
        ctx.drawImage(edgeLayer, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      }

      // --- Draw path edges (pre-baked coords) ---
      if (hasPath && pCoords.length >= 4) {
        ctx.globalAlpha = PATH_ALPHA;
        ctx.strokeStyle = PATH_COLOR;
        ctx.lineWidth = PATH_WIDTH / k;
        ctx.beginPath();
        ctx.moveTo(pCoords[0], pCoords[1]);
        for (let i = 2; i < pCoords.length; i += 2) {
          ctx.lineTo(pCoords[i], pCoords[i + 1]);
        }
        ctx.stroke();
      }

      // --- Draw nodes ---
      if (nr) {
        for (let i = 0; i < nr.xs.length; i++) {
          const id = nr.ids[i];
          if (!visibleSet.has(id)) continue;

          const nx = nr.xs[i];
          const ny = nr.ys[i];

          // Frustum cull
          if (nx < vx0 - 10 || nx > vx1 + 10 || ny < vy0 - 10 || ny > vy1 + 10) continue;

          const r = nr.radii[i];
          const isOnPath = pathNodes.has(id);
          const isSelected = id === selAId || id === selBId;
          const brightness = 0.5 + 0.5 * Math.min(nr.counts[i] / 200, 1);

          ctx.globalAlpha = (hasPath && !isOnPath) ? 0.15 : brightness;
          ctx.fillStyle = nr.colors[i];
          ctx.beginPath();
          ctx.arc(nx, ny, r, 0, Math.PI * 2);
          ctx.fill();

          // Highlight ring for selected/path nodes only
          if (isOnPath || isSelected) {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = isOnPath ? PATH_COLOR : "#ffffff";
            ctx.lineWidth = (isOnPath ? 2 : 1.5) / k;
            ctx.beginPath();
            ctx.arc(nx, ny, r + 2 / k, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      // --- Labels ---
      if (nr) {
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";

        if (k <= 2.5) {
          // Low/mid zoom: only show landmark labels (top 20)
          ctx.globalAlpha = 0.8;
          const landmarkFontSize = Math.max(6, Math.min(14, 10 / k));
          ctx.font = `600 ${landmarkFontSize}px Inter, system-ui, sans-serif`;

          for (const i of landmarkIndicesRef.current) {
            if (!visibleSet.has(nr.ids[i])) continue;
            const nx = nr.xs[i];
            const ny = nr.ys[i];
            if (nx < vx0 || nx > vx1 || ny < vy0 || ny > vy1) continue;
            ctx.fillText(nr.names[i], nx + nr.radii[i] + 3 / k, ny);
          }
        } else {
          // High zoom: show top N in viewport (includes landmarks naturally)
          ctx.globalAlpha = 0.85;
          const fontSize = Math.max(6, 10 / k);
          ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
          let labelCount = 0;
          for (const i of sortedByCountRef.current) {
            if (labelCount >= MAX_LABELS_ZOOMED) break;
            if (!visibleSet.has(nr.ids[i])) continue;
            const nx = nr.xs[i];
            const ny = nr.ys[i];
            if (nx < vx0 || nx > vx1 || ny < vy0 || ny > vy1) continue;
            ctx.fillText(nr.names[i], nx + nr.radii[i] + 3 / k, ny);
            labelCount++;
          }
        }
      }

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Click handler (no hover — click only)
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
        setSelectedA(found);
        setSelectedB(null);
        setPath(null);
      }
    },
    [selectedA, selectedB]
  );

  // Select a single node — zoom to it
  const handleSelectNode = useCallback(
    (node: GraphNode) => {
      setSelectedA(node);
      setSelectedB(null);
      setPath(null);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>().scaleExtent([ZOOM_MIN, ZOOM_MAX]);
      const targetK = 3;
      const nx = node.x * WORLD_WIDTH;
      const ny = node.y * WORLD_HEIGHT;
      const tx = window.innerWidth / 2 - nx * targetK;
      const ty = window.innerHeight / 2 - ny * targetK;
      select(canvas).transition().duration(750).call(zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(targetK));
    },
    []
  );

  const handleClearPath = useCallback(() => {
    setSelectedA(null);
    setSelectedB(null);
    setPath(null);
  }, []);

  // Called from Sidebar when a path is found (random, degree challenge, or manual)
  const handleSetPath = useCallback(
    (nodeA: GraphNode, nodeB: GraphNode, foundPath: string[]) => {
      setSelectedA(nodeA);
      setSelectedB(nodeB);
      setPath(foundPath);

      // Zoom to show both nodes
      const canvas = canvasRef.current;
      if (!canvas) return;
      const zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>().scaleExtent([ZOOM_MIN, ZOOM_MAX]);
      const ax = nodeA.x * WORLD_WIDTH;
      const ay = nodeA.y * WORLD_HEIGHT;
      const bx = nodeB.x * WORLD_WIDTH;
      const by = nodeB.y * WORLD_HEIGHT;
      const cx = (ax + bx) / 2;
      const cy = (ay + by) / 2;
      const dx = Math.abs(ax - bx) + 200;
      const dy = Math.abs(ay - by) + 200;
      const targetK = Math.min(window.innerWidth / dx, window.innerHeight / dy, 3) * 0.8;
      const tx = window.innerWidth / 2 - cx * targetK;
      const ty = window.innerHeight / 2 - cy * targetK;
      select(canvas).transition().duration(1000).call(zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(targetK));
    },
    []
  );

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 cursor-grab active:cursor-grabbing"
        onClick={handleClick}
      />

      <Sidebar
        data={data}
        selectedA={selectedA}
        selectedB={selectedB}
        path={path}
        yearRange={yearRange}
        onSelectNode={handleSelectNode}
        onSetPath={handleSetPath}
        onClearPath={handleClearPath}
        onYearRangeChange={setYearRange}
      />
    </>
  );
}
