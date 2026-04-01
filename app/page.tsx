"use client";

import { useGraphData } from "@/lib/useGraphData";
import Graph from "@/components/Graph";
import LoadingScreen from "@/components/LoadingScreen";

export default function Home() {
  const { data, loading, error } = useGraphData();

  if (loading || error || !data) {
    return <LoadingScreen error={error} />;
  }

  return <Graph data={data} />;
}
