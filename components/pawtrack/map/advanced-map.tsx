import React from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Save, X, Globe, Navigation } from 'lucide-react';
import useMapAdvanced, { LocationData } from './hooks/useMapAdvanced';
import SearchBar from './searchbar';

// Dynamically import Leaflet map to avoid SSR issues
const LeafletMap = dynamic(() => import('./leafLet'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

interface AdvancedMapProps {
  onSaveLocation?: (location: LocationData) => void;
  initialLocation?: LocationData;
  className?: string;
}

const AdvancedMap: React.FC<AdvancedMapProps> = ({ 
  onSaveLocation, 
  initialLocation,
  className = "" 
}) => {
  const {
    selectedLocation,
    currentLocation,
    locationPermission,
    isGettingLocation,
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
    requestLocationPermission
  } = useMapAdvanced({ initialLocation });

  const handleSave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const location = handleSaveLocation();
    if (location && onSaveLocation) {
      onSaveLocation(location);
    }
  };

  const handleRequestLocation = async () => {
    await requestLocationPermission();
  };

  return (
    <Card className={`w-full flex flex-col ${className}`}>
      <CardContent className="flex flex-col space-y-4 p-2 flex-1 min-h-0 overflow-hidden">
        {/* Search Bar and Location Button */}
        <div className="flex gap-2 flex-shrink-0">
          <SearchBar
            searchQuery={searchQuery}
            searchSuggestions={searchSuggestions}
            isSearching={isSearching}
            onSearchChange={handleSearchChange}
            onSuggestionSelect={handleSuggestionSelect}
          />
          
          {/* Location Permission Button */}
          {locationPermission === 'prompt' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestLocation}
              disabled={isGettingLocation}
              className="flex-shrink-0"
            >
              <Navigation className="h-4 w-4 mr-1" />
              {isGettingLocation ? 'Getting Location...' : 'Use My Location'}
            </Button>
          )}
          
          {locationPermission === 'denied' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestLocation}
              className="flex-shrink-0 text-red-600"
            >
              <Navigation className="h-4 w-4 mr-1" />
              Location Denied
            </Button>
          )}
          
          {locationPermission === 'granted' && currentLocation && (
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 text-green-600"
              disabled
            >
              <Navigation className="h-4 w-4 mr-1" />
              Location Active
            </Button>
          )}
          
          {selectedLocation && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearLocation}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Map */}
        <div className="relative w-full flex-1 min-h-0 overflow-hidden rounded-lg">
          <LeafletMap
            center={mapCenter}
            zoom={zoom}
            selectedLocation={selectedLocation}
            currentLocation={currentLocation}
            onMapClick={handleMapClick}
            onMapRef={setMapRef}
          />
        </div>

        {/* Current Location Info */}
        {currentLocation && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Current Location</p>
                <p className="text-sm text-blue-700 mt-1">{currentLocation.address}</p>
                <p className="text-xs text-blue-600 mt-1">
                  Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Selected Location Info */}
        {selectedLocation && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Selected Location</p>
                <p className="text-sm text-green-700 mt-1">{selectedLocation.address}</p>
                <p className="text-xs text-green-600 mt-1">
                  Lat: {selectedLocation.lat.toFixed(6)}, Lng: {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
              <Button
                onClick={handleSave}
                size="sm"
                className="ml-2 flex-shrink-0 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
              >
                <Save className="h-4 w-4 mr-1" />
                Save Location
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!selectedLocation && (
          <div className="text-sm text-gray-600 text-center py-4 flex-shrink-0">
            <p>Click on the map or search for a location to select it</p>
            <p className="text-xs text-gray-500 mt-1">
              Powered by OpenStreetMap Nominatim - Real address lookup
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedMap; 