"use client"

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, ThumbsUp } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useDebounce } from '@/hooks/useDebounce'
import { useSearchParams, useRouter } from 'next/navigation'
import { popularDestinations } from '@/data/destinations'

interface Destination {
  id: string
  name: string
  image: string
  description: string
  tags: string[]
}


export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const { data: session } = useSession()
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const initialDestination = searchParams.get('destination')
    if (initialDestination) {
      router.push(`/explore/${encodeURIComponent(initialDestination)}`)
    }
  }, [searchParams, router])


  const filteredDestinations = useMemo(() => {
    return popularDestinations.filter(destination =>
      destination.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
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
      <div  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    src={destination.image} 
                    alt={destination.name} 
                    layout="fill"
                    objectFit="cover"
                    className="rounded-t-lg"
                    priority={index < 4}
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




