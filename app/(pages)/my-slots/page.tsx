'use client'

import React from "react";
import { useRootContext } from "@/context/RootContext";
import VeterinarianSlots from "@/components/pawtrack/veterinarian/veterinarian-slots";
import withAuth from "@/utils/privateRouter";

function MySlotsPage() {
  const { clinic, userType, user } = useRootContext();

  // Only allow Veterinarian users to access this page
  if (!userType?.isVeterinarian && user?.roleName !== 'Veterinarian') {
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

  // Check if user ID is available
  if (!user?.id) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-yellow-600">User Not Found</h1>
          <p className="text-gray-600 mt-2">Unable to load user information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <VeterinarianSlots doctorId={user.id} clinicId={clinic.id} />
    </div>
  );
}

export default withAuth(MySlotsPage);
