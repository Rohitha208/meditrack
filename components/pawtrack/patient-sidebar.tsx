"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Home,
  Calendar,
  Users,
  Package,
  FileText,
  PieChart,
  Settings,
  Pill,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function PatientSidebar() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [colorTheme, setColorTheme] = useState("purple")
  const [mounted, setMounted] = useState(false)

  // Ensure we only access localStorage on the client side
  useEffect(() => {
    setMounted(true)
    const savedColorTheme = localStorage.getItem("pawtrack-color-theme") || "purple"
    setColorTheme(savedColorTheme)
  }, [])

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded)
  }

  // Update the navItems array to include a link to the inventory page
  const navItems = [
    { name: "Dashboard", icon: Home, href: "/dashboard", active: false },
    { name: "Appointments", icon: Calendar, href: "/appointments", active: false },
    { name: "Patients", icon: Users, href: "/patients", active: false },
    { name: "Inventory", icon: Package, href: "/inventory", active: false },
    { name: "Prescriptions", icon: Pill, href: "/prescriptions", active: false },
    { name: "Billing", icon: FileText, href: "/billing", active: false },
    { name: "Reports", icon: PieChart, href: "/reports", active: false },
    { name: "Settings", icon: Settings, href: "/settings", active: false },
  ]

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null

  return (
    <div
      className={cn(
        "hidden md:flex flex-col text-white transition-all duration-300 ease-in-out relative",
        `theme-${colorTheme}`,
        sidebarExpanded ? "w-64" : "w-20",
      )}
      style={{
        background: `linear-gradient(to bottom, var(--theme-primary), var(--theme-secondary))`,
      }}
    >
      <div
        className={cn(
          "flex items-center transition-all duration-300 ease-in-out",
          sidebarExpanded ? "p-4 justify-center" : "p-2 justify-center",
        )}
      >
        <div className="text-2xl font-bold">{sidebarExpanded ? "PawTrack" : "PT"}</div>
      </div>

      {/* Elegant toggle button positioned at the right edge of the sidebar */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-4 top-20 flex items-center justify-center w-8 h-24 bg-white dark:bg-slate-800 rounded-r-lg shadow-md transition-all duration-300 hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none"
        aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="w-4 h-0.5 theme-accent rounded-full transition-all duration-300"></div>
          <div className="w-4 h-0.5 theme-accent rounded-full transition-all duration-300"></div>
          <div className="w-4 h-0.5 theme-accent rounded-full transition-all duration-300"></div>
        </div>
        {sidebarExpanded ? (
          <ChevronLeft className="absolute theme-accent h-5 w-5" />
        ) : (
          <ChevronRight className="absolute theme-accent h-5 w-5" />
        )}
      </button>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center py-3 rounded-md group transition-all duration-200",
              item.active ? "theme-active text-white" : "text-white/80 hover:theme-active hover:text-white",
              sidebarExpanded ? "px-4" : "px-0 justify-center",
            )}
          >
            <item.icon className={cn("h-5 w-5", sidebarExpanded ? "mr-3" : "mr-0")} />
            {sidebarExpanded && <span>{item.name}</span>}
          </Link>
        ))}
      </nav>
    </div>
  )
}
