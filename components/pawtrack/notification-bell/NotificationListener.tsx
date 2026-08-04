"use client";

import { useEffect, useState } from "react";
import { notificationService } from "@/services/Notification/notificationService";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import IncomingCallDialog from "@/components/pawtrack/video-call/IncomingCallDialog";

export const NotificationListener = () => {
  const queryClient = useQueryClient();
  const [incomingCall, setIncomingCall] = useState<{
    videoSessionId: string
    clientName?: string
    patientName?: string
    createdAt?: string
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupNotifications = async () => {
      // Wait a bit for NotificationInitializer to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isMounted) return;

      try {
        // Don't call init() here - let NotificationInitializer handle it
        // Just register notification callback
        notificationService.onNotification((payload) => {
          console.log("[NotificationListener] Received notification:", payload);

          // Show toast notification with video call distinction
          const isVideoCall = payload.type === 'video_call_appointment';
          toast(isVideoCall ? `📹 ${payload.title || "Video Call Appointment"}` : (payload.title || "New notification"), {
            description: payload.message,
            duration: isVideoCall ? 8000 : 5000,
          });

          // Invalidate queries to refetch updated notification list
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
          
          console.log("[NotificationListener] Queries invalidated");
        });

        // Listen for incoming video call notifications
        const handleIncomingCall = (data: any) => {
          console.log('[NotificationListener] Received call notification:', data)
          
          if (data.type === 'IncomingVideoCall') {
            setIncomingCall({
              videoSessionId: data.videoSessionId,
              clientName: data.clientName || data.callerName || 'Unknown Caller',
              patientName: data.patientName,
              createdAt: data.createdAt
            })
          }
        }

        // Register for incoming call events
        notificationService.onEvent('IncomingVideoCall', handleIncomingCall);

        // Log connection state for debugging
        console.log("[NotificationListener] Connection state:", notificationService.getConnectionState());
      } catch (error) {
        console.error("[NotificationListener] Setup error:", error);
      }
    };

    setupNotifications();

    return () => {
      isMounted = false;
    };
  }, [queryClient]);

  const handleCallAccepted = (videoSessionId: string) => {
    // Navigate to video call page
    const videoCallUrl = `/video-call/${videoSessionId}`
    const newWindow = window.open(videoCallUrl, '_blank', 'width=1200,height=800')
    
    // Fallback if popup blocked
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      console.warn('[NotificationListener] Popup blocked, navigating in same window')
      toast.info('Opening video call in current window (popup blocked)', {
        duration: 3000
      })
      window.location.href = videoCallUrl
    }
    
    setIncomingCall(null)
  }

  const handleCallRejected = () => {
    setIncomingCall(null)
  }

  // Render incoming call dialog if there is one
  if (incomingCall) {
    return (
      <IncomingCallDialog
        callData={incomingCall}
        onAccepted={handleCallAccepted}
        onRejected={handleCallRejected}
      />
    );
  }

  return null;
};