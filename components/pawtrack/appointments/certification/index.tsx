"use client"
import { useState, useEffect, useMemo } from "react"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useGetCertificateByVisitId } from "@/queries/certificate/get-certificate-by-visit-id"
import { useUpdateAppointment } from "@/queries/appointment/update-appointment"
import { useToast } from "@/hooks/use-toast"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { useGetPatientAppointmentHistory } from "@/queries/patients/get-patient-appointment-history"
import { useContentLayout } from "@/hooks/useContentLayout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs-new"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useGetCertificateTypes } from "@/queries/certificateType/get-certificate-type"
import { type CertificateConfig, certificateConfigs } from "@/utils/certificate-configs"
import GenericCertificateSheet from "./generic-certificate-sheet"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { TabCompletionProvider, type TabId } from "@/context/TabCompletionContext"
import { appointmentTabConfigMap } from "../appointmentTabConfig"
import AppointmentHistoryNavigation from "../AppointmentHistoryNavigation"
import { Input } from "@/components/ui/input"
import { Search, FileText, CheckCircle, XCircle, Clock } from "lucide-react"
import React from "react"
import VaccinationPlanning from "../vaccination/VaccinationPlanning"

interface CertificateManagementProps {
  appointmentId: string
  patientId: string
  onClose: () => void
  embedded?: boolean
}

