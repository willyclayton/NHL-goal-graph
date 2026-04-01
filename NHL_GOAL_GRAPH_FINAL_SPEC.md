# NHL-goal-graph — Claude Code Build Spec (FINAL)

## One-Liner

Interactive bipartite network graph of every NHL goal since 2010. Scorers on one side, goalies on the other, edges connect who scored on whom. Click any two players to find the shortest path linking them. Ship with 2010+ data, backfill to 1917 later.

---

## Decisions (Locked In)

| Decision | Answer |
|----------|--------|
| **Repo/project name** | `NHL-goal-graph` |
| **MVP data range** | 2010-11 season through current (2025-26) |
| **Signature demo path (MVP)** | Ovechkin → McDavid (swap to Howe → McDavid after backfill) |
| **Goal types included** | Real goals only — 5v5, PP, SH with a goalie in net. **Exclude** shootout goals and empty net goals. |
| **Regular season + playoffs** | Yes, include both |
| **Edge weight visualization** | No — binary connections only, no thickness/opacity variation |
| **Path display format** | Names + arrows only: `Ovechkin → Fleury → McDavid` |
| **Mobile** | Needs to work (simplified: tap instead of hover, no canvas labels, maybe reduced node count) |
| **Auto-update** | No — manual rebuild when I feel like it |
| **Deployment** | Vercel (same as Bracket Lab) |
| **Backfill plan** | Hockey-Reference scraping for 1917-2010, separate phase |

---

## Tech Stack

- **Next.js 14+** (App Router, TypeScript)
- **D3.js v7** — force simulation math, zoom, quadtree, scales
- **HTML Canvas** for rendering (NOT SVG — ~6,000 nodes)
- **Web Workers** for off-thread force simulation
- **Tailwind CSS** for UI chrome
- **Fuse.js** for fuzzy player search
- **Python 3** for data pipeline scripts
- **Vercel** for deployment
- **GitHub** for version control

---

## Project Structure

