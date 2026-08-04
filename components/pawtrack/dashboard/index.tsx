"use client"

import { DashboardScreen } from "./dashboard-screen"

// Export role-specific dashboards
import { AdminDashboard } from "./roles/admin"
import { ClinicAdminDashboard } from "./roles/clinic-admin"
import { ClinicStaffDashboard } from "./roles/clinic-staff"
import { ClientDashboard } from "./roles/client"

// Export shared components
import { DashboardWelcomeHeader } from "./shared/dashboard-welcome-header"
import { DashboardActionButtons } from "./shared/dashboard-action-buttons"
import { DashboardStatsCards } from "./shared/dashboard-stats-cards"
import { DashboardScheduleTable } from "./shared/dashboard-schedule-table"

export { 
  // Main dashboard component
  DashboardScreen,
  
  // Role-specific dashboards
  AdminDashboard,
  ClinicAdminDashboard,
  ClinicStaffDashboard,
  ClientDashboard,
  
  // Shared components
  DashboardWelcomeHeader,
  DashboardActionButtons,
  DashboardStatsCards,
  DashboardScheduleTable
} 