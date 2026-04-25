import type React from "react"
import { Button } from "@/components/ui/button"
import { Bed } from "lucide-react"

interface AccommodationSearchProps {
  destination: string
}

const AccommodationSearch: React.FC<AccommodationSearchProps> = ({ destination }) => {
  const handleSearch = () => {
    const encodedDestination = encodeURIComponent(destination)
    const searchQuery = encodeURIComponent("accommodations")
    const url = `https://www.google.com/maps/search/${searchQuery}/${encodedDestination}`
    window.open(url, "_blank")
  }

  return (
    <Button onClick={handleSearch} className="flex items-center justify-center w-full sm:w-auto">
      <Bed className="mr-2 h-4 w-4" />
      Search Accommodations
    </Button>
  )
}

export default AccommodationSearch

