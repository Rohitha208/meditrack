import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocationData } from './hooks/useMapAdvanced';
import Map from './index';

const MapExample: React.FC = () => {
  const [savedLocation, setSavedLocation] = useState<LocationData | null>(null);

  const handleSaveLocation = (location: LocationData) => {
    setSavedLocation(location);
    console.log('Location saved:', location);
    // You can also send this to your API here
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Map Component Example</CardTitle>
        </CardHeader>
        <CardContent>
          <Map 
            onSaveLocation={handleSaveLocation}
            className="max-w-4xl"
          />
        </CardContent>
      </Card>

      {savedLocation && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Location Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Address:</strong> {savedLocation.address}</p>
              <p><strong>Latitude:</strong> {savedLocation.lat}</p>
              <p><strong>Longitude:</strong> {savedLocation.lng}</p>
            </div>
            <Button 
              onClick={() => setSavedLocation(null)}
              variant="outline"
              className="mt-4"
            >
              Clear Saved Location
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MapExample; 