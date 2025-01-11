import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error("Error from Google OAuth:", error)
    return NextResponse.redirect('/saved?error=GoogleAuthFailed')
  }

  if (!code) {
    return NextResponse.redirect('/saved?error=NoCodeProvided')
  }

  // Redirect back to the saved page with the code
  return NextResponse.redirect(`/saved?code=${code}`)
}



