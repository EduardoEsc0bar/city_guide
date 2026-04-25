"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowRightLeft, Clock3, Map, Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OptimizationRequest, OptimizationResult, SimulationEvent } from "@/lib/route-optimization/types";
import { minutesToClock } from "@/lib/route-optimization/graph";

interface CatalogNode {
  id: string;
  name: string;
  kind: string;
  tags: string[];
  priority: number;
  visitDurationMin: number;
  timeWindows: { startMin: number; endMin: number; label?: string }[];
}

interface CatalogCity {
  cityId: string;
  cityName: string;
  description: string;
  defaultStartNodeId: string;
  nodes: CatalogNode[];
  edges: number;
}

const defaultWeights = {
  priorityWeight: 1.2,
  preferenceWeight: 1,
  travelTimeWeight: 0.65,
  maxStops: 4,
};

function clockToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function windowLabel(startMin: number, endMin: number) {
  return `${minutesToClock(startMin)}-${minutesToClock(endMin)}`;
}

export function RouteOptimizationWorkbench() {
  const [cities, setCities] = useState<CatalogCity[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [requiredLocationIds, setRequiredLocationIds] = useState<string[]>([]);
  const [preferredTag, setPreferredTag] = useState("architecture");
  const [algorithm, setAlgorithm] = useState<"astar" | "dijkstra">("astar");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("19:00");
  const [priorityWeight, setPriorityWeight] = useState(defaultWeights.priorityWeight);
  const [preferenceWeight, setPreferenceWeight] = useState(defaultWeights.preferenceWeight);
  const [travelTimeWeight, setTravelTimeWeight] = useState(defaultWeights.travelTimeWeight);
  const [maxStops, setMaxStops] = useState(defaultWeights.maxStops);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [lastRequest, setLastRequest] = useState<OptimizationRequest | null>(null);
  const [simulationEvents, setSimulationEvents] = useState<SimulationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const response = await fetch("/api/route-optimization");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load route optimization catalog.");
        }

        setCities(data.cities);
        if (data.cities.length > 0) {
          setSelectedCityId(data.cities[0].cityId);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load scenarios.");
      }
    };

    loadCatalog();
  }, []);

  useEffect(() => {
    const city = cities.find((entry) => entry.cityId === selectedCityId);
    if (!city) {
      return;
    }

    const candidateIds = city.nodes
      .filter((node) => node.kind !== "origin")
      .map((node) => node.id);

    setSelectedLocationIds(candidateIds);
    setRequiredLocationIds(candidateIds.slice(0, 2));
    setPreferredTag(city.nodes.find((node) => node.kind !== "origin")?.tags[0] ?? "history");
    setResult(null);
    setSimulationEvents([]);
    setLastRequest(null);
    setError(null);
  }, [selectedCityId, cities]);

  const selectedCity = cities.find((entry) => entry.cityId === selectedCityId) ?? null;
  const availableTags = selectedCity
    ? [...new Set(selectedCity.nodes.flatMap((node) => node.tags).filter((tag) => tag !== "origin" && tag !== "logistics"))]
    : [];

  const buildRequest = (): OptimizationRequest | null => {
    if (!selectedCity) {
      return null;
    }

    return {
      cityId: selectedCity.cityId,
      algorithm,
      startNodeId: selectedCity.defaultStartNodeId,
      currentTimeMin: clockToMinutes(startTime),
      endTimeMin: clockToMinutes(endTime),
      candidateLocationIds: selectedLocationIds,
      requiredLocationIds,
      preferences: {
        preferredTags: preferredTag ? [preferredTag] : [],
        priorityWeight,
        preferenceWeight,
        travelTimeWeight,
        maxStops,
      },
      conditions: {
        blockedLocationIds: [],
        edgeTravelTimeOffsetsMin: {},
      },
    };
  };

  const runOptimization = async (mode: "optimize" | "reroute" = "optimize") => {
    const request = buildRequest();
    if (!request) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/route-optimization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode, request }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Optimization failed.");
      }

      setLastRequest(request);
      setResult(data.result);
      setSimulationEvents([]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Optimization failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const runSimulation = async () => {
    if (!lastRequest) {
      await runOptimization("optimize");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/route-optimization/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseRequest: lastRequest,
          intensity: "medium",
          seed: 17,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Simulation failed.");
      }

      setSimulationEvents(data.events);
      setLastRequest(data.updatedRequest);
      setResult(data.result);
    } catch (simulationError) {
      setError(simulationError instanceof Error ? simulationError.message : "Simulation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLocation = (locationId: string) => {
    setSelectedLocationIds((current) =>
      current.includes(locationId) ? current.filter((id) => id !== locationId) : [...current, locationId],
    );
    setRequiredLocationIds((current) => current.filter((id) => id !== locationId));
  };

  const toggleRequired = (locationId: string) => {
    if (!selectedLocationIds.includes(locationId)) {
      return;
    }

    setRequiredLocationIds((current) =>
      current.includes(locationId) ? current.filter((id) => id !== locationId) : [...current, locationId],
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Systems Workbench</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Route Optimization Engine</h1>
          <p className="max-w-3xl text-slate-600">
            CityGuide now treats itinerary planning as a constrained routing problem. This workbench exercises a
            backend engine that models cities as graphs, runs A* or Dijkstra, honors time windows and preferences, and
            reroutes when simulated disruptions change the operating conditions.
          </p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Inputs</CardTitle>
              <CardDescription>Configure the graph, constraints, and scoring weights for a planning run.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Scenario City Graph</label>
                  <Select value={selectedCityId} onValueChange={setSelectedCityId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a city graph" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.cityId} value={city.cityId}>
                          {city.cityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCity && <p className="text-xs text-slate-500">{selectedCity.description}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Shortest-Path Algorithm</label>
                  <Select value={algorithm} onValueChange={(value) => setAlgorithm(value as "astar" | "dijkstra")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="astar">A* (heuristic guided)</SelectItem>
                      <SelectItem value="dijkstra">Dijkstra (baseline)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Execution Start</label>
                  <input
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Execution End</label>
                  <input
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Preferred Tag</label>
                  <Select value={preferredTag} onValueChange={setPreferredTag}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Max Scheduled Stops</label>
                  <input
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    type="number"
                    min={1}
                    max={8}
                    value={maxStops}
                    onChange={(event) => setMaxStops(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Priority Weight: {priorityWeight.toFixed(2)}</label>
                  <input
                    className="w-full"
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={priorityWeight}
                    onChange={(event) => setPriorityWeight(Number(event.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Preference Weight: {preferenceWeight.toFixed(2)}
                  </label>
                  <input
                    className="w-full"
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={preferenceWeight}
                    onChange={(event) => setPreferenceWeight(Number(event.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Travel Penalty Weight: {travelTimeWeight.toFixed(2)}
                  </label>
                  <input
                    className="w-full"
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={travelTimeWeight}
                    onChange={(event) => setTravelTimeWeight(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-slate-700">Candidate Stops</h3>
                  <p className="text-xs text-slate-500">
                    Choose the graph nodes to consider and mark high-priority required stops.
                  </p>
                </div>
                <div className="grid gap-3">
                  {selectedCity?.nodes
                    .filter((node) => node.kind !== "origin")
                    .map((node) => {
                      const isSelected = selectedLocationIds.includes(node.id);
                      const isRequired = requiredLocationIds.includes(node.id);

                      return (
                        <div
                          key={node.id}
                          className={`rounded-lg border p-4 ${isSelected ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-slate-900">{node.name}</span>
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                                  p{node.priority}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                  {node.visitDurationMin} min
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                {node.tags.map((tag) => (
                                  <span key={tag} className="rounded-full border border-slate-200 px-2 py-0.5">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-slate-500">
                                Windows: {node.timeWindows.map((window) => windowLabel(window.startMin, window.endMin)).join(", ")}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                onClick={() => toggleLocation(node.id)}
                              >
                                {isSelected ? "Included" : "Include"}
                              </Button>
                              <Button
                                type="button"
                                variant={isRequired ? "default" : "outline"}
                                onClick={() => toggleRequired(node.id)}
                                disabled={!isSelected}
                              >
                                Must Visit
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => runOptimization("optimize")} disabled={isLoading || !selectedCity}>
                  <Map className="mr-2 h-4 w-4" />
                  {isLoading ? "Running..." : "Compute Optimized Route"}
                </Button>
                <Button variant="outline" onClick={runSimulation} disabled={isLoading || !selectedCity}>
                  <Shuffle className="mr-2 h-4 w-4" />
                  Inject Simulation Step
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Graph Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Nodes</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{selectedCity?.nodes.length ?? 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Edges</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{selectedCity?.edges ?? 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Candidates</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{selectedLocationIds.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Required</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{requiredLocationIds.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Why This Matters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>Shortest paths come from an explicit city graph, not Google Maps waypoint sorting.</p>
                <p>Scheduling decisions balance time windows, value, travel cost, and preference weighting.</p>
                <p>Simulation re-runs the planner after node closures and edge delays to show dynamic rerouting.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Runtime Metrics
              </CardTitle>
              <CardDescription>Instrumentation for latency, search effort, and scheduling output.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Latency</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {result ? `${result.metrics.elapsedMs.toFixed(2)} ms` : "--"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Path Computations</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{result?.metrics.pathComputations ?? "--"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Nodes Expanded</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{result?.metrics.nodesExpanded ?? "--"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Edges Relaxed</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{result?.metrics.edgesRelaxed ?? "--"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Travel</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {result ? `${result.totalTravelTimeMin} min` : "--"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Wait</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {result ? `${result.totalWaitTimeMin} min` : "--"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Dynamic Events
              </CardTitle>
              <CardDescription>Simulation output that forces a recomputation of the remaining itinerary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {simulationEvents.length === 0 && (
                <p className="text-sm text-slate-500">No dynamic events applied yet. Run an optimization, then inject a simulation step.</p>
              )}
              {simulationEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{event.type}</p>
                  <p className="mt-1">{event.summary}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Optimized Itinerary</CardTitle>
              <CardDescription>Ordered route chosen by the engine under the current constraint set.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!result && <p className="text-sm text-slate-500">Run the engine to view scheduled stops.</p>}
              {result?.itinerary.map((stop, index) => (
                <div key={stop.locationId} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Stop {index + 1}</p>
                      <h3 className="text-lg font-semibold text-slate-900">{stop.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{stop.description}</p>
                    </div>
                    <div className="rounded-lg bg-slate-100 px-3 py-2 text-right text-sm text-slate-700">
                      <div className="flex items-center gap-1">
                        <Clock3 className="h-4 w-4" />
                        <span>
                          {minutesToClock(stop.startTimeMin)}-{minutesToClock(stop.endTimeMin)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Travel</p>
                      <p>{stop.travelTimeMin} min</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Arrival</p>
                      <p>{minutesToClock(stop.arrivalTimeMin)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Wait</p>
                      <p>{stop.waitTimeMin} min</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Selection Score</p>
                      <p>{stop.selectionScore.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Constraint Fallout</CardTitle>
              <CardDescription>Locations rejected because of windows, blockages, or max-stop limits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!result && <p className="text-sm text-slate-500">No diagnostics yet.</p>}
              {result?.unscheduled.length === 0 && result && (
                <p className="text-sm text-slate-500">All selected stops fit under the current constraint profile.</p>
              )}
              {result?.unscheduled.map((stop) => (
                <div key={stop.locationId} className="rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{stop.name}</p>
                  <p className="mt-1 uppercase tracking-wide text-slate-500">{stop.reason}</p>
                  <p className="mt-1">{stop.details}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
