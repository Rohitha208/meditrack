"use client"

import React, { useState } from "react"
import { Phone, Video, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useStartVideoMutation } from "@/queries/video/start-video"
import { toast } from "sonner"

interface EmergencyVideoCallProps {
  vetId: string
  patientId: string
  vetName?: string
  className?: string
}

export default function EmergencyVideoCall({ 
  vetId, 
  patientId, 
  vetName = "Veterinarian",
  className 
}: EmergencyVideoCallProps) {
  const [isInitiating, setIsInitiating] = useState(false)
  const { mutate: startVideoCall, isPending } = useStartVideoMutation({
  onSuccess: (data) => {
    const videoSessionId = data.videoSessionId
    const videoCallUrl = `/video-call/${videoSessionId}`

    // ✅ Navigate the CLIENT to the video call page
    window.location.href = videoCallUrl

    // OR if you want to open in a new tab for the client too:
    // window.open(videoCallUrl, '_blank', 'width=1200,height=800')
  },
  onError: (error) => {
    toast.error("Failed to start video call", {
      description: error.message || "Please try again",
      duration: 5000,
    })
  }
})

  const handleStartVideoCall = () => {
  if (isPending) return
  startVideoCall({ userId: vetId, patientId })
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-red-900">Emergency Video Call</h3>
          <p className="text-sm text-red-700">Connect immediately with {vetName}</p>
        </div>
      </div>
      
      <Button
        onClick={handleStartVideoCall}
        disabled={isInitiating || isPending}
        className="w-full bg-red-600 hover:bg-red-700 text-white"
        size="lg"
      >
        {isInitiating || isPending ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Connecting...
          </>
        ) : (
          <>
            <Video className="h-4 w-4 mr-2" />
            Start Emergency Video Call
          </>
        )}
      </Button>
      
      <p className="text-xs text-red-600 mt-2 text-center">
        For urgent medical emergencies only
      </p>
    </div>
  )
}
