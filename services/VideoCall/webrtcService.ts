// ICE servers: Google STUN for dev. Add Coturn TURN server for production.
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
]

export type DataChannelMessage =
  | { type: "camera-state"; enabled: boolean }
  | { type: "mic-state"; enabled: boolean }

export type WebRTCCallbacks = {
  onRemoteStream?: (stream: MediaStream) => void
  onIceCandidate?: (candidate: RTCIceCandidate) => void
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void
  onDataChannelMessage?: (message: DataChannelMessage) => void
}

export class WebRTCService {
  private pc: RTCPeerConnection | null = null
  private callbacks: WebRTCCallbacks = {}
  private iceCandidateQueue: RTCIceCandidateInit[] = []
  private hasRemoteDescription = false
  private dataChannel: RTCDataChannel | null = null

  constructor(
    callbacks: WebRTCCallbacks,
    iceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS
  ) {
    this.callbacks = callbacks
    this.pc = new RTCPeerConnection({ iceServers })

    // Create data channel (initiator side — callee receives via ondatachannel)
    this.dataChannel = this.pc.createDataChannel("metadata")
    this.setupDataChannel(this.dataChannel)

    // Listen for data channel from remote peer (callee side)
    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel
      this.setupDataChannel(this.dataChannel)
    }

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.callbacks.onIceCandidate) {
        this.callbacks.onIceCandidate(event.candidate)
      }
    }

    this.pc.ontrack = (event) => {
      if (event.streams[0] && this.callbacks.onRemoteStream) {
        this.callbacks.onRemoteStream(event.streams[0])
      }
    }

    this.pc.onconnectionstatechange = () => {
      if (this.pc && this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(this.pc.connectionState)
      }
    }

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc && this.callbacks.onIceConnectionStateChange) {
        this.callbacks.onIceConnectionStateChange(this.pc.iceConnectionState)
      }
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as DataChannelMessage
        this.callbacks.onDataChannelMessage?.(msg)
      } catch {
        console.warn("[WebRTC] Invalid data channel message:", event.data)
      }
    }
  }

  sendDataMessage(message: DataChannelMessage) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(JSON.stringify(message))
    }
  }

  addLocalStream(stream: MediaStream) {
    if (!this.pc) return
    stream.getTracks().forEach((track) => {
      this.pc!.addTrack(track, stream)
    })
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error("PeerConnection not initialized")
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    return offer
  }

  async createAnswer(remoteOffer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error("PeerConnection not initialized")
    await this.pc.setRemoteDescription(new RTCSessionDescription(remoteOffer))
    this.hasRemoteDescription = true
    await this.flushIceCandidateQueue()
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    return answer
  }

  async setRemoteAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) throw new Error("PeerConnection not initialized")
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer))
    this.hasRemoteDescription = true
    await this.flushIceCandidateQueue()
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) return
    // Queue candidates until remote description is set
    if (!this.hasRemoteDescription) {
      this.iceCandidateQueue.push(candidate)
      return
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      console.warn("[WebRTC] Failed to add ICE candidate:", err)
    }
  }

  private async flushIceCandidateQueue() {
    if (!this.pc) return
    for (const candidate of this.iceCandidateQueue) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn("[WebRTC] Failed to add queued ICE candidate:", err)
      }
    }
    this.iceCandidateQueue = []
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState ?? null
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.pc
  }

  close() {
    if (this.dataChannel) {
      this.dataChannel.close()
      this.dataChannel = null
    }
    if (this.pc) {
      this.pc.close()
      this.pc = null
    }
    this.iceCandidateQueue = []
    this.hasRemoteDescription = false
  }
}
