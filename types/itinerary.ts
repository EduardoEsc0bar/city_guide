export interface ItineraryActivity {
    name: string;
    time: string;
    description: string;
    transportation?: string;
    address?: string;
    startTime?: string;
    duration?: number;
  }
  
  export interface ItinerarySection {
    title: string;
    activities: ItineraryActivity[];
  }
  
  export interface ItineraryDay {
    dayNumber: number;
    sections: ItinerarySection[];
    activities?: ItineraryActivity[]; // For compatibility with custom-built itineraries
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
  
  
  
  
  
  
  
  