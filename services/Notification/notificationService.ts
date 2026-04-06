import Cookies from "js-cookie";
import * as signalR from "@microsoft/signalr";

let connection: signalR.HubConnection | null = null;
let pendingCallbacks: ((n: any) => void)[] = [];
let pendingEventHandlers: { event: string; callback: (...args: any[]) => void }[] = [];
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const LOG_PREFIX = "[NotificationService]";

const toErrorInfo = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { message: String(error) };
};

const resolveHubBaseUrl = () => {
  const trimmedUrl = API_URL.trim();
  if (!trimmedUrl) return trimmedUrl;

  // Prevent mixed-content errors when the app is served over HTTPS.
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol === "http:") {
        parsed.protocol = "https:";
        return parsed.toString().replace(/\/$/, "");
      }
    } catch {
      // Keep original value if URL parsing fails.
    }
  }

  return trimmedUrl.replace(/\/$/, "");
};

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
    console.log(`${LOG_PREFIX} init() called`, {
      isConnecting,
      hasConnection: !!connection,
      connectionState: connection?.state,
      pageProtocol: typeof window !== "undefined" ? window.location.protocol : "server",
      rawApiUrl: API_URL,
    });

    if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
      console.log(`${LOG_PREFIX} Already connected or connecting`, { state: connection.state });
      registerPendingCallbacks();
      return;
    }

    if (isConnecting) {
      console.log(`${LOG_PREFIX} Connection already in progress`);
      return;
    }

    const token = Cookies.get("jwtToken");
    if (!token) {
      console.warn(`${LOG_PREFIX} No JWT token found in cookies.`);
      return;
    }

    const hubBaseUrl = resolveHubBaseUrl();
    const hubUrl = `${hubBaseUrl}/notificationHub`;
    console.log(`${LOG_PREFIX} Initializing SignalR connection`, {
      hubBaseUrl,
      hubUrl,
      tokenPresent: !!token,
    });
    isConnecting = true;

    connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => {
          const t = Cookies.get("jwtToken");
          console.log(`${LOG_PREFIX} accessTokenFactory invoked`, { tokenPresent: !!t });
          return t || "";
        },
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Custom reconnection delay strategy
          if (retryContext.previousRetryCount >= MAX_RECONNECT_ATTEMPTS) {
            console.error(`${LOG_PREFIX} Max reconnection attempts reached`);
            return null; // Stop reconnecting
          }
          const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          console.log(`${LOG_PREFIX} Reconnecting scheduled`, {
            delayMs: delay,
            attempt: retryContext.previousRetryCount + 1,
            elapsedMs: retryContext.elapsedMilliseconds,
            retryReason: toErrorInfo(retryContext.retryReason),
          });
          return delay;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Connection event handlers
    connection.onclose((error) => {
      console.error(`${LOG_PREFIX} Connection closed`, {
        error: toErrorInfo(error),
        finalState: connection?.state,
      });
      isConnecting = false;
      reconnectAttempts = 0;
    });

    connection.onreconnecting((error) => {
      console.warn(`${LOG_PREFIX} onreconnecting`, {
        error: toErrorInfo(error),
        reconnectAttempts,
      });
      reconnectAttempts++;
    });

    connection.onreconnected((connectionId) => {
      console.log(`${LOG_PREFIX} Reconnected`, { connectionId });
      reconnectAttempts = 0;
      // Re-register callbacks after reconnection
      registerPendingCallbacks();
    });

    try {
      console.log(`${LOG_PREFIX} Calling connection.start()`);
      await connection.start();
      console.log(`${LOG_PREFIX} SignalR connected successfully`, { connectionId: connection.connectionId });
      isConnecting = false;
      reconnectAttempts = 0;
      
      // Register any callbacks that were registered before connection was established
      registerPendingCallbacks();
    } catch (err) {
      console.error(`${LOG_PREFIX} SignalR connection error`, {
        error: toErrorInfo(err),
        attemptedHubUrl: hubUrl,
      });
      isConnecting = false;
      connection = null;
      
      // Retry connection after a delay
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const retryDelay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`${LOG_PREFIX} Retrying init after start failure`, {
          retryDelayMs: retryDelay,
          nextAttempt: reconnectAttempts + 1,
        });
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