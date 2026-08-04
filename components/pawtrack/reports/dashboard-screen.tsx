"use client"

import { useState } from "react"
import ReportsSidebar from "@/components/pawtrack/reports-sidebar"
import { DateRangeSelector } from "@/components/pawtrack/reports/date-range-selector"
import { MetricCard } from "@/components/pawtrack/reports/metric-card"
import { RevenueByServiceChart } from "@/components/pawtrack/reports/revenue-by-service-chart"
import { AppointmentTrendsChart } from "@/components/pawtrack/reports/appointment-trends-chart"
import { PatientSpeciesChart } from "@/components/pawtrack/reports/patient-species-chart"
import { ProviderPerformanceChart } from "@/components/pawtrack/reports/provider-performance-chart"
import { RecentReportsList } from "@/components/pawtrack/reports/recent-reports-list"
import { Button } from "@/components/ui/button"
import { Download, FilePlus, Calendar } from "lucide-react"

// Mock data for the dashboard
const mockData = {
  metrics: {
    totalRevenue: {
      value: "$24,875",
      change: { value: 8.5, isIncrease: true },
    },
    appointments: {
      value: "287",
      change: { value: 12, isIncrease: true },
    },
    newPatients: {
      value: "42",
      change: { value: 5, isIncrease: true },
    },
    averageInvoice: {
      value: "$164.25",
      change: { value: 2.3, isIncrease: false },
    },
  },
  revenueByService: {
    labels: ["Exams", "Vaccines", "Medications", "Surgery", "Dental"],
    values: [12500, 8700, 6200, 5100, 3800],
  },
  appointmentTrends: {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7"],
    scheduled: [65, 59, 80, 81, 76, 90, 85],
    completed: [45, 42, 50, 55, 48, 60, 58],
  },
  patientSpecies: {
    labels: ["Dogs", "Cats", "Exotics", "Other"],
    values: [58, 28, 9, 5],
    percentages: ["58%", "28%", "9%", "5%"],
    colors: ["#4A89DC", "#E9573F", "#37BC9B", "#F6BB42"],
  },
  providerPerformance: {
    providers: ["Dr. Johnson", "Dr. Smith", "Dr. Wilson"],
    appointments: [92, 78, 71],
  },
  recentReports: [
    {
      title: "Monthly Revenue Summary",
      date: "May 1, 2025",
    },
    {
      title: "Client Satisfaction Survey Results",
      date: "April 28, 2025",
    },
    {
      title: "Staff Performance Review",
      date: "April 15, 2025",
    },
    {
      title: "Inventory Usage Report",
      date: "April 10, 2025",
    },
  ],
}

export const DashboardScreen = () => {
  const [dateRange, setDateRange] = useState("this-month")

  const handleDateRangeChange = (range: string) => {
    setDateRange(range)
    // In a real app, you would fetch new data based on the selected range
  }

  return (
    <div className="flex">
      <ReportsSidebar />
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reporting Dashboard</h1>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <FilePlus className="h-4 w-4" />
              Create New Report
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Reports
            </Button>
          </div>
        </div>

        <DateRangeSelector onRangeChange={handleDateRangeChange} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <MetricCard
            title="Total Revenue"
            value={mockData.metrics.totalRevenue.value}
            change={mockData.metrics.totalRevenue.change}
            valueClassName="text-green-600 dark:text-green-400"
          />
          <MetricCard
            title="Appointments"
            value={mockData.metrics.appointments.value}
            change={mockData.metrics.appointments.change}
            valueClassName="text-blue-600 dark:text-blue-400"
          />
          <MetricCard
            title="New Patients"
            value={mockData.metrics.newPatients.value}
            change={mockData.metrics.newPatients.change}
            valueClassName="text-purple-600 dark:text-purple-400"
          />
          <MetricCard
            title="Average Invoice"
            value={mockData.metrics.averageInvoice.value}
            change={mockData.metrics.averageInvoice.change}
            valueClassName="text-amber-600 dark:text-amber-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Revenue by Service Type</h3>
            <RevenueByServiceChart data={mockData.revenueByService} />
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Appointment Trends</h3>
            <AppointmentTrendsChart data={mockData.appointmentTrends} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Patient Species</h3>
            <PatientSpeciesChart data={mockData.patientSpecies} />
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Provider Performance</h3>
            <ProviderPerformanceChart data={mockData.providerPerformance} />
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Recent Reports</h3>
            <RecentReportsList reports={mockData.recentReports} />
          </div>
        </div>
      </div>
    </div>
  )
} 