"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"

import RoomView from "./room-view"
import WaitingRoom from "./waiting-room"
import ProviderView from "./provider-view"
import { Button } from "@/components/ui/button"
import AppointmentList from "./appointment-list"
import AppointmentCalendar from "./appointment-calendar"
import NewAppointment from "./newAppointment"
import AppointmentDetails from "./appointment-details"
import { PatientSearch, Patient } from "./patient-search"
import { useRootContext } from "@/context/RootContext"
import useAppointmentFilter from "./hooks/useAppointmentFilter"

export default function AppointmentsPage() {
  const { user, userType, IsAdmin, clinic } = useRootContext()
  const router = useRouter()
  const [appointmentId, setAppointmentId] = useState<string | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedProvider, setSelectedProvider] = useState("")
  const { searchParams, handleSearch, handleStatus, handleProvider, handleClinic, handleDate, removeAllFilters } =
    useAppointmentFilter()
  const urlSearchParams = useSearchParams()

  const [activeView, setActiveView] = useState("list")
  const [mounted, setMounted] = useState(false)
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)
  const [localClinicId, setLocalClinicId] = useState<string | null>(null)

  // Ensure we only access localStorage on the client side
  useEffect(() => {
    setMounted(true)
    const view = urlSearchParams.get("view") || "list"
    setActiveView(view)

    // Restore appointmentId from URL on page load
    const appointmentIdFromUrl = urlSearchParams.get("appointmentId")
    if (appointmentIdFromUrl) {
      setAppointmentId(appointmentIdFromUrl)
    }
  }, [urlSearchParams])

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const user = JSON.parse(userData)

      if (user.roleName === "Clinic Admin") {
        if (user.clinics && user.clinics.length > 0) {
          setLocalClinicId(user.clinics[0].clinicId)
        }
      }
    }
  }, [])

  const handleViewChange = (view: string) => {
    setActiveView(view)

    // Force replace the entire URL with just the view parameter
    window.history.replaceState(null, "", `/appointments/confirmed?view=${view}`)
  }

  const handleAppointmentClick = useCallback(
    (id: string | number) => {
      const appointmentIdStr = id.toString()
      setAppointmentId(appointmentIdStr)
      // Store appointmentId in URL
      const params = new URLSearchParams(urlSearchParams.toString())
      params.set("appointmentId", appointmentIdStr)

      // This ensures that even if a stale tab param was in the URL, it gets cleared
      params.delete("tab")

      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [urlSearchParams, router],
  )

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient)
  }

  const clearPatientFilter = () => {
    setSelectedPatient(null)
  }

  // Close appointment details
  const handleCloseAppointmentView = () => {
    setAppointmentId(null)
    // Remove appointmentId and tab from URL when closing
    const params = new URLSearchParams(urlSearchParams.toString())
    params.delete("appointmentId")
    params.delete("tab")
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null

  return (
    <div className="bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
      <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-blue-800 dark:from-slate-100 dark:to-blue-100 bg-clip-text text-transparent px-6 pt-4">
        {activeView === "list" && "Appointment List"}
        {activeView === "calendar" && "Appointment Calendar"}
        {activeView === "provider" && "Provider View"}
        {/* {activeView === "room" && "Room View"}
                        {activeView === "waiting" && "Waiting Room"} */}
      </h1>
      {/* Clinic dropdown moved to app/(pages)/appointments/layout.tsx */}
      <div className="md:flex justify-between items-center p-6">
        <div className="flex-1">
          <div className="w-full pr-2">
            <PatientSearch onPatientSelect={handlePatientSelect} />
            {selectedPatient && (
              <div className="flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                <span className="text-sm font-medium">
                  Filtering appointments for:{" "}
                  <strong className="text-blue-900 dark:text-blue-100">{selectedPatient.name}</strong>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-3 h-7 w-7 p-0 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-300"
                  onClick={clearPatientFilter}
                >
                  <span className="sr-only">Clear filter</span>
                  <svg
                    xmlns="http://www.w3.org/20   00/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </Button>
              </div>
            )}
          </div>
        </div>
        <Button className={`theme-button text-white mt-4 md:mt-0`} onClick={() => setIsNewAppointmentOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Appointment
        </Button>
      </div>

      {/* View Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <nav className="flex -mb-px">
          <button
            onClick={() => handleViewChange("list")}
            className={`py-4 px-6 text-center border-b-2 font-medium text-md transition-all duration-200 ${
              activeView === "list"
                ? "border-[#1E3D3D] text-[#1E3D3D] dark:border-[#1E3D3D] dark:text-[#1E3D3D] bg-[#D2EFEC] dark:bg-[#1E3D3D]/20"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
            }`}
          >
            List View
          </button>
          {/* <button
                        onClick={() => handleViewChange("calendar")}
                        className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-all duration-200 ${activeView === "calendar"
                            ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
                            }`}
                    >
                        Calendar View
                    </button> */}

          <button
            onClick={() => handleViewChange("provider")}
            className={`py-4 px-6 text-center border-b-2 font-medium text-md transition-all duration-200 ${
              activeView === "provider"
                ? "border-[#1E3D3D] text-[#1E3D3D] dark:border-[#1E3D3D] dark:text-[#1E3D3D] bg-[#D2EFEC] dark:bg-[#1E3D3D]/20"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
            }`}
          >
            Provider View
          </button>
          {/* <button
                        onClick={() => handleViewChange("room")}
                        className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-all duration-200 ${activeView === "room"
                            ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
                            }`}
                    >
                        Room View
                    </button>
                    <button
                        onClick={() => handleViewChange("waiting")}
                        className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-all duration-200 ${activeView === "waiting"
                            ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600"
                            }`}
                    >
                        Waiting Room
                    </button> */}
        </nav>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-6">
        {activeView === "list" && (
          <AppointmentList onAppointmentClick={handleAppointmentClick} selectedPatientId={selectedPatient?.id} />
        )}
        {activeView === "calendar" && <AppointmentCalendar onAppointmentClick={handleAppointmentClick} />}
        {activeView === "provider" && <ProviderView onAppointmentClick={handleAppointmentClick} />}
        {activeView === "room" && <RoomView onAppointmentClick={handleAppointmentClick} />}
        {activeView === "waiting" && <WaitingRoom onAppointmentClick={handleAppointmentClick} />}
      </div>

      {/* New Appointment Drawer */}
      <NewAppointment isOpen={isNewAppointmentOpen} onClose={() => setIsNewAppointmentOpen(false)} />

      {/* Appointment Details */}
      {appointmentId && <AppointmentDetails appointmentId={appointmentId} onClose={handleCloseAppointmentView} />}
    </div>
  )
}
