export interface ClinicLicense {
  id: string;
  clinicId?: string | null;
  licenseNumber: string;
  licenseName?: string | null;
  issuingAuthority?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  documentUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function normalizeClinicLicenses(payload: unknown): ClinicLicense[] {
  if (Array.isArray(payload)) return payload as ClinicLicense[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as ClinicLicense[];
    if (Array.isArray(obj.items)) return obj.items as ClinicLicense[];
  }
  return [];
}

export function makeLicenseNumber(name: string) {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = Date.now().toString(36).toUpperCase().slice(-4);
  return `${slug || "LIC"}-${suffix}`.slice(0, 100);
}
