"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardScreen } from "@/components/pawtrack/dashboard";
import { useRootContext } from "@/context/RootContext";

/** Picks the right dashboard screen for the signed-in tenant. PawTrack keeps
 * its own DashboardScreen at this route; MediTrack no longer has a generic
 * dashboard — hospital tenants are redirected straight to the Admin
 * Overview (/admin/dashboard), matching the login flow's default landing
 * page. Mirrors ProductLayoutSwitch so app/(pages)/dashboard/page.tsx stays
 * a plain route file. */
export function ProductDashboardSwitch() {
    const { isHumanMode } = useRootContext();
    const router = useRouter();

    useEffect(() => {
        if (isHumanMode) {
            router.replace("/admin/dashboard");
        }
    }, [isHumanMode, router]);

    if (isHumanMode) {
        return null;
    }

    return <DashboardScreen />;
}
