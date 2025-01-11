"use client"

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Clock, Coffee, Sun, Moon, AlertTriangle, RefreshCw, MapPin, Save, Plus, Trash2, Edit } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Toast } from "@/components/ui/toast"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import DailyRouteMap from '@/components/DailyRouteMap'
import OpenInGoogleMapsButton from '@/components/OpenInGoogleMapsButton'
import RestaurantSearch from '@/components/RestaurantSearch'
import AccommodationSearch from '@/components/AccommodationSearch'
import { useSession } from "next-auth/react"
import { ItineraryDay, ItinerarySection, ItineraryActivity, Restaurant, Accommodation } from '@/types/itinerary'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import EditableItinerary from '@/components/EditableItinerary'
import {DateRange} from "@/types/dateRange"

export default function ItineraryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const { data: session } = useSession()
  const [isSavedItinerary, setIsSavedItinerary] = useState(false)
  const [isPublishedItinerary, setIsPublishedItinerary] = useState(false)
  const [isAddActivityDialogOpen, setIsAddActivityDialogOpen] = useState(false)
  const [newActivity, setNewActivity] = useState<Partial<ItineraryActivity>>({})
  const [isEditMode, setIsEditMode] = useState(false)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  const fetchItinerary = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const days = searchParams.get('days') || '1'
      const mustSees = JSON.parse(searchParams.get('mustSees') || '[]')
      const startDateParam = searchParams.get('startDate')
      const endDateParam = searchParams.get('endDate')
      
      if (!params.city) {
        throw new Error('No city specified')
      }

      const decodedCity = decodeURIComponent(params.city as string)

      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          city: decodedCity,
          days: parseInt(days),
          mustSees,
          startDate: startDateParam,
          endDate: endDateParam
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (!data.result) {
        throw new Error('No itinerary data received')
      }

      const parsedItinerary = parseItinerary(data.result)
      setItinerary(parsedItinerary)
      setSelectedDay(1)
      if (startDateParam) setStartDate(new Date(startDateParam))
      if (endDateParam) setEndDate(new Date(endDateParam))
    } catch (err) {
      console.error('Error fetching itinerary:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while generating the itinerary. Please try again.')
      setToastMessage('Failed to generate itinerary. Please try again.')
      setToastType('error')
      setShowToast(true)
    } finally {
      setIsLoading(false)
    }
  }

  const saveGeneratedItinerary = async () => {
    if (!session) {
      router.push('/login')
      return
    }

    try {
      const decodedCity = decodeURIComponent(params.city as string)
      const response = await fetch('/api/itineraries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: decodedCity,
          city: decodedCity,
          days: itinerary.length,
          content: itinerary,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save itinerary')
      }

      setToastMessage('Itinerary saved successfully!')
      setToastType('success')
      setShowToast(true)
    } catch (error) {
      console.error('Error saving itinerary:', error)
      setToastMessage('Failed to save itinerary')
      setToastType('error')
      setShowToast(true)
    }
  }

  const fetchSavedItinerary = async (id: string) => {
    try {
      const response = await fetch(`/api/itineraries/${id}`)
      if (!response.ok) throw new Error('Failed to fetch saved itinerary')
      const data = await response.json()
      console.log("Fetched saved itinerary:", data.itinerary);
      
      if (data.itinerary.content) {
        setItinerary(parseItinerary(data.itinerary.content))
      } else {
        console.error("No content found in the saved itinerary")
        setError("Failed to load saved itinerary: No content found")
      }
      
      setSelectedDay(1)
      setIsSavedItinerary(true)
      setStartDate(data.itinerary.start_date ? new Date(data.itinerary.start_date) : null)
      setEndDate(data.itinerary.end_date ? new Date(data.itinerary.end_date) : null)
    } catch (error) {
      console.error('Error fetching saved itinerary:', error)
      setError('Failed to load saved itinerary')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPublishedItinerary = async (id: string) => {
    try {
      const response = await fetch(`/api/published-itineraries/${id}`)
      if (!response.ok) throw new Error('Failed to fetch published itinerary')
      const data = await response.json()
      console.log("Fetched published itinerary:", data.itinerary);
      
      if (data.itinerary.content) {
        setItinerary(parseItinerary(data.itinerary.content))
      } else {
        console.error("No content found in the published itinerary")
        setError("Failed to load published itinerary: No content found")
      }
      
      setSelectedDay(1)
      setIsSavedItinerary(false)
      setStartDate(data.itinerary.start_date ? new Date(data.itinerary.start_date) : null)
      setEndDate(data.itinerary.end_date ? new Date(data.itinerary.end_date) : null)
    } catch (error) {
      console.error('Error fetching published itinerary:', error)
      setError('Failed to load published itinerary')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceDay = parseInt(result.source.droppableId);
    const destinationDay = parseInt(result.destination.droppableId);
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    setItinerary(prevItinerary => {
      const newItinerary = [...prevItinerary];
      const [removed] = newItinerary[sourceDay - 1].sections[0].activities.splice(sourceIndex, 1);
      newItinerary[destinationDay - 1].sections[0].activities.splice(destinationIndex, 0, removed);
      return newItinerary;
    });
  };

  const addActivity = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    setNewActivity({});
    setIsAddActivityDialogOpen(true);
  };

  const handleAddActivity = () => {
    if (selectedDay && newActivity.name) {
      setItinerary(prevItinerary => {
        const newItinerary = [...prevItinerary];
        const day = newItinerary[selectedDay - 1];
        day.sections[0].activities.push(newActivity as ItineraryActivity);
        return newItinerary;
      });
      setIsAddActivityDialogOpen(false);
      setNewActivity({});
    }
  };

  const removeActivity = (dayNumber: number, activityIndex: number) => {
    setItinerary(prevItinerary => {
      const newItinerary = [...prevItinerary];
      newItinerary[dayNumber - 1].sections[0].activities.splice(activityIndex, 1);
      return newItinerary;
    });
  };

  const updateActivity = (dayNumber: number, activityIndex: number, field: keyof ItineraryActivity, value: string | number) => {
    setItinerary(prevItinerary => {
      const newItinerary = [...prevItinerary];
      const activity = newItinerary[dayNumber - 1].sections[0].activities[activityIndex];
      if (field === 'duration') {
        activity[field] = typeof value === 'string' ? parseInt(value, 10) : value;
      } else {
        activity[field] = value as never;
      }
      return newItinerary;
    });
  };

  const handleDateRangeChange = (dateRange: DateRange | undefined) => {
    if (dateRange?.from) setStartDate(dateRange.from);
    if (dateRange?.to) setEndDate(dateRange.to);
  };

  useEffect(() => {
    const savedId = searchParams.get('saved')
    const publishedId = searchParams.get('published')
    if (savedId) {
      fetchSavedItinerary(savedId)
      setIsSavedItinerary(true)
      setIsPublishedItinerary(false)
    } else if (publishedId) {
      fetchPublishedItinerary(publishedId)
      setIsSavedItinerary(false)
      setIsPublishedItinerary(true)
    } else {
      fetchItinerary()
      setIsSavedItinerary(false)
      setIsPublishedItinerary(false)
    }
  }, [params.city, searchParams])

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  const parseItinerary = (rawItinerary: string | ItineraryDay[] | any): ItineraryDay[] => {
    if (Array.isArray(rawItinerary)) {
      // This is likely a custom-built itinerary or already parsed data
      return rawItinerary.map((day, index) => ({
        dayNumber: index + 1,
        sections: day.sections || [{
          title: "Activities",
          activities: day.activities?.map((activity: any) => ({
            name: activity.name,
            time: activity.time || activity.startTime || '',
            duration: activity.duration || 0,
            description: activity.description || '',
            address: activity.address || '',
            transportation: activity.transportation || '',
          })) || []
        }]
      }));
    } else if (typeof rawItinerary === 'string') {
      // This is likely an AI-generated itinerary
      const days = rawItinerary.split(/Day \d+:/).filter(Boolean);
      
      return days.map((day, index) => {
        const sections = ['Morning', 'Afternoon', 'Evening'];
        const daySections: ItinerarySection[] = sections.map(sectionTitle => {
          const sectionRegex = new RegExp(`${sectionTitle}:([\\s\\S]*?)(?=${sections.map(s => `${s}:`).join('|')}|Dinner|$)`);
          const sectionMatch = day.match(sectionRegex);
          const sectionContent = sectionMatch ? sectionMatch[1].trim() : '';
          const activities: ItineraryActivity[] = sectionContent.split(/\d+\./).filter(Boolean).map(activity => {
            const lines = activity.split('\n').filter(Boolean);
            const firstLine = lines[0] || 'Unnamed Activity';
            const rest = lines.slice(1);
            
            // Extract time and duration from the activity name
            const timeMatch = firstLine.match(/$$(\d{1,2}:\d{2} [AP]M)(?:\s*[–-]\s*(\d{1,2}:\d{2} [AP]M))?$$/);
            let name = firstLine.replace(/$$.*?$$/, '').trim();
            let time = '';
            let duration = 0;

            if (timeMatch) {
              time = timeMatch[1];
              if (timeMatch[2]) {
                const startTime = new Date(`1970/01/01 ${timeMatch[1]}`);
                const endTime = new Date(`1970/01/01 ${timeMatch[2]}`);
                duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // Duration in minutes
              }
            }

            const addressMatch = rest.find(line => line.toLowerCase().includes('address:'));
            const transportationMatch = rest.find(line => line.toLowerCase().includes('transportation:'));

            return {
              name,
              time,
              duration,
              description: rest.filter(line => !line.toLowerCase().includes('address:') && !line.toLowerCase().includes('transportation:')).join('\n').trim(),
              transportation: transportationMatch ? transportationMatch.replace(/transportation:/i, '').trim() : '',
              address: addressMatch ? addressMatch.replace(/address:/i, '').trim() : '',
            };
          });

          // Handle Lunch and Dinner separately
          ['Lunch', 'Dinner'].forEach(mealType => {
            const mealRegex = new RegExp(`${mealType}\\s*\$$(\\d{1,2}:\\d{2} [AP]M)(?:\\s*[–-]\\s*(\\d{1,2}:\\d{2} [AP]M))?\$$:(([\\s\\S]*?)(?=${sections.map(s => `${s}:`).join('|')}|$))`);
            const mealMatch = day.match(mealRegex);
            if (mealMatch) {
              const mealContent = mealMatch[3].trim();
              const addressMatch = mealContent.match(/Address: (.*?)(?:\n|$)/);
              let duration = 0;
              if (mealMatch[2]) {
                const startTime = new Date(`1970/01/01 ${mealMatch[1]}`);
                const endTime = new Date(`1970/01/01 ${mealMatch[2]}`);
                duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // Duration in minutes
              }
              activities.push({
                name: mealType,
                time: mealMatch[1],
                duration,
                description: mealContent.replace(/Address: .*/, '').trim(),
                transportation: '',
                address: addressMatch ? addressMatch[1].trim() : '',
              });
            }
          });

          return { 
            title: sectionTitle, 
            activities: activities.length > 0 ? activities : [{ 
              name: 'Activity not specified', 
              time: '', 
              duration: 0,
              description: 'No specific activity for this time slot.', 
              transportation: '',
              address: '',
            }] 
          };
        });
        return { dayNumber: index + 1, sections: daySections };
      });
    } else if (typeof rawItinerary === 'object' && rawItinerary !== null) {
      // This might be a parsed object from a manually created itinerary
      return Object.entries(rawItinerary).map(([key, value]: [string, any], index) => ({
        dayNumber: index + 1,
        sections: [{
          title: "Activities",
          activities: Array.isArray(value) ? value.map((activity: any) => ({
            name: activity.name,
            time: activity.time || activity.startTime || '',
            duration: activity.duration || 0,
            description: activity.description || '',
            address: activity.address || '',
            transportation: activity.transportation || '',
          })) : []
        }]
      }));
    } else {
      console.error("Unexpected itinerary format:", rawItinerary);
      return [];
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const getDayLocations = (day: ItineraryDay) => {
    return day.sections.flatMap(section => 
      section.activities
        .filter(activity => activity.address && activity.address.trim() !== '')
        .map(activity => ({
          name: activity.name,
          address: activity.address as string
        }))
    );
  };

  const saveItinerary = async () => {
    if (!session) {
      router.push('/login')
      return
    }

    try {
      const decodedCity = decodeURIComponent(params.city as string)
      const response = await fetch('/api/itineraries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: decodedCity,
          days: itinerary.length,
          content: itinerary,
          mustSees: JSON.parse(searchParams.get('mustSees') || '[]'),
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save itinerary')
      }

      setToastMessage(`Itinerary for ${decodedCity} saved successfully!`)
      setToastType('success')
      setShowToast(true)
    } catch (error) {
      console.error('Error saving itinerary:', error)
      setToastMessage('Failed to save itinerary')
      setToastType('error')
      setShowToast(true)
    }
  }

  const getSearchLocation = (): string => {
    if (itinerary.length > 0 && itinerary[0].sections.length > 0) {
      const firstSection = itinerary[0].sections[0];
      if (firstSection.activities.length > 0) {
        const firstActivity = firstSection.activities[0];
        if (firstActivity.address && firstActivity.address.trim() !== '') {
          return firstActivity.address;
        }
      }
    }
    return decodeURIComponent(params.city as string);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode)
  }

  const savePublishedItinerary = async () => {
    if (!session) {
      router.push('/login')
      return
    }

    try {
      const response = await fetch('/api/itineraries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: decodeURIComponent(params.city as string),
          days: itinerary.length,
          content: itinerary,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save itinerary')
      }

      setToastMessage(`Itinerary saved successfully!`)
      setToastType('success')
      setShowToast(true)
      setIsSavedItinerary(true)
      setIsPublishedItinerary(false)
    } catch (error) {
      console.error('Error saving itinerary:', error)
      setToastMessage('Failed to save itinerary')
      setToastType('error')
      setShowToast(true)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <Clock className="animate-spin h-8 w-8 mr-3" />
        <p>Loading your itinerary...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-500 text-center mb-4">{error}</p>
        <Button onClick={fetchItinerary}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Your {itinerary.length}-Day Itinerary for {decodeURIComponent(params.city as string)}</h1>
      {(startDate || endDate) && (
        <p className="text-lg mb-4">
          From {startDate ? startDate.toLocaleDateString() : 'N/A'} to {endDate ? endDate.toLocaleDateString() : 'N/A'}
        </p>
      )}
      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 mb-6">
        <RestaurantSearch location={getSearchLocation()} />
        <AccommodationSearch location={getSearchLocation()} />
        {!isSavedItinerary && !isPublishedItinerary && (
          <>
            <Button onClick={fetchItinerary} className="flex items-center justify-center w-full sm:w-auto">
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
            {session && (
              <Button
                onClick={saveItinerary}
                className="flex items-center justify-center w-full sm:w-auto"
                variant="outline"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Itinerary
              </Button>
            )}
          </>
        )}
        {isPublishedItinerary && session && (
          <Button
            onClick={savePublishedItinerary}
            className="flex items-center justify-center w-full sm:w-auto"
            variant="outline"
          >
            <Save className="mr-2 h-4 w-4" />
            Save to My Itineraries
          </Button>
        )}
        {(isSavedItinerary || (!isPublishedItinerary && !isSavedItinerary)) && (
          <Button onClick={toggleEditMode} className="flex items-center justify-center w-full sm:w-auto">
            <Edit className="mr-2 h-4 w-4" />
            {isEditMode ? 'View Itinerary' : 'Edit Itinerary'}
          </Button>
        )}
      </div>
      {isEditMode && (isSavedItinerary || (!isPublishedItinerary && !isSavedItinerary)) ? (
        <EditableItinerary 
          itinerary={itinerary} 
          setItinerary={setItinerary}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {itinerary.map((day) => (
              <Button
                key={day.dayNumber}
                onClick={() => setSelectedDay(day.dayNumber)}
                variant={selectedDay === day.dayNumber ? "default" : "outline"}
              >
                Day {day.dayNumber}
              </Button>
            ))}
          </div>
          {selectedDay && itinerary[selectedDay - 1] && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Day {selectedDay} Route</h2>
                <OpenInGoogleMapsButton locations={getDayLocations(itinerary[selectedDay - 1])} />
              </div>
              <DailyRouteMap 
                locations={getDayLocations(itinerary[selectedDay - 1])} 
                dayNumber={selectedDay}
              />
            </div>
          )}
          {itinerary.map((day) => (
            <div key={day.dayNumber} className={`mb-8 ${selectedDay !== day.dayNumber ? 'hidden' : ''}`}>
              <h2 className="text-2xl font-semibold mb-4">Day {day.dayNumber}</h2>
              <div className="grid gap-6 md:grid-cols-3">
                {day.sections.map((section, index) => (
                  <div key={section.title} className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                      {index === 0 && <Coffee className="mr-2" />}
                      {index === 1 && <Sun className="mr-2" />}
                      {index === 2 && <Moon className="mr-2" />}
                      {section.title}
                    </h3>
                    <ul className="space-y-4">
                      {section.activities.map((activity, actIndex) => (
                        <li key={actIndex} className="border-b pb-2 last:border-b-0 last:pb-0">
                          <div className="font-medium">{activity.name} {activity.time && `(${activity.time})`}</div>
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          {activity.address && (
                            <p className="text-sm text-blue-600 mt-1 flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {activity.address}
                            </p>
                          )}
                          {activity.transportation && (
                            <p className="text-sm text-blue-600 mt-1">{activity.transportation}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      <Dialog open={isAddActivityDialogOpen} onOpenChange={setIsAddActivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Activity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Activity Name"
              value={newActivity.name || ''}
              onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
            />
            <Input
              placeholder="Time (e.g., 09:00 - 11:00)"
              value={newActivity.time || ''}
              onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
            />
            <Input
              placeholder="Duration (minutes)"
              type="number"
              value={newActivity.duration || ''}
              onChange={(e) => setNewActivity({ ...newActivity, duration: parseInt(e.target.value) })}
            />
            <Input
              placeholder="Description"
              value={newActivity.description || ''}
              onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
            />
            <Input
              placeholder="Address"
              value={newActivity.address || ''}
              onChange={(e) => setNewActivity({ ...newActivity, address: e.target.value })}
            />
            <Input
              placeholder="Transportation"
              value={newActivity.transportation || ''}
              onChange={(e) => setNewActivity({ ...newActivity, transportation: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleAddActivity}>Add Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
