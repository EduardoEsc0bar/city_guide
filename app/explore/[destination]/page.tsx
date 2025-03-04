"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ThumbsUp } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { popularDestinations } from '@/data/destinations'
import { Skeleton } from "@/components/ui/skeleton"

interface PublishedItinerary {
  id: string
  title: string
  days: number
  upvotes: number
  user: {
    name: string
  }
}

export default function DestinationPage() {
  const [publishedItineraries, setPublishedItineraries] = useState<PublishedItinerary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const destination = decodeURIComponent(params.destination as string)

  const isValidDestination = popularDestinations.some(dest => dest.name.toLowerCase() === destination.toLowerCase())

  const fetchPublishedItineraries = useCallback(async (destination: string) => {
    try {
      const response = await fetch(`/api/published-itineraries?destination=${encodeURIComponent(destination)}`)
      if (!response.ok) throw new Error('Failed to fetch published itineraries')
      const data = await response.json()
      setPublishedItineraries(data.itineraries)
    } catch (error) {
      console.error('Error fetching published itineraries:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isValidDestination) {
      setIsLoading(true)
      fetchPublishedItineraries(destination)
    }
  }, [destination, isValidDestination, fetchPublishedItineraries])

  const upvoteItinerary = async (itineraryId: string) => {
    if (!session) {
      router.push('/login')
      return
    }

    // Optimistic update
    setPublishedItineraries(prevItineraries =>
      prevItineraries.map(itinerary =>
        itinerary.id === itineraryId
          ? { ...itinerary, upvotes: itinerary.upvotes + 1 }
          : itinerary
      )
    )

    try {
      const response = await fetch(`/api/published-itineraries/${itineraryId}/upvote`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to upvote itinerary')
    } catch (error) {
      console.error('Error upvoting itinerary:', error)
      // Revert the optimistic update if the API call fails
      setPublishedItineraries(prevItineraries =>
        prevItineraries.map(itinerary =>
          itinerary.id === itineraryId
            ? { ...itinerary, upvotes: itinerary.upvotes - 1 }
            : itinerary
        )
      )
    }
  }

  if (!isValidDestination) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Invalid Destination</h2>
        <p>The specified destination does not exist.</p>
        <Button onClick={() => router.push('/explore')} className="mt-4">
          Back to Destinations
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button onClick={() => router.push('/explore')} className="mb-4">
        Back to Destinations
      </Button>
      <h2 className="text-2xl font-bold mb-4">Published Itineraries for {destination}</h2>
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : publishedItineraries.length === 0 ? (
        <p>No published itineraries yet for this destination.</p>
      ) : (
        <div className="space-y-4">
          {publishedItineraries.map((itinerary) => (
            <Card key={itinerary.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{itinerary.title}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => upvoteItinerary(itinerary.id)}
                    disabled={!session}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    {itinerary.upvotes}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">By {itinerary.user.name}</p>
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {itinerary.days} {itinerary.days === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <Link href={`/itinerary/${encodeURIComponent(destination)}?published=${itinerary.id}`}>
                  <Button className="mt-4">View Itinerary</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

