/**
 * BFS shortest path between two nodes in the graph.
 * Returns array of node IDs forming the path, or null if no path exists.
 */
export function bfs(
  start: string,
  end: string,
  adjacency: Map<string, string[]>
): string[] | null {
  if (start === end) return [start];
  if (!adjacency.has(start) || !adjacency.has(end)) return null;

  const visited = new Set<string>([start]);
  const parent = new Map<string, string>();
  const queue: string[] = [start];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent.set(neighbor, current);

      if (neighbor === end) {
        // Reconstruct path
        const path: string[] = [end];
        let node = end;
        while (node !== start) {
          node = parent.get(node)!;
          path.unshift(node);
        }
        return path;
      }

      queue.push(neighbor);
    }
  }

  return null;
}
