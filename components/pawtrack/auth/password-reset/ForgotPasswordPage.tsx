"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { Check, Moon, Settings, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { PasswordResetFlow } from "@/components/pawtrack/auth/password-reset/PasswordResetFlow"


export function PawTrackForgotPasswordPage() {
  const [mounted, setMounted] = useState(false)
  const [colorTheme, setColorTheme] = useState("purple")
  const { theme, setTheme } = useTheme()

  // Theme options
  const themeOptions = [
    { name: "Purple (Default)", value: "purple", primaryColor: "bg-purple-600", secondaryColor: "bg-indigo-800" },
    { name: "Teal", value: "teal", primaryColor: "bg-teal-600", secondaryColor: "bg-teal-800" },
    { name: "Blue", value: "blue", primaryColor: "bg-blue-600", secondaryColor: "bg-blue-800" },
    { name: "Rose", value: "rose", primaryColor: "bg-rose-600", secondaryColor: "bg-rose-800" },
    { name: "Amber", value: "amber", primaryColor: "bg-amber-600", secondaryColor: "bg-amber-800" },
    { name: "Emerald", value: "emerald", primaryColor: "bg-emerald-600", secondaryColor: "bg-emerald-800" },
  ]

  // Ensure we only access localStorage on the client side
  useEffect(() => {
    setMounted(true)
    const savedColorTheme = localStorage.getItem("pawtrack-color-theme") || "purple"
    setColorTheme(savedColorTheme)
    document.documentElement.setAttribute("data-color-theme", savedColorTheme)
  }, [])

  const changeColorTheme = (value: string) => {
    setColorTheme(value)
    localStorage.setItem("pawtrack-color-theme", value)
    document.documentElement.setAttribute("data-color-theme", value)
  }

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{
        background: `linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-secondary) 100%)`,
      }}
    >
      {/* Theme Dropdown */}
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 border-0 bg-white/10 text-white hover:bg-white/20">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuLabel className="text-xs font-normal text-gray-500">Mode</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">
                <Sun className="mr-2 h-4 w-4" />
                <span>Light</span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Settings className="mr-2 h-4 w-4" />
                <span>System</span>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-gray-500">Color Theme</DropdownMenuLabel>

            <DropdownMenuRadioGroup value={colorTheme} onValueChange={changeColorTheme}>
              {themeOptions.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value} className="flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-2 ${option.primaryColor}`}></div>
                  <span>{option.name}</span>
                  {colorTheme === option.value && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Left side - Branding */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 text-white">
        <div className="max-w-md w-full space-y-8">
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40 mb-6">
              <Image src="/images/logo.png" alt="PawTrack Logo" fill className="object-contain" priority />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">PawTrack</h1>
            <p className="mt-2 text-xl">Veterinary Practice Management</p>
          </div>

          <div className="mt-10 hidden md:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Streamline Your Veterinary Practice</h2>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-sm">✓</span>
                  </div>
                  <p>Manage appointments and patient records</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-sm">✓</span>
                  </div>
                  <p>Track inventory and prescriptions</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-sm">✓</span>
                  </div>
                  <p>Process billing and generate reports</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Reset Password Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-8">
          <PasswordResetFlow />
        </div>
      </div>
    </div>
  )
}
