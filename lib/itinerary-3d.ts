import type { ItineraryDay, ItineraryStop } from "@/types/itinerary"

const TIME_RANGE_PATTERN = /(\d{1,2}:\d{2}\s*[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s*[AP]M)/i

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function splitTimeRange(timeText: string) {
  const match = timeText.match(TIME_RANGE_PATTERN)
  if (!match) {
    return { startTime: undefined, endTime: undefined }
  }

  return {
    startTime: match[1],
    endTime: match[2],
  }
}

export function buildDayStops(day: ItineraryDay): ItineraryStop[] {
  let order = 0

  return day.sections.flatMap((section) =>
    section.activities
      .filter((activity) => activity.address && activity.address.trim() !== "")
      .map((activity) => {
        order += 1
        const { startTime, endTime } = splitTimeRange(activity.time)

        return {
          id: `day-${day.dayNumber}-${order}-${slugify(activity.name)}`,
          dayNumber: day.dayNumber,
          order,
          sectionTitle: section.title,
          name: activity.name,
          address: activity.address!.trim(),
          description: activity.description,
          transportation: activity.transportation,
          time: activity.time,
          startTime,
          endTime,
        }
      }),
  )
}

export function buildMapboxStaticPreviewUrl(
  stop: Pick<ItineraryStop, "lng" | "lat">,
  mapboxToken: string | null,
) {
  if (!mapboxToken || stop.lng == null || stop.lat == null) {
    return null
  }

  const baseUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${stop.lng},${stop.lat},14.2,0/320x180`
  return `${baseUrl}?access_token=${mapboxToken}`
}
