# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive bipartite network graph visualizing every NHL goal since 2010. Scorers on one side, goalies on the other, edges connect who scored on whom. Users click any two players to find the shortest path linking them (degrees of separation). Greenfield project — the spec (`NHL_GOAL_GRAPH_FINAL_SPEC.md`) is the source of truth for all design decisions.

## Tech Stack

- **Frontend:** Next.js 14+ (App Router, TypeScript), Canvas rendering (not SVG), D3.js v7 for force simulation/zoom, Tailwind CSS, Fuse.js for search
- **Data Pipeline:** Python 3 (6 sequential scripts in `scripts/`)
- **Deployment:** Vercel

## Build & Run Commands

```bash
# Frontend
npm install
npm run dev          # local dev server
npm run build        # production build
npm run lint         # ESLint

# Data pipeline (must run in order, each depends on previous output)
python scripts/01_fetch_game_ids.py    # ~19,500 game IDs → data/processed/game_ids.txt
python scripts/02_fetch_pbp.py         # play-by-play JSONs → data/raw/pbp/ (5-6 hours)
python scripts/03_extract_goals.py     # parse goals → data/processed/goals.csv
python scripts/04_fetch_players.py     # player metadata → data/processed/players.csv
python scripts/05_build_graph.py       # graph JSON → public/data/nodes.json + edges.json
python scripts/06_compute_layout.py    # pre-computed positions → public/data/positions.json
```

## Architecture

### Data Flow
NHL API → Python pipeline → CSV → graph JSON (`public/data/`) → browser loads on mount → Canvas render

### Graph Structure
- **Bipartite layout:** Scorers right (x: 0.5–1.0), Goalies left (x: 0–0.5)
- **Nodes:** ~5,500–6,000 (prefixed IDs: `s_{id}` for scorers, `g_{id}` for goalies to handle players appearing on both sides)
- **Edges:** ~15,000–25,000 unique (scorer, goalie) pairs, binary (no weight)
- **Rendering:** Canvas-based with frustum culling, quadtree hit detection, Web Worker for force simulation

### Key Components
- `components/Graph.tsx` — main canvas renderer, zoom/pan, hover/click interaction
- `components/SearchBar.tsx` — Cmd+K fuzzy search via Fuse.js
- `components/PathDisplay.tsx` — BFS shortest path result overlay
- `lib/pathfinding.ts` — BFS shortest path algorithm
- `lib/graph-worker.ts` — Web Worker running d3-force simulation off-thread

## Important Constraints

- **Pre-computed layout is critical:** Without `positions.json`, browser spends 30-60s computing layout on load. Always regenerate after data changes.
- **Empty net detection:** NHL API returns `goalieInNetId: null` or missing — check both cases.
- **Shootout filtering:** Use `periodDescriptor.periodType === "SHOOTOUT"`, not period number.
- **API rate limits:** 0.5s between schedule requests, 1 req/sec for play-by-play.
- **JSON budget:** Total browser download (nodes + edges + positions) must stay under 10MB.
- **Labels only render** when zoom > 2.5x and node count > threshold.
- **Mobile:** Skip edge rendering when node count > 3000 and zoom < 1x.

## NHL API Endpoints

- Schedule: `https://api-web.nhle.com/v1/schedule/{date}`
- Play-by-Play: `https://api-web.nhle.com/v1/gamecenter/{game_id}/play-by-play`
- Player Info: `https://api-web.nhle.com/v1/player/{player_id}/landing`
