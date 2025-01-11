import React from 'react';
import { Button } from "@/components/ui/button";
import { Utensils } from 'lucide-react';

interface RestaurantSearchProps {
 location: string;
}

const RestaurantSearch: React.FC<RestaurantSearchProps> = ({ location }) => {
 const handleSearch = () => {
   const encodedLocation = encodeURIComponent(location);
   const searchQuery = encodeURIComponent('restaurants');
   const url = `https://www.google.com/maps/search/${searchQuery}/${encodedLocation}`;
   window.open(url, '_blank');
 };

 return (
   <Button onClick={handleSearch} className="flex items-center justify-center w-full sm:w-auto">
     <Utensils className="mr-2 h-4 w-4" />
     Search Restaurants
   </Button>
 );
};

export default RestaurantSearch;

















