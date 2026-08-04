"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DashboardStatsCardsProps {
  todayAppointmentsCount: number;
  todayCompletedCount: number;
}

export const DashboardStatsCards = ({ todayAppointmentsCount, todayCompletedCount }: DashboardStatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Today's Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline">
            <span className="text-4xl font-bold theme-text-primary">{todayAppointmentsCount}</span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{todayCompletedCount} Completed</span>
          </div>
        </CardContent>
      </Card> */}

      {/* <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline">
            <span className="text-4xl font-bold theme-text-secondary">8</span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">prescriptions</span>
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Unread Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline">
            <span className="text-4xl font-bold theme-text-accent">5</span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">3 clients, 2 staff</span>
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline">
            <span className="text-4xl font-bold theme-text-primary">$1,250</span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">7 invoices</span>
          </div>
        </CardContent>
      </Card> */}
    </div>
  )
} 