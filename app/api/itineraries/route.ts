import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, days, content, mustSees, startDate, endDate } = body

    const { data: itinerary, error } = await supabase
      .from('itineraries')
      .insert({
        user_id: session.user.id,
        title: title,
        days,
        content: JSON.stringify(content),
        must_sees: mustSees,
        start_date: startDate,
        end_date: endDate,
      })
      .select()

    if (error) throw error

    return NextResponse.json({ itinerary: itinerary[0] })
  } catch (error) {
    console.error("Failed to save itinerary:", error)
    return NextResponse.json({ error: "Failed to save itinerary" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { data: itineraries, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const processedItineraries = itineraries.map(itinerary => ({
      ...itinerary,
      content: typeof itinerary.content === 'string' ? JSON.parse(itinerary.content) : itinerary.content,
      title: itinerary.title || "Untitled Itinerary",
      startDate: itinerary.start_date ? new Date(itinerary.start_date).toISOString() : null,
      endDate: itinerary.end_date ? new Date(itinerary.end_date).toISOString() : null
    }));

    return NextResponse.json({ itineraries: processedItineraries })
  } catch (error) {
    console.error("Failed to fetch itineraries:", error)
    return NextResponse.json({ error: "Failed to fetch itineraries" }, { status: 500 })
  }
}

