"use client"

import { useContext, useState, useEffect, useCallback } from "react"
import { PatientDashboardContext } from "@/components/patientDashboard/PatientDashboardProvider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Video, Shield, Clock, AlertTriangle, PawPrint, Building2, Stethoscope } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useGetClinic } from "@/queries/clinic/get-clinic"
import { useGetUsers } from "@/queries/users/get-users"
import { useGetRole } from "@/queries/roles/get-role"
import { useStartVideoMutation } from "@/queries/video/start-video"
import { notificationService } from "@/services/Notification/notificationService"
import { markSessionAsInitiated } from "@/components/video-call/VideoCallListener"
import { toast } from "sonner"

export default function EmergencyVideoCall() {
  const { pets, clientData, isClient, clientId } = useContext(PatientDashboardContext)
  const [selectedClinicId, setSelectedClinicId] = useState<string>("")
  const [selectedVetId, setSelectedVetId] = useState<string>("")
  const [selectedPetId, setSelectedPetId] = useState<string>("")
  const [emergencyNotes, setEmergencyNotes] = useState("")
  const [isCallStarting, setIsCallStarting] = useState(false)
  const [waitingSessionId, setWaitingSessionId] = useState<string | null>(null)

  // Listen for CallAccepted event from the vet — then open the video window
  useEffect(() => {
    if (!waitingSessionId) return

    const handleCallAccepted = (data: { videoSessionId: string; userId: string }) => {
      if (data.videoSessionId === waitingSessionId) {
        toast.success("Call accepted!", { description: "Joining video call..." })
        setWaitingSessionId(null)
        setIsCallStarting(false)
        window.open(
          `/video-call/${data.videoSessionId}`,
          `videocall_emergency`,
          "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no"
        )
      }
    }

    // Listen via custom event dispatched by VideoCallListener
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      handleCallAccepted(detail)
    }
    window.addEventListener("videocall:accepted", handler)

    // Also register directly on notificationService as fallback
    notificationService.onEvent("CallAccepted", handleCallAccepted)

    // Auto-cancel waiting after 90 seconds
    const timeout = setTimeout(() => {
      setWaitingSessionId(null)
      setIsCallStarting(false)
      toast.error("No response from veterinarian", { description: "Please try again or select a different veterinarian." })
    }, 90000)

    return () => {
      window.removeEventListener("videocall:accepted", handler)
      clearTimeout(timeout)
    }
  }, [waitingSessionId])

  const { mutate: startVideoCall, isPending: isVideoCallLoading } = useStartVideoMutation({
    onSuccess: (data) => {
      const sessionId = data?.videoSessionId
      if (!sessionId) {
        setIsCallStarting(false)
        toast.error("Failed to start video call", { description: "No session ID returned from server." })
        return
      }

      toast.success("Call request sent!", {
        description: "Waiting for veterinarian to accept..."
      })

      // Mark this session so VideoCallListener won't show incoming dialog to us
      markSessionAsInitiated(sessionId)

      // Enter waiting state — the CallAccepted listener will open the window
      setWaitingSessionId(sessionId)
    },
    onError: (error) => {
      setIsCallStarting(false)
      toast.error("Failed to start video call", {
        description: error.message || "Please try again or contact support"
      })
    }
  })

  const isPremium = clientData?.isPremium === true

  // Fetch clinics for the client's company
  const { data: clinicsData, isLoading: isClinicsLoading } = useGetClinic(
    1, 100, clientData?.companyId ?? null, isPremium
  )
  const clinics = clinicsData?.items ?? []

  // Fetch the veterinarian role ID
  const { data: rolesData } = useGetRole(1, 100, "", isPremium)
  const [veterinarianRoleId, setVeterinarianRoleId] = useState<string | null>(null)

  useEffect(() => {
    if (rolesData?.data) {
      const vetRole = rolesData.data.find(
        (role: any) => role.name.toLowerCase() === "veterinarian"
      )
      if (vetRole) {
        setVeterinarianRoleId(vetRole.id)
      }
    }
  }, [rolesData])

  // Fetch veterinarians for the selected clinic
  const { data: vetsData, isLoading: isVetsLoading } = useGetUsers(
    1, 50, "",
    !!(selectedClinicId && veterinarianRoleId), // enabled
    "", // companyId
    selectedClinicId ? [selectedClinicId] : [], // clinicIds
    veterinarianRoleId ? [veterinarianRoleId] : [] // roleIds
  )
  const veterinarians = vetsData?.items ?? []

  // Reset vet selection when clinic changes
  useEffect(() => {
    setSelectedVetId("")
  }, [selectedClinicId])

  // If not premium, show upgrade prompt
  if (!isPremium) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">Emergency Video Call</h2>
        <Card className="bg-white dark:bg-slate-900 shadow-lg border border-[#1E3D3D]/20">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-full mb-4">
              <Shield className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-[#1E3D3D] dark:text-[#D2EFEC] mb-2">
              Premium Feature
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
              Emergency video consultations are available exclusively for premium members.
              Upgrade your plan to get instant access to veterinary video calls for urgent situations.
            </p>
            <Button className="bg-[#1E3D3D] hover:bg-[#1E3D3D]/90 text-white">
              <Shield className="h-4 w-4 mr-2" />
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const selectedPet = pets.find((p: any) => p.id === selectedPetId)
  const selectedVet = veterinarians.find((v: any) => v.id === selectedVetId)
  const selectedClinic = clinics.find((c: any) => c.id === selectedClinicId)

  const handleStartCall = () => {
    if (!selectedClinicId) {
      toast("Please select a clinic", { description: "Choose a clinic to connect with." })
      return
    }
    if (!selectedVetId) {
      toast("Please select a veterinarian", { description: "Choose a veterinarian for the consultation." })
      return
    }
    if (!selectedPetId) {
      toast("Please select a pet", { description: "Choose which pet needs emergency attention." })
      return
    }

    setIsCallStarting(true)

    // Start the video call with the selected veterinarian as userId and selected pet as patientId
    startVideoCall({
      userId: selectedVetId,
      patientId: selectedPetId
    })
  }

  const isFormComplete = selectedClinicId && selectedVetId && selectedPetId

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center md:mb-4">
        <h2 className="text-xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">Emergency Video Call</h2>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-[#D2EFEC] dark:bg-[#1E3D3D]/30 text-[#1E3D3D] dark:text-[#D2EFEC]">
          <Shield className="h-3.5 w-3.5" />
          Premium
        </span>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-[#1E3D3D] to-[#1E3D3D]/80 border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-full shrink-0">
              <AlertTriangle className="h-4 w-4 text-[#D2EFEC]" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">When to use Emergency Video Call</h3>
              <p className="text-[#D2EFEC]/80 text-sm">
                Use this for urgent situations like sudden injuries, poisoning, difficulty breathing,
                or any condition that needs immediate veterinary guidance. Select your clinic and veterinarian
                to start a direct video consultation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Call Card */}
      <Card className="bg-white dark:bg-slate-900 shadow-lg border border-[#1E3D3D]/20">
        <CardHeader>
          <CardTitle className="text-[#1E3D3D] dark:text-[#D2EFEC]">Start Emergency Consultation</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Select a clinic, veterinarian, and pet to begin your video call
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Step 1: Clinic Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#1E3D3D] dark:text-[#D2EFEC] flex items-center gap-2">
              {/* <Building2 className="h-4 w-4" /> */}
              Select Clinic
            </Label>
            {isClinicsLoading ? (
              <p className="text-sm text-gray-500">Loading clinics...</p>
            ) : clinics.length === 0 ? (
              <p className="text-sm text-red-500">No clinics available.</p>
            ) : (
              <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
                <SelectTrigger className="border-[#1E3D3D]/20 dark:border-[#1E3D3D]/30">
                  <SelectValue placeholder="Choose a clinic" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((clinic: any) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      <div className="flex items-center gap-2">
                        {/* <Building2 className="h-4 w-4 text-[#1E3D3D]" /> */}
                        <span>{clinic.name}</span>
                        {clinic.city && (
                          <span className="text-xs text-gray-400">({clinic.city})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Step 2: Veterinarian Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#1E3D3D] dark:text-[#D2EFEC] flex items-center gap-2">
              {/* <Stethoscope className="h-4 w-4" /> */}
              Select Veterinarian
            </Label>
            {selectedClinicId ? (
              <Select value={selectedVetId} onValueChange={setSelectedVetId}>
                <SelectTrigger className="border-[#1E3D3D]/20 dark:border-[#1E3D3D]/30">
                  <SelectValue placeholder="Choose a veterinarian" />
                </SelectTrigger>
                <SelectContent>
                  {veterinarians.map((vet: any) => (
                    <SelectItem key={vet.id} value={vet.id}>
                      <div className="flex items-center gap-2">
                        {/* <Stethoscope className="h-4 w-4 text-[#1E3D3D]" /> */}
                        <span>Dr. {vet.firstName} {vet.lastName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={selectedVetId} onValueChange={() => { }}>
                <SelectTrigger className="border-[#1E3D3D]/20 dark:border-[#1E3D3D]/30">
                  <SelectValue placeholder="Choose a veterinarian" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 text-center text-sm text-gray-500">
                    Please select a clinic first
                  </div>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Step 3: Pet Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#1E3D3D] dark:text-[#D2EFEC] flex items-center gap-2">
              {/* <PawPrint className="h-4 w-4" /> */}
              Select Pet
            </Label>
            {pets.length === 0 ? (
              <p className="text-sm text-red-500">No pets registered. Please register a pet first.</p>
            ) : (
              <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                <SelectTrigger className="border-[#1E3D3D]/20 dark:border-[#1E3D3D]/30">
                  <SelectValue placeholder="Which pet needs attention?" />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((pet: any) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      <div className="flex items-center gap-2">
                        {/* <PawPrint className="h-4 w-4 text-[#1E3D3D]" /> */}
                        <span>{pet.name}</span>
                        {pet.species && (
                          <span className="text-xs text-gray-400">({pet.species})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Summary */}
          {isFormComplete && (
            <div className="p-4 rounded-lg bg-[#D2EFEC]/30 dark:bg-[#1E3D3D]/20 border border-[#1E3D3D]/10 space-y-2">
              <p className="text-xs font-semibold text-[#162A2A] dark:text-[#C2E6E2] uppercase tracking-wide">Call Summary</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#1E3D3D]/60 dark:text-[#D2EFEC]/60" />
                  <span className="text-sm text-[#1E3D3D] dark:text-[#D2EFEC]">{selectedClinic?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-[#1E3D3D]/60 dark:text-[#D2EFEC]/60" />
                  <span className="text-sm text-[#1E3D3D] dark:text-[#D2EFEC]">Dr. {selectedVet?.firstName} {selectedVet?.lastName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-[#D2EFEC] dark:bg-[#1E3D3D] text-[#1E3D3D] dark:text-[#D2EFEC] text-[10px]">
                      {selectedPet?.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-[#1E3D3D] dark:text-[#D2EFEC]">{selectedPet?.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Waiting for vet overlay */}
          {waitingSessionId && (
            <div className="p-6 rounded-lg bg-[#1E3D3D]/10 dark:bg-[#1E3D3D]/30 border border-[#1E3D3D]/20 text-center space-y-3">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-full border-4 border-[#1E3D3D] border-t-transparent animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-[#1E3D3D] dark:text-[#D2EFEC]">
                Waiting for Veterinarian...
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedVet ? `Dr. ${selectedVet.firstName} ${selectedVet.lastName}` : "The veterinarian"} has been notified. The video call will open automatically once they accept.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setWaitingSessionId(null)
                  setIsCallStarting(false)
                }}
                className="border-[#1E3D3D]/30 text-[#1E3D3D] dark:text-[#D2EFEC]"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Footer Info */}
          <div className="flex items-center justify-between pt-2 text-xs text-gray-500 dark:text-gray-400">
            <div></div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Available 24/7</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                <span>Premium only</span>
              </div>
            </div>
            <Button
              onClick={handleStartCall}
              disabled={!isFormComplete || isCallStarting || isVideoCallLoading || !!waitingSessionId}
              className="h-9 bg-[#1E3D3D] hover:bg-[#1E3D3D]/90 text-white text-sm font-semibold shadow-lg disabled:opacity-50"
            >
              <Video className="h-4 w-4 mr-2" />
              {waitingSessionId ? "Waiting..." : isCallStarting || isVideoCallLoading ? "Connecting..." : "Start Call"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
