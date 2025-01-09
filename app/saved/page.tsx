"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { MapPin, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface SavedItinerary {
  id: string
  city: string
  days: number
  created_at: string
  content: any
  must_sees: string[]
}

export default function SavedItinerariesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedItinerary, setExpandedItinerary] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/login')
    }

    if (status === "authenticated") {
      fetchItineraries()
    }
  }, [status, router])

  const fetchItineraries = async () => {
    try {
      const response = await fetch('/api/itineraries')
      if (!response.ok) throw new Error('Failed to fetch itineraries')
      const data = await response.json()
      setItineraries(data.itineraries)
    } catch (error) {
      console.error('Error fetching itineraries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleItineraryExpansion = (id: string) => {
    setExpandedItinerary(expandedItinerary === id ? null : id)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Clock className="animate-spin h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Saved Itineraries</h1>
      
      {itineraries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">You haven't saved any itineraries yet.</p>
          <Button onClick={() => router.push('/')}>Create an Itinerary</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {itineraries.map((itinerary) => (
            <Card key={itinerary.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    {itinerary.city}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleItineraryExpansion(itinerary.id)}
                  >
                    {expandedItinerary === itinerary.id ? <ChevronUp /> : <ChevronDown />}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(itinerary.created_at).toLocaleDateString()}
                  </p>
                  <p className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-2" />
                    {itinerary.days} {itinerary.days === 1 ? 'day' : 'days'}
                  </p>
                  {expandedItinerary === itinerary.id && (
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Itinerary Details:</h3>
                      {itinerary.content.map((day: any, index: number) => (
                        <div key={index} className="mb-4">
                          <h4 className="font-medium">Day {day.dayNumber}</h4>
                          {day.sections.map((section: any, sectionIndex: number) => (
                            <div key={sectionIndex} className="ml-4">
                              <h5 className="font-medium">{section.title}</h5>
                              <ul className="list-disc list-inside">
                                {section.activities.map((activity: any, activityIndex: number) => (
                                  <li key={activityIndex}>{activity.name}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ))}
                      {itinerary.must_sees && itinerary.must_sees.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">Must-See Locations:</h3>
                          <ul className="list-disc list-inside">
                            {itinerary.must_sees.map((location: string, index: number) => (
                              <li key={index}>{location}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  <Button 
                    className="w-full mt-4"
                    onClick={() => router.push(`/itinerary/${itinerary.city}?saved=${itinerary.id}`)}
                  >
                    View Full Itinerary
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}





