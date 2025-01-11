'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Authentication Error</h1>
        <p className="mb-4">An error occurred during the authentication process:</p>
        <p className="p-2 bg-red-100 border border-red-300 rounded mb-4">{error}</p>
        <p className="mb-4">Please try again or contact support if the problem persists.</p>
        <Button asChild>
          <Link href="/login">Return to Login</Link>
        </Button>
      </div>
    </div>
  )
}

