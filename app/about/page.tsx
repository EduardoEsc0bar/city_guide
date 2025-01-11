import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8 text-center">About CityGuide</h1>
      

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div>
          <h2 className="text-2xl font-semibold mb-4">The Idea</h2>
          <p className="text-lg mb-4">
            The idea for this came from the fact that my little sister will be a pilot one day. 
          </p>
          <p className="text-lg mb-4">
          I had in mind that she’ll be in a random city for one day, or for many days, and she’ll wonder what to do and where to go. 
          </p>
          <p className="text-lg mb-4">
            I also made this for all the impulsive travelers that just pick a city and go.
          </p>
          <p className="text-lg">
            Our AI-powered platform creates custom travel plans tailored to your 
            interests, time constraints, and must-see locations, ensuring you 
            make the most of every moment in a new city.
          </p>
        </div>
        <div className="relative h-64 md:h-auto">
          <Image
            src="/photo.jpg"
            alt="City Collage"
            fill
            className="object-cover rounded-lg"
          />
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-2">AI-Generated Itineraries</h3>
            <p>Customized travel plans created in seconds, tailored to your preferences and schedule.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-2">Flexible Planning</h3>
            <p>Easily adjust your itinerary, add must-see locations, and optimize your route.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-2">Community Sharing</h3>
            <p>Discover and share itineraries with fellow travelers, gaining insider tips and inspiration.</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Technology Stack</h2>
      <div className="flex flex-wrap gap-2 mb-16">
        <Badge variant="secondary">Next.js</Badge>
        <Badge variant="secondary">React</Badge>
        <Badge variant="secondary">TypeScript</Badge>
        <Badge variant="secondary">Tailwind CSS</Badge>
        <Badge variant="secondary">Node.js</Badge>
        <Badge variant="secondary">OpenAI API</Badge>
        <Badge variant="secondary">Google Maps API</Badge>
        <Badge variant="secondary">Supabase</Badge>
      </div>

      <footer className="text-center text-sm text-gray-500">
        <p>© 2023 CityGuide. All rights reserved.</p>
        <p>Made with % for travelers everywhere</p>
      </footer>
    </div>
  )
}



