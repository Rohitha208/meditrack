import Cookies from "js-cookie"
import * as signalR from "@microsoft/signalr"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
const LOG_PREFIX = "[VideoSignaling]"

const toErrorInfo = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }
  return { message: String(error) }
}

const resolveHubBaseUrl = () => {
  const trimmedUrl = API_URL.trim()
  if (!trimmedUrl) return trimmedUrl

  // Prevent mixed-content errors when the app is served over HTTPS.
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    try {
      const parsed = new URL(trimmedUrl)
      if (parsed.protocol === "http:") {
        parsed.protocol = "https:"
        return parsed.toString().replace(/\/$/, "")
      }
    } catch {
      // Keep original value if URL parsing fails.
    }
  }

  return trimmedUrl.replace(/\/$/, "")
}

type SignalingCallback = (...args: any[]) => void

let connection: signalR.HubConnection | null = null
let isConnecting = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

const pendingHandlers: { event: string; callback: SignalingCallback }[] = []

const registerPendingHandlers = () => {
  if (connection && pendingHandlers.length > 0) {
    pendingHandlers.forEach(({ event, callback }) => {
      connection!.on(event, callback)
    })
    pendingHandlers.length = 0
  }
}

export const videoSignalingService = {
  async init() {
    console.log(`${LOG_PREFIX} init() called`, {
      isConnecting,
      hasConnection: !!connection,
      connectionState: connection?.state,
      pageProtocol: typeof window !== "undefined" ? window.location.protocol : "server",
      rawApiUrl: API_URL,
    })

    if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
      registerPendingHandlers()
      return
    }

    if (isConnecting) return

    const token = Cookies.get("jwtToken")
    if (!token) {
      console.warn(`${LOG_PREFIX} No JWT token found.`)
      return
    }

    isConnecting = true

    const hubBaseUrl = resolveHubBaseUrl()
    const hubUrl = `${hubBaseUrl}/videoHub`
    console.log(`${LOG_PREFIX} Initializing SignalR connection`, {
      hubBaseUrl,
      hubUrl,
      tokenPresent: !!token,
    })

    connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => {
          const t = Cookies.get("jwtToken")
          console.log(`${LOG_PREFIX} accessTokenFactory invoked`, { tokenPresent: !!t })
          return t || ""
        },
        skipNegotiation: false,
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.ServerSentEvents |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (ctx) => {
          if (ctx.previousRetryCount >= MAX_RECONNECT_ATTEMPTS) return null
          return Math.min(1000 * Math.pow(2, ctx.previousRetryCount), 30000)
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connection.onclose((error) => {
      console.error(`${LOG_PREFIX} Connection closed`, {
        error: toErrorInfo(error),
        finalState: connection?.state,
      })
      isConnecting = false
      reconnectAttempts = 0
    })

    connection.onreconnecting((error) => {
      console.warn(`${LOG_PREFIX} onreconnecting`, {
        error: toErrorInfo(error),
        reconnectAttempts,
      })
      reconnectAttempts++
    })

    connection.onreconnected(() => {
      reconnectAttempts = 0
      registerPendingHandlers()
    })

    try {
      console.log(`${LOG_PREFIX} Calling connection.start()`)
      await connection.start()
      console.log(`${LOG_PREFIX} Connected`, { connectionId: connection.connectionId })
      isConnecting = false
      reconnectAttempts = 0
      registerPendingHandlers()
    } catch (err) {
      console.error(`${LOG_PREFIX} Connection error`, {
        error: toErrorInfo(err),
        attemptedHubUrl: hubUrl,
      })
      isConnecting = false
      connection = null
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
        console.log(`${LOG_PREFIX} Retrying init after start failure`, {
          retryDelayMs: delay,
          nextAttempt: reconnectAttempts + 1,
        })
        setTimeout(() => {
          reconnectAttempts++
          this.init()
        }, delay)
      }
    }
  },

  getConnectionId(): string | null {
    return connection?.connectionId ?? null
  },

  isConnected(): boolean {
    return connection?.state === signalR.HubConnectionState.Connected
  },

  // --- Hub method invocations ---

  async joinRoom(videoSessionId: string) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Not connected to video signaling hub")
    }
    await connection.invoke("JoinRoom", videoSessionId)
  },

  async leaveRoom(videoSessionId: string) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return
    try {
      await connection.invoke("LeaveRoom", videoSessionId)
    } catch {
      // Ignore errors on leave (connection may already be closed)
    }
  },

  async sendOffer(videoSessionId: string, targetConnectionId: string, offer: RTCSessionDescriptionInit) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return
    await connection.invoke("SendOffer", videoSessionId, targetConnectionId, offer)
  },

  async sendAnswer(videoSessionId: string, targetConnectionId: string, answer: RTCSessionDescriptionInit) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return
    await connection.invoke("SendAnswer", videoSessionId, targetConnectionId, answer)
  },

  async sendIceCandidate(videoSessionId: string, targetConnectionId: string, candidate: RTCIceCandidateInit) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return
    await connection.invoke("SendIceCandidate", videoSessionId, targetConnectionId, candidate)
  },

  // --- Event listeners ---

  on(event: string, callback: SignalingCallback) {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      connection.on(event, callback)
    } else {
      pendingHandlers.push({ event, callback })
      if (!isConnecting && (!connection || connection.state === signalR.HubConnectionState.Disconnected)) {
        this.init()
      }
    }
  },

  off(event: string, callback: SignalingCallback) {
    connection?.off(event, callback)
  },

  onUserJoined(callback: (connectionId: string, userId: string) => void) {
    this.on("UserJoined", callback)
  },

  onUserLeft(callback: (connectionId: string, userId: string) => void) {
    this.on("UserLeft", callback)
  },

  onReceiveOffer(callback: (senderConnectionId: string, offer: RTCSessionDescriptionInit) => void) {
    this.on("ReceiveOffer", callback)
  },

  onReceiveAnswer(callback: (senderConnectionId: string, answer: RTCSessionDescriptionInit) => void) {
    this.on("ReceiveAnswer", callback)
  },

  onReceiveIceCandidate(callback: (senderConnectionId: string, candidate: RTCIceCandidateInit) => void) {
    this.on("ReceiveIceCandidate", callback)
  },

  async stop() {
    if (connection) {
      try {
        await connection.stop()
      } catch {
        // Ignore stop errors
      }
      connection = null
      pendingHandlers.length = 0
      isConnecting = false
      reconnectAttempts = 0
    }
  },
}
