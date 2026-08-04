import { useState, useCallback, useRef, useEffect } from "react";
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

interface UseMapAdvancedProps {
  initialLocation?: LocationData;
}

const useMapAdvanced = (props?: UseMapAdvancedProps) => {
  const { initialLocation } = props || {};
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.5246, 73.8786]); // Default to Mumbai
  const [zoom, setZoom] = useState(13);
  
  const mapRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if geolocation is supported
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationPermission('unsupported');
      return;
    }
    
    // Check current permission status
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        setLocationPermission(result.state as 'granted' | 'denied' | 'prompt');
        
        // Listen for permission changes
        result.addEventListener('change', () => {
          setLocationPermission(result.state as 'granted' | 'denied' | 'prompt');
        });
      });
    }
  }, []);

  // Real reverse geocoding using OpenStreetMap Nominatim
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'PawTrack-Map-Component/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }
      
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }, []);

  // Request location permission and get current location
  const requestLocationPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationPermission('unsupported');
      return null;
    }

    setIsGettingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Reverse geocode to get address
      const address = await reverseGeocode(latitude, longitude);
      
      const locationData: LocationData = {
        lat: latitude,
        lng: longitude,
        address: address
      };
      
      setCurrentLocation(locationData);
      setLocationPermission('granted');
      
      // If no initial location is set, use current location as default
      if (!initialLocation && !selectedLocation) {
        setMapCenter([latitude, longitude]);
        setSelectedLocation(locationData);
      }
      
      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      setLocationPermission('denied');
      return null;
    } finally {
      setIsGettingLocation(false);
    }
  }, [reverseGeocode, initialLocation, selectedLocation]);

  // Initialize with initial location if provided, otherwise try to get current location
  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation(initialLocation);
      setMapCenter([initialLocation.lat, initialLocation.lng]);
    } else if (locationPermission === 'granted' && !currentLocation) {
      // If permission is already granted, get current location
      requestLocationPermission();
    }
  }, [initialLocation, locationPermission, currentLocation, requestLocationPermission]);

  // Real location search using OpenStreetMap Nominatim
  const searchLocations = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=en-US,en;q=0.9`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'PawTrack-Map-Component/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Location search failed');
      }
      
      const data = await response.json();
      
      const suggestions: SearchSuggestion[] = data.map((item: any, index: number) => ({
        place_id: item.place_id?.toString() || index.toString(),
        description: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }));
      
      setSearchSuggestions(suggestions);
    } catch (error) {
      console.error("Error searching locations:", error);
      setSearchSuggestions([]);
    } finally {
      setIsSearching(false);
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
    setZoom,
    setSelectedLocation,
    setMapCenter,
    currentLocation,
    locationPermission,
    isGettingLocation,
    requestLocationPermission
  };
};

export default useMapAdvanced; 