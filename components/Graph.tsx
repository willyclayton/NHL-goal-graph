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
} from "@/lib/constants";
import PathDisplay from "./PathDisplay";
import SearchBar from "./SearchBar";
import Timeline from "./Timeline";
import Legend from "./Legend";
import InfoDrawer from "./InfoDrawer";
import RandomPathButton from "./RandomPathButton";

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
  const [drawerNode, setDrawerNode] = useState<GraphNode | null>(null);

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

  // Pre-compute all baked data on data load
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

    // Bake node render arrays
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
      xs[i] = node.x * WORLD_WIDTH;
      ys[i] = node.y * WORLD_HEIGHT;
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

    // Create offscreen edge canvas
    const offscreen = document.createElement("canvas");
    offscreen.width = WORLD_WIDTH;
    offscreen.height = WORLD_HEIGHT;
    edgeLayerRef.current = offscreen;
    edgeLayerDirtyRef.current = true;
  }, [data]);

  // Rebuild edge layer + visible set when yearRange changes (debounced effect)
  useEffect(() => {
    const visibleSet = new Set<string>();
    for (const n of data.nodes) {
      if (n.lastYear >= yearRange[0] && n.firstYear <= yearRange[1]) {
        visibleSet.add(n.id);
      }
    }
    visibleSetRef.current = visibleSet;

    // Rebuild quadtree
    const visible = data.nodes.filter((n) => visibleSet.has(n.id));
    qtRef.current = quadtree<GraphNode>()
      .x((d) => d.x * WORLD_WIDTH)
      .y((d) => d.y * WORLD_HEIGHT)
      .addAll(visible);

    // Render edges to offscreen canvas
    const offscreen = edgeLayerRef.current;
    if (offscreen) {
      const ctx = offscreen.getContext("2d")!;
      ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      ctx.globalAlpha = EDGE_ALPHA;
      ctx.strokeStyle = EDGE_COLOR;
      ctx.lineWidth = EDGE_WIDTH;
      ctx.beginPath();
      for (const edge of data.edges) {
        if (!visibleSet.has(edge.source) || !visibleSet.has(edge.target)) continue;
        const sn = data.nodeMap.get(edge.source);
        const tn = data.nodeMap.get(edge.target);
        if (!sn || !tn) continue;
        ctx.moveTo(sn.x * WORLD_WIDTH, sn.y * WORLD_HEIGHT);
        ctx.lineTo(tn.x * WORLD_WIDTH, tn.y * WORLD_HEIGHT);
      }
      ctx.stroke();
    }

    dirtyRef.current = true;
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

      // --- A1: Draw edges from pre-rendered offscreen canvas ---
      const edgeLayer = edgeLayerRef.current;
      if (edgeLayer && k >= 0.4) {
        ctx.globalAlpha = 1;
        ctx.drawImage(edgeLayer, 0, 0);
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

          ctx.globalAlpha = (hasPath && !isOnPath) ? 0.15 : 1;
          ctx.fillStyle = nr.colors[i];
          ctx.beginPath();
          ctx.arc(nx, ny, r, 0, Math.PI * 2);
          ctx.fill();

          // Highlight ring for selected/path nodes only (no hover)
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

      // --- B2: Landmark labels (always visible, top 20) ---
      if (nr) {
        ctx.globalAlpha = 0.8;
        const landmarkFontSize = Math.max(6, Math.min(14, 10 / k));
        ctx.font = `600 ${landmarkFontSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";

        for (const i of landmarkIndicesRef.current) {
          if (!visibleSet.has(nr.ids[i])) continue;
          const nx = nr.xs[i];
          const ny = nr.ys[i];
          if (nx < vx0 || nx > vx1 || ny < vy0 || ny > vy1) continue;
          ctx.fillText(nr.names[i], nx + nr.radii[i] + 3 / k, ny);
        }

        // Additional labels at high zoom (from pre-sorted list, early exit)
        if (k > 2.5) {
          ctx.globalAlpha = 0.7;
          const fontSize = Math.max(6, 10 / k);
          ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
          let labelCount = 0;
          for (const i of sortedByCountRef.current) {
            if (labelCount >= MAX_LABELS_ZOOMED) break;
            if (!visibleSet.has(nr.ids[i])) continue;
            const nx = nr.xs[i];
            const ny = nr.ys[i];
            if (nx < vx0 || nx > vx1 || ny < vy0 || ny > vy1) continue;
            // Skip landmarks (already drawn)
            if (labelCount < LANDMARK_COUNT && landmarkIndicesRef.current.includes(i)) continue;
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
        setDrawerNode(null);
        return;
      }

      if (!selectedA) {
        setSelectedA(found);
        setDrawerNode(found);
      } else if (!selectedB && found.id !== selectedA.id) {
        setSelectedB(found);
        setDrawerNode(null);
      } else {
        setSelectedA(found);
        setSelectedB(null);
        setPath(null);
        setDrawerNode(found);
      }
    },
    [selectedA, selectedB]
  );

  const handleSelectNode = useCallback(
    (node: GraphNode) => {
      if (!selectedA) {
        setSelectedA(node);
        setDrawerNode(node);
      } else if (!selectedB && node.id !== selectedA.id) {
        setSelectedB(node);
        setDrawerNode(null);
      } else {
        setSelectedA(node);
        setSelectedB(null);
        setPath(null);
        setDrawerNode(node);
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
      select(canvas).transition().duration(750).call(zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(targetK));
    },
    [selectedA, selectedB]
  );

  const handleClearPath = useCallback(() => {
    setSelectedA(null);
    setSelectedB(null);
    setPath(null);
    setDrawerNode(null);
  }, []);

  const handleRandomPath = useCallback(
    (nodeA: GraphNode, nodeB: GraphNode, foundPath: string[]) => {
      setSelectedA(nodeA);
      setSelectedB(nodeB);
      setPath(foundPath);
      setDrawerNode(null);

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

  const handleMiniMapJump = useCallback((worldX: number, worldY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>().scaleExtent([ZOOM_MIN, ZOOM_MAX]);
    const currentK = transformRef.current.k;
    const tx = window.innerWidth / 2 - worldX * currentK;
    const ty = window.innerHeight / 2 - worldY * currentK;
    select(canvas).transition().duration(500).call(zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(currentK));
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 cursor-grab active:cursor-grabbing"
        onClick={handleClick}
      />

      <SearchBar nodes={data.nodes} onSelect={handleSelectNode} />
      <RandomPathButton data={data} onPathFound={handleRandomPath} />

      {path && path.length > 0 && (
        <PathDisplay
          path={path}
          nodeMap={data.nodeMap}
          onClickNode={handleSelectNode}
          onClose={handleClearPath}
        />
      )}

      {drawerNode && !path && (
        <InfoDrawer
          node={drawerNode}
          data={data}
          transformRef={transformRef}
          onClickNode={handleSelectNode}
          onJump={handleMiniMapJump}
          onClose={() => setDrawerNode(null)}
        />
      )}

      <Timeline yearRange={yearRange} onChange={setYearRange} />
      <Legend />

      {selectedA && !selectedB && !drawerNode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm pointer-events-none">
          Select a second player to find path
        </div>
      )}
    </>
  );
}
