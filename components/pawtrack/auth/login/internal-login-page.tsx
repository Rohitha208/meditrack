"use client";

import type React from "react"
import { Moon, Sun } from "lucide-react"
import { signIn } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { getCompanySubdomain } from "@/utils/subdomain";
import { useGetCompanyBySubdomain } from "@/queries/companies";
import { CompanyLogo } from "@/components/pawtrack/company-logo";
import { LoginForm } from "@/components/pawtrack/auth/login/loginform";

export function PawTrackInternalLoginPage() {
  const subdomain = getCompanySubdomain();
  const { data: company, isLoading: companyLoading } = useGetCompanyBySubdomain(subdomain);

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
        </DropdownMenu>
      </div>
      {/* Left side - Branding */}
      <div className="flex-1 flex flex-col justify-center items-center text-white">
        <div className="max-w-md w-full space-y-8">
          <div className="flex flex-col items-center">
            <div className="w-80 relative h-20">
              <CompanyLogo
                logoUrl={company?.logoUrl}
                companyName={company?.name}
                context="internal-login"
                fallbackSrc="/images/logo-white.png"
                fill
                className="object-contain"
                priority
              />
            </div>
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

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-8 border">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{company?.name || "PawTrack"}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Enter your credentials to access your pet's health information</p>
          </div>

          <LoginForm hideRegisterLink={true} />
        </div>
      </div>
    </div>
  )
}
