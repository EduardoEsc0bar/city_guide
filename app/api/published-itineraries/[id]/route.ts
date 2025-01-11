import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { data: itinerary, error } = await supabase
      .from('published_itineraries')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) throw error

    if (!itinerary) {
      return NextResponse.json({ error: "Published itinerary not found" }, { status: 404 })
    }

    // Parse the content if it's stored as a JSON string
    if (typeof itinerary.content === 'string') {
      try {
        itinerary.content = JSON.parse(itinerary.content)
      } catch (e) {
        console.error("Error parsing itinerary content:", e)
      }
    }

    return NextResponse.json({ itinerary })
  } catch (error) {
    console.error("Failed to fetch published itinerary:", error)
    return NextResponse.json({ error: "Failed to fetch published itinerary" }, { status: 500 })
  }
}

