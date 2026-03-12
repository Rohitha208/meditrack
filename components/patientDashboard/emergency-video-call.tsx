"use client"

import { useContext, useState } from "react"
import { PatientDashboardContext } from "@/components/patientDashboard/PatientDashboardProvider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Video, Phone, Shield, Clock, AlertTriangle, PawPrint } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useCreateNotification } from "@/queries/notifications/create-notification"
import { useStartVideoMutation } from "@/queries/video/start-video"
import { toast } from "sonner"

export default function EmergencyVideoCall() {
  const { pets, clientData, isClient, clientId, veterinarianId } = useContext(PatientDashboardContext)
  const [selectedPetId, setSelectedPetId] = useState<string>("")
  const [emergencyNotes, setEmergencyNotes] = useState("")
  const [isCallStarting, setIsCallStarting] = useState(false)
  const { mutate: createNotification } = useCreateNotification()

  const { mutate: startVideoCall, isPending: isVideoCallLoading } = useStartVideoMutation({
    onSuccess: (data) => {
      toast.success("Video call started successfully", {
        description: "Connecting you with a veterinarian..."
      })

      // Open video call in a new window with the returned session data
      if (data?.sessionUrl) {
        window.open(
          data.sessionUrl,
          `videocall_emergency`,
          "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no"
        )
      } else {
        // Fallback to original URL structure if no sessionUrl returned
        window.open(
          `/video-call/emergency-${clientId}-${Date.now()}`,
          `videocall_emergency`,
          "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no"
        )
      }
    },
    onError: (error) => {
      toast.error("Failed to start video call", {
        description: error.message || "Please try again or contact support"
      })
    }
  })

  const isPremium = clientData?.isPremium === true

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

  const handleStartCall = () => {
    if (!selectedPetId) {
      toast("Please select a pet", { description: "Choose which pet needs emergency attention." })
      return
    }

    if (!veterinarianId) {
      toast.error("No veterinarian assigned", { 
        description: "Please contact the clinic to assign a veterinarian." 
      })
      return
    }
    setIsCallStarting(true)
    // Start the video call with the assigned veterinarian as userId and selected pet as patientId
    startVideoCall({
      userId: veterinarianId,
      patientId: selectedPetId
    })

    // Send notification to the assigned veterinarian about the emergency call
    createNotification({
      userId: veterinarianId,
      type: "video_call_appointment",
      title: "Emergency Video Call Started",
      message: `Emergency video call requested for ${selectedPet?.name || "a pet"}. ${emergencyNotes ? `Notes: ${emergencyNotes}` : ""}`,
      data: JSON.stringify({
        patientId: selectedPetId,
        clientId,
        isEmergency: true,
        notes: emergencyNotes,
      }),
    })

    setIsCallStarting(false)
  }

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
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-full shrink-0">
              <AlertTriangle className="h-6 w-6 text-[#D2EFEC]" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">When to use Emergency Video Call</h3>
              <p className="text-[#D2EFEC]/80 text-sm">
                Use this for urgent situations like sudden injuries, poisoning, difficulty breathing,
                or any condition that needs immediate veterinary guidance. A veterinarian will connect
                with you as soon as possible.
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
            Connect with an available veterinarian instantly via video call
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Pet Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#1E3D3D] dark:text-[#D2EFEC]">
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
                        <PawPrint className="h-4 w-4 text-[#1E3D3D]" />
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

          {/* Selected Pet Info */}
          {selectedPet && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#D2EFEC]/30 dark:bg-[#1E3D3D]/20 border border-[#1E3D3D]/10">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[#D2EFEC] dark:bg-[#1E3D3D] text-[#1E3D3D] dark:text-[#D2EFEC]">
                  {selectedPet.name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-[#1E3D3D] dark:text-[#D2EFEC]">{selectedPet.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {[selectedPet.species, selectedPet.breed].filter(Boolean).join(" - ")}
                </p>
              </div>
            </div>
          )}

          {/* Emergency Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#1E3D3D] dark:text-[#D2EFEC]">
              Describe the Emergency (Optional)
            </Label>
            <Textarea
              value={emergencyNotes}
              onChange={(e) => setEmergencyNotes(e.target.value)}
              placeholder="Briefly describe what's happening with your pet..."
              className="min-h-[80px] border-[#1E3D3D]/20 dark:border-[#1E3D3D]/30"
            />
          </div>

          {/* Start Call Button */}
          <Button
            onClick={handleStartCall}
            disabled={pets.length === 0 || !selectedPetId || isCallStarting || isVideoCallLoading}
            className="w-full h-14 bg-[#1E3D3D] hover:bg-[#1E3D3D]/90 text-white text-base font-semibold shadow-lg"
          >
            <Video className="h-5 w-5 mr-3" />
            {isCallStarting || isVideoCallLoading ? "Connecting..." : "Start Emergency Video Call"}
          </Button>

          {/* Footer Info */}
          <div className="flex items-center justify-center gap-4 pt-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Available 24/7</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              <span>Instant connection</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              <span>Premium only</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
