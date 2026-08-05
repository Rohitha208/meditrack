import { isMediTrackSubdomain, isHumanProductType, PAWTRACK_SUBDOMAIN, type ProductType } from "./appMode";

export type WorkspaceResolution =
  | { kind: "meditrack" }
  | { kind: "pawtrack-default" }
  | { kind: "meditrack-tenant"; subdomain: string; productType: ProductType }
  | { kind: "pawtrack-tenant"; subdomain: string; productType?: ProductType }
  | { kind: "not-found"; subdomain: string };

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
    return { kind: "pawtrack-tenant", subdomain };
  } catch {
    return { kind: "pawtrack-tenant", subdomain };
  }
}

export function isMediTrackWorkspace(workspace: WorkspaceResolution): boolean {
  return workspace.kind === "meditrack" || workspace.kind === "meditrack-tenant";
}
