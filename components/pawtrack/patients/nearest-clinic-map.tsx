"use client"

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useGetLocation } from '@/hooks/useGetLocation';
import { useGetClinic } from '@/queries/clinic/get-clinic';
import 'leaflet/dist/leaflet.css';
import { Clinic } from '../clinic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

function NearestClinicMapContent({ onClinicSelect, companyId }: { onClinicSelect: (clinic: Clinic) => void; companyId?: string }) {
  const [isClient, setIsClient] = useState(false);
  const { latitude, longitude, address, isLoading, error, refetch } = useGetLocation();
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Only fetch clinics when location is available and we're on the client side
  const { data: clinicsData, isLoading: clinicsLoading } = useGetClinic(
    1, 
    100, 
    companyId || '', 
    Boolean(isClient && latitude && longitude && typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude) && companyId)
  );
  
  // Center map on user location
  const center = latitude && longitude ? [latitude, longitude] as [number, number] : [20, 77] as [number, number]; // fallback to India center
  
  const [mapIcons, setMapIcons] = useState<{
    currentLocationIcon: any;
    clinicIcon: any;
  } | null>(null);
  
  // Initialize Leaflet icons on client-side only
  useEffect(() => {
    // Import Leaflet dynamically to avoid SSR issues
    import('leaflet').then((L) => {
      // Custom icon for user location
      const currentLocationIcon = L.divIcon({
        className: 'current-location-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            position: relative;
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 8px;
              height: 8px;
              background: white;
              border-radius: 50%;
            "></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      // Custom icon for clinic marker
      const clinicIcon = L.icon({
        iconUrl: '/images/hospital.png',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
        className: 'clinic-marker-icon',
      });

      setMapIcons({ currentLocationIcon, clinicIcon });
    });
  }, []);

  return (
    <div className="w-full h-[500px] rounded-lg border mt-4">
      {isLoading && (
        <div className="flex items-center justify-center h-full text-gray-500">Detecting your location...</div>
      )}
      {error && (
        <div className="flex items-center justify-center h-full text-gray-500">{error}</div>
      )}
      {!isLoading && latitude && longitude && mapIcons && (
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* User Location Marker */}
          <Marker position={center} icon={mapIcons.currentLocationIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-medium text-blue-600">Your Location</p>
                <p className="text-gray-600">{address}</p>
                <p className="text-xs text-gray-500">Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}</p>
              </div>
            </Popup>
          </Marker>
          {/* Clinic Markers */}
          {clinicsData?.items?.map(clinic => (
            <Marker
              key={clinic.id}
              position={[clinic.location.lat, clinic.location.lng]}
              icon={mapIcons.clinicIcon}
              eventHandlers={{
                click: () => onClinicSelect(clinic as any),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-medium">{clinic.name}</p>
                  <p className="text-gray-600">{clinic.location.address}</p>
                  <p className="text-xs text-gray-500">Lat: {clinic.location.lat.toFixed(6)}, Lng: {clinic.location.lng.toFixed(6)}</p>
                  {clinic.distance && (
                    <p className="text-xs text-green-600 mt-1">{clinic.distance.toFixed(2)} km away</p>
                  )}
                  {/* <button
                    className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    onClick={e => {
                      e.preventDefault();
                      onClinicSelect(clinic as any);
                    }}
                  >
                    Select this Clinic
                  </button> */}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
      {!isLoading && !latitude && !error && (
        <div className="flex items-center justify-center h-full text-gray-500">Unable to get your location.</div>
      )}
    </div>
  );
}

const NearestClinicMap: React.FC<{ onClinicSelect: (clinic: Clinic) => void; companyId?: string }> = ({ onClinicSelect, companyId }) => {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading map…</div>}>
      <NearestClinicMapContent onClinicSelect={onClinicSelect} companyId={companyId} />
    </Suspense>
  );
};

export default NearestClinicMap;