import { getCityNetwork } from "./city-data";
import { findShortestPath } from "./graph";
import { createMetrics, finalizeMetrics } from "./metrics";
import type {
  CandidateEvaluation,
  OptimizationRequest,
  OptimizationResult,
  RouteLocation,
  TimeWindow,
  UnscheduledStop,
} from "./types";

function clampWeight(weight: number) {
  return Number.isFinite(weight) ? Math.max(0, weight) : 0;
}

function findFeasibleWindow(
  timeWindows: TimeWindow[],
  arrivalTimeMin: number,
  visitDurationMin: number,
) {
  for (const window of timeWindows) {
    const startTimeMin = Math.max(arrivalTimeMin, window.startMin);
    const endTimeMin = startTimeMin + visitDurationMin;
    if (endTimeMin <= window.endMin) {
      return {
        window,
        startTimeMin,
        endTimeMin,
        waitTimeMin: Math.max(0, window.startMin - arrivalTimeMin),
      };
    }
  }

  return null;
}

function buildUnscheduledStop(location: RouteLocation, reason: UnscheduledStop["reason"], details: string): UnscheduledStop {
  return {
    locationId: location.id,
    name: location.name,
    reason,
    details,
  };
}

function scoreCandidate(
  location: RouteLocation,
  evaluation: {
    travelTimeMin: number;
    waitTimeMin: number;
    slackTimeMin: number;
  },
  request: OptimizationRequest,
  isRequired: boolean,
) {
  const preferredTags = new Set(request.preferences.preferredTags);
  const avoidedTags = new Set(request.preferences.avoidedTags ?? []);

  const preferenceMatches = location.tags.filter((tag) => preferredTags.has(tag)).length;
  const avoidedMatches = location.tags.filter((tag) => avoidedTags.has(tag)).length;
  const priorityScore = location.priority * clampWeight(request.preferences.priorityWeight) * 10;
  const preferenceScore =
    preferenceMatches * clampWeight(request.preferences.preferenceWeight) * 14 -
    avoidedMatches * clampWeight(request.preferences.preferenceWeight) * 12;
  const valueScore = location.baseScore * 4;
  const travelPenalty = evaluation.travelTimeMin * clampWeight(request.preferences.travelTimeWeight);
  const waitPenalty = evaluation.waitTimeMin * 0.15;
  const urgencyBonus = Math.max(0, 150 - evaluation.slackTimeMin) / 6;
  const requiredBonus = isRequired ? 200 : 0;

  return {
    selectionScore: Number(
      (priorityScore + preferenceScore + valueScore + urgencyBonus + requiredBonus - travelPenalty - waitPenalty).toFixed(
        3,
      ),
    ),
    priorityScore,
    preferenceScore,
    urgencyBonus,
  };
}

function uniqueIds(values: string[]) {
  return [...new Set(values)];
}

