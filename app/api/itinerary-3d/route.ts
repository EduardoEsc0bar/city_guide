import { NextResponse } from "next/server"

import {
  geocodeDestination,
  geocodeItineraryStops,
  getWalkingRouteCoordinates,
  hasMapboxServerToken,
} from "@/lib/mapbox-server"
import type { Itinerary3DResponse, ItineraryStop } from "@/types/itinerary"

interface Itinerary3DRequestBody {
  destination?: string
  stops?: ItineraryStop[]
}

export async function POST(req: Request) {
  try {
    if (!hasMapboxServerToken()) {
      return NextResponse.json(
        {
          error:
            "Mapbox is not configured. Set MAPBOX_ACCESS_TOKEN and NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to enable 3D mode.",
        },
        { status: 503 },
      )
    }

    const body = (await req.json()) as Itinerary3DRequestBody
    const destination = body.destination?.trim()
    const stops = Array.isArray(body.stops) ? body.stops : []

    if (!destination) {
      return NextResponse.json({ error: "Destination is required." }, { status: 400 })
    }

    if (stops.length === 0) {
      const emptyResponse: Itinerary3DResponse = {
        center: null,
        routeCoordinates: [],
        stops: [],
      }

      return NextResponse.json(emptyResponse)
    }

    const center = await geocodeDestination(destination)
    const enrichedStops = await geocodeItineraryStops(destination, stops, center)
    const routeCoordinates = await getWalkingRouteCoordinates(enrichedStops)

    const response: Itinerary3DResponse = {
      center,
      routeCoordinates,
      stops: enrichedStops,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Failed to prepare itinerary 3D data:", error)
    return NextResponse.json({ error: "Failed to prepare the 3D itinerary experience." }, { status: 500 })
  }
}
