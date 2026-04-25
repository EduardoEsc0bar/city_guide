import type { CityNetwork, PathResult, RouteLocation, TravelConditions, TravelEdge } from "./types";
import type { MetricsAccumulator } from "./metrics";

interface QueueItem {
  nodeId: string;
  priority: number;
}

interface EdgeInstance extends TravelEdge {
  travelTimeMin: number;
}

interface GraphIndex {
  nodesById: Record<string, RouteLocation>;
  adjacency: Record<string, EdgeInstance[]>;
}

class MinPriorityQueue {
  private heap: QueueItem[] = [];

  push(item: QueueItem) {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): QueueItem | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop();

    if (last && this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    return top;
  }

  get size() {
    return this.heap.length;
  }

  private bubbleUp(index: number) {
    let currentIndex = index;
    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);
      if (this.heap[parentIndex].priority <= this.heap[currentIndex].priority) {
        break;
      }

      [this.heap[parentIndex], this.heap[currentIndex]] = [this.heap[currentIndex], this.heap[parentIndex]];
      currentIndex = parentIndex;
    }
  }

  private bubbleDown(index: number) {
    let currentIndex = index;

    while (true) {
      const left = currentIndex * 2 + 1;
      const right = currentIndex * 2 + 2;
      let smallest = currentIndex;

      if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }

      if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }

      if (smallest === currentIndex) {
        break;
      }

      [this.heap[currentIndex], this.heap[smallest]] = [this.heap[smallest], this.heap[currentIndex]];
      currentIndex = smallest;
    }
  }
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMeters(a: RouteLocation, b: RouteLocation) {
  const earthRadiusMeters = 6_371_000;
  const dLat = toRadians(b.coordinate.lat - a.coordinate.lat);
  const dLng = toRadians(b.coordinate.lng - a.coordinate.lng);
  const lat1 = toRadians(a.coordinate.lat);
  const lat2 = toRadians(b.coordinate.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}

export function minutesToClock(totalMinutes: number) {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function buildGraphIndex(network: CityNetwork, conditions?: TravelConditions): GraphIndex {
  const nodesById = Object.fromEntries(network.nodes.map((node) => [node.id, node]));
  const adjacency: Record<string, EdgeInstance[]> = {};

  const blockedEdges = new Set<string>();
  const multipliers = conditions?.edgeTravelTimeMultipliers ?? {};
  const offsets = conditions?.edgeTravelTimeOffsetsMin ?? {};

  for (const edge of network.edges) {
    const multiplier = multipliers[edge.id] ?? 1;
    const offset = offsets[edge.id] ?? 0;
    const travelTimeMin = Math.max(1, Math.round(edge.baseTravelTimeMin * multiplier + offset));

    if (!adjacency[edge.from]) {
      adjacency[edge.from] = [];
    }

    adjacency[edge.from].push({ ...edge, travelTimeMin });

    if (edge.bidirectional !== false) {
      if (!adjacency[edge.to]) {
        adjacency[edge.to] = [];
      }

      adjacency[edge.to].push({
        ...edge,
        id: `${edge.id}:reverse`,
        from: edge.to,
        to: edge.from,
        travelTimeMin,
      });
    } else {
      blockedEdges.add(`${edge.id}:reverse`);
    }
  }

  void blockedEdges;

  return { nodesById, adjacency };
}

function estimateRemainingCostMinutes(
  fromNode: RouteLocation,
  toNode: RouteLocation,
  metrics?: MetricsAccumulator,
) {
  if (metrics) {
    metrics.heuristicCalls += 1;
  }

  const distanceMeters = haversineMeters(fromNode, toNode);
  const assumedMetersPerMinute = 85;
  return distanceMeters / assumedMetersPerMinute;
}

export function findShortestPath(
  network: CityNetwork,
  fromNodeId: string,
  toNodeId: string,
  conditions: TravelConditions | undefined,
  metrics: MetricsAccumulator,
  algorithm: "astar" | "dijkstra",
): PathResult | null {
  if (fromNodeId === toNodeId) {
    return {
      nodeIds: [fromNodeId],
      edgeIds: [],
      totalTravelTimeMin: 0,
    };
  }

  metrics.pathComputations += 1;
  const blockedLocationIds = new Set(conditions?.blockedLocationIds ?? []);
  const { nodesById, adjacency } = buildGraphIndex(network, conditions);

  if (!nodesById[fromNodeId] || !nodesById[toNodeId]) {
    return null;
  }

  if (blockedLocationIds.has(fromNodeId) || blockedLocationIds.has(toNodeId)) {
    return null;
  }

  const frontier = new MinPriorityQueue();
  const bestCost = new Map<string, number>([[fromNodeId, 0]]);
  const previousNode = new Map<string, string>();
  const previousEdge = new Map<string, string>();

  frontier.push({ nodeId: fromNodeId, priority: 0 });

  while (frontier.size > 0) {
    const current = frontier.pop();
    if (!current) {
      break;
    }

    const currentKnownCost = bestCost.get(current.nodeId);
    if (currentKnownCost === undefined) {
      continue;
    }

    metrics.nodesExpanded += 1;

    if (current.nodeId === toNodeId) {
      const nodeIds: string[] = [];
      const edgeIds: string[] = [];
      let cursor = toNodeId;

      while (cursor) {
        nodeIds.unshift(cursor);
        const edgeId = previousEdge.get(cursor);
        if (edgeId) {
          edgeIds.unshift(edgeId);
        }
        cursor = previousNode.get(cursor) ?? "";
      }

      return {
        nodeIds,
        edgeIds,
        totalTravelTimeMin: currentKnownCost,
      };
    }

    const edges = adjacency[current.nodeId] ?? [];
    for (const edge of edges) {
      if (blockedLocationIds.has(edge.to)) {
        continue;
      }

      const tentativeCost = currentKnownCost + edge.travelTimeMin;
      const bestKnownForNeighbor = bestCost.get(edge.to);

      if (bestKnownForNeighbor !== undefined && tentativeCost >= bestKnownForNeighbor) {
        continue;
      }

      metrics.edgesRelaxed += 1;
      bestCost.set(edge.to, tentativeCost);
      previousNode.set(edge.to, current.nodeId);
      previousEdge.set(edge.to, edge.id);

      const heuristic =
        algorithm === "astar"
          ? estimateRemainingCostMinutes(nodesById[edge.to], nodesById[toNodeId], metrics)
          : 0;

      frontier.push({
        nodeId: edge.to,
        priority: tentativeCost + heuristic,
      });
    }
  }

  return null;
}
