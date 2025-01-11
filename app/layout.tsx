import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CityGuide - Plan Your Perfect Trip",
  description: "Discover and plan your perfect city adventure with personalized itineraries.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Providers>
          <Navbar />
          <main className="flex-grow">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}


















