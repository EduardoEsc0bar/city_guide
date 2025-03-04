"use client"

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { MapPin, Calendar, Clock, ChevronDown, ChevronUp, Hotel, Trash2, Share } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Toast } from "@/components/ui/toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { popularDestinations } from '@/data/destinations'
import { Skeleton } from "@/components/ui/skeleton"

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
  isPublished: boolean
  startDate: string | null
  endDate: string | null
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
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [selectedDestination, setSelectedDestination] = useState<string>('')
  const [publishingItinerary, setPublishingItinerary] = useState<string | null>(null)

  const fetchItineraries = useCallback(async () => {
    try {
      const response = await fetch('/api/itineraries')
      if (!response.ok) throw new Error('Failed to fetch itineraries')
      const data = await response.json()
      setItineraries(data.itineraries)
      setError(null)
    } catch (error) {
      console.error('Error fetching itineraries:', error)
      setError('Failed to fetch itineraries. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "authenticated") {
      fetchItineraries()
    } else if (status === "unauthenticated") {
      router.push('/login')
    }
  }, [status, router, fetchItineraries])

  const toggleItineraryExpansion = (id: string) => {
    setExpandedItinerary(expandedItinerary === id ? null : id)
  }

  const deleteItinerary = async (id: string) => {
    // Optimistic update
    setItineraries(prevItineraries => prevItineraries.filter(itinerary => itinerary.id !== id))
    setDeleteConfirmation(null)

    try {
      const response = await fetch(`/api/itineraries/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete itinerary')
      setToastMessage('Itinerary deleted successfully')
      setToastType('success')
      setShowToast(true)
    } catch (error) {
      console.error('Error deleting itinerary:', error)
      setToastMessage('Failed to delete itinerary')
      setToastType('error')
      setShowToast(true)
      // Revert the optimistic update
      fetchItineraries()
    }
  }

  const publishItinerary = async () => {
    if (!publishingItinerary || !selectedDestination) return

    try {
      const response = await fetch(`/api/itineraries/${publishingItinerary}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ destination: selectedDestination }),
      })

      if (!response.ok) throw new Error('Failed to publish itinerary')

      setItineraries(itineraries.map(itinerary => 
        itinerary.id === publishingItinerary ? { ...itinerary, isPublished: true } : itinerary
      ))

      setToastMessage('Itinerary published successfully')
      setToastType('success')
      setShowToast(true)
    } catch (error) {
      console.error('Error publishing itinerary:', error)
      setToastMessage('Failed to publish itinerary')
      setToastType('error')
      setShowToast(true)
    } finally {
      setPublishDialogOpen(false)
      setPublishingItinerary(null)
      setSelectedDestination('')
    }
  }

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Date not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Clock className="animate-spin h-8 w-8" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null; // This will prevent any flash of content before redirect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Saved Itineraries</h1>
      
      {error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchItineraries}>Try Again</Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-8 w-2/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
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
                    {!itinerary.isPublished && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPublishingItinerary(itinerary.id)
                          setPublishDialogOpen(true)
                        }}
                      >
                        <Share className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(itinerary.startDate)} - {formatDate(itinerary.endDate)}
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
                      {/* Render itinerary details here */}
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
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publish Itinerary</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select a destination to publish your itinerary:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {popularDestinations.map((destination) => (
                <button
                  key={destination.id}
                  className={`p-4 border rounded-lg text-center transition-colors ${
                    selectedDestination === destination.name
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent'
                  }`}
                  onClick={() => setSelectedDestination(destination.name)}
                >
                  {destination.name}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>Cancel</Button>
            <Button onClick={publishItinerary} disabled={!selectedDestination}>Publish to {selectedDestination}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

