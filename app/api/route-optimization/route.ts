import { NextResponse } from "next/server";

import { optimizeRoute, rerouteRoute } from "@/lib/route-optimization/engine";
import { ROUTE_ENGINE_CITY_CATALOG, getCityNetwork } from "@/lib/route-optimization/city-data";
import type { OptimizationRequest } from "@/lib/route-optimization/types";

function validateRequest(body: Partial<OptimizationRequest>) {
  if (!body.cityId || !getCityNetwork(body.cityId)) {
    return "A valid cityId is required.";
  }

  if (!body.startNodeId) {
    return "startNodeId is required.";
  }

  if (!Array.isArray(body.candidateLocationIds) || body.candidateLocationIds.length === 0) {
    return "candidateLocationIds must include at least one node.";
  }

  if (typeof body.currentTimeMin !== "number" || typeof body.endTimeMin !== "number") {
    return "currentTimeMin and endTimeMin must be numbers.";
  }

  if (!body.preferences) {
    return "preferences are required.";
  }

  return null;
}

export async function GET() {
  return NextResponse.json({
    cities: ROUTE_ENGINE_CITY_CATALOG,
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      mode?: "optimize" | "reroute";
      request?: OptimizationRequest;
    };

    const request = body.request;
    if (!request) {
      return NextResponse.json({ error: "request payload is required." }, { status: 400 });
    }

    const validationError = validateRequest(request);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const result = body.mode === "reroute" ? rerouteRoute(request) : optimizeRoute(request);

    console.info(
      JSON.stringify({
        subsystem: "route-optimization",
        cityId: request.cityId,
        mode: body.mode ?? "optimize",
        algorithm: result.algorithm,
        itineraryStops: result.itinerary.length,
        unscheduledStops: result.unscheduled.length,
        metrics: result.metrics,
      }),
    );

    return NextResponse.json({
      result,
    });
  } catch (error) {
    console.error("Route optimization request failed:", error);
    return NextResponse.json({ error: "Route optimization failed." }, { status: 500 });
  }
}
