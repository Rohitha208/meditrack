"use client"

import CertificateManagement from "./certification/index"; // Import the new CertificateManagement component

interface CertificateGenerationProps {
  appointmentId: string;
  patientId: string;
  onClose: () => void;
}

// This component will now simply render the CertificateManagement component.
// All logic for fetching and rendering certificate types is moved to CertificateManagement.
export default function CertificateGeneration({ appointmentId, patientId, onClose }: CertificateGenerationProps) {
  return (
    <CertificateManagement
      appointmentId={appointmentId}
      patientId={patientId}
      onClose={onClose}
    />
  );
} 