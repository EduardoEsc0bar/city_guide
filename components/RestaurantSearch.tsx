import type React from "react"
import { Button } from "@/components/ui/button"
import { Utensils } from "lucide-react"

interface RestaurantSearchProps {
  destination: string
}

const RestaurantSearch: React.FC<RestaurantSearchProps> = ({ destination }) => {
  const handleSearch = () => {
    const encodedDestination = encodeURIComponent(destination)
    const searchQuery = encodeURIComponent("restaurants")
    const url = `https://www.google.com/maps/search/${searchQuery}/${encodedDestination}`
    window.open(url, "_blank")
  }

  return (
    <Button onClick={handleSearch} className="flex items-center justify-center w-full sm:w-auto">
      <Utensils className="mr-2 h-4 w-4" />
      Search Restaurants
    </Button>
  )
}

export default RestaurantSearch

