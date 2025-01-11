import React from 'react';
import { Button } from "@/components/ui/button";
import { Bed } from 'lucide-react';

interface AccommodationSearchProps {
 location: string;
}

const AccommodationSearch: React.FC<AccommodationSearchProps> = ({ location }) => {
 const handleSearch = () => {
   const encodedLocation = encodeURIComponent(location);
   const searchQuery = encodeURIComponent('accommodations');
   const url = `https://www.google.com/maps/search/${searchQuery}/${encodedLocation}`;
   window.open(url, '_blank');
 };

 return (
   <Button onClick={handleSearch} className="flex items-center justify-center w-full sm:w-auto">
     <Bed className="mr-2 h-4 w-4" />
     Search Accommodations
   </Button>
 );
};

export default AccommodationSearch;














