import { optimizeRoute } from "../lib/route-optimization/engine";
import { getCityNetwork } from "../lib/route-optimization/city-data";

interface BenchmarkSummary {
  algorithm: "astar" | "dijkstra";
  averageLatencyMs: number;
  p95LatencyMs: number;
  averageNodesExpanded: number;
  averageEdgesRelaxed: number;
  averageScheduledStops: number;
}

function percentile(values: number[], percentileValue: number) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * percentileValue));
  return sorted[index];
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function runBench(algorithm: "astar" | "dijkstra"): BenchmarkSummary {
  const latencies: number[] = [];
  const nodesExpanded: number[] = [];
  const edgesRelaxed: number[] = [];
  const scheduledStops: number[] = [];
  const cityIds = ["barcelona-core", "tokyo-circuit"] as const;
  const preferredTags = ["history", "art", "scenic", "food", "technology"];

  for (let iteration = 0; iteration < 150; iteration += 1) {
    const cityId = cityIds[iteration % cityIds.length];
    const network = getCityNetwork(cityId);
    if (!network) {
      throw new Error(`Unknown benchmark city: ${cityId}`);
    }

    const candidateLocationIds = network.nodes.filter((node) => node.kind !== "origin").map((node) => node.id);
    const preferredTag = preferredTags[iteration % preferredTags.length];
    const result = optimizeRoute({
      cityId,
      algorithm,
      startNodeId: network.defaultStartNodeId,
      currentTimeMin: 9 * 60,
      endTimeMin: 19 * 60,
      candidateLocationIds,
      requiredLocationIds: candidateLocationIds.slice(0, 2),
      preferences: {
        preferredTags: [preferredTag],
        priorityWeight: 1 + (iteration % 4) * 0.15,
        preferenceWeight: 0.8 + (iteration % 3) * 0.25,
        travelTimeWeight: 0.5 + (iteration % 5) * 0.08,
        maxStops: 4 + (iteration % 2),
      },
    });

    latencies.push(result.metrics.elapsedMs);
    nodesExpanded.push(result.metrics.nodesExpanded);
    edgesRelaxed.push(result.metrics.edgesRelaxed);
    scheduledStops.push(result.itinerary.length);
  }

  return {
    algorithm,
    averageLatencyMs: Number(average(latencies).toFixed(3)),
    p95LatencyMs: Number(percentile(latencies, 0.95).toFixed(3)),
    averageNodesExpanded: Number(average(nodesExpanded).toFixed(2)),
    averageEdgesRelaxed: Number(average(edgesRelaxed).toFixed(2)),
    averageScheduledStops: Number(average(scheduledStops).toFixed(2)),
  };
}

const summaries = [runBench("astar"), runBench("dijkstra")];

console.table(summaries);
