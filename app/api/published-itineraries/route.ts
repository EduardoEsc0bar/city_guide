import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const destination = searchParams.get('destination')

  if (!destination) {
    return NextResponse.json({ error: "Destination is required" }, { status: 400 })
  }

  try {
    const { data: itineraries, error } = await supabase
      .from('published_itineraries')
      .select(`
        id,
        title,
        days,
        upvotes,
        user:users!published_itineraries_user_id_fkey(name)
      `)
      .eq('destination', destination)
      .order('upvotes', { ascending: false })

    if (error) throw error

    return NextResponse.json({ itineraries })
  } catch (error) {
    console.error("Failed to fetch published itineraries:", error)
    return NextResponse.json({ error: "Failed to fetch published itineraries" }, { status: 500 })
  }
}



