import OverviewPage from "@/components/pawtrack/patientDashboard/overview";
import { Suspense } from "react";

export default function Overview() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <OverviewPage />
        </Suspense>
    )
} 