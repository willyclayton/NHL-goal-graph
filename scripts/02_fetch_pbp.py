"""
Step 2: Fetch play-by-play JSON for every game.

Reads game_ids.txt and downloads PBP data from the NHL API.
Skips games that already have a cached file (resume-safe).

Output: data/raw/pbp/{game_id}.json (~19,500 files, 15-20GB total)
Runtime: ~5-6 hours at 1 req/sec
"""

import json
import os
import time
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

GAME_IDS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "game_ids.txt")
PBP_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "pbp")
ERROR_LOG = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "fetch_errors.txt")

PBP_URL = "https://api-web.nhle.com/v1/gamecenter/{game_id}/play-by-play"
RATE_LIMIT = 1.0  # seconds between requests


def fetch_pbp(game_id: str) -> bool:
    """Fetch and cache play-by-play for a single game. Returns True on success."""
    out_path = os.path.join(PBP_DIR, f"{game_id}.json")
    if os.path.exists(out_path):
        return True

    url = PBP_URL.format(game_id=game_id)
    try:
        req = Request(url, headers={"User-Agent": "NHL-Goal-Graph/1.0"})
        with urlopen(req, timeout=30) as resp:
            data = resp.read()
        # Validate it's parseable JSON
        json.loads(data)
        with open(out_path, "wb") as f:
            f.write(data)
        return True
    except (URLError, HTTPError, json.JSONDecodeError) as e:
        return False


def main():
    os.makedirs(PBP_DIR, exist_ok=True)

    with open(GAME_IDS_FILE, "r") as f:
        game_ids = [line.strip() for line in f if line.strip()]

    total = len(game_ids)
    print(f"Total games to fetch: {total}")

    # Count already cached
    cached = sum(1 for gid in game_ids if os.path.exists(os.path.join(PBP_DIR, f"{gid}.json")))
    print(f"Already cached: {cached}")
    print(f"Remaining: {total - cached}\n")

    errors = []
    fetched = 0

    for i, game_id in enumerate(game_ids):
        out_path = os.path.join(PBP_DIR, f"{game_id}.json")
        if os.path.exists(out_path):
            continue

        success = fetch_pbp(game_id)
        if success:
            fetched += 1
        else:
            errors.append(game_id)
            print(f"  ERROR: {game_id}")

        if (fetched + len(errors)) % 100 == 0:
            print(f"  Progress: {cached + fetched + len(errors)}/{total} "
                  f"(fetched: {fetched}, errors: {len(errors)})")

        time.sleep(RATE_LIMIT)

    # Log errors
    if errors:
        with open(ERROR_LOG, "w") as f:
            for gid in errors:
                f.write(f"{gid}\n")
        print(f"\n{len(errors)} errors logged to {ERROR_LOG}")

    print(f"\nDone! Fetched {fetched} new games. Total cached: {cached + fetched}")


if __name__ == "__main__":
    main()
