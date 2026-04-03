import { useState, useEffect } from "react";
import type { H2HResponse } from "./dashboard-types";

export function useHeadToHead(scorerId: number | null, goalieId: number | null) {
  const [data, setData] = useState<H2HResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scorerId || !goalieId) {
      setData(null);
      return;
    }

    setLoading(true);
    fetch(`/api/head-to-head?scorer=${scorerId}&goalie=${goalieId}`)
      .then((res) => res.json())
      .then((d: H2HResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load head-to-head data:", err);
        setLoading(false);
      });
  }, [scorerId, goalieId]);

  return { data, loading };
}
