"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { Search, X, Check, AlertCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Toast } from "@/components/ui/toast"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { differenceInDays, addDays } from "date-fns"

interface MustSee {
  name: string;
  address?: string;
}

export function HeroSearch() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [mustSees, setMustSees] = useState<MustSee[]>([])
  const [newMustSee, setNewMustSee] = useState<MustSee>({ name: '', address: '' })
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastType, setToastType] = useState<"success" | "error">("success")
  const router = useRouter()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setToastMessage("Please enter a city for the itinerary");
      setToastType("error");
      setShowToast(true);
      return;
    }
    setIsLoading(true);

    const days = dateRange?.from && dateRange?.to
      ? differenceInDays(dateRange.to, dateRange.from) + 1
      : undefined;

    const queryParams = new URLSearchParams({
      ...(days && { days: days.toString() }),
      mustSees: JSON.stringify(mustSees),
      ...(dateRange?.from && { startDate: dateRange.from.toISOString() }),
      ...(dateRange?.to && { endDate: dateRange.to.toISOString() })
    }).toString();
    
    try {
      await router.push(`/itinerary/${encodeURIComponent(searchQuery)}?${queryParams}`);
    } catch (error) {
      console.error('Navigation failed:', error);
      setToastMessage("Failed to generate itinerary. Please try again.");
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("")
  }

  const addMustSee = () => {
    if (newMustSee.name) {
      setMustSees([...mustSees, newMustSee])
      setNewMustSee({ name: '', address: '' })
      setToastMessage("Must-see location added successfully!");
      setToastType("success");
      setShowToast(true)
    }
  }

  const removeMustSee = (index: number) => {
    setMustSees(mustSees.filter((_, i) => i !== index))
  }

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative bg-white rounded-full shadow-lg">
          <div className="flex items-center px-4 h-14">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <Input
              type="text"
              placeholder="Enter a city for an itinerary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 text-lg bg-transparent border-none focus:outline-none text-gray-900"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearSearch}
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-white text-black border-gray-300 hover:bg-gray-100 hover:text-black">
                <span className="hidden sm:inline">Add Must-sees</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Must-see Locations</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Location name"
                  value={newMustSee.name}
                  onChange={(e) => setNewMustSee({ ...newMustSee, name: e.target.value })}
                />
                <Input
                  placeholder="Address (optional)"
                  value={newMustSee.address}
                  onChange={(e) => setNewMustSee({ ...newMustSee, address: e.target.value })}
                />
                <Button onClick={addMustSee}>Add</Button>
              </div>
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Must-see Locations:</h4>
                <ul className="space-y-2">
                  {mustSees.map((mustSee, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <span className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        {mustSee.name} {mustSee.address && `(${mustSee.address})`}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => removeMustSee(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <Button 
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Itinerary'}
        </Button>
      </form>

      {showToast && (
        <Toast className={`fixed bottom-4 right-4 ${toastType === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white p-2 rounded shadow-lg flex items-center`}>
          {toastType === 'error' && <AlertCircle className="mr-2 h-4 w-4" />}
          {toastMessage}
        </Toast>
      )}
    </div>
  )
}

