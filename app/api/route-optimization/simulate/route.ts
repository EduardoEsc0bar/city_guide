import { NextResponse } from "next/server";

import { rerouteRoute } from "@/lib/route-optimization/engine";
import { simulateConditions } from "@/lib/route-optimization/simulator";
import type { SimulationRequest } from "@/lib/route-optimization/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SimulationRequest;
    if (!body.baseRequest) {
      return NextResponse.json({ error: "baseRequest is required." }, { status: 400 });
    }

    const simulation = simulateConditions(body);
    const rerouted = rerouteRoute(simulation.updatedRequest);

    return NextResponse.json({
      events: simulation.events,
      updatedRequest: simulation.updatedRequest,
      result: {
        ...rerouted,
        metrics: {
          ...rerouted.metrics,
          simulationEventsApplied: simulation.events.length,
        },
      },
    });
  } catch (error) {
    console.error("Simulation request failed:", error);
    return NextResponse.json({ error: "Simulation failed." }, { status: 500 });
  }
}
