import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { data: itinerary, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (error) throw error

    if (!itinerary) {
      return NextResponse.json({ error: "Itinerary not found" }, { status: 404 })
    }

    // Parse the content if it's stored as a JSON string
    if (typeof itinerary.content === 'string') {
      try {
        itinerary.content = JSON.parse(itinerary.content)
      } catch (e) {
        console.error("Error parsing itinerary content:", e)
      }
    }

    // Parse the accommodation if it's stored as a JSON string
    if (typeof itinerary.accommodation === 'string') {
      try {
        itinerary.accommodation = JSON.parse(itinerary.accommodation)
      } catch (e) {
        console.error("Error parsing accommodation data:", e)
      }
    }

    return NextResponse.json({ itinerary })
  } catch (error) {
    console.error("Failed to fetch itinerary:", error)
    return NextResponse.json({ error: "Failed to fetch itinerary" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { error } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', params.id)
      .eq('user_id', session.user.id)

    if (error) throw error

    return NextResponse.json({ message: "Itinerary deleted successfully" })
  } catch (error) {
    console.error("Failed to delete itinerary:", error)
    return NextResponse.json({ error: "Failed to delete itinerary" }, { status: 500 })
  }
}
