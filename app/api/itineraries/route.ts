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
    const { title, days, content, mustSees, startDate, endDate, accommodation } = body

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
        accommodation: accommodation ? JSON.stringify(accommodation) : null,
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

    console.log("Fetched itineraries:", itineraries);

    const processedItineraries = itineraries.map(itinerary => {
      let parsedContent;
      try {
        parsedContent = JSON.parse(itinerary.content);
      } catch (error) {
        console.error("Error parsing itinerary content:", error);
        parsedContent = itinerary.content;
      }
      return {
        ...itinerary,
        title: itinerary.title || "Untitled Itinerary",
        content: parsedContent,
        accommodation: itinerary.accommodation ? JSON.parse(itinerary.accommodation) : null,
      };
    });

    console.log("Processed itineraries:", processedItineraries);

    return NextResponse.json({ itineraries: processedItineraries })
  } catch (error) {
    console.error("Failed to fetch itineraries:", error)
    return NextResponse.json({ error: "Failed to fetch itineraries" }, { status: 500 })
  }
}



























