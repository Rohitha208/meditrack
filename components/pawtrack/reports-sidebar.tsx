"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BarChart, FileText, Download, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ReportsSidebar() {
  const [colorTheme, setColorTheme] = useState("purple")
  const [mounted, setMounted] = useState(false)

  // Ensure we only access localStorage on the client side
  useEffect(() => {
    setMounted(true)
    const savedColorTheme = localStorage.getItem("pawtrack-color-theme") || "purple"
    setColorTheme(savedColorTheme)
  }, [])

  const navItems = [
    { name: "Reporting Dashboard", icon: BarChart, href: "/reports/dashboard", active: true },
    { name: "Report Builder", icon: FileText, href: "/reports/builder", active: false },
    { name: "Standard Reports", icon: FileText, href: "/reports/standard", active: false },
    { name: "Export Center", icon: Download, href: "/reports/export", active: false },
    { name: "Scheduled Reports", icon: Clock, href: "/reports/scheduled", active: false },
  ]

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null

  return (
    <div className="bg-white dark:bg-gray-800 w-64 border-r border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-lg font-semibold mb-4 theme-text-primary">Reports</h2>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
              item.active
                ? "bg-gray-100 dark:bg-gray-700 theme-text-primary"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:theme-text-primary",
            )}
          >
            <item.icon className="h-5 w-5 mr-2" />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  )
}
