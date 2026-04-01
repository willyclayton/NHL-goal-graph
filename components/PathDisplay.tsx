"use client";

import type { GraphNode } from "@/lib/types";

interface PathDisplayProps {
  path: string[];
  nodeMap: Map<string, GraphNode>;
  onClickNode: (node: GraphNode) => void;
  onClose: () => void;
}

export default function PathDisplay({ path, nodeMap, onClickNode, onClose }: PathDisplayProps) {
  const degrees = path.length - 1;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-black/85 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3 shadow-xl max-w-[90vw]">
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-amber-200 font-semibold text-sm">
          {degrees} degree{degrees !== 1 ? "s" : ""} of separation
        </span>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors text-lg leading-none"
          aria-label="Close"
        >
          &times;
        </button>
      </div>
      <div className="flex items-center gap-1 flex-wrap text-sm">
        {path.map((nodeId, i) => {
          const node = nodeMap.get(nodeId);
          if (!node) return null;
          return (
            <span key={nodeId} className="flex items-center gap-1">
              <button
                onClick={() => onClickNode(node)}
                className={`hover:underline font-medium ${
                  node.type === "goalie" ? "text-amber-300" : "text-sky-400"
                }`}
              >
                {node.name}
              </button>
              {i < path.length - 1 && (
                <span className="text-amber-200/70 mx-0.5">&rarr;</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
