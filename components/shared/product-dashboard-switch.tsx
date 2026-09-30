"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardScreen } from "@/components/pawtrack/dashboard";
import { useRootContext } from "@/context/RootContext";
import { useStaffRole } from "@/components/meditrack/layout/register/RoleProvider";
import { roleHomePath } from "@/components/meditrack/layout/register/rbac";

/** Picks the right dashboard screen for the signed-in tenant. PawTrack keeps
 * its own DashboardScreen at this route; MediTrack no longer has a generic
 * dashboard — hospital tenants are redirected straight to the Admin
 * Overview (/admin/dashboard), matching the login flow's default landing
 * page. Mirrors ProductLayoutSwitch so app/(pages)/dashboard/page.tsx stays
 * a plain route file.
 *
 * `loading` gates the fallback render deliberately: `isHumanMode` defaults
 * to false until the tenant's product type is known, so rendering
 * DashboardScreen as soon as `!isHumanMode` is true would flash PawTrack's
 * dashboard for a MediTrack tenant during that brief unknown window (this
 * is exactly what a MediTrack login landing here via a generic redirect
 * used to show, for about a second, before the effect below could redirect
 * away). Render nothing until we actually know which product this is. */
export function ProductDashboardSwitch() {
    const { isHumanMode, loading, userType } = useRootContext();
    const { role } = useStaffRole();
    const router = useRouter();

    useEffect(() => {
        if (!loading && isHumanMode) {
            router.replace(roleHomePath(role, !!userType?.isSuperAdmin));
        }
    }, [loading, isHumanMode, role, router, userType?.isSuperAdmin]);

    if (loading || isHumanMode) {
        return null;
    }

    return <DashboardScreen />;
}
