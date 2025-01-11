"use client"

import * as React from "react"
import { CalendarIcon, Check } from 'lucide-react'
import { addDays, format } from "date-fns"
import { DateRange } from "react-day-picker"
import { useState } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  className?: string
  dateRange: DateRange | undefined
  onDateRangeChange: (dateRange: DateRange | undefined) => void
}

export function DateRangePicker({
  className,
  dateRange,
  onDateRangeChange,
}: DateRangePickerProps) {
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange)
  const [open, setOpen] = useState(false)

  const isDesktop = useMediaQuery("(min-width: 768px)")

  const handleConfirm = () => {
    onDateRangeChange(tempDateRange)
    setOpen(false)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              // Remove the text-muted-foreground class when there's no date range
              "text-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                </>
              ) : (
                format(dateRange.from, "MMM d, yyyy")
              )
            ) : (
              <span>Pick a date range (optional)</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className={cn(
            isDesktop ? "w-[600px]" : "w-[300px]",
            "h-[350px]" // Update 1
          )}>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempDateRange?.from}
              selected={tempDateRange}
              onSelect={setTempDateRange}
              numberOfMonths={isDesktop ? 2 : 1}
              className="rounded-md border" // Update 2
            />
            <Button
              size="icon"
              className="absolute bottom-2 right-2"
              onClick={handleConfirm}
            >
              <Check className="h-4 w-4" />
            </Button> {/* Update 3 & 4 */}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

