import React from 'react';
import { Button } from "@/components/ui/button";
import { Hotel } from 'lucide-react';

interface Location {
  lat: number;
  lng: number;
}

interface HotelSearchProps {
  routeLocations: Location[];
}

const HotelSearch: React.FC<HotelSearchProps> = ({ routeLocations }) => {
  const searchHotels = () => {
    if (routeLocations.length === 0) return;

    const centerPoint = routeLocations[Math.floor(routeLocations.length / 2)];
    const url = `https://www.google.com/maps/search/hotels/@${centerPoint.lat},${centerPoint.lng},14z`;
    window.open(url, '_blank');
  };

  return (
    <Button onClick={searchHotels} className="flex items-center">
      <Hotel className="mr-2 h-4 w-4" />
      Search Hotels
    </Button>
  );
};

export default HotelSearch;


