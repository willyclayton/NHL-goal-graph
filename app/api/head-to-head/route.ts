import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import type { H2HRecord } from "@/lib/dashboard-types";

// Cache parsed files in memory for the lifetime of the serverless function
const cache = new Map<number, H2HRecord[]>();

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const scorerId = parseInt(searchParams.get("scorer") ?? "");
  const goalieId = parseInt(searchParams.get("goalie") ?? "");

  if (isNaN(scorerId) || isNaN(goalieId)) {
    return NextResponse.json(
      { error: "scorer and goalie query params required" },
      { status: 400 }
    );
  }

  try {
    // Load scorer's h2h file (from cache or disk)
    let records = cache.get(scorerId);
    if (!records) {
      const filePath = path.join(
        process.cwd(),
        "data",
        "processed",
        "h2h",
        `${scorerId}.json`
      );
      const raw = await readFile(filePath, "utf-8");
      records = JSON.parse(raw) as H2HRecord[];
      cache.set(scorerId, records);
    }

    // Filter to the specific goalie
    const goals: H2HRecord[] = [];
    const saves: H2HRecord[] = [];

    for (const r of records) {
      if (r.g !== goalieId) continue;
      if (r.type === "goal") goals.push(r);
      else saves.push(r);
    }

    return NextResponse.json({ goals, saves });
  } catch {
    // File not found = no data for this scorer
    return NextResponse.json({ goals: [], saves: [] });
  }
}
