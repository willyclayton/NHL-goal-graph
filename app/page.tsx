"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/30 px-4 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              NHL Stats
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every goal since 2010
            </p>
          </div>
          <a
            href="/graph"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden md:block"
          >
            Network Graph &rarr;
          </a>
        </div>
      </header>

      {/* Main content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        {/* Desktop tabs */}
        <div className="border-b border-border/20 px-4 md:px-8 hidden md:block">
          <TabsList className="bg-transparent h-12 gap-1 p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-muted/50 data-[state=active]:text-foreground text-muted-foreground rounded-t-lg rounded-b-none px-4 h-10 gap-2 transition-colors border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab content */}
        <div className="flex-1 px-4 md:px-8 py-6 pb-20 md:pb-6">
          <TabsContent value="goal-map" className="h-full mt-0">
            <GoalHeatmapTab />
          </TabsContent>
          <TabsContent value="career-arcs" className="h-full mt-0">
            <CareerArcTab />
          </TabsContent>
          <TabsContent value="head-to-head" className="h-full mt-0">
            <HeadToHeadTab />
          </TabsContent>
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border/30 px-2 py-2 z-50">
          <TabsList className="bg-transparent w-full h-auto gap-0 p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex-1 flex flex-col items-center gap-1 py-2 text-[10px] data-[state=active]:text-primary text-muted-foreground data-[state=active]:bg-transparent rounded-lg"
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
}

// Simple SVG icons
function GoalMapIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function HeadToHeadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
