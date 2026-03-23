import Cookies from "js-cookie";
import * as signalR from "@microsoft/signalr";

let connection: signalR.HubConnection | null = null;
let pendingCallbacks: ((n: any) => void)[] = [];
let pendingEventHandlers: { event: string; callback: (...args: any[]) => void }[] = [];
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const registerPendingCallbacks = () => {
  if (connection && pendingCallbacks.length > 0) {
    console.log(`[NotificationService] Registering ${pendingCallbacks.length} pending callbacks`);
    pendingCallbacks.forEach(callback => {
      connection!.on("ReceiveNotification", callback);
    });
    pendingCallbacks = [];
  }
  if (connection && pendingEventHandlers.length > 0) {
    pendingEventHandlers.forEach(({ event, callback }) => {
      connection!.on(event, callback);
    });
    pendingEventHandlers = [];
  }
};

export const notificationService = {
  async init() {
    if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
      console.log("[NotificationService] Already connected or connecting, state:", connection.state);
      registerPendingCallbacks();
      return;
    }

    if (isConnecting) {
      console.log("[NotificationService] Connection already in progress");
      return;
    }

    const token = Cookies.get("jwtToken");
    if (!token) {
      console.warn("[NotificationService] No JWT token found in cookies.");
      return;
    }

    console.log("[NotificationService] Initializing SignalR connection to:", API_URL);
    isConnecting = true;

    connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/notificationHub`, {
        accessTokenFactory: () => {
          const t = Cookies.get("jwtToken");
          console.log("[SignalR] Providing auth token:", !!t);
          return t || "";
        },
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Custom reconnection delay strategy
          if (retryContext.previousRetryCount >= MAX_RECONNECT_ATTEMPTS) {
            console.error("[NotificationService] Max reconnection attempts reached");
            return null; // Stop reconnecting
          }
          const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          console.log(`[NotificationService] Reconnecting in ${delay}ms (attempt ${retryContext.previousRetryCount + 1})`);
          return delay;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Connection event handlers
    connection.onclose((error) => {
      console.error("[NotificationService] Connection closed:", error);
      isConnecting = false;
      reconnectAttempts = 0;
    });

    connection.onreconnecting((error) => {
      console.warn("[NotificationService] Reconnecting...", error);
      reconnectAttempts++;
    });

    connection.onreconnected((connectionId) => {
      console.log("[NotificationService] Reconnected! Connection ID:", connectionId);
      reconnectAttempts = 0;
      // Re-register callbacks after reconnection
      registerPendingCallbacks();
    });

    try {
      await connection.start();
      console.log("[NotificationService] SignalR connected successfully! Connection ID:", connection.connectionId);
      isConnecting = false;
      reconnectAttempts = 0;
      
      // Register any callbacks that were registered before connection was established
      registerPendingCallbacks();
    } catch (err) {
      console.error("[NotificationService] SignalR connection error:", err);
      isConnecting = false;
      connection = null;
      
      // Retry connection after a delay
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const retryDelay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`[NotificationService] Retrying connection in ${retryDelay}ms...`);
        setTimeout(() => {
          reconnectAttempts++;
          this.init();
        }, retryDelay);
      }
    }
  },

  onNotification(callback: (n: any) => void) {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      // Connection is ready, register immediately
      console.log("[NotificationService] Registering notification callback immediately");
      connection.on("ReceiveNotification", callback);
    } else {
      // Connection not ready yet, store callback to register later
      console.log("[NotificationService] Connection not ready (state:", connection?.state, "), storing callback for later registration");
      pendingCallbacks.push(callback);
      
      // Try to initialize if not already connecting
      if (!isConnecting && (!connection || connection.state === signalR.HubConnectionState.Disconnected)) {
        console.log("[NotificationService] Initiating connection...");
        this.init();
      }
    }
  },

  // Method to manually send a test notification (for debugging)
  async sendTestNotification() {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      try {
        await connection.invoke("SendNotification", {
          title: "Test Notification",
          message: "This is a test notification from the client",
          type: "info"
        });
        console.log("[NotificationService] Test notification sent");
      } catch (err) {
        console.error("[NotificationService] Error sending test notification:", err);
      }
    } else {
      console.warn("[NotificationService] Cannot send notification - not connected");
    }
  },

  // Get current connection state
  getConnectionState() {
    return connection?.state || "Disconnected";
  },

  // Check if connected
  isConnected() {
    return connection?.state === signalR.HubConnectionState.Connected;
  },

  // Register a handler for any SignalR event (e.g. IncomingVideoCall, CallAccepted)
  onEvent(event: string, callback: (...args: any[]) => void) {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      connection.on(event, callback);
    } else {
      pendingEventHandlers.push({ event, callback });
      if (!isConnecting && (!connection || connection.state === signalR.HubConnectionState.Disconnected)) {
        this.init();
      }
    }
  },

  stop() {
    if (connection) {
      console.log("[NotificationService] Stopping connection...");
      connection.stop().then(() => {
        console.log("[NotificationService] Connection stopped");
        connection = null;
        pendingCallbacks = [];
        isConnecting = false;
        reconnectAttempts = 0;
      }).catch(err => {
        console.error("[NotificationService] Error stopping connection:", err);
      });
    }
  },

};