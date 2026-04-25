import { getCityNetwork } from "./city-data";
import type {
  OptimizationRequest,
  SimulationEvent,
  SimulationIntensity,
  SimulationRequest,
  SimulationResult,
} from "./types";

function createDeterministicRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function pick<T>(items: T[], rng: () => number) {
  if (items.length === 0) {
    return undefined;
  }

  const index = Math.floor(rng() * items.length);
  return items[index];
}

function eventCountForIntensity(intensity: SimulationIntensity) {
  switch (intensity) {
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

export function applySimulationEvents(
  request: OptimizationRequest,
  events: SimulationEvent[],
): OptimizationRequest {
  const blockedLocationIds = new Set(request.conditions?.blockedLocationIds ?? []);
  const edgeTravelTimeOffsetsMin = {
    ...(request.conditions?.edgeTravelTimeOffsetsMin ?? {}),
  };
  const preferredTags = [...request.preferences.preferredTags];

  for (const event of events) {
    if (event.type === "location_closure" && event.locationId) {
      blockedLocationIds.add(event.locationId);
    }

    if (event.type === "edge_delay" && event.edgeId && typeof event.delayMin === "number") {
      edgeTravelTimeOffsetsMin[event.edgeId] = (edgeTravelTimeOffsetsMin[event.edgeId] ?? 0) + event.delayMin;
    }

    if (event.type === "preference_shift" && event.nextPreferredTag && !preferredTags.includes(event.nextPreferredTag)) {
      preferredTags.unshift(event.nextPreferredTag);
    }
  }

  return {
    ...request,
    preferences: {
      ...request.preferences,
      preferredTags,
    },
    conditions: {
      ...request.conditions,
      blockedLocationIds: [...blockedLocationIds],
      edgeTravelTimeOffsetsMin,
    },
  };
}

export function simulateConditions(request: SimulationRequest): SimulationResult {
  const network = getCityNetwork(request.baseRequest.cityId);
  if (!network) {
    throw new Error(`Unknown city network: ${request.baseRequest.cityId}`);
  }

  const intensity = request.intensity ?? "medium";
  const rng = createDeterministicRng(request.seed ?? 42);
  const availableLocations = network.nodes.filter(
    (node) =>
      node.kind !== "origin" &&
      request.baseRequest.candidateLocationIds.includes(node.id) &&
      !(request.baseRequest.conditions?.blockedLocationIds ?? []).includes(node.id),
  );
  const availableEdges = network.edges.filter((edge) =>
    request.baseRequest.candidateLocationIds.includes(edge.from) ||
    request.baseRequest.candidateLocationIds.includes(edge.to) ||
    edge.from === request.baseRequest.startNodeId,
  );

  const events: SimulationEvent[] = [];
  const totalEvents = eventCountForIntensity(intensity);

  for (let index = 0; index < totalEvents; index += 1) {
    if (index === 0 && availableLocations.length > 0) {
      const closed = pick(availableLocations, rng);
      if (closed) {
        events.push({
          id: `event-${index + 1}`,
          type: "location_closure",
          locationId: closed.id,
          summary: `${closed.name} became unavailable during execution.`,
        });
      }
      continue;
    }

    if (index === 1 && availableEdges.length > 0) {
      const delayedEdge = pick(availableEdges, rng);
      const delayMin = intensity === "high" ? 14 : 8;
      if (delayedEdge) {
        events.push({
          id: `event-${index + 1}`,
          type: "edge_delay",
          edgeId: delayedEdge.id,
          delayMin,
          summary: `${delayedEdge.id} incurred a ${delayMin}-minute transit delay.`,
        });
      }
      continue;
    }

    const nextPreferredTag = pick(["scenic", "food", "art", "history", "technology"], rng);
    if (nextPreferredTag) {
      events.push({
        id: `event-${index + 1}`,
        type: "preference_shift",
        nextPreferredTag,
        summary: `User priorities shifted toward ${nextPreferredTag} stops.`,
      });
    }
  }

  return {
    events,
    updatedRequest: applySimulationEvents(request.baseRequest, events),
  };
}
