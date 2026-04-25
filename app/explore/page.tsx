"use client"

import { Suspense, useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, ThumbsUp } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useDebounce } from "@/hooks/useDebounce"
import { useSearchParams, useRouter } from "next/navigation"
import { popularDestinations } from "@/data/destinations"

const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#333" offset="20%" />
      <stop stop-color="#222" offset="50%" />
      <stop stop-color="#333" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#333" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`

const toBase64 = (str: string) =>
  typeof window === "undefined" ? Buffer.from(str).toString("base64") : window.btoa(str)

interface Destination {
  id: string
  name: string
  image: string
  description: string
  tags: string[]
}

function ExplorePageContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const { data: session } = useSession()
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const initialDestination = searchParams.get("destination")
    if (initialDestination) {
      router.push(`/explore/${encodeURIComponent(initialDestination)}`)
    }
  }, [searchParams, router])

  const filteredDestinations = useMemo(() => {
    return popularDestinations.filter((destination) =>
      destination.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
    )
  }, [debouncedSearchQuery])

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDestinations.map((destination, index) => (
          <Card
            key={destination.id}
            className={`cursor-pointer hover:shadow-lg transition-shadow`}
            onClick={() => {
              router.push(`/explore/${encodeURIComponent(destination.name)}`)
            }}
          >
            <CardContent className="p-4">
              <div className="relative w-full h-48 mb-4">
                <Image
                  src={destination.image || "/placeholder.svg"}
                  alt={destination.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="rounded-t-lg object-cover"
                  priority={index < 4}
                  placeholder="blur"
                  blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(700, 475))}`}
                />
              </div>
              <h3 className="font-semibold text-lg mb-2">{destination.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{destination.description}</p>
              <div className="flex flex-wrap gap-2">
                {destination.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-200 rounded-full px-2 py-1">
                    {tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {filteredDestinations.length === 0 && (
        <p className="text-center text-gray-500 mt-8">No destinations found. Try a different search term.</p>
      )}
    </div>
  )
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExplorePageContent />
    </Suspense>
  )
}
