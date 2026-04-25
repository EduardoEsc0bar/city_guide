import OpenAI from "openai"
import { NextResponse } from "next/server"
import { isSupabaseReachable, supabase } from "@/lib/supabase"

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

async function createChatCompletion(city: string, numDays: number, mustSees: string[]) {
  if (!openai) {
    throw new Error("OPENAI_API_KEY not configured")
  }

  const mustSeesString =
    mustSees.length > 0
      ? `Must-see locations: ${mustSees.join(", ")}. These MUST be included in the itinerary, distributed across the days.`
      : ""
  const systemPrompt = `You are a knowledgeable travel assistant. Create a compact ${numDays}-day itinerary for ${city}. ${mustSeesString}

Day X:

Morning:
1. [Specific Attraction Name] $$09:00 AM – 10:30 AM$$
[One short sentence.]
Address: [Specific full address]
Transportation: [One short sentence]

2. [Next Specific Attraction] $$11:00 AM – 12:30 PM$$
[One short sentence.]
Address: [Specific full address]
Transportation: [One short sentence]

Lunch $$01:00 PM – 02:00 PM$$:
[Specific Restaurant Name]
Address: [Specific full address]

Afternoon:
3. [Specific Attraction Name] $$02:30 PM – 04:00 PM$$
[One short sentence.]
Address: [Specific full address]
Transportation: [One short sentence]

4. [Next Specific Attraction] $$04:30 PM – 06:00 PM$$
[One short sentence.]
Address: [Specific full address]
Transportation: [One short sentence]

Evening:
5. [Specific Attraction or Activity] $$06:30 PM – 08:00 PM$$
[One short sentence.]
Address: [Specific full address]
Transportation: [One short sentence]

Dinner $$08:15 PM – 09:30 PM$$:
[Specific Restaurant Name or Dining Area]
Address: [Specific full address]

Rules:
- Output EXACTLY ${numDays} days.
- Keep descriptions brief: one sentence per numbered activity and no extra paragraphs.
- Every numbered activity and meal must include a specific address.
- Use the $$time$$ format exactly.
- Do not add any text before Day 1 or after the final dinner.
- Activities must be unique across days.`

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Create the itinerary now for ${city}. Generate EXACTLY ${numDays} day(s), using the required compact format. Include all must-see locations before adding anything else.`,
      },
    ],
    max_completion_tokens: 8000,
    frequency_penalty: 0,
    presence_penalty: 0,
  })

  const content = completion.choices[0]?.message?.content?.trim()
  if (!content) {
    throw new Error("OpenAI returned an empty itinerary response")
  }

  return content
}

async function generateMultiDayItinerary(city: string, numDays: number, mustSees: string[]): Promise<string> {
  return createChatCompletion(city, numDays, mustSees)
}

async function getCachedItinerary(city: string, numDays: number, mustSees: string[]): Promise<string | null> {
  try {
    if (!(await isSupabaseReachable())) {
      return null
    }

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
    if (!(await isSupabaseReachable())) {
      return
    }

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
    const maxAttempts = 3

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

      // Only retry validation failures from a real model response.
      // Fatal API errors are handled by the outer catch and should not loop.
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
    if (
      error?.status === 429 ||
      error?.code === "insufficient_quota" ||
      error?.code === "rate_limit_exceeded"
    ) {
      return NextResponse.json(
        {
          error: "Itinerary generation is unavailable because the configured OpenAI account is out of quota or rate-limited.",
        },
        { status: 503 },
      )
    }

    if (error?.status === 403 || error?.code === "model_not_found") {
      return NextResponse.json(
        {
          error:
            "The configured OPENAI_API_KEY belongs to a project that does not have access to gpt-5-mini.",
        },
        { status: 503 },
      )
    }

    console.error(`Error with itinerary generation request: ${error?.message ?? "unknown error"}`)
    return NextResponse.json({ error: "An error occurred during your request." }, { status: 500 })
  }
}
