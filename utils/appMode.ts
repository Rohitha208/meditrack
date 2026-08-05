export type ProductType = "veterinary" | "human";

export const MEDITRACK_SUBDOMAIN = process.env.NEXT_PUBLIC_MEDITRACK_SUBDOMAIN || "meditrack";
export const PAWTRACK_SUBDOMAIN = process.env.NEXT_PUBLIC_PAWTRACK_SUBDOMAIN || "pawtrack";

export const BRAND_NAMES: Record<ProductType, string> = {
  human: "MediTrack",
  veterinary: "PawTrack",
};

export function getSubdomainFromHost(hostHeader: string | null | undefined): string | null {
  const hostname = (hostHeader || "").split(":")[0];

  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  if (hostname.endsWith(".localhost")) {
    return hostname.split(".")[0];
  }

  if (hostname.endsWith(".xcdify.com")) {
    const parts = hostname.split(".");
    if (parts.length >= 2) return parts[0];
  }

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

export function isHumanProductType(productType?: ProductType | string | null): boolean {
  return productType === "human";
}
