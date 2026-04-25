import { performance } from "node:perf_hooks";

import type { EngineMetrics, OptimizationAlgorithm } from "./types";

export interface MetricsAccumulator extends EngineMetrics {
  startedAtMs: number;
}

export function createMetrics(algorithm: OptimizationAlgorithm): MetricsAccumulator {
  return {
    algorithm,
    startedAtMs: performance.now(),
    elapsedMs: 0,
    pathComputations: 0,
    nodesExpanded: 0,
    edgesRelaxed: 0,
    heuristicCalls: 0,
    candidateEvaluations: 0,
    feasibleCandidates: 0,
    scheduledStops: 0,
    unscheduledStops: 0,
    rerouteCount: 0,
    simulationEventsApplied: 0,
  };
}

export function finalizeMetrics(metrics: MetricsAccumulator): EngineMetrics {
  return {
    algorithm: metrics.algorithm,
    elapsedMs: Number((performance.now() - metrics.startedAtMs).toFixed(3)),
    pathComputations: metrics.pathComputations,
    nodesExpanded: metrics.nodesExpanded,
    edgesRelaxed: metrics.edgesRelaxed,
    heuristicCalls: metrics.heuristicCalls,
    candidateEvaluations: metrics.candidateEvaluations,
    feasibleCandidates: metrics.feasibleCandidates,
    scheduledStops: metrics.scheduledStops,
    unscheduledStops: metrics.unscheduledStops,
    rerouteCount: metrics.rerouteCount,
    simulationEventsApplied: metrics.simulationEventsApplied,
  };
}
