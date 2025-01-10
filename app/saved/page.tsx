"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { MapPin, Calendar, Clock, ChevronDown, ChevronUp, Hotel, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Toast } from "@/components/ui/toast"

interface SavedItinerary {
  id: string
  title: string
  days: number
  created_at: string
  content: any
  accommodation: {
    name: string
    address: string
  } | null
}

export default function SavedItinerariesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedItinerary, setExpandedItinerary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null)

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
      console.log("Fetched itineraries data:", data)
      setItineraries(data.itineraries)
      setError(null)
    } catch (error) {
      console.error('Error fetching itineraries:', error)
      setError('Failed to fetch itineraries. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleItineraryExpansion = (id: string) => {
    setExpandedItinerary(expandedItinerary === id ? null : id)
  }

  const renderItineraryContent = (content: any) => {
    if (Array.isArray(content)) {
      return content.map((day, index) => (
        <div key={index} className="mb-4">
          <h4 className="font-medium">Day {index + 1}</h4>
          {day.sections.map((section: any, sectionIndex: number) => (
            <div key={sectionIndex} className="ml-4">
              <h5 className="font-medium">{section.title}</h5>
              {section.activities.map((activity: any, activityIndex: number) => (
                <div key={activityIndex} className="ml-4">
                  <p>{activity.name} {activity.time && `(${activity.time})`}</p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  {activity.address && <p className="text-sm text-blue-600">{activity.address}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))
    } else {
      return <p>Unable to display itinerary content.</p>
    }
  }

  const deleteItinerary = async (id: string) => {
    try {
      const response = await fetch(`/api/itineraries/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete itinerary')
      setItineraries(itineraries.filter(itinerary => itinerary.id !== id))
      setToastMessage('Itinerary deleted successfully')
      setToastType('success')
      setShowToast(true)
    } catch (error) {
      console.error('Error deleting itinerary:', error)
      setToastMessage('Failed to delete itinerary')
      setToastType('error')
      setShowToast(true)
    } finally {
      setDeleteConfirmation(null)
    }
  }

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

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
      
      {error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchItineraries}>Try Again</Button>
        </div>
      ) : itineraries.length === 0 ? (
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
                    {itinerary.title}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleItineraryExpansion(itinerary.id)}
                    >
                      {expandedItinerary === itinerary.id ? <ChevronUp /> : <ChevronDown />}
                    </Button>
                    <Dialog open={deleteConfirmation === itinerary.id} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmation(itinerary.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Itinerary</DialogTitle>
                        </DialogHeader>
                        <p>Are you sure you want to delete this itinerary? This action cannot be undone.</p>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteConfirmation(null)}>Cancel</Button>
                          <Button variant="destructive" onClick={() => deleteItinerary(itinerary.id)}>Delete</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
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
                  {itinerary.accommodation && (
                    <p className="flex items-center text-sm text-gray-500">
                      <Hotel className="h-4 w-4 mr-2" />
                      {itinerary.accommodation.name} - {itinerary.accommodation.address}
                    </p>
                  )}
                  {expandedItinerary === itinerary.id && (
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Itinerary Details:</h3>
                      {renderItineraryContent(itinerary.content)}
                    </div>
                  )}
                  <Button 
                    className="w-full mt-4"
                    onClick={() => router.push(`/itinerary/${encodeURIComponent(itinerary.title)}?saved=${itinerary.id}`)}
                  >
                    View Full Itinerary
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {showToast && (
        <Toast 
          className={`fixed bottom-4 right-4 p-2 rounded shadow-lg ${
            toastType === 'error' ? 'bg-red-500' : 'bg-green-500'
          } text-white`}
        >
          {toastMessage}
        </Toast>
      )}
    </div>
  )
}
