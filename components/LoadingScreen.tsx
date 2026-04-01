"use client";

interface LoadingScreenProps {
  error?: string | null;
}

export default function LoadingScreen({ error }: LoadingScreenProps) {
  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0e27] z-50">
        <div className="text-red-400 text-lg mb-2">Failed to load graph data</div>
        <div className="text-white/40 text-sm max-w-md text-center">{error}</div>
        <div className="text-white/30 text-xs mt-4">
          Make sure the data pipeline has been run (scripts 01-06)
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0e27] z-50">
      <div className="relative w-12 h-12 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 rounded-full border-2 border-t-pink-400 border-r-transparent border-b-transparent border-l-blue-400 animate-spin" />
      </div>
      <div className="text-white/50 text-sm">Loading NHL goal graph...</div>
      <div className="text-white/25 text-xs mt-2">
        Every goal since 2010 &middot; Thousands of players
      </div>
    </div>
  );
}
