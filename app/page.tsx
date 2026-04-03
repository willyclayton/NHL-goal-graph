"use client";

import { useState } from "react";
import GoalHeatmapTab from "@/components/dashboard/GoalHeatmapTab";
import CareerArcTab from "@/components/dashboard/CareerArcTab";
import HeadToHeadTab from "@/components/dashboard/HeadToHeadTab";

const tabs = [
  { id: "goal-map", label: "Goal Map", icon: GoalMapIcon },
  { id: "career-arcs", label: "Career Arcs", icon: CareerArcsIcon },
  { id: "head-to-head", label: "Head to Head", icon: HeadToHeadIcon },
] as const;

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("goal-map");

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Header — compact on mobile */}
      <header className="shrink-0 border-b border-border/30 px-4 md:px-8 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold tracking-tight">
            NHL Stats
          </h1>
          {/* Desktop tab bar inline with header */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-muted/60 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
          <a
            href="/graph"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden md:block"
          >
            Network Graph &rarr;
          </a>
        </div>
      </header>

      {/* Tab content — fills remaining space, scrolls internally */}
      <main className="flex-1 overflow-y-auto px-3 md:px-8 py-4 md:py-6 pb-[72px] md:pb-6">
        {activeTab === "goal-map" && <GoalHeatmapTab />}
        {activeTab === "career-arcs" && <CareerArcTab />}
        {activeTab === "head-to-head" && <HeadToHeadTab />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden shrink-0 bg-background/95 backdrop-blur-md border-t border-border/30 mobile-safe-bottom z-50">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function GoalMapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
    </svg>
  );
}

function CareerArcsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function HeadToHeadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
