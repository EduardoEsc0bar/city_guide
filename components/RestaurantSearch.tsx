import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Utensils } from 'lucide-react';

interface Restaurant {
  name: string;
  address: string;
  rating: number;
}

interface RestaurantSearchProps {
  city: string;
  onSelectRestaurant: (restaurant: Restaurant, mealTime: string) => void;
}

const RestaurantSearch: React.FC<RestaurantSearchProps> = ({ city, onSelectRestaurant }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [mealTime, setMealTime] = useState('');

  const searchRestaurants = async () => {
    // In a real application, this would be an API call to a restaurant search service
    // For this example, we'll use mock data
    const mockRestaurants: Restaurant[] = [
      { name: "Delicious Diner", address: "123 Main St, " + city, rating: 4.5 },
      { name: "Tasty Tavern", address: "456 Oak Ave, " + city, rating: 4.2 },
      { name: "Gourmet Grill", address: "789 Pine Rd, " + city, rating: 4.7 },
    ];
    setRestaurants(mockRestaurants);
  };

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handleAddToItinerary = () => {
    if (selectedRestaurant && mealTime) {
      onSelectRestaurant(selectedRestaurant, mealTime);
      setSelectedRestaurant(null);
      setMealTime('');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center">
          <Utensils className="mr-2 h-4 w-4" />
          Search Restaurants
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Search Restaurants in {city}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <Input
              id="restaurant-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search restaurants..."
            />
            <Button onClick={searchRestaurants}>Search</Button>
          </div>
          {restaurants.map((restaurant, index) => (
            <div key={index} className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{restaurant.name}</h3>
                <p className="text-sm text-gray-500">{restaurant.address}</p>
                <p className="text-sm">Rating: {restaurant.rating}</p>
              </div>
              <Button onClick={() => handleSelectRestaurant(restaurant)}>Select</Button>
            </div>
          ))}
          {selectedRestaurant && (
            <div className="mt-4">
              <h3 className="font-semibold">Selected: {selectedRestaurant.name}</h3>
              <select
                className="mt-2 w-full p-2 border rounded"
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
              >
                <option value="">Select meal time</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
              <Button className="mt-2 w-full" onClick={handleAddToItinerary}>
                Add to Itinerary
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestaurantSearch;











