import React from 'react';
import { Button } from "@/components/ui/button";
import { Utensils } from 'lucide-react';

interface Location {
  lat: number;
  lng: number;
}

interface RestaurantSearchProps {
  routeLocations: Location[];
}

const RestaurantSearch: React.FC<RestaurantSearchProps> = ({ routeLocations }) => {
  const searchRestaurants = () => {
    if (routeLocations.length === 0) return;

    const centerPoint = routeLocations[Math.floor(routeLocations.length / 2)];
    const url = `https://www.google.com/maps/search/restaurants/@${centerPoint.lat},${centerPoint.lng},14z`;
    window.open(url, '_blank');
  };

  return (
    <Button onClick={searchRestaurants} className="flex items-center">
      <Utensils className="mr-2 h-4 w-4" />
      Search Restaurants
    </Button>
  );
};

export default RestaurantSearch;









