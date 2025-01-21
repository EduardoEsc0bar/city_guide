import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get("city")

  if (!city) {
    return NextResponse.json({ error: "City parameter is required" }, { status: 400 })
  }

  const { data, error } = await supabase.from("cached_itineraries").select("itineraries").eq("city", city).single()

  if (error) {
    console.error("Error fetching cached itineraries:", error)
    return NextResponse.json({ error: "Failed to fetch cached itineraries" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ itineraries: null })
  }

  return NextResponse.json({ itineraries: data.itineraries })
}

