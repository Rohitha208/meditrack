import { LocationData } from "@/components/pawtrack/map/hooks/useMapAdvanced"
import { useState, useEffect } from "react"

export const useGetLocation = () => {
    const [location, setLocation] = useState<LocationData | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Reverse geocoding function to get address from coordinates
    const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'en-US,en;q=0.9',
                        'User-Agent': 'PawTrack-Map-Component/1.0'
                    }
                }
            )
            
            if (!response.ok) {
                throw new Error('Reverse geocoding failed')
            }
            
            const data = await response.json()
            return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        } catch (error) {
            console.error("Error reverse geocoding:", error)
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        }
    }

    const getCurrentLocation = async () => {
        // Check if window is available (client-side only)
        if (typeof window === 'undefined') {
            setError('Geolocation is not available during server-side rendering')
            return
        }

        if (!window.navigator.geolocation) {
            setError('Geolocation is not supported by this browser')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                window.navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                })
            })

            const { latitude, longitude } = position.coords
            
            // Get address from coordinates
            const address = await reverseGeocode(latitude, longitude)
            
            const locationData: LocationData = {
                lat: latitude,
                lng: longitude,
                address: address
            }

            console.log(locationData)
            
            setLocation(locationData)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get location'
            setError(errorMessage)
            console.error('Error getting current location:', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        // Only run on client-side
        if (typeof window !== 'undefined') {
            getCurrentLocation()
        }
    }, [])

    return {
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        address: location?.address,
        isLoading,
        error,
        refetch: getCurrentLocation
    }
}       