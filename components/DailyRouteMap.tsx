import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface Location {
  name: string;
  address: string;
}

interface DailyRouteMapProps {
  locations: Location[];
}

const DailyRouteMap: React.FC<DailyRouteMapProps> = ({ locations }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

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
      }
    });
  }, []);

  useEffect(() => {
    if (map && locations.length > 0) {
      const google = window.google;
      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer();
      directionsRenderer.setMap(map);

      const waypoints = locations.slice(1, -1).map(location => ({
        location: location.address,
        stopover: true
      }));

      directionsService.route(
        {
          origin: locations[0].address,
          destination: locations[locations.length - 1].address,
          waypoints: waypoints,
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.WALKING,
        },
        (result: any, status: any) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            directionsRenderer.setDirections(result);
          }
        }
      );
    }
  }, [map, locations]);

  return <div ref={mapRef} style={{ width: '100%', height: '400px' }} />;
};

export default DailyRouteMap;





