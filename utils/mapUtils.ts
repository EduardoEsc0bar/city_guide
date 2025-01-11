import { Loader } from '@googlemaps/js-api-loader';

let googleMapsLoaded = false;

export const loadGoogleMaps = async () => {
  if (googleMapsLoaded) return;

  const loader = new Loader({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    version: "weekly",
    libraries: ["places"]
  });

  await loader.load();
  googleMapsLoaded = true;
};

export const getRouteCenterPoint = (locations: google.maps.LatLngLiteral[]): google.maps.LatLngLiteral => {
  if (locations.length === 0) {
    return { lat: 0, lng: 0 };
  }

  const totalLat = locations.reduce((sum, location) => sum + location.lat, 0);
  const totalLng = locations.reduce((sum, location) => sum + location.lng, 0);

  return {
    lat: totalLat / locations.length,
    lng: totalLng / locations.length
  };
};

type PlaceType = 
  | 'accounting' | 'airport' | 'amusement_park' | 'aquarium' | 'art_gallery' | 'atm' | 'bakery' 
  | 'bank' | 'bar' | 'beauty_salon' | 'bicycle_store' | 'book_store' | 'bowling_alley' | 'bus_station' 
  | 'cafe' | 'campground' | 'car_dealer' | 'car_rental' | 'car_repair' | 'car_wash' | 'casino' 
  | 'cemetery' | 'church' | 'city_hall' | 'clothing_store' | 'convenience_store' | 'courthouse' 
  | 'dentist' | 'department_store' | 'doctor' | 'drugstore' | 'electrician' | 'electronics_store' 
  | 'embassy' | 'fire_station' | 'florist' | 'funeral_home' | 'furniture_store' | 'gas_station' 
  | 'gym' | 'hair_care' | 'hardware_store' | 'hindu_temple' | 'home_goods_store' | 'hospital' 
  | 'insurance_agency' | 'jewelry_store' | 'laundry' | 'lawyer' | 'library' | 'light_rail_station' 
  | 'liquor_store' | 'local_government_office' | 'locksmith' | 'lodging' | 'meal_delivery' 
  | 'meal_takeaway' | 'mosque' | 'movie_rental' | 'movie_theater' | 'moving_company' | 'museum' 
  | 'night_club' | 'painter' | 'park' | 'parking' | 'pet_store' | 'pharmacy' | 'physiotherapist' 
  | 'plumber' | 'police' | 'post_office' | 'primary_school' | 'real_estate_agency' | 'restaurant' 
  | 'roofing_contractor' | 'rv_park' | 'school' | 'secondary_school' | 'shoe_store' | 'shopping_mall' 
  | 'spa' | 'stadium' | 'storage' | 'store' | 'subway_station' | 'supermarket' | 'synagogue' 
  | 'taxi_stand' | 'tourist_attraction' | 'train_station' | 'transit_station' | 'travel_agency' 
  | 'university' | 'veterinary_care' | 'zoo';

export const searchNearby = async (
  centerPoint: google.maps.LatLngLiteral,
  radius: number,
  type: PlaceType
): Promise<google.maps.places.PlaceResult[]> => {
  await loadGoogleMaps();

  return new Promise((resolve, reject) => {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const request: google.maps.places.PlaceSearchRequest = {
      location: centerPoint,
      radius: radius,
      type: type
    };

    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        resolve(results);
      } else {
        reject(new Error(`Places search failed: ${status}`));
      }
    });
  });
};



