function CertificateManagement({ appointmentId, patientId, onClose, embedded = false }: CertificateManagementProps) {
  const { data: certificateTypes, isLoading: isLoadingCertificateTypes } = useGetCertificateTypes()
  const [selectedCertificateConfig, setSelectedCertificateConfig] = useState<CertificateConfig | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [hasCertificateCreated, setHasCertificateCreated] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [completedTemplates, setCompletedTemplates] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<TabId>("certification-details")
  const [currentAppointmentId, setCurrentAppointmentId] = useState(appointmentId)
  const [followUpDateFooter, setFollowUpDateFooter] = useState<string>("")
  const [weightGraphOpen, setWeightGraphOpen] = useState(false)

  const { toast } = useToast()
  const { clinic, user, userType } = useContentLayout()
  const { data: visit } = useGetVisitByAppointmentId(currentAppointmentId)
  const { data: existingCertificate } = useGetCertificateByVisitId(visit?.id)
  const { data: appointment } = useGetAppointmentById(currentAppointmentId)
  
  const clinicIdForHistory = (user?.roleName === 'Clinic Admin' || user?.roleName === 'Veterinarian') 
    ? (appointment?.clinicId || clinic?.id) 
    : undefined
  
  const { data: history } = useGetPatientAppointmentHistory(patientId, clinicIdForHistory)
  const { data: visitData, refetch: refetchVisitData } = useGetVisitByAppointmentId(currentAppointmentId)

  const currentTabConfig = useMemo(() => {
    const type = appointment?.appointmentType?.name || ""
    return appointmentTabConfigMap[type] || []
  }, [appointment?.appointmentType?.name])

 const filteredAppointmentHistory = useMemo(() => {
  return history?.appointmentHistory.filter(
    (appt) => appt.status === "in_progress" || appt.status === "completed"
  ) || []
}, [history?.appointmentHistory])

  const isCertificationAppointment = useMemo(() => {
    const type = appointment?.appointmentType?.name?.toLowerCase()
    return type === 'certification' || type === 'certificate'
  }, [appointment?.appointmentType?.name])

  useEffect(() => {
    if (currentTabConfig.length > 0) {
      setActiveTab(currentTabConfig[0].value)
    }
  }, [currentTabConfig, currentAppointmentId])

  useEffect(() => {
    setCurrentAppointmentId(appointmentId)
  }, [appointmentId])

  useEffect(() => {
    if (currentAppointmentId && appointment?.id === currentAppointmentId) {
      refetchVisitData()
    }
  }, [currentAppointmentId, appointment?.id, refetchVisitData])

  const isTabCompleted = (tabValue: string): boolean => {
    if (!visitData || !currentTabConfig.length) return false
    const visit = visitData as any
    const tabConfig = currentTabConfig.find(tab => tab.value === tabValue)
    if (!tabConfig || !tabConfig.isCompletedKey) return false
    return Boolean(visit[tabConfig.isCompletedKey])
  }

  const navigateToNextTab = () => {
    if (!currentTabConfig) return
    const currentIndex = currentTabConfig.findIndex((tab) => tab.value === activeTab)
    if (currentIndex < currentTabConfig.length - 1) {
      setActiveTab(currentTabConfig[currentIndex + 1].value)
    }
  }

  const updateAppointmentMutation = useUpdateAppointment({
    onSuccess: () => {
      toast({ title: "Success", description: "Appointment completed successfully" })
      setIsCheckingOut(false)
      onClose()
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to complete appointment", variant: "destructive" })
      setIsCheckingOut(false)
    },
  })

  useEffect(() => {
    if (Array.isArray(existingCertificate)) {
      setHasCertificateCreated(existingCertificate.length > 0)
      return
    }
    setHasCertificateCreated(Boolean(existingCertificate))
  }, [existingCertificate])

  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      const key = `cert_completed_${currentAppointmentId}`
      const raw = localStorage.getItem(key)
      if (!raw) { setCompletedTemplates([]); return }
      const parsed = JSON.parse(raw)
      setCompletedTemplates(Array.isArray(parsed) ? parsed : [])
    } catch {
      setCompletedTemplates([])
    }
  }, [currentAppointmentId])

  const handleCertificateCreated = (configName: string) => {
    setHasCertificateCreated(true)
    setSelectedCertificateConfig(null)
    setCompletedTemplates((prev) => {
      const next = prev.includes(configName) ? prev : [...prev, configName]
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(`cert_completed_${currentAppointmentId}`, JSON.stringify(next))
        }
      } catch {}
      return next
    })
  }

  const handleCheckout = async () => {
    if (!appointment) {
      toast({ title: "Error", description: "Appointment data not found", variant: "destructive" })
      return
    }
    setIsCheckingOut(true)
    try {
      await updateAppointmentMutation.mutateAsync({
        id: currentAppointmentId,
        data: { ...appointment, status: "completed" },
      })
    } catch (error) {
      console.error("Error during checkout:", error)
    }
  }

  const filteredCertificateTypes = certificateTypes?.filter(
    (type) =>
      type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const handleCertificateTypeClick = (type: any) => {
    const config = certificateConfigs.find((c) => c.name === type.name)
    if (config) setSelectedCertificateConfig(config)
  }

  const handleCloseGenericSheet = () => {
    setSelectedCertificateConfig(null)
  }

  const renderContent = () => (
    // When embedded, don't set h-full — let the parent control height
    // When standalone, use h-full so the sheet fills correctly
    <div className={`w-full flex flex-col ${embedded ? '' : 'h-full'}`}>
      {!embedded && (
        <div className="border-b pb-4 flex-shrink-0 p-4">
          <h2 className="flex items-center text-xl font-semibold text-gray-900">
            <FileText className="h-5 w-5 mr-2" />
            {appointment?.appointmentType?.name || 'Appointment'} Details
          </h2>
        </div>
      )}

      {/* Appointment History Navigation - only when standalone */}
      {!embedded && filteredAppointmentHistory.length > 0 && (
        <div className="flex-shrink-0 px-4 pt-4">
          <AppointmentHistoryNavigation
            patientHistory={filteredAppointmentHistory}
            currentAppointmentId={currentAppointmentId}
            onAppointmentSelect={(newAppointmentId) => {
              setCurrentAppointmentId(newAppointmentId)
            }}
            selectedAppointmentType={appointment?.appointmentType?.name}
          />
        </div>
      )}

      {/*
        KEY FIX:
        - When embedded: no overflow-y-auto, no flex-1 — just render content naturally
          so the PARENT scroll container (SurgeryComponent) handles all scrolling.
        - When standalone: flex-1 + overflow-y-auto so it scrolls within its own sheet.
      */}
      <div className={embedded ? '' : 'flex-1 overflow-y-auto'}>
        {/* Tabs for appointment types that have them */}
        {currentTabConfig.length > 0 && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabId)} className="h-full flex flex-col">
            <TabsList className="w-full flex-shrink-0 sticky top-0 bg-white z-10 px-4">
              {currentTabConfig.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={`flex items-center gap-1 text-lg font-bold ${
                    isTabCompleted(tab.value) ? 'data-[state=active]:text-green-600' : ''
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {tab.label}
                    {isTabCompleted(tab.value) && (
                      <CheckCircle className="h-4 w-4 text-green-600 ml-1" />
                    )}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {currentTabConfig.map((tab: any) => {
              const TabComponent = tab.component
              return (
                <TabsContent key={tab.value} value={tab.value} className="flex-1 p-4 m-0 data-[state=inactive]:hidden">
                  <TabCompletionProvider>
                    <TabComponent
                      patientId={patientId}
                      appointmentId={currentAppointmentId}
                      visitId={visitData?.id}
                      onNext={navigateToNextTab}
                      onClose={onClose}
                      externalFollowUpDate={followUpDateFooter}
                      onExternalFollowUpDateChange={setFollowUpDateFooter}
                      setWeightGraphOpen={tab.value === "certification-details" ? setWeightGraphOpen : undefined}
                    />
                  </TabCompletionProvider>
                </TabsContent>
              )
            })}
          </Tabs>
        )}

        {/* Vaccination fallback */}
        {appointment?.appointmentType?.name === "Vaccination" && currentTabConfig.length === 0 && (
          <div className="p-4">
            <VaccinationPlanning
              patientId={patientId}
              appointmentId={currentAppointmentId}
              species={appointment?.patient?.species || "dog"}
              onNext={() => {}}
              onClose={onClose}
              clinicId={appointment?.clinicId}
              isReadOnly={appointment?.status === "completed"}
              embedded={true}
              hideMedicalHistoryButton={false}
            />
          </div>
        )}

        {/* Certificate section */}
        {isCertificationAppointment && (
          <div className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search certificates..."
                className="pl-9 h-10 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              {filteredCertificateTypes.map((type) => {
                const config = certificateConfigs.find((c) => c.name === type.name)
                if (!config) return null
                const Icon = config.icon || FileText
                const isCompleted = completedTemplates.includes(config.name)

                return (
                  <Card
                    key={type.id}
                    className="cursor-pointer hover:shadow-md transition-shadow duration-200 w-full"
                    onClick={() => handleCertificateTypeClick(type)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            config.toastMessages.saved.includes("Fitness") ? "bg-red-50" :
                            config.toastMessages.saved.includes("Health") ? "bg-blue-50" :
                            config.toastMessages.saved.includes("Vaccination") ? "bg-green-50" :
                            config.toastMessages.saved.includes("Deworming") ? "bg-purple-50" :
                            config.toastMessages.saved.includes("Tick Medicine") ? "bg-orange-50" :
                            config.toastMessages.saved.includes("Euthanasia") ? "bg-gray-50" :
                            config.toastMessages.saved.includes("Consent Bond") ? "bg-indigo-50" : ""
                          }`}>
                            <div className={`${
                              config.toastMessages.saved.includes("Fitness") ? "text-red-600" :
                              config.toastMessages.saved.includes("Health") ? "text-blue-600" :
                              config.toastMessages.saved.includes("Vaccination") ? "text-green-600" :
                              config.toastMessages.saved.includes("Deworming") ? "text-purple-600" :
                              config.toastMessages.saved.includes("Tick Medicine") ? "text-orange-600" :
                              config.toastMessages.saved.includes("Euthanasia") ? "text-gray-600" :
                              config.toastMessages.saved.includes("Consent Bond") ? "text-indigo-600" : ""
                            }`}>
                              <Icon className="h-6 w-6" />
                            </div>
                          </div>
                          <div>
                            <CardTitle className="text-sm">{type.name}</CardTitle>
                            <CardDescription className="text-xs">{type.description}</CardDescription>
                          </div>
                        </div>
                        {isCompleted && (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Checkout button - only for Certification appointments, always at bottom */}
      {isCertificationAppointment && (
        <div className="border-t pt-4 flex-shrink-0 p-4 bg-white">
          <div className="flex justify-between items-center gap-4">
            <Button variant="outline" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 font-medium">
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={!hasCertificateCreated || isCheckingOut}
              className="px-4 py-2 rounded-md bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white disabled:bg-gray-300 disabled:opacity-60 disabled:cursor-not-allowed font-medium"
            >
              {isCheckingOut ? "Processing..." : "Checkout"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  if (isLoadingCertificateTypes) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-full md:max-w-[70%] lg:max-w-[50%] flex flex-col">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600 text-sm">Loading...</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  if (selectedCertificateConfig) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-full md:max-w-[40%] lg:max-w-[50%] p-0 flex flex-col">
          <div className="border-b pb-4 flex-shrink-0 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{selectedCertificateConfig.name}</h2>
              <Button variant="outline" size="sm" onClick={handleCloseGenericSheet} className="flex items-center bg-transparent">
                <XCircle className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            {selectedCertificateConfig.description && (
              <p className="text-gray-600 mt-1">{selectedCertificateConfig.description}</p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <GenericCertificateSheet
              config={selectedCertificateConfig}
              appointmentId={currentAppointmentId}
              patientId={patientId}
              onClose={handleCloseGenericSheet}
              onCertificateCreated={() => handleCertificateCreated(selectedCertificateConfig.name)}
            />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  if (embedded) {
    return renderContent()
  }

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-full md:max-w-[70%] lg:max-w-[50%] p-0 flex flex-col">
        {renderContent()}
      </SheetContent>
    </Sheet>
  )
}

export default function CertificateManagementWrapper(props: CertificateManagementProps) {
  return (
    <TabCompletionProvider>
      <CertificateManagement {...props} />
    </TabCompletionProvider>
  )
}