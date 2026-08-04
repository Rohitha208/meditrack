'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocationData } from '@/components/pawtrack/map/hooks/useMapAdvanced';
import Map from '@/components/pawtrack/map';
import AdvancedMap from '@/components/pawtrack/map/advanced-map';

export default function MapTestPage() {
  const [basicLocation, setBasicLocation] = useState<LocationData | null>(null);
  const [advancedLocation, setAdvancedLocation] = useState<LocationData | null>(null);

  const handleBasicSave = (location: LocationData) => {
    setBasicLocation(location);
    console.log('Basic location saved:', location);
  };

  const handleAdvancedSave = (location: LocationData) => {
    setAdvancedLocation(location);
    console.log('Advanced location saved:', location);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Map Component Test
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic Map */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Map (Mock Geocoding)</CardTitle>
            </CardHeader>
            <CardContent>
              <Map 
                onSaveLocation={handleBasicSave}
                className="max-w-full"
              />
            </CardContent>
          </Card>

          {/* Advanced Map */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Map (Real Geocoding)</CardTitle>
            </CardHeader>
            <CardContent>
              <AdvancedMap 
                onSaveLocation={handleAdvancedSave}
                className="max-w-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Results Display */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {basicLocation && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Map Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Address:</strong> {basicLocation.address}</p>
                  <p><strong>Latitude:</strong> {basicLocation.lat}</p>
                  <p><strong>Longitude:</strong> {basicLocation.lng}</p>
                </div>
                <Button 
                  onClick={() => setBasicLocation(null)}
                  variant="outline"
                  className="mt-4"
                >
                  Clear Result
                </Button>
              </CardContent>
            </Card>
          )}

          {advancedLocation && (
            <Card>
              <CardHeader>
                <CardTitle>Advanced Map Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Address:</strong> {advancedLocation.address}</p>
                  <p><strong>Latitude:</strong> {advancedLocation.lat}</p>
                  <p><strong>Longitude:</strong> {advancedLocation.lng}</p>
                </div>
                <Button 
                  onClick={() => setAdvancedLocation(null)}
                  variant="outline"
                  className="mt-4"
                >
                  Clear Result
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Basic Map:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Uses mock geocoding for demonstration</li>
                  <li>Click on map or search to select location</li>
                  <li>Returns coordinates and placeholder address</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Advanced Map:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Uses OpenStreetMap Nominatim for real geocoding</li>
                  <li>Provides real address lookup</li>
                  <li>Search suggestions from actual location data</li>
                  <li>Reverse geocoding when clicking on map</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Features:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>✅ Location search with autocomplete</li>
                  <li>✅ Click on map to select location</li>
                  <li>✅ Zoom and pan controls</li>
                  <li>✅ Returns lat, lng, and complete address</li>
                  <li>✅ Business logic separated in custom hooks</li>
                  <li>✅ TypeScript support</li>
                  <li>✅ Responsive design</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 