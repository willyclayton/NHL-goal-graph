"use client";

import { useCallback } from "react";
import { YEAR_MIN, YEAR_MAX } from "@/lib/constants";

interface TimelineProps {
  yearRange: [number, number];
  onChange: (range: [number, number]) => void;
}

export default function Timeline({ yearRange, onChange }: TimelineProps) {
  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.min(Number(e.target.value), yearRange[1]);
      onChange([val, yearRange[1]]);
    },
    [yearRange, onChange]
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(Number(e.target.value), yearRange[0]);
      onChange([yearRange[0], val]);
    },
    [yearRange, onChange]
  );

  const handleReset = useCallback(() => {
    onChange([YEAR_MIN, YEAR_MAX]);
  }, [onChange]);

  const isFiltered = yearRange[0] !== YEAR_MIN || yearRange[1] !== YEAR_MAX;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 max-w-md w-[90vw]">
      <span className="text-white/50 text-xs font-mono w-10 text-right">
        {yearRange[0]}
      </span>
      <div className="flex-1 flex flex-col gap-1 relative">
        {/* Gradient track */}
        <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-30" />
        <input
          type="range"
          min={YEAR_MIN}
          max={YEAR_MAX}
          value={yearRange[0]}
          onChange={handleStartChange}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-6"
          style={{ top: "-6px" }}
          aria-label="Start year"
        />
        <input
          type="range"
          min={YEAR_MIN}
          max={YEAR_MAX}
          value={yearRange[1]}
          onChange={handleEndChange}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-6"
          style={{ top: "6px" }}
          aria-label="End year"
        />
      </div>
      <span className="text-white/50 text-xs font-mono w-10">{yearRange[1]}</span>
      {isFiltered && (
        <button
          onClick={handleReset}
          className="text-white/40 hover:text-white text-xs transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  );
}
