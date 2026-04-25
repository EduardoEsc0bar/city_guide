"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { AnimatePresence, motion } from "framer-motion"
import type { FeatureCollection, LineString } from "geojson"
import {
  AlertTriangle,
  Clock3,
  MapPin,
  Milestone,
  Navigation,
  Pause,
  Play,
  Sparkles,
} from "lucide-react"
import mapboxgl, { type GeoJSONSource, type Map as MapboxMap, type Marker as MapboxMarker } from "mapbox-gl"

import { Button } from "@/components/ui/button"
import { buildMapboxStaticPreviewUrl } from "@/lib/itinerary-3d"
import { cn } from "@/lib/utils"
import type { Itinerary3DResponse, ItineraryStop } from "@/types/itinerary"

const MAPBOX_PUBLIC_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null

const ROUTE_SOURCE_ID = "myictl-route-source"
const ROUTE_GLOW_LAYER_ID = "myictl-route-glow"
const ROUTE_CORE_LAYER_ID = "myictl-route-core"

interface Itinerary3DViewProps {
  className?: string
  dayNumber: number
  destination: string
  stops: ItineraryStop[]
}

interface MarkerEntry {
  element: HTMLButtonElement
  marker: MapboxMarker
}

function buildRouteFeatureCollection(routeCoordinates: [number, number][]): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features:
      routeCoordinates.length >= 2
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: routeCoordinates,
              },
            },
          ]
        : [],
  } as const
}

function formatTimeLabel(stop: ItineraryStop) {
  if (stop.startTime && stop.endTime) {
    return `${stop.startTime} – ${stop.endTime}`
  }

  return stop.time || "Time flexible"
}

