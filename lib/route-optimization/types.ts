export type OptimizationAlgorithm = "astar" | "dijkstra";
export type TravelMode = "walk" | "transit" | "bike";
export type SimulationIntensity = "low" | "medium" | "high";

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface TimeWindow {
  startMin: number;
  endMin: number;
  label?: string;
}

export interface RouteLocation {
  id: string;
  cityId: string;
  name: string;
  description: string;
  kind: "origin" | "attraction" | "food" | "hub";
  coordinate: Coordinate;
  visitDurationMin: number;
  priority: number;
  baseScore: number;
  tags: string[];
  timeWindows: TimeWindow[];
}

export interface TravelEdge {
  id: string;
  from: string;
  to: string;
  mode: TravelMode;
  distanceMeters: number;
  baseTravelTimeMin: number;
  bidirectional?: boolean;
}

export interface CityNetwork {
  cityId: string;
  cityName: string;
  description: string;
  defaultStartNodeId: string;
  nodes: RouteLocation[];
  edges: TravelEdge[];
}

export interface OptimizationPreferences {
  preferredTags: string[];
  avoidedTags?: string[];
  priorityWeight: number;
  preferenceWeight: number;
  travelTimeWeight: number;
  maxStops: number;
}

export interface TravelConditions {
  blockedLocationIds?: string[];
  edgeTravelTimeMultipliers?: Record<string, number>;
  edgeTravelTimeOffsetsMin?: Record<string, number>;
}

export interface OptimizationRequest {
  cityId: string;
  algorithm?: OptimizationAlgorithm;
  startNodeId: string;
  currentNodeId?: string;
  currentTimeMin: number;
  endTimeMin: number;
  candidateLocationIds: string[];
  requiredLocationIds?: string[];
  completedLocationIds?: string[];
  preferences: OptimizationPreferences;
  conditions?: TravelConditions;
}

export interface PathResult {
  nodeIds: string[];
  edgeIds: string[];
  totalTravelTimeMin: number;
}

export interface CandidateEvaluation {
  locationId: string;
  selectionScore: number;
  travelTimeMin: number;
  arrivalTimeMin: number;
  startTimeMin: number;
  endTimeMin: number;
  waitTimeMin: number;
  urgencyBonus: number;
  preferenceScore: number;
  priorityScore: number;
  path: PathResult;
}

export interface ScheduledStop {
  locationId: string;
  name: string;
  description: string;
  tags: string[];
  travelTimeMin: number;
  arrivalTimeMin: number;
  startTimeMin: number;
  endTimeMin: number;
  waitTimeMin: number;
  selectionScore: number;
  pathNodeIds: string[];
  pathEdgeIds: string[];
}

export interface UnscheduledStop {
  locationId: string;
  name: string;
  reason: "blocked" | "unreachable" | "window_miss" | "beyond_day_end" | "trimmed_by_max_stops";
  details: string;
}

export interface EngineMetrics {
  algorithm: OptimizationAlgorithm;
  elapsedMs: number;
  pathComputations: number;
  nodesExpanded: number;
  edgesRelaxed: number;
  heuristicCalls: number;
  candidateEvaluations: number;
  feasibleCandidates: number;
  scheduledStops: number;
  unscheduledStops: number;
  rerouteCount: number;
  simulationEventsApplied: number;
}

export interface OptimizationResult {
  cityId: string;
  cityName: string;
  algorithm: OptimizationAlgorithm;
  generatedAt: string;
  itinerary: ScheduledStop[];
  unscheduled: UnscheduledStop[];
  totalTravelTimeMin: number;
  totalVisitTimeMin: number;
  totalWaitTimeMin: number;
  completedLocationIds: string[];
  remainingLocationIds: string[];
  currentNodeId: string;
  currentTimeMin: number;
  metrics: EngineMetrics;
}

export interface SimulationEvent {
  id: string;
  type: "location_closure" | "edge_delay" | "preference_shift";
  summary: string;
  locationId?: string;
  edgeId?: string;
  delayMin?: number;
  nextPreferredTag?: string;
}

export interface SimulationRequest {
  baseRequest: OptimizationRequest;
  intensity?: SimulationIntensity;
  seed?: number;
}

export interface SimulationResult {
  events: SimulationEvent[];
  updatedRequest: OptimizationRequest;
}