```
/NHL-goal-graph
├── app/
│   ├── layout.tsx              # Meta tags, fonts, dark theme
│   ├── page.tsx                # Full viewport — just renders <Graph />
│   └── globals.css             # Tailwind + CSS vars
├── components/
│   ├── Graph.tsx               # Main canvas renderer + all interaction
│   ├── Timeline.tsx            # Year range slider at bottom
│   ├── SearchBar.tsx           # Cmd+K player search
│   ├── PathDisplay.tsx         # Chain overlay (names + arrows)
│   ├── PlayerTooltip.tsx       # Hover/tap tooltip
│   ├── Legend.tsx              # Goalie=blue, Scorer=pink legend
│   └── LoadingScreen.tsx       # Loading state
├── lib/
│   ├── types.ts                # GraphNode, GraphEdge, etc.
│   ├── colors.ts               # Color scales by type + era
│   ├── pathfinding.ts          # BFS shortest path
│   ├── graph-worker.ts         # Web Worker for force sim (stretch)
│   └── constants.ts            # Layout params, force strengths
├── public/
│   ├── data/
│   │   ├── nodes.json          # All player nodes
│   │   ├── edges.json          # All scorer↔goalie connections
│   │   └── positions.json      # Pre-computed x,y layout
│   └── og-image.png            # Social share image
├── scripts/
│   ├── 01_fetch_game_ids.py    # Get all game IDs 2010-present
│   ├── 02_fetch_pbp.py         # Download play-by-play JSONs
│   ├── 03_extract_goals.py     # Parse goals → goals.csv
│   ├── 04_fetch_players.py     # Build player name lookup
│   ├── 05_build_graph.py       # Generate nodes.json + edges.json
│   └── 06_compute_layout.py    # Pre-compute positions.json
├── data/                        # Local data dir (gitignored)
│   ├── raw/
│   │   ├── pbp/                # Raw play-by-play JSON per game
│   │   └── players/            # Raw player info JSON
│   └── processed/
│       ├── goals.csv           # scorer_id, goalie_id, game_id, season, game_type
│       └── players.csv         # player_id, name, position
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## Phase 1: Data Pipeline (Python)

Run these scripts sequentially. Each is idempotent and caches results so you can resume.

### Script 1: Fetch Game IDs

```python
# scripts/01_fetch_game_ids.py
#
# For each season from 2010-11 (20102011) through 2025-26 (20252026):
#   Hit the NHL schedule API to get all game IDs
#
# NHL API schedule endpoint:
#   https://api-web.nhle.com/v1/club-schedule-season/{team_abbr}/{season}
#   Returns all games for that team/season with game IDs
#
# OR iterate by date:
#   https://api-web.nhle.com/v1/schedule/{date}
#   Returns games scheduled on that date
#
# RECOMMENDED APPROACH: iterate by date from Oct 1 of start year to Jun 30 of end year
# for each season. Collect unique game IDs.
#
# Game ID format: YYYYTTNNNN
#   YYYY = season start year
#   TT = game type (02 = regular season, 03 = playoffs)
#   NNNN = game number
#
# Include BOTH regular season (02) and playoff (03) games.
#
# Output: data/processed/game_ids.txt (one game ID per line)
#
# Rate limiting: 0.5s between requests, cache schedule responses
# Expected: ~19,500 game IDs total across 15 seasons
```

### Script 2: Fetch Play-by-Play

```python
# scripts/02_fetch_pbp.py
#
# For each game ID in game_ids.txt:
#   Fetch: https://api-web.nhle.com/v1/gamecenter/{game_id}/play-by-play
#   Save raw JSON to: data/raw/pbp/{game_id}.json
#   Skip if file already exists (resume capability)
#
# Rate limiting: 1 request/sec
# Expected runtime: ~5-6 hours for full scrape
# Expected disk: ~15-20GB of raw JSON (each file is ~500KB-1MB)
#
# TIP: Run overnight. Add a progress counter.
# Print: "Fetching game {i}/{total}: {game_id}"
```

### Script 3: Extract Goals

```python
# scripts/03_extract_goals.py
#
# For each raw PBP file in data/raw/pbp/:
#   Parse the JSON
#   Find all plays where typeDescKey == "goal"
#   For each goal:
#     - Get scorer_id from details.scoringPlayerId
#     - Get goalie_id from details.goalieInNetId
#     - SKIP if goalieInNetId is missing/null (empty net goal)
#     - SKIP if periodDescriptor.periodType == "SHOOTOUT"
#     - Extract season from game ID (first 4 digits of game_id)
#     - Extract game_type: "R" if game_id[4:6]=="02", "P" if "03"
#   
#   Collect all unique player IDs encountered (both scorers and goalies)
#
# Output: 
#   data/processed/goals.csv
#     Columns: scorer_id, goalie_id, game_id, season, game_type
#
#   data/processed/player_ids.txt
#     All unique player IDs (to fetch names in next step)
#
# Expected: ~95,000-110,000 goal rows (after excluding SO + EN)
```

### Script 4: Fetch Player Info

```python
# scripts/04_fetch_players.py
#
# For each player ID in player_ids.txt:
#   Fetch: https://api-web.nhle.com/v1/player/{player_id}/landing
#   Extract: firstName.default, lastName.default, position, birthDate
#   Save to: data/raw/players/{player_id}.json
#   Skip if file already exists
#
# Build output CSV:
#   data/processed/players.csv
#     Columns: player_id, name, position, birth_year
#
# Expected: ~5,000-6,500 unique players
# Rate limiting: 0.5s between requests
# Runtime: ~1 hour
```

### Script 5: Build Graph JSON

```python
# scripts/05_build_graph.py
#
# Read goals.csv and players.csv
#
# Build NODES:
#   For each unique scorer_id in goals.csv:
#     Create a scorer node: {
#       "id": "s_{scorer_id}",
#       "name": "Alex Ovechkin",
#       "type": "scorer",
#       "count": 542,              # total goals scored (in our dataset)
#       "firstYear": 2010,         # first season in dataset
#       "lastYear": 2025,          # last season in dataset
#       "midYear": 2017            # for color mapping
#     }
#
#   For each unique goalie_id in goals.csv:
#     Create a goalie node: {
#       "id": "g_{goalie_id}",
#       "name": "Marc-Andre Fleury",
#       "type": "goalie",
#       "count": 1847,             # total goals allowed (in our dataset)
#       "firstYear": 2010,
#       "lastYear": 2023,
#       "midYear": 2016
#     }
#
# Build EDGES:
#   For each unique (scorer_id, goalie_id) pair in goals.csv:
#     Create an edge: {
#       "source": "s_{scorer_id}",
#       "target": "g_{goalie_id}"
#     }
#   NOTE: Binary edges only. No weight field. No firstYear field needed.
#   Just the connection exists or it doesn't.
#
# Output:
#   public/data/nodes.json
#   public/data/edges.json
#
# Print summary stats:
#   "Nodes: {total} ({scorers} scorers, {goalies} goalies)"
#   "Edges: {total}"
#   "Biggest scorer node: {name} ({count} goals)"
#   "Biggest goalie node: {name} ({count} goals against)"
```

### Script 6: Pre-Compute Layout

```python
# scripts/06_compute_layout.py
#
# This is CRITICAL for user experience. Without it, the browser spends
# 30-60 seconds computing the force layout on load. With it, nodes
# render in their final positions instantly.
#
# Approach: Use networkx spring_layout with bipartite initialization
#
# 1. Load nodes.json and edges.json
# 2. Build a networkx graph
# 3. Set initial positions:
#    - Scorers: random x in [0.5, 1.0], random y in [0, 1]
#    - Goalies: random x in [0.0, 0.5], random y in [0, 1]
# 4. Run spring_layout with:
#    - k = 0.1 (node spacing)
#    - iterations = 1000 (more = better convergence)
#    - seed = 42 (reproducible)
# 5. Normalize positions to [0, 1] range
# 6. Save as positions.json: { "s_8471214": {"x": 0.72, "y": 0.45}, ... }
#
# ALTERNATIVE (more accurate):
#   Write a Node.js script that runs d3-force headless for 5000 ticks
#   using the exact same force configuration as the browser.
#   This gives pixel-perfect initial positions.
#   Use: `node scripts/compute-layout.mjs`
#
# Output: public/data/positions.json
```

---

## Phase 2: Next.js App

### page.tsx

```tsx
// Full viewport, no scroll. Dark background.
// Loads <Graph /> component which handles everything.
// Also renders <SearchBar />, <Timeline />, <PathDisplay />, <Legend />
// as overlays on top of the canvas.
```

### Graph.tsx — Core Canvas Renderer

**Setup:**
- Full viewport `<canvas>` element
- `devicePixelRatio` aware for retina
- Load nodes.json, edges.json, positions.json on mount
- Apply pre-computed positions to nodes immediately
- Build adjacency list for pathfinding
- Build d3 quadtree for hover detection
- Attach d3.zoom for pan/zoom

**Render loop (requestAnimationFrame):**

```
1. Clear canvas with #0a0e27
2. Apply zoom transform (ctx.translate + ctx.scale)
3. Draw edges:
   - ctx.globalAlpha = 0.015
   - ctx.strokeStyle = "#ffffff"
   - ctx.lineWidth = 0.3
   - Simple lines from source to target
   - Frustum culling: skip edges fully outside viewport
