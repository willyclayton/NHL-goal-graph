"""
Step 1: Fetch all NHL game IDs from 2010-11 through 2025-26.

Hits the NHL schedule API day by day for each season, collects unique game IDs
for regular season (gameType=2) and playoff (gameType=3) games.

Output: data/processed/game_ids.txt (~19,500 IDs, one per line)
"""

import json
import os
import time
from datetime import date, timedelta
from typing import Optional, List, Dict
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "schedules")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "game_ids.txt")

# Seasons: 2010-11 through 2025-26
# Each season runs roughly from early October to late June
SEASONS = []
for start_year in range(2010, 2026):
    SEASONS.append({
        "label": f"{start_year}-{str(start_year + 1)[-2:]}",
        "start": date(start_year, 10, 1),
        "end": date(start_year + 1, 7, 15),
    })

SCHEDULE_URL = "https://api-web.nhle.com/v1/schedule/{date}"
RATE_LIMIT = 0.5  # seconds between requests


def fetch_schedule(d: date) -> Optional[dict]:
    """Fetch schedule for a given date, with caching."""
    cache_path = os.path.join(RAW_DIR, f"{d.isoformat()}.json")
    if os.path.exists(cache_path):
        with open(cache_path, "r") as f:
            return json.load(f)

    url = SCHEDULE_URL.format(date=d.isoformat())
    try:
        req = Request(url, headers={"User-Agent": "NHL-Goal-Graph/1.0"})
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        with open(cache_path, "w") as f:
            json.dump(data, f)
        return data
    except (URLError, HTTPError) as e:
        print(f"  Error fetching {d}: {e}")
        return None


def extract_game_ids(schedule_data: dict) -> List[int]:
    """Extract regular season and playoff game IDs from schedule response."""
    ids = []
    for week in schedule_data.get("gameWeek", []):
        for game in week.get("games", []):
            game_type = game.get("gameType")
            if game_type in (2, 3):  # regular season or playoffs
                game_id = game.get("id")
                if game_id:
                    ids.append(game_id)
    return ids


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    all_ids = set()

    for season in SEASONS:
        print(f"\nSeason {season['label']}:")
        season_count = 0
        current = season["start"]

        while current <= season["end"]:
            data = fetch_schedule(current)
            if data:
                ids = extract_game_ids(data)
                new_ids = [i for i in ids if i not in all_ids]
                all_ids.update(new_ids)
                season_count += len(new_ids)

            # The schedule API returns a full week, so skip ahead 7 days
            current += timedelta(days=7)
            time.sleep(RATE_LIMIT)

        print(f"  Found {season_count} new games (total: {len(all_ids)})")

    # Write sorted game IDs
    sorted_ids = sorted(all_ids)
    with open(OUTPUT_FILE, "w") as f:
        for gid in sorted_ids:
            f.write(f"{gid}\n")

    print(f"\nDone! Wrote {len(sorted_ids)} game IDs to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
