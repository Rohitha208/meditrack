"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { FileText, CreditCard, Users, BarChart, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export default function BillingSidebar() {
  const [colorTheme, setColorTheme] = useState("purple")
  const [mounted, setMounted] = useState(false)

  // Ensure we only access localStorage on the client side
  useEffect(() => {
    setMounted(true)
    const savedColorTheme = localStorage.getItem("pawtrack-color-theme") || "purple"
    setColorTheme(savedColorTheme)
  }, [])

  const navItems = [
    { name: "Invoice List", icon: FileText, href: "/billing", active: true },
    { name: "Payment Processing", icon: CreditCard, href: "/billing/payment-processing", active: false },
    { name: "Client Accounts", icon: Users, href: "/billing/client-accounts", active: false },
    { name: "Financial Reports", icon: BarChart, href: "/billing/financial-reports", active: false },
    { name: "Settings", icon: Settings, href: "/billing/settings", active: false },
  ]

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null

  return (
    <div className="bg-white dark:bg-gray-800 w-64 border-r border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-lg font-semibold mb-4 theme-text-primary">Billing</h2>
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