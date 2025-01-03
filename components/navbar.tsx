"use client"

import Link from "next/link"
import { MapPin } from 'lucide-react'
import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <MapPin className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-primary">CityGuide</span>
            </Link>
            <nav className="hidden md:ml-10 md:flex md:space-x-8">
              <Link href="/explore" className="text-sm font-medium text-gray-500 hover:text-primary">
                Explore
              </Link>
              <Link href="/itineraries" className="text-sm font-medium text-gray-500 hover:text-primary">
                Itineraries
              </Link>
              <Link href="/saved" className="text-sm font-medium text-gray-500 hover:text-primary">
                Saved
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}







