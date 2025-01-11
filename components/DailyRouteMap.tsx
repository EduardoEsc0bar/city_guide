import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface Location {
  name: string;
  address: string;
}

interface DailyRouteMapProps {
  locations: Location[];
  dayNumber: number;
}

const DailyRouteMap: React.FC<DailyRouteMapProps> = ({ locations, dayNumber }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
      version: "weekly",
      libraries: ["places"]
    });

    loader.load().then((google) => {
      if (mapRef.current) {
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 0, lng: 0 },
          zoom: 10,
        });
        setMap(map);
        const renderer = new google.maps.DirectionsRenderer();
        renderer.setMap(map);
        setDirectionsRenderer(renderer);
      }
    });
  }, []);

  useEffect(() => {
    if (!map || !directionsRenderer || locations.length === 0) return;

    const google = window.google;

    // Filter out locations without addresses
    const validLocations = locations.filter(location => location.address && location.address.trim() !== '');

    if (validLocations.length === 0) {
      // If no valid locations, center the map on the city name
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: locations[0].name }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          map.setCenter(results[0].geometry.location);
          map.setZoom(12);
        } else {
          console.error('Geocode was not successful for the following reason: ' + status);
        }
      });
      return;
    }

    if (validLocations.length === 1) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: validLocations[0].address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          map.setCenter(results[0].geometry.location);
          map.setZoom(15);
          new google.maps.Marker({
            map: map,
            position: results[0].geometry.location,
            title: validLocations[0].name
          });
        } else {
          console.error('Geocode was not successful for the following reason: ' + status);
        }
      });
    } else {
      const directionsService = new google.maps.DirectionsService();

      const origin = validLocations[0].address;
      const destination = validLocations[validLocations.length - 1].address;
      const waypoints = validLocations.slice(1, -1).map(location => ({
        location: location.address,
        stopover: true
      }));

      directionsService.route(
        {
          origin: origin,
          destination: destination,
          waypoints: waypoints,
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.WALKING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            directionsRenderer.setDirections(result);
            
            const bounds = new google.maps.LatLngBounds();
            result.routes[0].legs.forEach((leg) => {
              leg.steps.forEach((step) => {
                bounds.extend(step.start_location);
                bounds.extend(step.end_location);
              });
            });
            map.fitBounds(bounds);
          } else {
            console.error('Directions request failed due to ' + status);
          }
        }
      );
    }
  }, [map, directionsRenderer, locations]);

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Day {dayNumber} Route</h3>
      <div ref={mapRef} style={{ width: '100%', height: '400px' }} />
    </div>
  );
};

export default DailyRouteMap;

