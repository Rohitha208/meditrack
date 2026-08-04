"use client";

import type React from "react"
import { Moon, Sun, Calendar, PawPrint, Heart, FileText, Bell, Building2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { getCompanySubdomain } from "@/utils/subdomain";
import { useGetCompanyBySubdomain } from "@/queries/companies";
import { CompanyLogo } from "@/components/pawtrack/company-logo";
import { RegistrationForm } from "@/components/pawtrack/auth/register/registration-form";

export default function RegisterPage() {
  // Get company information based on subdomain
  const subdomain = getCompanySubdomain();
  const { data: company, isLoading: companyLoading } = useGetCompanyBySubdomain(subdomain);

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row max-h-screen overflow-y-auto"
      style={{
        background: `linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-secondary) 100%)`,
      }}
    >
      {/* Theme Dropdown */}
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>

        </DropdownMenu>
      </div>
      
      {/* Left side - Branding */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 md:p-8 text-white">
        <div className="max-w-md w-full space-y-6 md:space-y-8">
          <div className="flex flex-col items-center">
            {/* <div className="relative w-24 h-24 md:w-40 md:h-40 mb-4 md:mb-6">
              <Image src="/images/logo.png" alt="PawTrack Logo" fill className="object-contain" priority />
            </div> */}
            <div className="w-80 relative h-20">
              <CompanyLogo
                logoUrl={company?.logoUrl}
                companyName={company?.name}
                context="public-register"
                fallbackSrc="/images/logo-white.png"
                fill
                className="object-contain"
              />
            </div>
            {/* <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-center">PawTrack</h1>
            <p className="mt-2 text-base md:text-xl text-center">Your Pet's Health Journey</p> */}
          </div>

          {/* Mobile Features Preview */}
          <div className="md:hidden">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 shadow-lg">
              <h2 className="text-lg font-semibold mb-3 text-center">Stay Connected with Your Pet's Care</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center text-center">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mb-2">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <p className="text-xs">Manage appointments</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mb-2">
                    <PawPrint className="h-4 w-4" />
                  </div>
                  <p className="text-xs">Medical records</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mb-2">
                    <Heart className="h-4 w-4" />
                  </div>
                  <p className="text-xs">Track treatments</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mb-2">
                    <Bell className="h-4 w-4" />
                  </div>
                  <p className="text-xs">Get reminders</p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Features List */}
          <div className="mt-10 hidden md:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Stay Connected with Your Pet's Care</h2>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mr-3 mt-0.5">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <p>View and manage your pet's appointments</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mr-3 mt-0.5">
                    <PawPrint className="h-4 w-4" />
                  </div>
                  <p>Access your pet's medical records</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mr-3 mt-0.5">
                    <Heart className="h-4 w-4" />
                  </div>
                  <p>Track vaccinations and treatments</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mr-3 mt-0.5">
                    <Bell className="h-4 w-4" />
                  </div>
                  <p>Get appointment reminders and updates</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mr-3 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>
                  <p>View prescriptions and billing history</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-white">
        <div className="bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl shadow-xl w-full max-w-lg p-4 md:p-8 border">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              Welcome to {company?.name || "PawTrack"}
            </h2>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2">
              Create your account to access your pet's health portal
            </p>
          </div>
          
          <RegistrationForm />
        </div>
      </div>
    </div>
  )
} 