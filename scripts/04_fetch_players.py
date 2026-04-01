"""
Step 4: Fetch player metadata for all unique player IDs.

Reads player_ids.txt and fetches name, position, birth year from the NHL API.

Output:
  - data/raw/players/{player_id}.json (cached raw responses)
  - data/processed/players.csv (player_id, name, position, birth_year)
"""

import csv
import json
import os
import time
from typing import Optional
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

PLAYER_IDS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "player_ids.txt")
PLAYERS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "players")
PLAYERS_CSV = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "players.csv")

PLAYER_URL = "https://api-web.nhle.com/v1/player/{player_id}/landing"
RATE_LIMIT = 0.5


def fetch_player(player_id: str) -> Optional[dict]:
    """Fetch and cache player info. Returns parsed data or None."""
    cache_path = os.path.join(PLAYERS_DIR, f"{player_id}.json")
    if os.path.exists(cache_path):
        with open(cache_path, "r") as f:
            return json.load(f)

    url = PLAYER_URL.format(player_id=player_id)
    try:
        req = Request(url, headers={"User-Agent": "NHL-Goal-Graph/1.0"})
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        with open(cache_path, "w") as f:
            json.dump(data, f)
        return data
    except (URLError, HTTPError) as e:
        print(f"  Error fetching player {player_id}: {e}")
        return None


def extract_player_info(data: dict, player_id: str) -> dict:
    """Extract relevant fields from player API response."""
    first = data.get("firstName", {}).get("default", "")
    last = data.get("lastName", {}).get("default", "")
    name = f"{first} {last}".strip()
    position = data.get("position", "")
    birth_date = data.get("birthDate", "")
    birth_year = int(birth_date[:4]) if birth_date and len(birth_date) >= 4 else 0

    return {
        "player_id": player_id,
        "name": name,
        "position": position,
        "birth_year": birth_year,
    }


def main():
    os.makedirs(PLAYERS_DIR, exist_ok=True)

    with open(PLAYER_IDS_FILE, "r") as f:
        player_ids = [line.strip() for line in f if line.strip()]

    total = len(player_ids)
    print(f"Total players to fetch: {total}")

    cached = sum(1 for pid in player_ids if os.path.exists(os.path.join(PLAYERS_DIR, f"{pid}.json")))
    print(f"Already cached: {cached}")

    players = []
    errors = 0

    for i, pid in enumerate(player_ids):
        data = fetch_player(pid)
        if data:
            players.append(extract_player_info(data, pid))
        else:
            errors += 1
            players.append({
                "player_id": pid,
                "name": f"Unknown ({pid})",
                "position": "",
                "birth_year": 0,
            })

        if (i + 1) % 500 == 0:
            print(f"  Progress: {i + 1}/{total}")

        # Only sleep if we actually made a request (not cached)
        if not os.path.exists(os.path.join(PLAYERS_DIR, f"{pid}.json")):
            time.sleep(RATE_LIMIT)

    # Write CSV
    with open(PLAYERS_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["player_id", "name", "position", "birth_year"])
        writer.writeheader()
        writer.writerows(players)

    print(f"\nDone! Wrote {len(players)} players to {PLAYERS_CSV} ({errors} errors)")


if __name__ == "__main__":
    main()
