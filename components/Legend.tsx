"use client";

export default function Legend() {
  return (
    <div className="fixed bottom-4 right-4 z-30 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-xs text-white/60 space-y-1.5 hidden sm:block">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-pink-400" />
        <span>Scorer (goals scored)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-blue-400" />
        <span>Goalie (goals against)</span>
      </div>
      <div className="flex items-center gap-2 text-white/30">
        <div className="flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          <span className="w-3 h-3 rounded-full bg-white/40" />
        </div>
        <span>Size = career goals</span>
      </div>
    </div>
  );
}
