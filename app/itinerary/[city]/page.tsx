"use client"

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Clock, Coffee, Sun, Moon, AlertTriangle, RefreshCw, MapPin, Save } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Toast } from "@/components/ui/toast"
import DailyRouteMap from '@/components/DailyRouteMap'
import OpenInGoogleMapsButton from '@/components/OpenInGoogleMapsButton'
import RestaurantSearch from '@/components/RestaurantSearch'
import AccommodationSearch from '@/components/AccommodationSearch'
import { useSession } from "next-auth/react"
import { ItineraryDay, ItinerarySection, ItineraryActivity, Restaurant, Accommodation } from '@/types/itinerary'

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
  const [selectedAccommodation, setSelectedAccommodation] = useState<Accommodation | null>(null)
  const [isSavedItinerary, setIsSavedItinerary] = useState(false)

  const fetchItinerary = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const days = searchParams.get('days') || '1'
      const mustSees = JSON.parse(searchParams.get('mustSees') || '[]')
      
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
          mustSees
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
      if (data.itinerary.accommodation) {
        setSelectedAccommodation(data.itinerary.accommodation)
      }
      setIsSavedItinerary(true)
    } catch (error) {
      console.error('Error fetching saved itinerary:', error)
      setError('Failed to load saved itinerary')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const savedId = searchParams.get('saved')
    if (savedId) {
      fetchSavedItinerary(savedId)
    } else {
      fetchItinerary()
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
            time: activity.startTime || activity.time || '',
            description: activity.description || `Duration: ${activity.duration} minutes`,
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
            const name = lines[0] || 'Unnamed Activity';
            const rest = lines.slice(1);
            const timeMatch = name.match(/$$(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})$$/);
            const addressMatch = rest.find(line => line.toLowerCase().includes('address:'));
            return {
              name: name.replace(/$$\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$$/, '').trim(),
              time: timeMatch ? timeMatch[1] : '',
              description: rest.filter(line => !line.toLowerCase().includes('address:') && !line.toLowerCase().includes('transportation:')).join('\n').trim(),
              transportation: rest.find(line => line.toLowerCase().includes('transportation:')) || '',
              address: addressMatch ? addressMatch.replace(/address:/i, '').trim() : '',
            };
          });

          if (sectionTitle === 'Morning' && day.includes('Lunch')) {
            const lunchRegex = /Lunch\s*$$(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})$$:([\s\S]*?)(?=Afternoon|$)/;
            const lunchMatch = day.match(lunchRegex);
            if (lunchMatch) {
              const lunchContent = lunchMatch[2].trim();
              const addressMatch = lunchContent.match(/Address: (.*?)(?:\n|$)/);
              activities.push({
                name: 'Lunch',
                time: lunchMatch[1],
                description: lunchContent.replace(/Address: .*/, '').trim(),
                transportation: '',
                address: addressMatch ? addressMatch[1].trim() : '',
              });
            }
          }
          if (sectionTitle === 'Evening' && day.includes('Dinner')) {
            const dinnerRegex = /Dinner\s*$$(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})$$:([\s\S]*?)$/;
            const dinnerMatch = day.match(dinnerRegex);
            if (dinnerMatch) {
              const dinnerContent = dinnerMatch[2].trim();
              const addressMatch = dinnerContent.match(/Address: (.*?)(?:\n|$)/);
              activities.push({
                name: 'Dinner',
                time: dinnerMatch[1],
                description: dinnerContent.replace(/Address: .*/, '').trim(),
                transportation: '',
                address: addressMatch ? addressMatch[1].trim() : '',
              });
            }
          }

          return { 
            title: sectionTitle, 
            activities: activities.length > 0 ? activities : [{ 
              name: 'Activity not specified', 
              time: '', 
              description: 'No specific activity for this time slot.', 
              transportation: '',
              address: '',
            }] 
          };
        });
        return { dayNumber: index + 1, sections: daySections };
      });
    } else if (typeof rawItinerary === 'object' && rawItinerary !== null) {
      // This might be a parsed object, try to convert it to our expected format
      return Object.entries(rawItinerary).map(([key, value]: [string, any], index) => ({
        dayNumber: index + 1,
        sections: [{
          title: "Activities",
          activities: Array.isArray(value) ? value.map((activity: any) => ({
            name: activity.name,
            time: activity.startTime || activity.time || '',
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
          startDate: null,
          endDate: null,
          accommodation: selectedAccommodation,
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

  const handleSelectRestaurant = (restaurant: Restaurant, mealTime: string) => {
    setItinerary(prevItinerary => {
      const newItinerary = [...prevItinerary];
      const dayIndex = selectedDay ? selectedDay - 1 : 0;
      const day = newItinerary[dayIndex];
      
      let sectionIndex;
      switch (mealTime) {
        case 'breakfast':
          sectionIndex = 0;
          break;
        case 'lunch':
          sectionIndex = 1;
          break;
        case 'dinner':
          sectionIndex = 2;
          break;
        default:
          sectionIndex = 1;
      }

      const newActivity: ItineraryActivity = {
        name: `${mealTime.charAt(0).toUpperCase() + mealTime.slice(1)} at ${restaurant.name}`,
        time: '',
        description: `Enjoy a meal at ${restaurant.name}. Rating: ${restaurant.rating}`,
        address: restaurant.address,
      };

      day.sections[sectionIndex].activities.push(newActivity);

      return newItinerary;
    });

    setToastMessage(`Added ${restaurant.name} to your itinerary!`);
    setToastType('success');
    setShowToast(true);
  };

  const handleSelectAccommodation = (accommodation: Accommodation) => {
    setSelectedAccommodation(accommodation);
    setToastMessage(`Selected ${accommodation.name} as your accommodation!`);
    setToastType('success');
    setShowToast(true);
  };

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
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <RestaurantSearch city={decodeURIComponent(params.city as string)} onSelectRestaurant={handleSelectRestaurant} />
          <AccommodationSearch 
            city={decodeURIComponent(params.city as string)} 
            onSelect={handleSelectAccommodation} 
          />
          {!isSavedItinerary && (
            <>
              <Button onClick={fetchItinerary} className="flex items-center">
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Itinerary
              </Button>
              {session && (
                <Button
                  onClick={saveItinerary}
                  className="flex items-center"
                  variant="outline"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Itinerary
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      {selectedAccommodation && (
        <div className="mb-4 p-4 bg-blue-100 rounded-lg">
          <h3 className="font-semibold">Selected Accommodation:</h3>
          <p>{selectedAccommodation.name} - {selectedAccommodation.address}</p>
        </div>
      )}
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


