'use client'

import { useState } from "react"
import { signIn } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn("google", { 
        callbackUrl,
        redirect: true
      })
    } catch (error) {
      console.error("Login failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <Image
          src="/city-background.jpg"
          alt="City skyline at sunset"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 p-8 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl mx-4">
        <div className="text-center">
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Welcome to CityGuide
          </h2>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center" role="alert">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span className="block sm:inline">
              {error === 'AccessDenied' ? 'Access denied. Please try again.' : 
               error === 'Configuration' ? 'There is a problem with the server configuration.' :
               'An error occurred. Please try again.'}
            </span>
          </div>
        )}

        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2"
        >
          <Image
            src="/google.svg"
            alt="Google logo"
            width={20}
            height={20}
          />
          <span>{isLoading ? "Signing in..." : "Sign in with Google"}</span>
        </Button>

        <p className="text-center text-sm text-gray-600">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="font-medium text-indigo-600 hover:text-indigo-500">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-indigo-600 hover:text-indigo-500">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}









