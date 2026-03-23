import Cookies from "js-cookie"
import * as signalR from "@microsoft/signalr"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

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
    if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
      registerPendingHandlers()
      return
    }

    if (isConnecting) return

    const token = Cookies.get("jwtToken")
    if (!token) {
      console.warn("[VideoSignaling] No JWT token found.")
      return
    }

    isConnecting = true

    connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/videoHub`, {
        accessTokenFactory: () => Cookies.get("jwtToken") || "",
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

    connection.onclose(() => {
      isConnecting = false
      reconnectAttempts = 0
    })

    connection.onreconnecting(() => {
      reconnectAttempts++
    })

    connection.onreconnected(() => {
      reconnectAttempts = 0
      registerPendingHandlers()
    })

    try {
      await connection.start()
      console.log("[VideoSignaling] Connected, ID:", connection.connectionId)
      isConnecting = false
      reconnectAttempts = 0
      registerPendingHandlers()
    } catch (err) {
      console.error("[VideoSignaling] Connection error:", err)
      isConnecting = false
      connection = null
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
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
