import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../auth/[...nextauth]/route"
import { supabase } from "@/lib/supabase"
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/google-calendar/callback`
)

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    // Fetch the user's Google tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (tokenError) throw tokenError
    if (!tokens) {
      return NextResponse.json({ error: "Google Calendar not authenticated" }, { status: 400 })
    }

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    })

    // Fetch the itinerary
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

    if (!itinerary.start_date || !itinerary.end_date) {
      return NextResponse.json({ error: "Itinerary does not have a date range set" }, { status: 400 })
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Create an event for each day of the itinerary
    for (let i = 0; i < itinerary.content.length; i++) {
      const day = itinerary.content[i]
      const date = new Date(itinerary.start_date)
      date.setDate(date.getDate() + i)

      for (const section of day.sections) {
        for (const activity of section.activities) {
          await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
              summary: activity.name,
              description: activity.description,
              location: activity.address,
              start: {
                dateTime: `${date.toISOString().split('T')[0]}T${activity.time}:00`,
                timeZone: 'UTC',
              },
              end: {
                dateTime: `${date.toISOString().split('T')[0]}T${activity.time}:00`,
                timeZone: 'UTC',
              },
            },
          })
        }
      }
    }

    return NextResponse.json({ message: "Itinerary saved to Google Calendar" })
  } catch (error) {
    console.error("Failed to save itinerary to Google Calendar:", error)
    return NextResponse.json({ error: "Failed to save itinerary to Google Calendar" }, { status: 500 })
  }
}

