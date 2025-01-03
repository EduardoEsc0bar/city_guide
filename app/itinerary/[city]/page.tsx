"use client"

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Clock, Coffee, Sun, Moon, AlertTriangle } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface ItinerarySection {
  title: string
  activities: string[]
}

interface ItineraryDay {
  sections: ItinerarySection[]
}

export default function ItineraryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchItinerary = async () => {
      try {
        const days = searchParams.get('days') || '1'
        const mustSees = JSON.parse(searchParams.get('mustSees') || '[]')
        
        if (!params.city) {
          throw new Error('No city specified')
        }

        const response = await fetch('/api/generate-itinerary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            city: params.city,
            days: parseInt(days),
            mustSees
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        if (!data.result) {
          throw new Error('No itinerary data received')
        }

        const parsedItinerary = parseItinerary(data.result, parseInt(days))
        setItinerary(parsedItinerary)
      } catch (err) {
        console.error('Error fetching itinerary:', err)
        setError('An error occurred while generating the itinerary. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchItinerary()
  }, [params.city, searchParams])

  const parseItinerary = (rawItinerary: string, numDays: number): ItineraryDay[] => {
    const days = rawItinerary.split(/Day \d+:/).filter(Boolean)
    return days.map((day, index) => {
      const sections = ['Morning', 'Afternoon', 'Evening']
      const daySections = sections.map(sectionTitle => {
        const sectionRegex = new RegExp(`${sectionTitle}:([\\s\\S]*?)(?=${sections.map(s => `${s}:`).join('|')}|$)`)
        const sectionMatch = day.match(sectionRegex)
        const activities = sectionMatch 
          ? sectionMatch[1].trim().split('\n').filter(Boolean).map(activity => activity.trim())
          : ['No activities planned']
        return { title: sectionTitle, activities }
      })
      return { sections: daySections }
    }).slice(0, numDays)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <Clock className="animate-spin h-8 w-8 mr-3" />
        <p>Generating your itinerary...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-500 text-center mb-4">{error}</p>
        <Button onClick={() => router.push('/')}>
          Return to Home
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Your {itinerary.length}-Day Itinerary for {params.city}</h1>
      {itinerary.map((day, dayIndex) => (
        <div key={dayIndex} className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Day {dayIndex + 1}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {day.sections.map((section, index) => (
              <div key={section.title} className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  {index === 0 && <Coffee className="mr-2" />}
                  {index === 1 && <Sun className="mr-2" />}
                  {index === 2 && <Moon className="mr-2" />}
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.activities.map((activity, actIndex) => (
                    <li key={actIndex} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{activity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}