export function optimizeRoute(request: OptimizationRequest): OptimizationResult {
  const network = getCityNetwork(request.cityId);
  if (!network) {
    throw new Error(`Unknown city network: ${request.cityId}`);
  }

  const algorithm = request.algorithm ?? "astar";
  const metrics = createMetrics(algorithm);
  const nodesById = Object.fromEntries(network.nodes.map((node) => [node.id, node]));
  const blockedLocationIds = new Set(request.conditions?.blockedLocationIds ?? []);
  const requiredLocationIds = new Set(request.requiredLocationIds ?? []);
  const completedLocationIds = new Set(request.completedLocationIds ?? []);
  const requestedCandidateIds = uniqueIds(request.candidateLocationIds).filter(
    (locationId) => locationId !== request.startNodeId && !completedLocationIds.has(locationId),
  );

  let currentNodeId = request.currentNodeId ?? request.startNodeId;
  let currentTimeMin = request.currentTimeMin;
  const itinerary: OptimizationResult["itinerary"] = [];
  const unscheduledById = new Map<string, UnscheduledStop>();
  const remaining = new Set(requestedCandidateIds);

  while (remaining.size > 0 && itinerary.length < request.preferences.maxStops) {
    const evaluations: CandidateEvaluation[] = [];

    for (const locationId of remaining) {
      const location = nodesById[locationId];
      if (!location) {
        continue;
      }

      metrics.candidateEvaluations += 1;

      if (blockedLocationIds.has(locationId)) {
        unscheduledById.set(
          locationId,
          buildUnscheduledStop(location, "blocked", "Location removed from the graph by dynamic constraints."),
        );
        continue;
      }

      const path = findShortestPath(network, currentNodeId, locationId, request.conditions, metrics, algorithm);
      if (!path) {
        unscheduledById.set(
          locationId,
          buildUnscheduledStop(location, "unreachable", "No traversable path exists under current edge and node constraints."),
        );
        continue;
      }

      const arrivalTimeMin = currentTimeMin + path.totalTravelTimeMin;
      const feasibleWindow = findFeasibleWindow(location.timeWindows, arrivalTimeMin, location.visitDurationMin);

      if (!feasibleWindow) {
        unscheduledById.set(
          locationId,
          buildUnscheduledStop(location, "window_miss", "Arrival cannot satisfy the attraction time window."),
        );
        continue;
      }

      if (feasibleWindow.endTimeMin > request.endTimeMin) {
        unscheduledById.set(
          locationId,
          buildUnscheduledStop(location, "beyond_day_end", "Serving this stop would exceed the itinerary end time."),
        );
        continue;
      }

      const scoring = scoreCandidate(
        location,
        {
          travelTimeMin: path.totalTravelTimeMin,
          waitTimeMin: feasibleWindow.waitTimeMin,
          slackTimeMin: feasibleWindow.window.endMin - feasibleWindow.endTimeMin,
        },
        request,
        requiredLocationIds.has(locationId),
      );

      metrics.feasibleCandidates += 1;
      evaluations.push({
        locationId,
        selectionScore: scoring.selectionScore,
        travelTimeMin: path.totalTravelTimeMin,
        arrivalTimeMin,
        startTimeMin: feasibleWindow.startTimeMin,
        endTimeMin: feasibleWindow.endTimeMin,
        waitTimeMin: feasibleWindow.waitTimeMin,
        urgencyBonus: scoring.urgencyBonus,
        preferenceScore: scoring.preferenceScore,
        priorityScore: scoring.priorityScore,
        path,
      });
    }

    const best = evaluations.sort((left, right) => right.selectionScore - left.selectionScore)[0];
    if (!best) {
      break;
    }

    const location = nodesById[best.locationId];
    itinerary.push({
      locationId: location.id,
      name: location.name,
      description: location.description,
      tags: location.tags,
      travelTimeMin: best.travelTimeMin,
      arrivalTimeMin: best.arrivalTimeMin,
      startTimeMin: best.startTimeMin,
      endTimeMin: best.endTimeMin,
      waitTimeMin: best.waitTimeMin,
      selectionScore: best.selectionScore,
      pathNodeIds: best.path.nodeIds,
      pathEdgeIds: best.path.edgeIds,
    });

    metrics.scheduledStops += 1;
    currentNodeId = location.id;
    currentTimeMin = best.endTimeMin;
    completedLocationIds.add(location.id);
    remaining.delete(location.id);
    unscheduledById.delete(location.id);
  }

  if (remaining.size > 0) {
    for (const locationId of remaining) {
      const location = nodesById[locationId];
      if (!location || unscheduledById.has(locationId)) {
        continue;
      }

      unscheduledById.set(
        locationId,
        buildUnscheduledStop(location, "trimmed_by_max_stops", "Optimization stopped after hitting the configured stop limit."),
      );
    }
  }

  const unscheduled = [...unscheduledById.values()];
  metrics.unscheduledStops = unscheduled.length;

  return {
    cityId: network.cityId,
    cityName: network.cityName,
    algorithm,
    generatedAt: new Date().toISOString(),
    itinerary,
    unscheduled,
    totalTravelTimeMin: itinerary.reduce((sum, stop) => sum + stop.travelTimeMin, 0),
    totalVisitTimeMin: itinerary.reduce((sum, stop) => sum + (stop.endTimeMin - stop.startTimeMin), 0),
    totalWaitTimeMin: itinerary.reduce((sum, stop) => sum + stop.waitTimeMin, 0),
    completedLocationIds: [...completedLocationIds],
    remainingLocationIds: requestedCandidateIds.filter((locationId) => !completedLocationIds.has(locationId)),
    currentNodeId,
    currentTimeMin,
    metrics: finalizeMetrics(metrics),
  };
}

export function rerouteRoute(request: OptimizationRequest): OptimizationResult {
  const result = optimizeRoute(request);
  return {
    ...result,
    metrics: {
      ...result.metrics,
      rerouteCount: result.metrics.rerouteCount + 1,
    },
  };
}
