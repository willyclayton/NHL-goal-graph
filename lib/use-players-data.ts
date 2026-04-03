import { useState, useEffect, useMemo } from "react";
import Fuse from "fuse.js";
import type { PlayerEnriched } from "./dashboard-types";

let cachedPlayers: PlayerEnriched[] | null = null;

export function usePlayersData() {
  const [players, setPlayers] = useState<PlayerEnriched[]>(
    cachedPlayers ?? []
  );
  const [loading, setLoading] = useState(!cachedPlayers);

  useEffect(() => {
    if (cachedPlayers) return;

    fetch("/data/players_enriched.json")
      .then((res) => res.json())
      .then((data: PlayerEnriched[]) => {
        cachedPlayers = data;
        setPlayers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load players data:", err);
        setLoading(false);
      });
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(players, {
        keys: ["name"],
        threshold: 0.3,
        distance: 100,
      }),
    [players]
  );

  return { players, loading, fuse };
}
