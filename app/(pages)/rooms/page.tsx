'use client'

import React from "react";
import { useRootContext } from "@/context/RootContext";
import Room from "@/components/pawtrack/clinic/details/rooms";
import withAuth from "@/utils/privateRouter";

function RoomsPage() {
  const { clinic, userType } = useRootContext();

  // Only allow Clinic Admin users to access this page
  if (!userType?.isClinicAdmin) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Check if clinic ID is available
  if (!clinic?.id) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-yellow-600">No Clinic Assigned</h1>
          <p className="text-gray-600 mt-2">No clinic is assigned to your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0">
      <Room clinicId={clinic.id} />
    </div>
  );
}

export default withAuth(RoomsPage);
