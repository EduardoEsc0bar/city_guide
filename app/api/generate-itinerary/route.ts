import OpenAI from "openai"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function generateMultiDayItinerary(city: string, numDays: number, mustSees: string[]): Promise<string> {
  const mustSeesString =
    mustSees.length > 0
      ? `Must-see locations: ${mustSees.join(", ")}. These MUST be included in the itinerary, distributed across the days.`
      : ""
  const systemPrompt = `You are a knowledgeable travel assistant. Create a detailed ${numDays}-day itinerary for ${city}, focusing on must-see locations and efficient travel. ${mustSeesString} Provide SPECIFIC and UNIQUE activities for EVERY time slot (Morning, Afternoon, Evening) for EACH day, including Lunch and Dinner. Do not leave any slot empty or generic. EVERY activity MUST include a specific address. PRIORITIZE including all must-see locations before adding other activities. Format the itinerary EXACTLY as follows for EACH day:

Day X:

Morning:
1. [Specific Attraction Name] (Start Time – End Time)

[Brief description - 1-2 sentences]
Address: [Specific address for the attraction]
[Specific transportation information]

2. [Next Specific Attraction] (Start Time – End Time)

[Brief description - 1-2 sentences]
Address: [Specific address for the attraction]
[Specific transportation information]

Lunch (Start Time – End Time):
[Specific Restaurant Name]

[Brief description of cuisine - 1 sentence]
Address: [Specific address for the restaurant]

Afternoon:
3. [Specific Attraction Name] (Start Time – End Time)

[Brief description - 1-2 sentences]
Address: [Specific address for the attraction]
[Specific transportation information]

4. [Next Specific Attraction] (Start Time – End Time)

[Brief description - 1-2 sentences]
Address: [Specific address for the attraction]
[Specific transportation information]

Evening:
5. [Specific Attraction or Activity] (Start Time – End Time)

[Brief description - 1-2 sentences]
Address: [Specific address for the attraction/activity]
[Specific transportation information]

Dinner (Start Time – End Time):
[Specific Restaurant Name or Dining Area]

[Brief description of cuisine or dining experience - 1 sentence]
Address: [Specific address for the restaurant/dining area]

Repeat this EXACT format for each day, up to Day ${numDays}. Ensure that activities are UNIQUE across all days. Do not add any extra text or explanations outside of this format.`

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Create a detailed ${numDays}-day itinerary for ${city} with specific activities for every part of each day, including Morning, Afternoon, Evening, Lunch, and Dinner. Generate EXACTLY ${numDays} day(s), no more and no less. Remember to include a specific address for EVERY activity. ENSURE ALL must-see locations are included before adding other activities.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  })

  return completion.choices[0].message.content || ""
}

async function getCachedItinerary(city: string, numDays: number, mustSees: string[]): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("cached_itineraries")
      .select("itinerary, must_sees")
      .eq("city", city)
      .eq("days", numDays)

    if (error) {
      console.error("Error fetching from cached_itineraries:", error)
      return null
    }

    if (!data || data.length === 0) {
      console.log("No cached itinerary found for", city, "with", numDays, "days")
      return null
    }

    // Check if any of the cached itineraries contain all must-see locations
    for (const item of data) {
      if (item.itinerary && item.must_sees) {
        const cachedMustSees = item.must_sees as string[]
        if (mustSees.every((ms) => cachedMustSees.includes(ms))) {
          return item.itinerary
        }
      }
    }

    return null
  } catch (error) {
    console.error("Error in getCachedItinerary:", error)
    return null
  }
}

async function cacheItinerary(city: string, numDays: number, itinerary: string, mustSees: string[]) {
  try {
    const { error } = await supabase
      .from("cached_itineraries")
      .upsert({ city, days: numDays, itinerary, must_sees: mustSees }, { onConflict: "city,days" })

    if (error) {
      console.error("Error caching in cached_itineraries:", error)
      throw error
    }

    console.log("Successfully cached itinerary with must-see locations")
  } catch (error) {
    console.error("Error in cacheItinerary:", error)
    throw error
  }
}

