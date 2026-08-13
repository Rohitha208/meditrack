"use client";

import type { ReactNode } from "react";
import MainLayout from "@/components/pawtrack/layout/mainLayout";
import { MediTrackLayout } from "@/components/meditrack/layout/meditrack-layout";
import { useRootContext } from "@/context/RootContext";

/** Picks the right product shell for the signed-in tenant — PawTrack's
 * MainLayout or MediTrack's own layout — based on isHumanMode. Kept out of
 * app/(pages)/layout.tsx so that file stays a plain route layout and the
 * two products' shells never need to know about each other. */
export function ProductLayoutSwitch({ children }: { children: ReactNode }) {
    const { isHumanMode } = useRootContext();

    if (isHumanMode) {
        return <MediTrackLayout>{children}</MediTrackLayout>;
    }

    return <MainLayout>{children}</MainLayout>;
}
