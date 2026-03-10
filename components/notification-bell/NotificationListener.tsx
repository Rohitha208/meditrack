"use client";

import { useEffect } from "react";
import { notificationService } from "@/services/Notification/notificationService";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const NotificationListener = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    const setupNotifications = async () => {
      // Wait a bit for NotificationInitializer to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isMounted) return;

      try {
        // Don't call init() here - let NotificationInitializer handle it
        // Just register the notification callback
        notificationService.onNotification((payload) => {
          console.log("[NotificationListener] Received notification:", payload);

          // Show toast notification with video call distinction
          const isVideoCall = payload.type === 'video_call_appointment';
          toast(isVideoCall ? `📹 ${payload.title || "Video Call Appointment"}` : (payload.title || "New notification"), {
            description: payload.message,
            duration: isVideoCall ? 8000 : 5000,
          });

          // Invalidate queries to refetch the updated notification list
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
          
          console.log("[NotificationListener] Queries invalidated");
        });

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

  return null;
};