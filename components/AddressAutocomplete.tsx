"use client"

import React, { useRef, useEffect, useState } from 'react'
import { Input } from "@/components/ui/input"
import { Loader } from "@googlemaps/js-api-loader"

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (address: string) => void
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ value, onChange, onSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
      version: "weekly",
      libraries: ["places"]
    })

    loader.load().then(() => {
      setLoaded(true)
    }).catch((error) => {
      console.error("Error loading Google Maps API:", error)
    })
  }, [])

  useEffect(() => {
    if (loaded && inputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address']
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place.formatted_address) {
          onSelect(place.formatted_address)
        }
      })
    }
  }, [loaded, onSelect])

  return (
    <Input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter address"
      className="flex-grow"
    />
  )
}

export default AddressAutocomplete

