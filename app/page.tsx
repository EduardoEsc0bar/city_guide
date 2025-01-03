import Image from "next/image"
import { HeroSearch } from "@/components/hero-search"
import { DestinationCard } from "@/components/destination-card"

const popularDestinations = [
  {
    id: "1",
    name: "New York City",
    image: "/nyc.jpg?height=400&width=600",
    description: "Experience the vibrant culture and iconic landmarks of the Big Apple.",
    rating: 4.8,
    tags: ["Urban", "Culture", "Food"],
  },
  {
    id: "2",
    name: "Paris",
    image: "/paris.jpg?height=400&width=600",
    description: "Discover the romance and beauty of the City of Light.",
    rating: 4.9,
    tags: ["Culture", "History", "Romance"],
  },
  {
    id: "3",
    name: "Tokyo",
    image: "/tokyo.jpg?height=400&width=600",
    description: "Immerse yourself in the perfect blend of tradition and innovation.",
    rating: 4.7,
    tags: ["Technology", "Culture", "Food"],
  },
  {
    id: "4",
    name: "Barcelona",
    image: "/fcbarcelona.jpg?height=400&width=600",
    description: "Experience stunning architecture and Mediterranean charm.",
    rating: 4.6,
    tags: ["Architecture", "Beach", "Culture"],
  },
]

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="relative h-[calc(80vh-4rem)] flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/barcelona.jpg"
            alt="City skyline"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40 z-10" />
        </div>
        <div className="relative z-20 text-center text-white px-4">
          <h1 className="text-5xl font-bold mb-6">Plan Your Perfect City Adventure</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Discover amazing destinations and create personalized itineraries tailored to your interests
          </p>
          <HeroSearch />
        </div>
      </div>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Popular Destinations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularDestinations.map((destination) => (
            <DestinationCard key={destination.id} {...destination} />
          ))}
        </div>
      </section>
    </div>
  )
}















