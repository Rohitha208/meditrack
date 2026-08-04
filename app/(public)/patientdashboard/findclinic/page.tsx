"use client"
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { MapPin, Search, Info, Phone, Clock } from "lucide-react";

const NearestClinicMap = dynamic(() => import("@/components/pawtrack/patients/nearest-clinic-map"), {
    ssr: false,
})

export default function FindClinic() {
    return (
        <div className="flex flex-col gap-6 h-full bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen p-4 overflow-y-auto">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Find Nearest Clinic</h1>
                        <p className="text-gray-600">Discover veterinary clinics near your location</p>
                    </div>
                </div>
                
                {/* Info Cards */}
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <Search className="h-5 w-5 text-green-600" />
                        <div>
                            <p className="font-medium text-green-800">Real-time Search</p>
                            <p className="text-sm text-green-600">Find clinics instantly</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <Info className="h-5 w-5 text-purple-600" />
                        <div>
                            <p className="font-medium text-purple-800">Detailed Info</p>
                            <p className="text-sm text-purple-600">Clinic details & contact</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <Clock className="h-5 w-5 text-orange-600" />
                        <div>
                            <p className="font-medium text-orange-800">Distance & Time</p>
                            <p className="text-sm text-orange-600">See travel estimates</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Section */}
            <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-600">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-white font-medium">Interactive Map</span>
                    </div>
                </div>
                
                <div className="md:w-full w-full max-w-full ">
                    <Suspense fallback={<div className="p-6 text-center">Loading map…</div>}>
                        <NearestClinicMap onClinicSelect={() => { }} />
                    </Suspense>
                </div>
            </div>

            {/* Footer Info */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-800">Need Help?</span>
                </div>
                <p className="text-sm text-gray-600">
                    Click on any clinic marker to view details, contact information, and directions. 
                    The blue marker shows your current location, while the hospital icons represent nearby clinics.
                </p>
            </div>

        </div>
    )
}