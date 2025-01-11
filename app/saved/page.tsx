"use client"

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { MapPin, Calendar, Clock, ChevronDown, ChevronUp, Hotel, Trash2, Share, CalendarIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Toast } from "@/components/ui/toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { popularDestinations } from '@/data/destinations'

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
  const [isGoogleCalendarAuthenticated, setIsGoogleCalendarAuthenticated] = useState(false) // Added Google Calendar auth state
  const searchParams = useSearchParams()

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

  const saveToGoogleCalendar = async (itineraryId: string) => {
    if (!isGoogleCalendarAuthenticated) {
      handleGoogleCalendarAuth();
      return;
    }

    if (!itineraries.find(i => i.id === itineraryId)?.startDate || !itineraries.find(i => i.id === itineraryId)?.endDate) {
      setToastMessage('Please set start and end dates before saving to Google Calendar');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      const response = await fetch(`/api/itineraries/${itineraryId}/save-to-calendar`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to save to Google Calendar');
      setToastMessage('Itinerary saved to Google Calendar successfully');
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      console.error('Error saving to Google Calendar:', error);
      setToastMessage('Failed to save to Google Calendar');
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleGoogleCalendarAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/google-calendar');
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No authentication URL received');
      }
    } catch (error) {
      console.error('Error initiating Google Calendar auth:', error);
      setToastMessage('Failed to initiate Google Calendar authentication');
      setToastType('error');
      setShowToast(true);
    }
  }, []);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setToastMessage('Google Calendar authentication failed. Please try again.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (code) {
      const exchangeCodeForTokens = async () => {
        try {
          const response = await fetch('/api/auth/google-calendar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });
          if (response.ok) {
            setIsGoogleCalendarAuthenticated(true);
            setToastMessage('Successfully authenticated with Google Calendar');
            setToastType('success');
            setShowToast(true);
          } else {
            throw new Error('Failed to exchange code for tokens');
          }
        } catch (error) {
          console.error('Error exchanging code for tokens:', error);
          setToastMessage('Failed to complete Google Calendar authentication');
          setToastType('error');
          setShowToast(true);
        }
      };
      exchangeCodeForTokens();
    }
  }, [searchParams]);


  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Clock className="animate-spin h-8 w-8" />
      </div>
    )
  }

  console.log('Available destinations:', popularDestinations.map(d => d.name));

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
                      {renderItineraryContent(itinerary.content)}
                    </div>
                  )}
                  <Button 
                    className="w-full mt-4"
                    onClick={() => router.push(`/itinerary/${encodeURIComponent(itinerary.title)}?saved=${itinerary.id}`)}
                  >
                    View Full Itinerary
                  </Button>
                  <Button 
                    className="w-full mt-2"
                    onClick={() => saveToGoogleCalendar(itinerary.id)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {isGoogleCalendarAuthenticated ? 'Save to Google Calendar' : 'Authenticate Google Calendar'}
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
  <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" aria-describedby="publish-dialog-description">
    <DialogHeader>
      <DialogTitle>Publish Itinerary</DialogTitle>
    </DialogHeader>
    <div className="py-4">
      <p id="publish-dialog-description" className="text-sm text-muted-foreground mb-4">
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


