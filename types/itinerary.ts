export interface ItineraryActivity {
  name: string;
  time: string;
  duration: number;
  description: string;
  transportation?: string;
  address?: string;
}

export interface ItinerarySection {
  title: string;
  activities: ItineraryActivity[];
}

export interface ItineraryDay {
  dayNumber: number;
  sections: ItinerarySection[];
}

export interface ItineraryStop extends Location {
  id: string;
  dayNumber: number;
  order: number;
  sectionTitle: string;
  description: string;
  transportation?: string;
  time: string;
  startTime?: string;
  endTime?: string;
  lat?: number;
  lng?: number;
  imageUrl?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Itinerary3DResponse {
  center: Coordinates | null;
  routeCoordinates: [number, number][];
  stops: ItineraryStop[];
}

export interface Restaurant {
  name: string;
  address: string;
  rating: number;
}

export interface Accommodation {
  name: string;
  address: string;
  rating: number;
}

export interface Location {
  name: string;
  address: string;
}