4. Draw highlighted path (if active):
   - ctx.globalAlpha = 0.9
   - ctx.strokeStyle = "#ffd700" (gold)
   - ctx.lineWidth = 2.5 / transform.k
   - Draw line through path nodes
   - Draw larger circles on path nodes
5. Draw nodes:
   - ctx.globalAlpha = 0.85
   - Radius: Math.max(0.8, Math.sqrt(count) * 0.4)
   - Fill color: goalie = blue spectrum, scorer = pink spectrum
     (lighter for earlier midYear, more saturated for recent)
   - Optional glow (ctx.shadowBlur) for nodes with count > 200
6. Draw labels (only when zoomed in past 2.5x):
   - Show names on nodes with count > threshold
   - White text, small font
7. Draw hovered node highlight (if any):
   - Bright ring around node
   - Connected edges highlighted at higher opacity
```

**Color scale:**

```typescript
// Goalies: light steel blue (#88bbff) → deep blue (#2244cc)
// Scorers: light pink (#ffaacc) → hot pink (#ff2277)
// Interpolated by midYear within [2010, 2026] range
// Use d3.scaleLinear with d3.interpolateHcl for perceptual uniformity
```

**Interaction:**

```
- Hover (desktop) / Tap (mobile):
    Quadtree.find(mx, my, radius)
    Show PlayerTooltip: name, type, goal count, active years
    Highlight connected edges at 0.3 opacity

