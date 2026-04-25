import test from "node:test";
import assert from "node:assert/strict";

import { getCityNetwork } from "../../lib/route-optimization/city-data";
import { optimizeRoute, rerouteRoute } from "../../lib/route-optimization/engine";
import { findShortestPath } from "../../lib/route-optimization/graph";
import { createMetrics } from "../../lib/route-optimization/metrics";

test("A* finds the lowest-cost path on the city graph", () => {
  const network = getCityNetwork("barcelona-core");
  assert.ok(network);

  const metrics = createMetrics("astar");
  const path = findShortestPath(network, "bcn-hotel", "montjuic", undefined, metrics, "astar");

  assert.ok(path);
  assert.equal(path.totalTravelTimeMin, 40);
  assert.deepEqual(path.nodeIds, ["bcn-hotel", "gothic-quarter", "boqueria-market", "montjuic"]);
});

test("scheduler rejects nodes whose time windows cannot be met", () => {
  const result = optimizeRoute({
    cityId: "barcelona-core",
    algorithm: "astar",
    startNodeId: "bcn-hotel",
    currentTimeMin: 14 * 60 + 30,
    endTimeMin: 19 * 60,
    candidateLocationIds: ["boqueria-market", "sagrada-familia"],
    requiredLocationIds: ["boqueria-market"],
    preferences: {
      preferredTags: ["food"],
      priorityWeight: 1,
      preferenceWeight: 1,
      travelTimeWeight: 0.5,
      maxStops: 3,
    },
  });

  assert.equal(result.itinerary.some((stop) => stop.locationId === "boqueria-market"), false);
  assert.equal(
    result.unscheduled.some((stop) => stop.locationId === "boqueria-market" && stop.reason === "window_miss"),
    true,
  );
  assert.equal(result.itinerary.some((stop) => stop.locationId === "sagrada-familia"), true);
});

test("preference weighting changes which feasible stop is chosen first", () => {
  const scenicResult = optimizeRoute({
    cityId: "barcelona-core",
    algorithm: "astar",
    startNodeId: "bcn-hotel",
    currentTimeMin: 9 * 60,
    endTimeMin: 19 * 60,
    candidateLocationIds: ["park-guell", "picasso-museum"],
    preferences: {
      preferredTags: ["scenic"],
      priorityWeight: 0.2,
      preferenceWeight: 2,
      travelTimeWeight: 0.1,
      maxStops: 1,
    },
  });

  const artResult = optimizeRoute({
    cityId: "barcelona-core",
    algorithm: "astar",
    startNodeId: "bcn-hotel",
    currentTimeMin: 9 * 60,
    endTimeMin: 19 * 60,
    candidateLocationIds: ["park-guell", "picasso-museum"],
    preferences: {
      preferredTags: ["art"],
      priorityWeight: 0.2,
      preferenceWeight: 2,
      travelTimeWeight: 0.1,
      maxStops: 1,
    },
  });

  assert.equal(scenicResult.itinerary[0]?.locationId, "park-guell");
  assert.equal(artResult.itinerary[0]?.locationId, "picasso-museum");
});

test("rerouting removes blocked attractions and recomputes the remaining plan", () => {
  const rerouted = rerouteRoute({
    cityId: "barcelona-core",
    algorithm: "astar",
    startNodeId: "bcn-hotel",
    currentTimeMin: 9 * 60,
    endTimeMin: 19 * 60,
    candidateLocationIds: ["sagrada-familia", "gothic-quarter", "picasso-museum"],
    requiredLocationIds: ["sagrada-familia", "gothic-quarter"],
    preferences: {
      preferredTags: ["history"],
      priorityWeight: 1,
      preferenceWeight: 1,
      travelTimeWeight: 0.5,
      maxStops: 3,
    },
    conditions: {
      blockedLocationIds: ["sagrada-familia"],
    },
  });

  assert.equal(rerouted.itinerary.some((stop) => stop.locationId === "sagrada-familia"), false);
  assert.equal(
    rerouted.unscheduled.some((stop) => stop.locationId === "sagrada-familia" && stop.reason === "blocked"),
    true,
  );
  assert.equal(rerouted.metrics.rerouteCount, 1);
});
