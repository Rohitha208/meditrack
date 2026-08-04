"use client"

import { useEffect, useState, useCallback } from "react"
import { notificationService } from "@/services/Notification/notificationService"
import IncomingCallDialog from "./IncomingCallDialog"

interface IncomingCallData {
  videoSessionId: string
  clientName?: string
  patientName?: string
  createdAt?: string
}

// Track sessions initiated by the current user so we don't show
// the incoming-call dialog to the caller themselves.
const initiatedSessions = new Set<string>()

export function markSessionAsInitiated(videoSessionId: string) {
  initiatedSessions.add(videoSessionId)
}

/**
 * Global listener for video call SignalR events.
 * Mount once in the root layout. Uses the existing notificationHub connection
 * since VideoCallNotifier sends events through NotificationHub.
 */
export default function VideoCallListener() {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)

  // Listen for IncomingVideoCall (sent to vet when client starts a call)
  useEffect(() => {
    let mounted = true

    const setup = async () => {
      // Small delay to let NotificationInitializer connect first
      await new Promise((r) => setTimeout(r, 200))
      if (!mounted) return

      notificationService.onNotification((payload: any) => {
        // The backend sends "IncomingVideoCall" via NotificationHub
        // but NotificationListener only handles "ReceiveNotification".
        // We need a separate handler. Check if it's a video call type.
      })
    }

    setup()
    return () => { mounted = false }
  }, [])

  // Register direct SignalR event handlers for video call events
  useEffect(() => {
    let mounted = true

    const setupVideoCallHandlers = async () => {
      await new Promise((r) => setTimeout(r, 300))
      if (!mounted) return

      // Access the underlying notification service connection to register
      // handlers for IncomingVideoCall and CallAccepted events
      // These events are sent by VideoCallNotifier through NotificationHub
      const registerHandlers = () => {
        try {
          // IncomingVideoCall — vet receives this when client initiates a call
          notificationService.onEvent?.("IncomingVideoCall", (data: IncomingCallData) => {
            if (!mounted) return
            // Skip if this user is the one who initiated the call
            if (initiatedSessions.has(data.videoSessionId)) {
              console.log("[VideoCallListener] Ignoring own initiated call:", data.videoSessionId)
              initiatedSessions.delete(data.videoSessionId)
              return
            }
            console.log("[VideoCallListener] Incoming video call:", data)
            setIncomingCall(data)
          })

          // CallAccepted — client receives this when vet accepts
          notificationService.onEvent?.("CallAccepted", (data: { videoSessionId: string; userId: string }) => {
            if (!mounted) return
            console.log("[VideoCallListener] Call accepted:", data)
            // Dispatch a custom event that emergency-video-call.tsx can listen to
            window.dispatchEvent(
              new CustomEvent("videocall:accepted", { detail: data })
            )
          })
        } catch {
          // onEvent may not be available yet, retry
          setTimeout(registerHandlers, 1000)
        }
      }

      registerHandlers()
    }

    setupVideoCallHandlers()
    return () => { mounted = false }
  }, [])

  const handleAccepted = useCallback((videoSessionId: string) => {
    setIncomingCall(null)
    // Open video call window for the vet
    window.open(
      `/video-call/${videoSessionId}`,
      `videocall_${videoSessionId}`,
      "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no"
    )
  }, [])

  const handleRejected = useCallback(() => {
    setIncomingCall(null)
  }, [])

  if (!incomingCall) return null

  return (
    <IncomingCallDialog
      callData={incomingCall}
      onAccepted={handleAccepted}
      onRejected={handleRejected}
    />
  )
}