- Click / Tap:
    First click: select Player A (ring highlight, show connections)
    Second click: select Player B
      → Run BFS(A, B) via pathfinding.ts
      → If path found: render gold line, show PathDisplay
      → If no path: show "No connection found" (unlikely)
    Third click on empty space: clear all selections

- Zoom/Pan:
    d3.zoom() on canvas
    scaleExtent: [0.3, 20]
    Desktop: scroll wheel + drag
    Mobile: pinch + two-finger drag
```

### PathDisplay.tsx

```
Fixed overlay, bottom-left or left sidebar
Shows the chain as: Ovechkin → Fleury → McDavid
Compact, names + arrows only
Each name is clickable (zooms to that node)
Shows "X degrees of separation"
Close button to dismiss
```

### SearchBar.tsx

```
Triggered by Cmd+K (desktop) or search icon (mobile)
Fuse.js fuzzy search against node names
Results show: name, type icon (🏒 scorer / 🥅 goalie), goal count
Click result → zoom to node + select it
Max 8 results shown
```

### Timeline.tsx

```
Range slider at bottom of viewport
Range: 2010 to 2026
Background gradient: blue → purple → pink
Labels at each end

Behavior:
  - Filter visible nodes: show only nodes whose [firstYear, lastYear] 
    overlaps with the selected range
  - Filter visible edges: show only edges where BOTH source and target
    are visible
  - Do NOT re-run layout — just hide/show. This is instant.
  - Reset button to show all
```

### Legend.tsx

```
Small overlay, top-right or bottom-right
Shows:
  🔵 Goalies (goals against)     🟣 Scorers (goals scored)
  Node size = career goals
  Smaller dot → bigger dot visual
```

### LoadingScreen.tsx

```
Shown while JSON files are loading
Dark background matching the app
"Loading X goals across Y seasons..."
Simple progress or spinner
Fades out when data is ready
```

### Mobile Adaptations

```
- Canvas touch events handled by d3.zoom (pinch, drag work natively)
- Tap = hover + select combined (no separate hover state)
- PlayerTooltip appears as a bottom sheet on tap
- SearchBar is a bottom sheet triggered by floating button
- Timeline slider is full-width at bottom, thicker touch target
- PathDisplay appears as a bottom sheet
- Reduce rendering: 
    Skip edge drawing when node count > 3000 and zoom < 1
    (edges are too dense to see on small screens anyway)
    Only draw edges when zoomed in past 1.5x
