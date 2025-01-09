import React from 'react';
import { Button } from "@/components/ui/button";
import { MapPin } from 'lucide-react';

interface Location {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
}

interface OpenInGoogleMapsButtonProps {
  locations: Location[];
}

const OpenInGoogleMapsButton: React.FC<OpenInGoogleMapsButtonProps> = ({ locations }) => {
  const openInGoogleMaps = () => {
    if (locations.length === 0) return;

    const origin = `${locations[0].lat},${locations[0].lng}`;
    const destination = `${locations[locations.length - 1].lat},${locations[locations.length - 1].lng}`;
    const waypoints = locations.slice(1, -1).map(loc => `${loc.lat},${loc.lng}`).join('|');

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=walking`;

    window.open(url, '_blank');
  };

  return (
    <Button onClick={openInGoogleMaps} className="flex items-center">
      <MapPin className="mr-2 h-4 w-4" />
      Open in Google Maps
    </Button>
  );
};

export default OpenInGoogleMapsButton;



