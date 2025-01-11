"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { Plus, Trash2, Clock, MapPin, Save } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Toast } from "@/components/ui/toast"
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { useSession } from "next-auth/react"

interface Activity {
  id: string
  name: string
  duration: number
  startTime: string
  address: string
}

interface Day {
  id: string
  activities: Activity[]
}

const generateTimeOptions = () => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      options.push(time)
    }
  }
  return options
}

const timeOptions = generateTimeOptions()

export default function BuildItineraryPage() {
  const [days, setDays] = useState<Day[]>([
    { id: 'day1', activities: [] }
  ])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itineraryTitle, setItineraryTitle] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const { data: session } = useSession()
  const router = useRouter()

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result

    if (!destination) {
      return
    }

    const sourceDay = days.find(day => day.id === source.droppableId)
    const destDay = days.find(day => day.id === destination.droppableId)

    if (sourceDay && destDay) {
      const newDays = [...days]
      const [reorderedItem] = sourceDay.activities.splice(source.index, 1)
      destDay.activities.splice(destination.index, 0, reorderedItem)
      setDays(newDays)
    }
  }

  const addActivity = (dayId: string) => {
    const newActivity: Activity = {
      id: `activity-${Date.now()}`,
      name: 'New Activity',
      duration: 60,
      startTime: '09:00',
      address: ''
    }

    setDays(days.map(day => 
      day.id === dayId 
        ? { ...day, activities: [...day.activities, newActivity] }
        : day
    ))
  }

  const updateActivity = (dayId: string, activityId: string, field: keyof Activity, value: string | number) => {
    setDays(days.map(day => 
      day.id === dayId
        ? {
            ...day,
            activities: day.activities.map(activity =>
              activity.id === activityId
                ? { ...activity, [field]: value }
                : activity
            )
          }
        : day
    ))
  }

  const removeActivity = (dayId: string, activityId: string) => {
    setDays(days.map(day => 
      day.id === dayId
        ? { ...day, activities: day.activities.filter(activity => activity.id !== activityId) }
        : day
    ))
  }

  const addDay = () => {
    const newDay: Day = {
      id: `day${days.length + 1}`,
      activities: []
    }
    setDays([...days, newDay])
  }

  const saveItinerary = async () => {
    if (!session) {
      router.push('/login')
      return
    }

    if (!itineraryTitle) {
      setToastMessage('Please enter a title for your itinerary')
      setShowToast(true)
      return
    }

    try {
      const response = await fetch('/api/itineraries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: itineraryTitle,
          city: itineraryTitle,
          days: days.length,
          content: days.map(day => ({
            sections: [{
              title: "Activities",
              activities: day.activities.map(activity => ({
                name: activity.name,
                time: activity.startTime,
                duration: activity.duration,
                address: activity.address
              }))
            }]
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save itinerary')
      }

      setToastMessage('Itinerary saved successfully!')
      setShowToast(true)
      setIsDialogOpen(false)
      setItineraryTitle('')
    } catch (error) {
      console.error('Error saving itinerary:', error)
      setToastMessage('Failed to save itinerary')
      setShowToast(true)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Build Your Itinerary</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Save className="mr-2 h-4 w-4" />
              Save Itinerary
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Itinerary</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="itinerary-title">City / Itinerary Title</Label>
              <Input
                id="itinerary-title"
                value={itineraryTitle}
                onChange={(e) => setItineraryTitle(e.target.value)}
                placeholder="Enter a city or title for your itinerary"
              />
            </div>
            <DialogFooter>
              <Button onClick={saveItinerary}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        {days.map((day, dayIndex) => (
          <Card key={day.id} className="mb-6">
            <CardHeader>
              <CardTitle>Day {dayIndex + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId={day.id}>
                {(provided) => (
                  <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {day.activities.map((activity, index) => (
                      <Draggable key={activity.id} draggableId={activity.id} index={index}>
                        {(provided) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-white p-4 rounded-lg shadow flex flex-col"
                          >
                            <Input
                              value={activity.name}
                              onChange={(e) => updateActivity(day.id, activity.id, 'name', e.target.value)}
                              className="mb-2"
                              placeholder="Activity name"
                            />
                            <div className="flex items-center space-x-2 mb-2">
                              <Label htmlFor={`${activity.id}-start-time`} className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                Start:
                              </Label>
                              <Select
                                value={activity.startTime}
                                onValueChange={(value) => updateActivity(day.id, activity.id, 'startTime', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeOptions.map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Label htmlFor={`${activity.id}-duration`}>Duration (min):</Label>
                              <Input
                                id={`${activity.id}-duration`}
                                type="number"
                                value={activity.duration}
                                onChange={(e) => updateActivity(day.id, activity.id, 'duration', parseInt(e.target.value))}
                                className="w-20"
                              />
                            </div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Label htmlFor={`${activity.id}-address`} className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                Address:
                              </Label>
                              <AddressAutocomplete
                                value={activity.address}
                                onChange={(value) => updateActivity(day.id, activity.id, 'address', value)}
                                onSelect={(address) => updateActivity(day.id, activity.id, 'address', address)}
                              />
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeActivity(day.id, activity.id)}
                              className="self-end"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Remove
                            </Button>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
              <Button onClick={() => addActivity(day.id)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" /> Add Activity
              </Button>
            </CardContent>
          </Card>
        ))}
      </DragDropContext>
      <Button onClick={addDay} className="mt-4">
        <Plus className="h-4 w-4 mr-2" /> Add Day
      </Button>
      {showToast && (
        <Toast 
          className={`fixed bottom-4 right-4 p-2 rounded shadow-lg ${
            toastMessage.includes('successfully') ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {toastMessage}
        </Toast>
      )}
    </div>
  )
}




