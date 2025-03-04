import React from 'react';
import { Button } from "@/components/ui/button";
import { MapPin } from 'lucide-react';

interface Location {
  name: string;
  address: string | undefined;
}

interface OpenInGoogleMapsButtonProps {
  locations: Location[];
}

const OpenInGoogleMapsButton: React.FC<OpenInGoogleMapsButtonProps> = ({ locations }) => {
  const openInGoogleMaps = () => {
    if (locations.length === 0) return;

    const validLocations = locations.filter(loc => loc.address);
    if (validLocations.length === 0) return;

    const origin = encodeURIComponent(validLocations[0].address!);
    const destination = encodeURIComponent(validLocations[validLocations.length - 1].address!);
    const waypoints = validLocations.slice(1, -1).map(loc => encodeURIComponent(loc.address!)).join('|');

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

