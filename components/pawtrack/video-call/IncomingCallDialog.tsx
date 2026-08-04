"use client"

import { useState, useEffect, useRef } from "react"
import { Phone, PhoneOff, PawPrint, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAcceptVideoMutation } from "@/queries/video/accept-video"
import { toast } from "sonner"

interface IncomingCallData {
  videoSessionId: string
  clientName?: string
  patientName?: string
  createdAt?: string
}

interface IncomingCallDialogProps {
  callData: IncomingCallData
  onAccepted: (videoSessionId: string) => void
  onRejected: () => void
}

const CALL_TIMEOUT_MS = 60000 // 60 seconds

export default function IncomingCallDialog({ callData, onAccepted, onRejected }: IncomingCallDialogProps) {
  const [isAccepting, setIsAccepting] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { mutate: acceptVideoCall } = useAcceptVideoMutation({
    onSuccess: (data) => {
      setIsAccepting(false)
      toast.success("Call accepted", { description: "Joining video call..." })
      onAccepted(data?.videoSessionId || callData.videoSessionId)
    },
    onError: (error) => {
      setIsAccepting(false)
      toast.error("Failed to accept call", { description: error.message || "Please try again." })
    },
  })

  // Auto-dismiss after timeout
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      onRejected()
    }, CALL_TIMEOUT_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [onRejected])

  const handleAccept = () => {
    setIsAccepting(true)
    acceptVideoCall({ videoSessionId: callData.videoSessionId })
  }

  const handleReject = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    onRejected()
  }

  const clientInitial = callData.clientName?.[0]?.toUpperCase() || "?"

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-[#1E3D3D]/20 p-8 max-w-sm w-full mx-4 text-center space-y-6">
        {/* Animated avatar ring */}
        <div className="relative mx-auto w-24 h-24">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="bg-[#1E3D3D] text-[#D2EFEC] text-2xl font-bold">
              {clientInitial}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-40" />
          <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-pulse" />
        </div>

        {/* Call info */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">
            Incoming Video Call
          </h2>
          {callData.clientName && (
            <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
              <User className="h-4 w-4" />
              <span className="font-medium">{callData.clientName}</span>
            </div>
          )}
          {callData.patientName && (
            <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
              <PawPrint className="h-4 w-4" />
              <span>Patient: {callData.patientName}</span>
            </div>
          )}
        </div>

        {/* Accept / Reject buttons */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <Button
            onClick={handleReject}
            disabled={isAccepting}
            className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            onClick={handleAccept}
            disabled={isAccepting}
            className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg"
          >
            {isAccepting ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Phone className="h-6 w-6" />
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-400">
          {isAccepting ? "Connecting..." : "Call will auto-dismiss in 60 seconds"}
        </p>
      </div>
    </div>
  )
}
