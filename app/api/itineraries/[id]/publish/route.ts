import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../auth/[...nextauth]/route"
import { popularDestinations } from '@/data/destinations'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { destination } = body

    if (!destination) {
      return NextResponse.json({ error: "Destination is required" }, { status: 400 })
    }

    if (!popularDestinations.some(dest => dest.name === destination)) {
      return NextResponse.json({ error: "Invalid destination" }, { status: 400 })
    }

    const { data: itinerary, error: fetchError } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (fetchError) throw fetchError

    if (!itinerary) {
      return NextResponse.json({ error: "Itinerary not found" }, { status: 404 })
    }

    const { data: publishedItinerary, error: publishError } = await supabase
      .from('published_itineraries')
      .insert({
        itinerary_id: itinerary.id,
        user_id: session.user.id,
        destination: destination,
        title: itinerary.title,
        days: itinerary.days,
        content: itinerary.content,
        upvotes: 0
      })
      .select()
      .single()

    if (publishError) throw publishError

    // Update the original itinerary to mark it as published
    const { error: updateError } = await supabase
      .from('itineraries')
      .update({ is_published: true })
      .eq('id', itinerary.id)

    if (updateError) throw updateError

    return NextResponse.json({ publishedItinerary })
  } catch (error) {
    console.error("Failed to publish itinerary:", error)
    return NextResponse.json({ error: "Failed to publish itinerary" }, { status: 500 })
  }
}



