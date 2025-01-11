import React, { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { Plus, Trash2, Clock, MapPin } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { ItineraryDay, ItineraryActivity } from '@/types/itinerary'
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "@/types/dateRange"

interface EditableItineraryProps {
  itinerary: ItineraryDay[]
  setItinerary: React.Dispatch<React.SetStateAction<ItineraryDay[]>>
  selectedDay: number | null
  setSelectedDay: React.Dispatch<React.SetStateAction<number | null>>
  startDate: Date | null
  endDate: Date | null
  onDateRangeChange: (dateRange: DateRange | undefined) => void
}

const EditableItinerary: React.FC<EditableItineraryProps> = ({ 
  itinerary, 
  setItinerary, 
  selectedDay, 
  setSelectedDay,
  startDate,
  endDate,
  onDateRangeChange
}) => {
  const [isAddActivityDialogOpen, setIsAddActivityDialogOpen] = useState(false)
  const [newActivity, setNewActivity] = useState<Partial<ItineraryActivity>>({})

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
        day.sections[0].activities.push({
          ...newActivity,
          time: newActivity.time || '',
          duration: newActivity.duration || 0,
        } as ItineraryActivity);
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

  return (
    <div>
      <div className="mb-6 w-full">
        <h3 className="text-lg font-semibold mb-2">Edit Dates</h3>
        <DateRangePicker
          dateRange={{ from: startDate || undefined, to: endDate || undefined }}
          onDateRangeChange={onDateRangeChange}
        />
      </div>
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
      <DragDropContext onDragEnd={handleDragEnd}>
        {itinerary.map((day) => (
          <Card key={day.dayNumber} className="mb-8">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Day {day.dayNumber}</span>
                <Button onClick={() => addActivity(day.dayNumber)} size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Activity
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId={day.dayNumber.toString()}>
                {(provided) => (
                  <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {day.sections[0].activities.map((activity, index) => (
                      <Draggable key={`${day.dayNumber}-${index}`} draggableId={`${day.dayNumber}-${index}`} index={index}>
                        {(provided) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-white p-4 rounded-lg shadow flex flex-col"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <Input
                                value={activity.name}
                                onChange={(e) => updateActivity(day.dayNumber, index, 'name', e.target.value)}
                                className="font-medium"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeActivity(day.dayNumber, index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Input
                                value={activity.time}
                                onChange={(e) => updateActivity(day.dayNumber, index, 'time', e.target.value)}
                                placeholder="Time (e.g., 9:00 AM)"
                                className="w-32"
                              />
                              <Input
                                value={activity.duration?.toString() || ''}
                                onChange={(e) => updateActivity(day.dayNumber, index, 'duration', parseInt(e.target.value, 10) || 0)}
                                placeholder="Duration (min)"
                                type="number"
                                className="w-32"
                              />
                            </div>
                            <Input
                              value={activity.description}
                              onChange={(e) => updateActivity(day.dayNumber, index, 'description', e.target.value)}
                              placeholder="Description"
                              className="mb-2"
                            />
                            <AddressAutocomplete
                              value={activity.address || ''}
                              onChange={(value) => updateActivity(day.dayNumber, index, 'address', value)}
                              onSelect={(address) => updateActivity(day.dayNumber, index, 'address', address)}
                            />
                            <Input
                              value={activity.transportation}
                              onChange={(e) => updateActivity(day.dayNumber, index, 'transportation', e.target.value)}
                              placeholder="Transportation"
                              className="mt-2"
                            />
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </CardContent>
          </Card>
        ))}
      </DragDropContext>
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
              placeholder="Time (e.g., 9:00 AM)"
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
            <AddressAutocomplete
              value={newActivity.address || ''}
              onChange={(value) => setNewActivity({ ...newActivity, address: value })}
              onSelect={(address) => setNewActivity({ ...newActivity, address: address })}
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
    </div>
  );
};

export default EditableItinerary;









