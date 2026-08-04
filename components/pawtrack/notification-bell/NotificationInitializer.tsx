"use client";
import { useEffect } from "react";
import { notificationService } from "@/services/Notification/notificationService";

export function NotificationInitializer() {
  useEffect(() => {
    console.log("[UI] Initializing notifications");
    notificationService.init();

    // No stop() needed for SignalR global connection
  }, []);

  return null;
}
