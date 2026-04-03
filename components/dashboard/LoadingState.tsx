"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function RinkSkeleton() {
  return (
    <div className="w-full aspect-[100/85] bg-card/30 rounded-xl border border-border/20 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      <div className="space-y-3 text-center">
        <div className="w-16 h-16 mx-auto rounded-full border-2 border-muted-foreground/20 border-t-primary/40 animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading goal data...
        </p>
      </div>
    </div>
  );
}

export function FiltersSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="w-full h-full min-h-[300px] bg-card/30 rounded-xl border border-border/20 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      <div className="space-y-3 text-center">
        <div className="w-16 h-16 mx-auto rounded-full border-2 border-muted-foreground/20 border-t-primary/40 animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading data...
        </p>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-card/70 border border-border/30 rounded-xl p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