export default function Itinerary3DView({
  className,
  dayNumber,
  destination,
  stops,
}: Itinerary3DViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const markersRef = useRef<Record<string, MarkerEntry>>({})
  const hasShownOverviewRef = useRef(false)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeStopId, setActiveStopId] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<"steps" | "summary">("steps")
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [visualization, setVisualization] = useState<Itinerary3DResponse>({
    center: null,
    routeCoordinates: [],
    stops: [],
  })

  const stopSignature = useMemo(
    () => JSON.stringify(stops.map((stop) => [stop.id, stop.name, stop.address, stop.time])),
    [stops],
  )

  const activeStop = useMemo(
    () => visualization.stops.find((stop) => stop.id === activeStopId) ?? null,
    [activeStopId, visualization.stops],
  )

  const summary = useMemo(() => {
    const geocodedStops = visualization.stops.filter((stop) => stop.lat != null && stop.lng != null)

    return {
      totalStops: visualization.stops.length,
      mappedStops: geocodedStops.length,
      firstStop: visualization.stops[0] ?? null,
      lastStop: visualization.stops[visualization.stops.length - 1] ?? null,
    }
  }, [visualization.stops])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !MAPBOX_PUBLIC_TOKEN) {
      return
    }

    mapboxgl.accessToken = MAPBOX_PUBLIC_TOKEN

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: [2.3522, 48.8566],
      zoom: 12.5,
      pitch: 62,
      bearing: -18,
      antialias: true,
      attributionControl: false,
    })

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-left")
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right")

    map.on("load", () => {
      setIsMapLoaded(true)
    })

    mapRef.current = map

    return () => {
      Object.values(markersRef.current).forEach(({ marker }) => marker.remove())
      markersRef.current = {}
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!MAPBOX_PUBLIC_TOKEN) {
      setError("Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to unlock the 3D itinerary experience.")
      return
    }

    if (stops.length === 0) {
      setVisualization({ center: null, routeCoordinates: [], stops: [] })
      setActiveStopId(null)
      setError(null)
      return
    }

    const abortController = new AbortController()

    const loadVisualization = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/itinerary-3d", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            destination,
            dayNumber,
            stops,
          }),
          signal: abortController.signal,
        })

        const data = (await response.json()) as Itinerary3DResponse & { error?: string }

        if (!response.ok) {
          throw new Error(data.error || "Unable to render the itinerary in 3D.")
        }

        setVisualization(data)
        setActiveStopId((current) => current ?? data.stops[0]?.id ?? null)
        hasShownOverviewRef.current = false
      } catch (requestError) {
        if (abortController.signal.aborted) {
          return
        }

        setError(requestError instanceof Error ? requestError.message : "Unable to render the itinerary in 3D.")
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadVisualization()

    return () => abortController.abort()
  }, [dayNumber, destination, stopSignature, stops])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapLoaded) {
      return
    }

    const routeCoordinates =
      visualization.routeCoordinates.length > 1
        ? visualization.routeCoordinates
        : visualization.stops
            .filter((stop) => stop.lng != null && stop.lat != null)
            .map((stop) => [stop.lng as number, stop.lat as number] as [number, number])

    const routeFeatureCollection = buildRouteFeatureCollection(routeCoordinates)

    if (map.getSource(ROUTE_SOURCE_ID)) {
      ;(map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource).setData(routeFeatureCollection)
    } else {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: routeFeatureCollection,
      })

      map.addLayer({
        id: ROUTE_GLOW_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        slot: "middle",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#7c3aed",
          "line-opacity": 0.42,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            5,
            16,
            16,
          ],
          "line-blur": 1.6,
        },
      })

      map.addLayer({
        id: ROUTE_CORE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        slot: "middle",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#d8b4fe",
          "line-opacity": 0.95,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            2.5,
            16,
            6,
          ],
        },
      })
    }

    Object.values(markersRef.current).forEach(({ marker }) => marker.remove())
    markersRef.current = {}

    visualization.stops
      .filter((stop) => stop.lng != null && stop.lat != null)
      .forEach((stop) => {
        const element = document.createElement("button")
        element.type = "button"
        element.className = "myictl-stop-marker"
        element.innerHTML = `<span>${stop.order}</span>`
        element.setAttribute("aria-label", `Focus stop ${stop.order}: ${stop.name}`)
        element.addEventListener("click", () => {
          setActiveStopId(stop.id)
          setIsAutoPlaying(false)
        })

        const marker = new mapboxgl.Marker({
          element,
          anchor: "bottom",
        })
          .setLngLat([stop.lng as number, stop.lat as number])
          .addTo(map)

        markersRef.current[stop.id] = { marker, element }
      })

    const bounds = new mapboxgl.LngLatBounds()
    routeCoordinates.forEach((coordinate) => bounds.extend(coordinate))
    if (bounds.isEmpty() && visualization.center) {
      bounds.extend([visualization.center.lng, visualization.center.lat])
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 72, right: 72, bottom: 72, left: 72 },
        pitch: 58,
        bearing: -18,
        duration: 1400,
      })
      hasShownOverviewRef.current = true
    }
  }, [isMapLoaded, visualization])

  useEffect(() => {
    Object.entries(markersRef.current).forEach(([stopId, markerEntry]) => {
      markerEntry.element.classList.toggle("is-active", stopId === activeStopId)
    })
  }, [activeStopId])

  useEffect(() => {
    if (!hasShownOverviewRef.current) {
      return
    }

    const map = mapRef.current
    if (!map || !activeStop || activeStop.lng == null || activeStop.lat == null) {
      return
    }

    map.flyTo({
      center: [activeStop.lng, activeStop.lat],
      zoom: 16.2,
      pitch: 68,
      bearing: activeStop.order % 2 === 0 ? 26 : -24,
      speed: 0.6,
      essential: true,
    })
  }, [activeStop])

  useEffect(() => {
    if (!isAutoPlaying || visualization.stops.length < 2) {
      return
    }

    const geocodedStops = visualization.stops.filter((stop) => stop.lng != null && stop.lat != null)
    if (geocodedStops.length < 2) {
      return
    }

    const interval = window.setInterval(() => {
      setActiveStopId((current) => {
        const currentIndex = geocodedStops.findIndex((stop) => stop.id === current)
        const nextIndex = currentIndex === -1 || currentIndex === geocodedStops.length - 1 ? 0 : currentIndex + 1
        return geocodedStops[nextIndex].id
      })
    }, 2600)

    return () => window.clearInterval(interval)
  }, [isAutoPlaying, visualization.stops])

  return (
    <div
      className={cn(
        "grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_360px]",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top,_rgba(167,139,250,0.18),_transparent_38%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(242,247,255,0.92))] p-3 shadow-[0_30px_70px_-40px_rgba(88,28,135,0.45)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">MYICTL</p>
            <h3 className="text-xl font-semibold text-slate-900">Day {dayNumber} in living 3D</h3>
            <p className="text-sm text-slate-500">Fly through your route, inspect each stop, and keep the itinerary list synced.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-violet-200 bg-white/70"
              onClick={() => setIsAutoPlaying((current) => !current)}
              disabled={visualization.stops.length < 2}
            >
              {isAutoPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isAutoPlaying ? "Pause Flythrough" : "Autoplay Route"}
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] border border-slate-200/70 bg-slate-950/95">
          <div ref={mapContainerRef} className="myictl-map h-[560px] w-full" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.22),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.10),_rgba(15,23,42,0)_24%,rgba(15,23,42,0.18)_100%)]" />

          <AnimatePresence>
            {activeStop && (
              <motion.div
                key={activeStop.id}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={{ duration: 0.22 }}
                className="absolute bottom-5 left-5 z-10 w-[min(360px,calc(100%-2.5rem))] rounded-3xl border border-white/20 bg-slate-950/78 p-4 text-white shadow-2xl backdrop-blur-xl"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">{activeStop.sectionTitle}</p>
                    <h4 className="mt-1 text-xl font-semibold">{activeStop.name}</h4>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-300">
                      <Clock3 className="h-4 w-4" />
                      {formatTimeLabel(activeStop)}
                    </p>
                  </div>
                  <div className="rounded-full bg-violet-500/20 px-3 py-1 text-sm font-semibold text-violet-100">
                    Stop {activeStop.order}
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-200">{activeStop.description || "Tap around the city to inspect the rest of your itinerary."}</p>
                <p className="mt-3 text-sm text-violet-100/90">{activeStop.address}</p>
                {activeStop.transportation && (
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-300">{activeStop.transportation}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm font-medium text-white">
                Bringing your itinerary to life...
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-x-5 top-5 z-20 rounded-2xl border border-red-300/50 bg-red-500/15 px-4 py-3 text-sm text-white backdrop-blur">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-red-200" />
                <div>
                  <p className="font-medium text-red-100">3D view unavailable</p>
                  <p className="mt-1 text-red-50/90">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="rounded-[28px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-slate-50 p-1">
          <button
            type="button"
            className={cn(
              "flex-1 rounded-xl px-4 py-2 text-sm font-medium transition",
              activePanel === "steps" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500",
            )}
            onClick={() => setActivePanel("steps")}
          >
            Itinerary Steps
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 rounded-xl px-4 py-2 text-sm font-medium transition",
              activePanel === "summary" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500",
            )}
            onClick={() => setActivePanel("summary")}
          >
            Summary
          </button>
        </div>

        {activePanel === "steps" ? (
          <div className="space-y-3">
            {visualization.stops.map((stop) => {
              const previewUrl = buildMapboxStaticPreviewUrl(stop, MAPBOX_PUBLIC_TOKEN)
              const isActive = stop.id === activeStopId

              return (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => {
                    setActiveStopId(stop.id)
                    setIsAutoPlaying(false)
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition",
                    isActive
                      ? "border-violet-300 bg-violet-50 shadow-[0_12px_28px_-24px_rgba(109,40,217,0.75)]"
                      : "border-slate-200 hover:border-violet-200 hover:bg-slate-50",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white">
                    {stop.order}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{stop.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatTimeLabel(stop)}</p>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        {previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl}
                            alt={stop.name}
                            className="h-16 w-24 object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-24 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.24),_transparent_46%),linear-gradient(135deg,_#e2e8f0,_#f8fafc)] text-slate-500">
                            <MapPin className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{stop.description}</p>
                  </div>
                </button>
              )
            })}

            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm text-violet-700">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4" />
                <p>Click any stop in the 3D map or this list to move the camera and inspect the route in detail.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Route Summary</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Stops mapped</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.mappedStops}/{summary.totalStops}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Window</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {summary.firstStop ? formatTimeLabel(summary.firstStop) : "Flexible"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {summary.lastStop ? `Ends around ${summary.lastStop.endTime ?? summary.lastStop.time}` : destination}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Experience</p>
                  <p className="mt-2 flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Navigation className="h-4 w-4 text-violet-600" />
                    Drone-style camera transitions
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Route rendering</p>
                  <p className="mt-2 flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Milestone className="h-4 w-4 text-violet-600" />
                    Glowing walking path
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
