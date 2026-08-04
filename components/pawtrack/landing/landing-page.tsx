"use client";

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Calendar,
  Heart,
  FileText,
  Shield,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  CheckCircle,
  Star,
  Clock,
  Menu,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { getCompanySubdomain } from "@/utils/subdomain"
import { useGetCompanyBySubdomain } from "@/queries/companies"
import { base64ToPdfBlob, openPdf } from "@/utils/pdf";
import { CompanyLogo } from "@/components/pawtrack/company-logo";



export function PawTrackLandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Example: Print Terms of Service directly
  const handleTermsClick = async (base64: string) => {
    const blob = base64ToPdfBlob(base64)
    openPdf(blob)
  }

  const handlePrivacyPolicyClick = async (base64: string) => {
    const blob = base64ToPdfBlob(base64)
    openPdf(blob)
  }


  // Get company information based on subdomain
  const subdomain = getCompanySubdomain()
  const { data: company, isLoading: companyLoading, error: companyError } = useGetCompanyBySubdomain(subdomain)

  // Loading state
  if (companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#1E3D3D]" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (companyError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Unable to Load Clinic Information
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            We're having trouble loading the clinic information. Please try again later.
          </p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Fallback data if no company found
  const companyData = company || {
    name: "PawTrack Veterinary Clinic",
    description: "Professional veterinary care for your beloved pets",
    logoUrl: "/images/logo.png",
    email: "info@pawtrack.com",
    phone: "(555) 123-4567",
    address: {
      street: "123 Pet Care Ave",
      city: "Pet City",
      state: "PC",
      postalCode: "12345",
      country: "USA"
    },
    privacyPolicy: null,
    termsOfUse: null,
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 overflow-x-hidden overflow-y-auto max-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative w-8 h-8">
                <CompanyLogo
                  logoUrl={companyData.logoUrl}
                  companyName={companyData.name}
                  context="landing-header"
                  fallbackSrc="/images/logo.png"
                  cacheBust={company?.updatedAt}
                  fill
                  className="object-contain rounded"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{companyData.name}</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Services</a>
              <a href="#about" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">About</a>
              <a href="#doctors" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Our Doctors</a>
              <a href="#contact" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Contact</a>
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/login">
                <Button variant="outline" className="hidden lg:inline-flex bg-transparent">
                  Patient Portal
                </Button>
              </Link>
              <Link href="/login/internal">
                <Button variant="ghost" className="hidden md:inline-flex text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                  Staff Login
                </Button>
              </Link>
              <Link href="/patientdashboard">
                <Button className="bg-gradient-to-r from-[#1E3D3D] to-[#1E3D3D] hover:from-[#1E3D3D] hover:to-[#1E3D3D]">
                  Book Appointment
                </Button>
              </Link>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
              <nav className="px-4 py-4 space-y-4">
                <a
                  href="#services"
                  className="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Services
                </a>
                <a
                  href="#about"
                  className="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  About
                </a>
                <a
                  href="#doctors"
                  className="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Our Doctors
                </a>
                <a
                  href="#contact"
                  className="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Contact
                </a>
                <div className="pt-4 border-t border-gray-200 dark:border-slate-700 space-y-3">
                  <Link href="/login" className="block">
                    <Button variant="outline" className="w-full justify-center bg-transparent">
                      Patient Portal
                    </Button>
                  </Link>
                  <Link href="/login/internal" className="block">
                    <Button variant="ghost" className="w-full justify-center text-gray-600 dark:text-gray-300">
                      Staff Login
                    </Button>
                  </Link>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#D2EFEC] dark:bg-[#1E3D3D]/20 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-[#D2EFEC] dark:bg-[#1E3D3D]/20 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-80 h-80 bg-green-100 dark:bg-green-900/20 rounded-full blur-3xl opacity-40"></div>
        </div>

        <div className="md:container mx-auto relative">
          <div className="max-w-5xl mx-auto text-center">
            <div className="space-y-12">
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#1E3D3D] dark:bg-[#1E3D3D] border border-[#1E3D3D]">
                <Heart className="h-4 w-4 text-white mr-2" />
                <span className="text-sm font-medium text-white">Trusted by 10,000+ Pet Parents</span>
              </div>

              <div className="space-y-6">
                <h1 className="text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight">
                  Expert Care for Your
                  <span className="bg-gradient-to-r from-[#1E3D3D] to-[#1E3D3D] bg-clip-text text-transparent block"> Beloved Pets</span>
                </h1>
                <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">
                  {companyData.description || "Trust your furry family members to our experienced veterinary team. We provide compassionate care, advanced treatments, and a welcoming environment for pets and their owners."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/register">
                  <Button size="lg" className="bg-gradient-to-r from-[#1E3D3D] to-[#1E3D3D] hover:from-[#1E3D3D] hover:to-[#1E3D3D] text-lg px-10 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    Book Your First Appointment
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>

              <div className="flex justify-center">
                <Button variant="outline" size="lg" className="text-lg px-10 py-6 rounded-xl border-2 border-[#1E3D3D] text-[#1E3D3D] dark:border-[#D2EFEC] dark:text-[#D2EFEC] hover:bg-[#1E3D3D] hover:text-white dark:hover:bg-[#D2EFEC] dark:hover:text-[#1E3D3D] transition-all duration-300 transform hover:scale-105">
                  Emergency Care
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-12 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Same-day appointments available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Emergency services 24/7</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Licensed & Insured</span>
                </div>
              </div>

              {/* Stats preview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">15+</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Years Experience</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">10K+</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Happy Pets</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">24/7</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Emergency Care</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">98%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-slate-800">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Comprehensive Pet Care Services
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              From routine checkups to specialized treatments, we provide complete veterinary care
              to keep your pets healthy and happy throughout their lives.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white dark:bg-slate-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-[#D2EFEC] dark:bg-[#1E3D3D] rounded-lg flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-[#1E3D3D] dark:text-[#D2EFEC]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Wellness Exams</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Regular checkups, vaccinations, and preventive care to keep your pets healthy.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Emergency Care</h3>
              <p className="text-gray-600 dark:text-gray-300">
                24/7 emergency services for urgent medical situations and critical care.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-[#D2EFEC] dark:bg-[#1E3D3D] rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-[#1E3D3D] dark:text-[#D2EFEC]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Surgery & Procedures</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Advanced surgical procedures with state-of-the-art equipment and expert care.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Dental Care</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Professional dental cleaning, extractions, and oral health maintenance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Get Your First Appointment Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#1E3D3D] to-[#1E3D3D]">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Give Your Pet the Best Care?
            </h2>
            <p className="text-xl text-[#D2EFEC] mb-8">
              Join thousands of pet parents who trust us with their beloved companions.
              Book your first appointment today and experience compassionate, professional care.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-4 bg-white text-[#1E3D3D] hover:bg-gray-100">
                  Get Your First Appointment
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="secondary" className="text-lg px-8 py-4 bg-white text-[#1E3D3D] hover:bg-gray-100">
                Call Now
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="about" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
                Why Pet Parents Choose Us
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                We understand that your pets are family. That's why we provide personalized care
                with compassion, expertise, and the latest veterinary technology to ensure the best outcomes.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Experienced Veterinarians</h3>
                    <p className="text-gray-600 dark:text-gray-300">Board-certified doctors with years of experience</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Modern Facility</h3>
                    <p className="text-gray-600 dark:text-gray-300">State-of-the-art equipment and comfortable environment</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Compassionate Care</h3>
                    <p className="text-gray-600 dark:text-gray-300">We treat every pet like our own family member</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-[#D2EFEC] to-[#D2EFEC] dark:from-[#1E3D3D] dark:to-[#1E3D3D] rounded-2xl p-8">
                <div className="text-center space-y-4">
                  <div className="flex justify-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-lg text-gray-700 dark:text-gray-300 italic">
                    "The care my dog received was exceptional. The staff was so kind and professional.
                    I couldn't be happier with the treatment and follow-up care."
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Sarah M.</p>
                    <p className="text-gray-600 dark:text-gray-400">Happy Pet Parent</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="relative w-8 h-8">
                  <CompanyLogo
                    logoUrl={companyData.logoUrl}
                    companyName={companyData.name}
                    context="landing-footer"
                    fallbackSrc="/images/logo.png"
                    cacheBust={company?.updatedAt}
                    fill
                    className="object-contain rounded"
                  />
                </div>
                <span className="text-xl font-bold">{companyData.name}</span>
              </div>
              <p className="text-gray-400">
                {companyData.description || "Providing compassionate veterinary care for your beloved pets. Your pet's health and happiness are our top priorities."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#services" className="hover:text-white transition-colors">Wellness Exams</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Emergency Care</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Surgery</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Dental Care</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">About</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#about" className="hover:text-white transition-colors">Our Team</a></li>
                <li><a href="#doctors" className="hover:text-white transition-colors">Our Doctors</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Facility</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Testimonials</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Contact & Hours</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>{companyData.phone || "(555) 123-4567"}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>{companyData.email || "info@pawtrack.com"}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {companyData.address ?
                      `${companyData.address.street}, ${companyData.address.city}, ${companyData.address.state} ${companyData.address.postalCode}` :
                      "123 Pet Care Ave, Pet City, PC 12345"
                    }
                  </span>
                </li>
                <li className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Mon-Fri: 8AM-6PM, Sat: 9AM-4PM</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">
              © 2024 {companyData.name}. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <button
                onClick={() =>
                  companyData.privacyPolicy &&
                  handlePrivacyPolicyClick(companyData.privacyPolicy)
                }
                className="text-gray-400 hover:text-white transition-colors"
              >
                Privacy Policy
              </button>

              <button
                onClick={() =>
                  companyData.termsOfUse &&
                  handleTermsClick(companyData.termsOfUse)
                }
                className="text-gray-400 hover:text-white transition-colors"
              >
                Terms of Service
              </button>

            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
