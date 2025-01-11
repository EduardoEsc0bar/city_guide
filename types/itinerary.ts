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

