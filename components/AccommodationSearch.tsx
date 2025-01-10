import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bed } from 'lucide-react';

interface AccommodationInfo {
  name: string;
  address: string;
  rating: number;
}

interface AccommodationSearchProps {
  city: string;
  onSelect: (accommodation: AccommodationInfo) => void;
}

const AccommodationSearch: React.FC<AccommodationSearchProps> = ({ city, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [accommodations, setAccommodations] = useState<AccommodationInfo[]>([]);

  const searchAccommodations = async () => {
    // In a real application, this would be an API call to an accommodation search service
    // For this example, we'll use mock data
    const mockAccommodations: AccommodationInfo[] = [
      { name: "Cozy Inn", address: "123 Comfort St, " + city, rating: 4.3 },
      { name: "Luxury Suites", address: "456 Elegant Ave, " + city, rating: 4.8 },
      { name: "Budget Beds", address: "789 Thrifty Rd, " + city, rating: 3.9 },
    ];
    setAccommodations(mockAccommodations);
  };

  const handleSelectAccommodation = (accommodation: AccommodationInfo) => {
    onSelect(accommodation);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center">
          <Bed className="mr-2 h-4 w-4" />
          Search Accommodations
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Search Accommodations in {city}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <Input
              id="accommodation-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search accommodations..."
            />
            <Button onClick={searchAccommodations}>Search</Button>
          </div>
          {accommodations.map((accommodation, index) => (
            <div key={index} className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{accommodation.name}</h3>
                <p className="text-sm text-gray-500">{accommodation.address}</p>
                <p className="text-sm">Rating: {accommodation.rating}</p>
              </div>
              <Button onClick={() => handleSelectAccommodation(accommodation)}>Select</Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccommodationSearch;








