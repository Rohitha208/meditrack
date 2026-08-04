import { useState, useCallback, useRef } from "react";
import { LatLng } from "leaflet";

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

export interface SearchSuggestion {
  place_id: string;
  description: string;
  lat: number;
  lng: number;
}

const useMap = () => {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.505, -0.09]); // Default to London
  const [zoom, setZoom] = useState(13);
  
  const mapRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reverse geocode coordinates to address
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      // This is a placeholder - implement with your preferred geocoding service
      // For now, return coordinates as address
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }, []);

  // Handle map click to select location
  const handleMapClick = useCallback((latlng: LatLng) => {
    // Reverse geocode to get address
    reverseGeocode(latlng.lat, latlng.lng).then((address) => {
      const locationData: LocationData = {
        lat: latlng.lat,
        lng: latlng.lng,
        address: address || `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`
      };
      setSelectedLocation(locationData);
    });
  }, [reverseGeocode]);

  // Search for locations using Google Places API (you'll need to replace with your API key)
  const searchLocations = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      // This is a placeholder - you'll need to implement with your preferred geocoding service
      // For now, we'll use a mock implementation
      const suggestions: SearchSuggestion[] = [
        {
          place_id: "1",
          description: `${query} - Sample Location 1`,
          lat: 51.505,
          lng: -0.09
        },
        {
          place_id: "2", 
          description: `${query} - Sample Location 2`,
          lat: 51.51,
          lng: -0.1
        }
      ];
      
      setSearchSuggestions(suggestions);
    } catch (error) {
      console.error("Error searching locations:", error);
      setSearchSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    if (query.length > 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocations(query);
      }, 300);
    } else {
      setSearchSuggestions([]);
    }
  }, [searchLocations]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    const locationData: LocationData = {
      lat: suggestion.lat,
      lng: suggestion.lng,
      address: suggestion.description
    };
    
    setSelectedLocation(locationData);
    setMapCenter([suggestion.lat, suggestion.lng]);
    setSearchQuery(suggestion.description);
    setSearchSuggestions([]);
  }, []);

  // Save location and return data to parent
  const handleSaveLocation = useCallback(() => {
    if (selectedLocation) {
      return selectedLocation;
    }
    return null;
  }, [selectedLocation]);

  // Clear selected location
  const clearLocation = useCallback(() => {
    setSelectedLocation(null);
    setSearchQuery("");
    setSearchSuggestions([]);
  }, []);

  // Set map reference
  const setMapRef = useCallback((map: any) => {
    mapRef.current = map;
  }, []);

  return {
    selectedLocation,
    searchQuery,
    searchSuggestions,
    isSearching,
    mapCenter,
    zoom,
    handleMapClick,
    handleSearchChange,
    handleSuggestionSelect,
    handleSaveLocation,
    clearLocation,
    setMapRef,
    setZoom
  };
};

export default useMap;
