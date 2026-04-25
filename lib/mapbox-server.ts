import "server-only"

import type { Coordinates, ItineraryStop } from "@/types/itinerary"

const serverToken =
  process.env.MAPBOX_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null

interface MapboxGeocodeFeature {
  geometry?: {
    coordinates?: [number, number]
  }
  properties?: {
    coordinates?: {
      latitude?: number
      longitude?: number
    }
  }
}

interface MapboxGeocodeResponse {
  features?: MapboxGeocodeFeature[]
}

interface MapboxDirectionsResponse {
  routes?: Array<{
    geometry?: {
      coordinates?: [number, number][]
    }
  }>
}

function getServerToken() {
  if (!serverToken) {
    throw new Error("Mapbox access token is not configured")
  }

  return serverToken
}

function extractCoordinates(feature?: MapboxGeocodeFeature | null): Coordinates | null {
  if (feature?.geometry?.coordinates?.length === 2) {
    return {
      lng: feature.geometry.coordinates[0],
      lat: feature.geometry.coordinates[1],
    }
  }

  if (feature?.properties?.coordinates?.latitude != null && feature.properties.coordinates.longitude != null) {
    return {
      lng: feature.properties.coordinates.longitude,
      lat: feature.properties.coordinates.latitude,
    }
  }

  return null
}

async function requestMapboxJson<T>(url: URL) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 60 * 60,
    },
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Mapbox request failed (${response.status}): ${details}`)
  }

  return (await response.json()) as T
}

export function hasMapboxServerToken() {
  return Boolean(serverToken)
}

export async function geocodeDestination(destination: string): Promise<Coordinates | null> {
  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward")
  url.searchParams.set("q", destination)
  url.searchParams.set("types", "place,locality,postcode,address")
  url.searchParams.set("limit", "1")
  url.searchParams.set("access_token", getServerToken())

  const data = await requestMapboxJson<MapboxGeocodeResponse>(url)
  return extractCoordinates(data.features?.[0])
}

export async function geocodeItineraryStops(
  destination: string,
  stops: ItineraryStop[],
  proximity?: Coordinates | null,
) {
  const token = getServerToken()

  return Promise.all(
    stops.map(async (stop) => {
      const query = `${stop.address}, ${destination}`
      const url = new URL("https://api.mapbox.com/search/geocode/v6/forward")
      url.searchParams.set("q", query)
      url.searchParams.set("types", "address,street,place,locality,postcode")
      url.searchParams.set("limit", "1")
      url.searchParams.set("access_token", token)
      if (proximity) {
        url.searchParams.set("proximity", `${proximity.lng},${proximity.lat}`)
      }

      try {
        const data = await requestMapboxJson<MapboxGeocodeResponse>(url)
        const coordinates = extractCoordinates(data.features?.[0])

        if (!coordinates) {
          return stop
        }

        return {
          ...stop,
          lat: coordinates.lat,
          lng: coordinates.lng,
        }
      } catch (error) {
        console.error(`Failed to geocode itinerary stop "${stop.name}":`, error)
        return stop
      }
    }),
  )
}

export async function getWalkingRouteCoordinates(stops: ItineraryStop[]) {
  const routedStops = stops.filter((stop) => stop.lat != null && stop.lng != null)

  if (routedStops.length < 2) {
    return routedStops.map((stop) => [stop.lng as number, stop.lat as number] as [number, number])
  }

  const coordinates = routedStops.map((stop) => `${stop.lng},${stop.lat}`).join(";")
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}`)
  url.searchParams.set("access_token", getServerToken())
  url.searchParams.set("geometries", "geojson")
  url.searchParams.set("overview", "full")
  url.searchParams.set("steps", "false")

  try {
    const data = await requestMapboxJson<MapboxDirectionsResponse>(url)
    return data.routes?.[0]?.geometry?.coordinates ?? []
  } catch (error) {
    console.error("Failed to fetch walking route from Mapbox:", error)
    return routedStops.map((stop) => [stop.lng as number, stop.lat as number] as [number, number])
  }
}