- Consider filtering to nodes with count > 3 on mobile to reduce clutter
```

---

## Phase 3: Deployment

### Vercel

```bash
cd NHL-goal-graph
vercel --prod
```

Vercel URL: `nhl-goal-graph.vercel.app`

### Data size check

Ensure nodes.json + edges.json + positions.json total < 10MB.
Vercel serves static files from `public/` with automatic gzip.
If files are too large, minify JSON (remove whitespace) and use shorter property names.

### SEO / Social

```tsx
// app/layout.tsx
export const metadata = {
  title: "NHL Goal Graph — Every Goal Since 2010, Connected",
  description: "Interactive network graph connecting every NHL scorer to every goalie they scored on. Find the shortest path between any two players.",
  openGraph: {
    title: "NHL Goal Graph",
    description: "Every NHL goal since 2010, visualized as a network. How many degrees separate Ovechkin from McDavid?",
    images: ["/og-image.png"],
  },
};
```

OG image: Screenshot of the full graph with the Ovechkin → McDavid path highlighted in gold. Add title text overlay.

---

## Development Order (Step by Step)

```
PHASE 1 — DATA (do this first, everything depends on it)
  1. Run 01_fetch_game_ids.py → game_ids.txt
  2. Run 02_fetch_pbp.py → raw PBP JSONs (overnight)
  3. Run 03_extract_goals.py → goals.csv
  4. Run 04_fetch_players.py → players.csv
  5. Run 05_build_graph.py → nodes.json + edges.json
  6. Run 06_compute_layout.py → positions.json

PHASE 2 — STATIC RENDER (get something on screen)
  7. Next.js project setup + Tailwind + dark theme
  8. Graph.tsx: load JSON, render nodes + edges on canvas
  9. Zoom/pan with d3.zoom
  10. Verify: does it look like a yin-yang? Goalies clustered, scorers spread?

PHASE 3 — INTERACTIVITY (make it useful)
  11. Hover tooltips (quadtree + PlayerTooltip)
  12. Click to select + PathDisplay
  13. BFS pathfinding — verify Ovechkin → McDavid works
  14. SearchBar with Fuse.js

PHASE 4 — POLISH
  15. Timeline slider
  16. Legend
  17. LoadingScreen
  18. Mobile adaptations
  19. OG image

PHASE 5 — SHIP
  20. Deploy to Vercel
  21. README with screenshots
  22. LinkedIn post

PHASE 6 — BACKFILL (separate effort)
  23. Hockey-Reference scraping for 1917-2010
  24. Merge into existing data pipeline
  25. Recompute layout with full dataset
  26. Update signature path to Howe → McDavid
  27. Redeploy
```

---

## Expected Data Volumes

| Metric | Estimate |
|--------|----------|
| Seasons | 15 (2010-11 to 2025-26) |
| Total games | ~19,500 |
| Total goals (after SO/EN filter) | ~95,000-110,000 |
| Unique scorers | ~5,000-5,500 |
| Unique goalies | ~400-500 |
| Total nodes | ~5,500-6,000 |
| Unique edges (scorer↔goalie pairs) | ~15,000-25,000 |
| nodes.json size | ~1-2MB |
| edges.json size | ~1-3MB |
| positions.json size | ~500KB-1MB |
| **Total browser download** | **~3-6MB** |

---

## Key Gotchas to Watch For

1. **NHL API may not have play-by-play for very old games** even within the 2010+ range. Some early 2010-11 games might have different JSON structure. Handle gracefully — skip games where PBP parse fails and log them.

2. **Player IDs are integers** like 8471214 (Ovechkin). Prefix with "s_" or "g_" in the graph to keep scorer/goalie nodes separate even if the same player appears on both sides (rare but possible — a goalie who also scored, or a skater who played goalie briefly).

3. **The goalie cluster will be DENSE**. ~500 goalies each connected to hundreds of scorers. The yin-yang shape depends on the force parameters — if the link force is too strong, everything collapses into a ball. Start with very weak link strength (0.005) and stronger x-separation force (0.05).

4. **Pre-computed layout might not look like a yin-yang** if using networkx spring_layout. The d3-force headless approach is more reliable because it uses the exact same force model. Consider writing a small Node.js layout script.

5. **Empty net detection**: some NHL API responses may have `goalieInNetId: null` or the field may be entirely absent. Check for BOTH cases when filtering.

6. **Shootout detection**: check `periodDescriptor.periodType === "SHOOTOUT"` — don't rely on period number (period 5+ could be multiple OT in playoffs).
