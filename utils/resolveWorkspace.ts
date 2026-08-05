import { isMediTrackSubdomain, isHumanProductType, PAWTRACK_SUBDOMAIN, type ProductType } from "./appMode";

export type WorkspaceResolution =
  | { kind: "meditrack" } // the reserved MediTrack demo/gateway subdomain
  | { kind: "pawtrack-default" } // bare host, or the reserved "pawtrack" keyword
  | { kind: "meditrack-tenant"; subdomain: string; productType: ProductType } // real company, database says human mode
  | { kind: "pawtrack-tenant"; subdomain: string; productType?: ProductType } // real company, database says veterinary mode (or productType not yet returned by the API)
  | { kind: "not-found"; subdomain: string }; // unrecognized subdomain

/**
 * Decides what should render for the current request's subdomain.
 *
 * "meditrack" and "pawtrack" are the only two hardcoded values here, and
 * deliberately so - they're reserved routing keywords for this app's own
 * two products (like any platform reserving "admin."/"app." prefixes),
 * not tenant data. They are NOT used to decide a real company's mode.
 *
 * For every other subdomain, the mode is read from that company's own
 * `productType` field via the existing /api/companies/by-subdomain lookup
 * - i.e. it comes from the database, not from string-matching the
 * subdomain. A company using its own custom subdomain (not literally
 * "meditrack") with productType "human" still renders as MediTrack.
 *
 * Only a confirmed 404 (backend explicitly says no such company) produces
 * "not-found" - any other failure (network error, backend hiccup) fails
 * OPEN as a veterinary/PawTrack tenant, so an outage in the lookup itself
 * never locks real customers out of their own login page.
 */
export async function resolveWorkspace(headersList: Headers): Promise<WorkspaceResolution> {
  const subdomain = headersList.get("x-subdomain");

  if (!subdomain || subdomain === PAWTRACK_SUBDOMAIN) {
    return { kind: "pawtrack-default" };
  }

  if (isMediTrackSubdomain(subdomain)) {
    return { kind: "meditrack" };
  }

  const host = headersList.get("host") || "";
  const proto = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  try {
    const res = await fetch(
      `${origin}/api/companies/by-subdomain?subdomain=${encodeURIComponent(subdomain)}`,
      { cache: "no-store" }
    );

    if (res.ok) {
      const company = await res.json().catch(() => null);
      const productType: ProductType | undefined = company?.productType;

      if (isHumanProductType(productType)) {
        return { kind: "meditrack-tenant", subdomain, productType: "human" };
      }
      return { kind: "pawtrack-tenant", subdomain, productType };
    }
    if (res.status === 404) {
      return { kind: "not-found", subdomain };
    }
    // Some other error (500, etc.) from the lookup itself - fail open.
    return { kind: "pawtrack-tenant", subdomain };
  } catch {
    // Couldn't even reach the lookup - fail open rather than punish users
    // for an unrelated outage.
    return { kind: "pawtrack-tenant", subdomain };
  }
}

export function isMediTrackWorkspace(workspace: WorkspaceResolution): boolean {
  return workspace.kind === "meditrack" || workspace.kind === "meditrack-tenant";
}
