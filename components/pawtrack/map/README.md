# Generic Leaflet Map Component

A reusable React component built with Leaflet for location selection with search functionality.

## Features

- ✅ **Location Search**: Search bar with autocomplete suggestions
- ✅ **Map Interaction**: Click on map to select location
- ✅ **Zoom Controls**: Built-in zoom functionality
- ✅ **Location Data**: Returns lat, lng, and complete address
- ✅ **Business Logic Separation**: All logic moved to `useMap` hook
- ✅ **TypeScript Support**: Fully typed interfaces
- ✅ **Responsive Design**: Works on mobile and desktop
- ✅ **Customizable**: Easy to style and extend

## Installation

The component requires the following dependencies (already installed):

```bash
npm install leaflet react-leaflet @types/leaflet
```

## Usage

### Basic Usage

```tsx
import React, { useState } from 'react';
import Map, { LocationData } from '@/components/map';

const MyComponent = () => {
  const [savedLocation, setSavedLocation] = useState<LocationData | null>(null);

  const handleSaveLocation = (location: LocationData) => {
    setSavedLocation(location);
    console.log('Location saved:', location);
    // Send to your API or store in state
  };

  return (
    <Map 
      onSaveLocation={handleSaveLocation}
      className="max-w-4xl"
    />
  );
};
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSaveLocation` | `(location: LocationData) => void` | No | Callback when location is saved |
| `initialLocation` | `LocationData` | No | Pre-select a location |
| `className` | `string` | No | Additional CSS classes |

### LocationData Interface

```tsx
interface LocationData {
  lat: number;      // Latitude
  lng: number;      // Longitude
  address: string;  // Complete address
}
```

## Component Structure

```
components/map/
├── index.tsx              # Main map component
├── leafLet.tsx            # Leaflet map implementation
├── searchbar.tsx          # Search bar with suggestions
├── hooks/
│   └── useMap.tsx         # Business logic hook
├── example-usage.tsx      # Usage example
└── README.md             # This file
```

## Customization

### Styling

The component uses Tailwind CSS classes and can be customized by:

1. Passing `className` prop
2. Modifying the component's internal styles
3. Overriding Tailwind classes

### Geocoding Service

Currently, the component uses placeholder geocoding. To implement real geocoding:

1. **Google Places API** (Recommended):
   ```tsx
   // In useMap.tsx, replace the searchLocations function
   const searchLocations = useCallback(async (query: string) => {
     const response = await fetch(
       `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&key=YOUR_API_KEY`
     );
     const data = await response.json();
     // Process and return suggestions
   }, []);
   ```

2. **OpenStreetMap Nominatim** (Free):
   ```tsx
   const searchLocations = useCallback(async (query: string) => {
     const response = await fetch(
       `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5`
     );
     const data = await response.json();
     // Process and return suggestions
   }, []);
   ```

### Reverse Geocoding

To get real addresses when clicking on the map:

```tsx
// In useMap.tsx, replace the reverseGeocode function
const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
  );
  const data = await response.json();
  return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}, []);
```

## Example Implementation

See `example-usage.tsx` for a complete implementation example.

## Browser Support

- Modern browsers with ES6+ support
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires internet connection for map tiles

## Performance Considerations

- Map is loaded dynamically to avoid SSR issues
- Search is debounced (300ms) to reduce API calls
- Markers are only rendered when location is selected

## Troubleshooting

### Map not loading
- Check if Leaflet CSS is imported
- Ensure internet connection for map tiles
- Check browser console for errors

### Search not working
- Implement real geocoding service
- Check API keys and rate limits
- Verify network requests in browser dev tools

### TypeScript errors
- Ensure all dependencies are installed
- Check import paths are correct
- Verify TypeScript configuration

## License

This component is part of the PawTrack project and follows the same license terms. 