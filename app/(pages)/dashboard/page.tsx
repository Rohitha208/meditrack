"use client"

import { DashboardScreen } from "@/components/pawtrack/dashboard"
import { MediTrackDashboardPage } from "@/components/meditrack/dashboard/dashboard-page"
import { useRootContext } from "@/context/RootContext"

export default function Dashboard() {
  const { isHumanMode } = useRootContext();

  if (isHumanMode) {
    return <MediTrackDashboardPage />
  }

  return <DashboardScreen />
}
