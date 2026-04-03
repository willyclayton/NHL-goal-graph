import { useState, useEffect } from "react";
import type { GoalRecord } from "./dashboard-types";

let cachedGoals: GoalRecord[] | null = null;

export function useGoalsData() {
  const [goals, setGoals] = useState<GoalRecord[]>(cachedGoals ?? []);
  const [loading, setLoading] = useState(!cachedGoals);

  useEffect(() => {
    if (cachedGoals) return;

    fetch("/data/goals_detailed.json")
      .then((res) => res.json())
      .then((data: GoalRecord[]) => {
        cachedGoals = data;
        setGoals(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load goals data:", err);
        setLoading(false);
      });
  }, []);

  return { goals, loading };
}
