// Single source of truth for PawTrack (veterinary) vs MediTrack (human) mode
// detection. Everything that needs to know "which product is this" -
// middleware, server components, API routes - should import from here
// instead of re-checking magic strings locally.

export type ProductType = "veterinary" | "human";

// The reserved subdomains for this app's own two products - not tenant
// data, so they don't come from the database (unlike a real company's
// productType, which does - see resolveWorkspace.ts). They're deployment
// configuration, same category as NEXT_PUBLIC_API_URL, so they're
// overridable via env vars rather than being a bare literal, with the
// current names kept as the default so nothing changes if unset.
export const MEDITRACK_SUBDOMAIN = process.env.NEXT_PUBLIC_MEDITRACK_SUBDOMAIN || "meditrack";
export const PAWTRACK_SUBDOMAIN = process.env.NEXT_PUBLIC_PAWTRACK_SUBDOMAIN || "pawtrack";

export const BRAND_NAMES: Record<ProductType, string> = {
  human: "MediTrack",
  veterinary: "PawTrack",
};

/**
 * Extracts the product/tenant subdomain from a raw Host header value
 * (e.g. "meditrack.localhost:3050" -> "meditrack").
 * Mirrors the existing company-tenant subdomain convention (*.xcdify.com)
 * plus the *.localhost convention used in local development.
 */
export function getSubdomainFromHost(hostHeader: string | null | undefined): string | null {
  const hostname = (hostHeader || "").split(":")[0];

  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  // Product subdomains on localhost, e.g. meditrack.localhost, pawtrack.localhost
  if (hostname.endsWith(".localhost")) {
    return hostname.split(".")[0];
  }

  // Production domain structure: subdomain.xcdify.com
  if (hostname.endsWith(".xcdify.com")) {
    const parts = hostname.split(".");
    if (parts.length >= 2) return parts[0];
  }

  // Fallback: more than 2 parts -> first part is the subdomain
  const parts = hostname.split(".");
  if (parts.length > 2) return parts[0];

  return null;
}

export function isMediTrackSubdomain(subdomain?: string | null): boolean {
  return subdomain === MEDITRACK_SUBDOMAIN;
}

export function getProductTypeFromSubdomain(subdomain?: string | null): ProductType {
  return isMediTrackSubdomain(subdomain) ? "human" : "veterinary";
}

export function getBrandName(subdomain?: string | null): string {
  return BRAND_NAMES[getProductTypeFromSubdomain(subdomain)];
}

// For comparing an already-known ProductType value (e.g. from the logged-in
// user's session) rather than deriving it from a subdomain.
export function isHumanProductType(productType?: ProductType | string | null): boolean {
  return productType === "human";
}
