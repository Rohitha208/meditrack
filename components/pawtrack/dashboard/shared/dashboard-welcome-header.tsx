"use client"

import { useRootContext } from "@/context/RootContext"

interface DashboardWelcomeHeaderProps {
  date: Date;
}

export const DashboardWelcomeHeader = ({ date }: DashboardWelcomeHeaderProps) => {
  const { user } = useRootContext();
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  return (
    <div className="mb-6 p-6 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 -m-6 mb-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Welcome, {userName}</h1>
      <p className="text-gray-600 dark:text-gray-400">{formattedDate}</p>
    </div>
  )
} 