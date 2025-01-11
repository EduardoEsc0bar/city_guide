import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../auth/[...nextauth]/route"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { data, error } = await supabase.rpc('upvote_itinerary', {
      itinerary_id: params.id,
      user_id: session.user.id
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to upvote itinerary:", error)
    return NextResponse.json({ error: "Failed to upvote itinerary" }, { status: 500 })
  }
}

