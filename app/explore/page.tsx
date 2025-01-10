"use client"

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { DestinationCard } from "@/components/destination-card"

const popularDestinations = [
  {
    id: "1",
    name: "New York City",
    image: "/nyc.jpg",
    description: "Experience the vibrant culture and iconic landmarks of the Big Apple.",
    rating: 4.8,
    tags: ["Urban", "Culture", "Food"],
  },
  {
    id: "2",
    name: "Paris",
    image: "/paris.jpg",
    description: "Discover the romance and beauty of the City of Light.",
    rating: 4.9,
    tags: ["Culture", "History", "Romance"],
  },
  {
    id: "3",
    name: "Tokyo",
    image: "/tokyo.jpg",
    description: "Immerse yourself in the perfect blend of tradition and innovation.",
    rating: 5.0,
    tags: ["Technology", "Culture", "Food"],
  },
  {
    id: "4",
    name: "Barcelona",
    image: "/barcelona.jpg",
    description: "Experience stunning architecture and Mediterranean charm.",
    rating: 5.0,
    tags: ["Architecture", "Beach", "Culture"],
  },
  {
    id: "5",
    name: "Rome",
    image: "/rome.jpg",
    description: "Explore the eternal city's ancient ruins and Renaissance masterpieces.",
    rating: 4.7,
    tags: ["History", "Art", "Food"],
  },
  {
    id: "6",
    name: "Florence",
    image: "/florence.jpg",
    description: "Immerse yourself in Renaissance art and Tuscan cuisine.",
    rating: 4.8,
    tags: ["Art", "History", "Food"],
  },
  {
    id: "7",
    name: "Berlin",
    image: "/berlin.jpg",
    description: "Discover a city rich in history and cutting-edge culture.",
    rating: 4.5,
    tags: ["History", "Nightlife", "Art"],
  },
  {
    id: "8",
    name: "Seoul",
    image: "/seoul.jpg",
    description: "Experience the perfect blend of ancient traditions and modern technology.",
    rating: 4.6,
    tags: ["Technology", "Culture", "Food"],
  },
  {
    id: "9",
    name: "Santorini",
    image: "/santorini.jpg",
    description: "Relax on picturesque beaches and explore charming villages.",
    rating: 4.9,
    tags: ["Beach", "Romance", "Scenery"],
  },
  {
    id: "10",
    name: "London",
    image: "/london.jpg",
    description: "Discover world-class museums, historic landmarks, and diverse cultures.",
    rating: 4.7,
    tags: ["History", "Culture", "Urban"],
  },
  {
    id: "11",
    name: "Los Angeles",
    image: "/los-angeles.jpg",
    description: "Experience the glamour of Hollywood and beautiful coastal scenery.",
    rating: 4.5,
    tags: ["Entertainment", "Beach", "Urban"],
  },
  {
    id: "12",
    name: "Amsterdam",
    image: "/amsterdam.jpg",
    description: "Explore picturesque canals, world-famous museums, and vibrant culture.",
    rating: 4.6,
    tags: ["Culture", "Nightlife", "Art"],
  },
]

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredDestinations = popularDestinations.filter(destination =>
    destination.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Explore Popular Destinations</h1>
      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search destinations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDestinations.map((destination) => (
          <DestinationCard key={destination.id} {...destination} />
        ))}
      </div>
      {filteredDestinations.length === 0 && (
        <p className="text-center text-gray-500 mt-8">No destinations found. Try a different search term.</p>
      )}
    </div>
  )
}

