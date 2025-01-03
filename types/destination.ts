export interface Destination {
    id: string
    name: string
    image: string
    description: string
    rating: number
    tags: string[]
    coordinates: {
      lat: number
      lng: number
    }
    attractions: Attraction[]
  }
  
  export interface Attraction {
    id: string
    name: string
    image: string
    description: string
    rating: number
    category: string
    price: string
    duration: string
    address: string
  }
  
  export interface Itinerary {
    id: string
    userId: string
    destination: Destination
    startDate: Date
    endDate: Date
    attractions: Attraction[]
    mustSees: string[]
    accommodation: {
      name: string
      address: string
      coordinates: {
        lat: number
        lng: number
      }
    }
  }
  
  