import { HeroSearch } from "@/components/hero-search"
import { DestinationCard } from "@/components/destination-card"
import Link from "next/link"
import Image from "next/image"

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
    image: "/fcbarcelona.jpg",
    description: "Experience stunning architecture and Mediterranean charm.",
    rating: 5.0,
    tags: ["Architecture", "Beach", "Culture"],
  },
]

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="relative h-[calc(85vh-4rem)] flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/barcelona.jpg"
            alt="City skyline"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAFxEAAwEAAAAAAAAAAAAAAAAAAAECEf/aAAwDAQACEQMRAD8AoNxbhL3xvpeNluNyeQ0pwCxJGwA5NFE9fqU+s5+0pr//2Q=="
          />
          <div className="absolute inset-0 bg-black/40 z-10" />
        </div>
        <div className="relative z-20 text-center text-white px-4">
          <h1 className="text-5xl font-bold mb-6">Plan Your Perfect City Adventure</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Discover amazing destinations and create personalized itineraries tailored to your interests
          </p>
          <HeroSearch />
          <Link href="/build-itinerary" className="block mt-4">
            <button className="bg-white text-black hover:bg-gray-100 px-6 py-3 rounded-md">Making an Itinerary from Scratch?</button>
          </Link>
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




