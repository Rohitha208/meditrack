import React from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Save, X } from 'lucide-react';
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

interface MapProps {
  onSaveLocation?: (location: LocationData) => void;
  initialLocation?: LocationData;
  className?: string;
}

const Map: React.FC<MapProps> = ({ 
  onSaveLocation, 
  initialLocation,
  className = "" 
}) => {
  const {
    selectedLocation,
    currentLocation,
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
  } = useMapAdvanced();

  const handleSave = () => {
    const location = handleSaveLocation();
    if (location && onSaveLocation) {
      onSaveLocation(location);
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Selector
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <SearchBar
            searchQuery={searchQuery}
            searchSuggestions={searchSuggestions}
            isSearching={isSearching}
            onSearchChange={handleSearchChange}
            onSuggestionSelect={handleSuggestionSelect}
          />
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
        <div className="relative w-full h-[400px] overflow-hidden rounded-lg">
          <LeafletMap
            center={mapCenter}
            zoom={zoom}
            selectedLocation={selectedLocation}
            currentLocation={currentLocation}
            onMapClick={handleMapClick}
            onMapRef={setMapRef}
          />
        </div>

        {/* Selected Location Info */}
        {selectedLocation && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Selected Location</p>
                <p className="text-sm text-blue-700 mt-1">{selectedLocation.address}</p>
                <p className="text-xs text-blue-600 mt-1">
                  Lat: {selectedLocation.lat.toFixed(6)}, Lng: {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
              <Button
                onClick={handleSave}
                size="sm"
                className="ml-2 flex-shrink-0"
              >
                <Save className="h-4 w-4 mr-1" />
                Save Location
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!selectedLocation && (
          <div className="text-sm text-gray-600 text-center py-4">
            <p>Click on the map or search for a location to select it</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Map;
