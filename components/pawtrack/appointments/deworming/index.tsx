"use client"
import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs-new"
import { Button } from "@/components/ui/button"
import { CheckCircle, History } from "lucide-react"
import { useTabCompletion, type TabId, TabCompletionProvider } from "@/context/TabCompletionContext"
import { useGetPatientAppointmentHistory } from "@/queries/patients/get-patient-appointment-history"
import { useContentLayout } from "@/hooks/useContentLayout"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { appointmentTabConfigMap } from "../appointmentTabConfig"
import AppointmentHistoryNavigation from "../AppointmentHistoryNavigation"
import MedicalHistoryTab from "../MedicalHistoryTab"
import VaccinationPlanning from "../vaccination/VaccinationPlanning"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@radix-ui/react-dialog"
import WeightGraph from "../WeightGraph"
import { DialogHeader } from "@/components/ui/dialog"
import CertificateManagementWrapper from "../certification"

interface DewormingComponentProps {
  patientId: string
  appointmentId: string
  onClose: () => void
  onAppointmentChange?: (newAppointmentId: string) => void
}

function DewormingContent({
  patientId,
  appointmentId: initialAppointmentId,
  onClose,
  onAppointmentChange,
}: DewormingComponentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>("deworming-intake")
  const [showNewAppointment, setShowNewAppointment] = useState(false)
  const [showMedicalHistory, setShowMedicalHistory] = useState(false)
  const [currentAppointmentId, setCurrentAppointmentId] = useState(initialAppointmentId)
  const [followUpDateFooter, setFollowUpDateFooter] = useState<string>("")
  const { clinic, user, userType } = useContentLayout()

  const { data: appointment } = useGetAppointmentById(currentAppointmentId)

  const clinicIdForHistory = (user?.roleName === 'Clinic Admin' || user?.roleName === 'Veterinarian')
    ? (appointment?.clinicId || clinic?.id)
    : undefined

  const { data: history } = useGetPatientAppointmentHistory(patientId, clinicIdForHistory)
  const { data: visitData, refetch: refetchVisitData } = useGetVisitByAppointmentId(currentAppointmentId)
  const [weightGraphOpen, setWeightGraphOpen] = useState(false)

  const { isTabCompleted } = useTabCompletion()

  const currentTabConfig = useMemo(() => {
    const type = appointment?.appointmentType?.name || "Deworming"
    return appointmentTabConfigMap[type] || appointmentTabConfigMap["Deworming"] || []
  }, [appointment?.appointmentType?.name])

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as TabId | null
    if (tabFromUrl && currentTabConfig.some((tab) => tab.value === tabFromUrl)) {
      setActiveTab(tabFromUrl)
    } else if (currentTabConfig.length > 0 && appointment?.appointmentType?.name) {
      const defaultTab = currentTabConfig[0].value
      setActiveTab(defaultTab)
      if (!tabFromUrl) {
        const params = new URLSearchParams(searchParams.toString())
        params.set("tab", defaultTab)
        router.replace(`?${params.toString()}`, { scroll: false })
      }
    }
  }, [currentTabConfig, appointment?.appointmentType?.name, searchParams, router])

  const handleTabChange = (value: string) => {
    const newTab = value as TabId
    setActiveTab(newTab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", newTab)
    params.set("appointmentId", currentAppointmentId)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const filteredAppointmentHistory = useMemo(() => {
    return history?.appointmentHistory.filter(
      (appt) => appt.status === "in_progress" || appt.status === "completed"
    ) || []
  }, [history?.appointmentHistory])

  useEffect(() => {
    setCurrentAppointmentId(initialAppointmentId)
  }, [initialAppointmentId])

  useEffect(() => {
    refetchVisitData()
  }, [currentAppointmentId, refetchVisitData])

  const isDewormingTabCompleted = (tabValue: string): boolean => {
    const contextCompleted = isTabCompleted(tabValue as TabId)
    if (contextCompleted) return true
    if (!visitData) return false
    const visit = visitData as any
    const tabConfig = currentTabConfig.find((tab) => tab.value === tabValue)
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

  const handleCloseAndClearUrl = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("tab")
    params.delete("appointmentId")
    router.replace(`?${params.toString()}`, { scroll: false })
    onClose()
  }

  return (
    <>
      <Sheet open={true} onOpenChange={handleCloseAndClearUrl}>
        <SheetContent
          side="right"
          className="w-full sm:!max-w-full md:!max-w-[70%] lg:!max-w-[70%] flex flex-col overflow-hidden h-full"
        >
          {/* Fixed header */}
          <SheetHeader className="mb-3 mr-10 flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle>Deworming Visit</SheetTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMedicalHistory(true)}
                  className="flex items-center gap-2"
                >
                  <History className="h-4 w-4" />
                  Medical History
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Single scrollable content area - min-h-0 prevents double scrollbar */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Appointment History Navigation - inside scroll div, same as SurgeryComponent */}
            {filteredAppointmentHistory.length > 0 && (
              <div className="mb-2">
                <AppointmentHistoryNavigation
                  patientHistory={filteredAppointmentHistory}
                  currentAppointmentId={currentAppointmentId}
                  onAppointmentSelect={(newAppointmentId) => {
                    setCurrentAppointmentId(newAppointmentId)
                    if (currentTabConfig && currentTabConfig.length > 0) {
                      const tabFromUrl = searchParams.get("tab") as TabId | null
                      const validTab =
                        tabFromUrl && currentTabConfig.some((tab) => tab.value === tabFromUrl)
                          ? tabFromUrl
                          : currentTabConfig[0].value
                      setActiveTab(validTab)
                      const params = new URLSearchParams(searchParams.toString())
                      params.set("tab", validTab)
                      router.replace(`?${params.toString()}`, { scroll: false })
                    }
                  }}
                  selectedAppointmentType="Deworming"
                />
              </div>
            )}
            {(() => {
              const appointmentType = appointment?.appointmentType?.name?.toLowerCase()

              if (appointmentType === "vaccination" && currentTabConfig.length === 0) {
                return (
                  <VaccinationPlanning
                    patientId={patientId}
                    appointmentId={currentAppointmentId}
                    species={appointment?.patient?.species || "dog"}
                    onNext={() => {}}
                    onClose={onClose}
                    clinicId={appointment?.clinicId}
                    isReadOnly={appointment?.status === "completed"}
                    embedded={true}
                    hideMedicalHistoryButton={true}
                  />
                )
              }

              if (appointmentType === "certification" || appointmentType === "certificate") {
                return (
                  <CertificateManagementWrapper
                    appointmentId={currentAppointmentId}
                    patientId={patientId}
                    onClose={handleCloseAndClearUrl}
                    embedded={true}
                  />
                )
              }

              return (
                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                  <TabsList className="w-full">
                    {currentTabConfig.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className={`flex items-center gap-1 text-lg font-bold ${
                          isDewormingTabCompleted(tab.value) ? "data-[state=active]:text-green-600" : ""
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          {tab.label}
                          {isDewormingTabCompleted(tab.value) && (
                            <CheckCircle className="h-4 w-4 text-green-600 ml-1" />
                          )}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {currentTabConfig.map((tab: any) => {
                    const TabComponent = tab.component
                    return (
                      <TabsContent key={tab.value} value={tab.value} className="mt-0">
                        <TabCompletionProvider>
                          <TabComponent
                            patientId={patientId}
                            appointmentId={currentAppointmentId}
                            visitId={visitData?.id}
                            onNext={navigateToNextTab}
                            onClose={handleCloseAndClearUrl}
                            externalFollowUpDate={followUpDateFooter}
                            onExternalFollowUpDateChange={setFollowUpDateFooter}
                            setWeightGraphOpen={tab.value === "deworming-intake" ? setWeightGraphOpen : undefined}
                          />
                        </TabCompletionProvider>
                      </TabsContent>
                    )
                  })}
                </Tabs>
              )
            })()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Medical History Sheet */}
      <Sheet open={showMedicalHistory} onOpenChange={setShowMedicalHistory}>
        <SheetContent
          side="right"
          className="w-full sm:!max-w-full md:!max-w-[50%] lg:!max-w-[50%] overflow-x-hidden overflow-y-auto"
        >
          <SheetHeader className="mb-6">
            <SheetTitle>Medical History</SheetTitle>
          </SheetHeader>
          <TabCompletionProvider>
            <MedicalHistoryTab
              patientId={patientId}
              appointmentId={currentAppointmentId}
              onNext={() => setShowMedicalHistory(false)}
            />
          </TabCompletionProvider>
        </SheetContent>
      </Sheet>

      <Dialog open={weightGraphOpen} onOpenChange={setWeightGraphOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Weight History</DialogTitle>
            <DialogDescription>View the patient's weight history over time</DialogDescription>
          </DialogHeader>
          <WeightGraph patientId={patientId} isOpen={weightGraphOpen} onClose={() => setWeightGraphOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function DewormingComponent(props: DewormingComponentProps) {
  return (
    <TabCompletionProvider>
      <DewormingContent {...props} />
    </TabCompletionProvider>
  )
}