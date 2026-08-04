"use client";

import Image, { type ImageProps } from "next/image";
import { useMemo, useRef, useState } from "react";
import { getCompanyLogoKind, resolveCompanyLogoSrc } from "@/utils/companyLogo";

type Props = Omit<ImageProps, "src" | "alt"> & {
  logoUrl?: string | null;
  companyName?: string | null;
  /** Used for more precise console errors (e.g. "login-left", "sidebar-top"). */
  context?: string;
  fallbackSrc: string;
  alt?: string;
  /** Optional cache-bust string (e.g. company.updatedAt) so browser fetches updated logo. */
  cacheBust?: string | null;
};

export function CompanyLogo({
  logoUrl,
  companyName,
  context,
  fallbackSrc,
  alt,
  cacheBust,
  onError,
  ...imageProps
}: Props) {
  const [errored, setErrored] = useState(false);
  const loggedRef = useRef(false);

  const resolved = useMemo(() => resolveCompanyLogoSrc(logoUrl), [logoUrl]);
  const kind = useMemo(() => getCompanyLogoKind(logoUrl), [logoUrl]);

  const finalSrc = useMemo(() => {
    const base = !errored && resolved ? resolved : fallbackSrc;
    if (!cacheBust || !base || base.startsWith("data:")) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}v=${encodeURIComponent(cacheBust)}`;
  }, [errored, resolved, fallbackSrc, cacheBust]);

  const finalAlt = alt ?? `${companyName || "Company"} Logo`;

  return (
    <Image
      {...imageProps}
      src={finalSrc}
      alt={finalAlt}
      onError={(e) => {
        // Only log once per component instance.
        if (!loggedRef.current) {
          loggedRef.current = true;
          const common = {
            context,
            companyName,
            logoUrlOriginal: logoUrl ?? null,
            logoUrlResolved: resolved ?? null,
            kind,
          };

          if (kind === "upload-path") {
            // Use warn instead of error to avoid Next.js dev overlay blocking the UI.
            console.warn(
              "[CompanyLogo] Failed to load logo from backend upload path. This usually means the saved `logoUrl` is wrong or the backend static upload path is not reachable.",
              {
                ...common,
                expectedPattern: `${process.env.NEXT_PUBLIC_API_URL || "<NEXT_PUBLIC_API_URL>"}/Uploads/<logoUrl> (e.g. /Uploads/company/<file>.png)`,
              }
            );
          } else {
            // Use warn instead of error to avoid Next.js dev overlay blocking the UI.
            console.warn("[CompanyLogo] Failed to load logo.", common);
          }
        }

        setErrored(true);
        onError?.(e);
      }}
    />
  );
}