function validateItinerary(
  itinerary: string,
  numDays: number,
  mustSees: any[],
): { isValid: boolean; reason?: string; missingMustSees?: string[] } {
  const days = itinerary.split(/Day \d+:/).filter(Boolean)
  if (days.length !== numDays) return { isValid: false, reason: `Expected ${numDays} days, but got ${days.length}` }

  for (let i = 0; i < numDays; i++) {
    const day = days[i]
    const requiredSections = ["Morning:", "Afternoon:", "Evening:", "Lunch", "Dinner"]
    for (const section of requiredSections) {
      if (!day.includes(section)) {
        return { isValid: false, reason: `Day ${i + 1} is missing ${section} section` }
      }
    }

    const activities = day.match(/\d+\./g)
    if (!activities || activities.length < 5) {
      return { isValid: false, reason: `Day ${i + 1} has fewer than 5 activities` }
    }

    // Check if all activities have addresses
    const addressCount = (day.match(/Address:/g) || []).length
    if (addressCount < activities.length) {
      return { isValid: false, reason: `Day ${i + 1} has activities missing addresses` }
    }
  }

  // Check for must-see locations
  const lowerCaseItinerary = itinerary.toLowerCase()
  const missingMustSees: string[] = []
  for (const mustSee of mustSees) {
    if (typeof mustSee === "string") {
      if (!lowerCaseItinerary.includes(mustSee.toLowerCase())) {
        missingMustSees.push(mustSee)
      }
    } else if (typeof mustSee === "object" && mustSee !== null && "name" in mustSee) {
      if (!lowerCaseItinerary.includes(mustSee.name.toLowerCase())) {
        missingMustSees.push(mustSee.name)
      }
    } else {
      console.warn("Invalid must-see item:", mustSee)
    }
  }

  if (missingMustSees.length > 0) {
    return {
      isValid: false,
      reason: `Itinerary is missing must-see locations: ${missingMustSees.join(", ")}`,
      missingMustSees,
    }
  }

  return { isValid: true }
}

function formatItinerary(itinerary: string, numDays: number): string {
  const days = itinerary.split(/Day \d+:/).filter(Boolean)
  return days
    .slice(0, numDays)
    .map((day, index) => `Day ${index + 1}:${day}`)
    .join("\n\n")
}

function insertMustSees(itinerary: string, missingMustSees: string[]): string {
  const days = itinerary.split(/Day \d+:/).filter(Boolean)
  const updatedDays = days.map((day, index) => {
    if (missingMustSees.length > 0) {
      const mustSee = missingMustSees.shift()
      const newActivity = `
${index + 1}. ${mustSee} $$10:00 AM – 12:00 PM$$

[A must-see location in the city]
Address: [Insert specific address for ${mustSee}]
[Insert transportation information]
`
      return day.replace(/Morning:/, `Morning:${newActivity}`)
    }
    return day
  })

  return updatedDays.map((day, index) => `Day ${index + 1}:${day}`).join("\n\n")
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key not configured")
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { city, days, mustSees } = body

    if (!city || city.trim().length === 0) {
      return NextResponse.json({ error: "Please enter a valid city" }, { status: 400 })
    }

    const numDays = Number.parseInt(days, 10)
    if (isNaN(numDays) || numDays < 1) {
      return NextResponse.json({ error: "Invalid number of days" }, { status: 400 })
    }

    const mustSeesArray = Array.isArray(mustSees) ? mustSees : []
    const mustSeesNames = mustSeesArray
      .map((item) =>
        typeof item === "string" ? item : item && typeof item === "object" && "name" in item ? item.name : "",
      )
      .filter(Boolean)

    let itinerary = await getCachedItinerary(city, numDays, mustSeesNames)
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      if (!itinerary) {
        itinerary = await generateMultiDayItinerary(city, numDays, mustSeesNames)
      }
      itinerary = formatItinerary(itinerary, numDays)

      const validationResult = validateItinerary(itinerary, numDays, mustSeesArray)
      if (validationResult.isValid) {
        break
      }

      console.warn(`Attempt ${attempts + 1} failed: ${validationResult.reason}`)

      if (validationResult.missingMustSees && validationResult.missingMustSees.length > 0) {
        itinerary = insertMustSees(itinerary, validationResult.missingMustSees)
        const revalidationResult = validateItinerary(itinerary, numDays, mustSeesArray)
        if (revalidationResult.isValid) {
          console.log("Successfully inserted missing must-see locations")
          break
        }
      }

      itinerary = null
      attempts++
    }

    if (attempts >= maxAttempts) {
      console.error(`Failed to generate a valid itinerary after ${maxAttempts} attempts.`)
      return NextResponse.json({ error: "Failed to generate a valid itinerary. Please try again." }, { status: 500 })
    }

    if (itinerary) {
      try {
        await cacheItinerary(city, numDays, itinerary, mustSeesNames)
        console.log("Itinerary successfully cached with must-see locations")
      } catch (cacheError) {
        console.error("Failed to cache itinerary:", cacheError)
      }
    }

    return NextResponse.json({ result: itinerary })
  } catch (error: any) {
    console.error("Error in generate-itinerary API:", error)
    if (error.response) {
      console.error(error.response.status, error.response.data)
      return NextResponse.json({ error: error.response.data }, { status: error.response.status })
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`)
      return NextResponse.json({ error: "An error occurred during your request." }, { status: 500 })
    }
  }
}

