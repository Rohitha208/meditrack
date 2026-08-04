import { certificateConfigs } from "@/utils/certificate-configs";
import GenericCertificateSheet from "./generic-certificate-sheet";

interface CertificateProps {
  certificateName: string;
  appointmentId: string;
  patientId: string;
  onClose: () => void;
  readOnly?: boolean;
  onCertificateCreated?: () => void;
}

export default function Certificate({
  certificateName,
  appointmentId,
  patientId,
  onClose,
  readOnly = false,
  onCertificateCreated,
}: CertificateProps) {
  const config = certificateConfigs.find(
    (config) => config.name === certificateName
  );

  if (!config) {
    return <div>Error: {certificateName} configuration not found.</div>;
  }

  return (
    <GenericCertificateSheet
      config={config}
      appointmentId={appointmentId}
      patientId={patientId}
      onClose={onClose}
      readOnly={readOnly}
      onCertificateCreated={onCertificateCreated}
    />
  );
}
