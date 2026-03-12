"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  Maximize2,
  Minimize2,
  MessageSquare,
  Settings,
  Users,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import VideoCallChat from "./VideoCallChat"
import VideoCallSettings from "./VideoCallSettings"
import { useEndVideoMutation } from "@/queries/video/end-video"
import { videoSignalingService } from "@/services/VideoCall/videoSignalingService"
import { WebRTCService } from "@/services/VideoCall/webrtcService"

interface VideoCallRoomProps {
  appointmentId: string
}

export default function VideoCallRoom({ appointmentId }: VideoCallRoomProps) {
  // Media states
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "ended">("connecting")
  const [callDuration, setCallDuration] = useState(0)
  
  // End video mutation
  const { mutate: endVideoCall, isPending: isEndingCall } = useEndVideoMutation({
    onSuccess: (data) => {
      console.log("Video call ended successfully:", data)
    },
    onError: (error) => {
      console.error("Failed to end video call:", error)
    }
  })

  // Refs for video elements
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const webrtcRef = useRef<WebRTCService | null>(null)
  const peerConnectionIdRef = useRef<string | null>(null)
  const [hasRemoteStream, setHasRemoteStream] = useState(false)

  const participantName = "Participant"
  const localName = "You"

  // Initialize local media + SignalR signaling + WebRTC
  useEffect(() => {
    let mounted = true

    const initCall = async () => {
      // 1. Get local media
      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        } catch {
          console.error("[VideoCallRoom] Cannot access any media devices")
        }
      }

      if (!mounted) {
        stream?.getTracks().forEach((t) => t.stop())
        return
      }

      if (stream) {
        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      }

      // 2. Connect to video signaling hub
      await videoSignalingService.init()
      if (!mounted) return

      // 3. Create WebRTC peer connection
      const webrtc = new WebRTCService({
        onRemoteStream: (remoteStream) => {
          if (!mounted) return
          console.log("[VideoCallRoom] Remote stream received")
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream
          }
          setHasRemoteStream(true)
          setCallStatus("connected")
        },
        onIceCandidate: (candidate) => {
          if (peerConnectionIdRef.current) {
            videoSignalingService.sendIceCandidate(
              appointmentId,
              peerConnectionIdRef.current,
              candidate.toJSON()
            )
          }
        },
        onConnectionStateChange: (state) => {
          console.log("[VideoCallRoom] Connection state:", state)
          if (state === "disconnected" || state === "failed") {
            if (mounted) setHasRemoteStream(false)
          }
        },
      })
      webrtcRef.current = webrtc

      // Add local stream to peer connection
      if (stream) {
        webrtc.addLocalStream(stream)
      }

      // 4. Register signaling event handlers

      // When a peer joins the room — we create an offer (we are the initiator)
      videoSignalingService.onUserJoined(async (connectionId) => {
        if (!mounted) return
        console.log("[VideoCallRoom] Peer joined:", connectionId)
        peerConnectionIdRef.current = connectionId
        try {
          const offer = await webrtc.createOffer()
          await videoSignalingService.sendOffer(appointmentId, connectionId, offer)
        } catch (err) {
          console.error("[VideoCallRoom] Error creating/sending offer:", err)
        }
      })

      // When we receive an offer (we are the callee)
      videoSignalingService.onReceiveOffer(async (senderConnectionId, offer) => {
        if (!mounted) return
        console.log("[VideoCallRoom] Received offer from:", senderConnectionId)
        peerConnectionIdRef.current = senderConnectionId
        try {
          const answer = await webrtc.createAnswer(offer)
          await videoSignalingService.sendAnswer(appointmentId, senderConnectionId, answer)
        } catch (err) {
          console.error("[VideoCallRoom] Error creating/sending answer:", err)
        }
      })

      // When we receive an answer to our offer
      videoSignalingService.onReceiveAnswer(async (senderConnectionId, answer) => {
        if (!mounted) return
        console.log("[VideoCallRoom] Received answer from:", senderConnectionId)
        try {
          await webrtc.setRemoteAnswer(answer)
        } catch (err) {
          console.error("[VideoCallRoom] Error setting remote answer:", err)
        }
      })

      // When we receive an ICE candidate
      videoSignalingService.onReceiveIceCandidate(async (_senderConnectionId, candidate) => {
        if (!mounted) return
        try {
          await webrtc.addIceCandidate(candidate)
        } catch (err) {
          console.error("[VideoCallRoom] Error adding ICE candidate:", err)
        }
      })

      // When peer leaves
      videoSignalingService.onUserLeft((connectionId) => {
        if (!mounted) return
        console.log("[VideoCallRoom] Peer left:", connectionId)
        setHasRemoteStream(false)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null
        }
      })

      // 5. Join the signaling room
      try {
        await videoSignalingService.joinRoom(appointmentId)
        console.log("[VideoCallRoom] Joined room:", appointmentId)
      } catch (err) {
        console.error("[VideoCallRoom] Error joining room:", err)
      }
    }

    initCall()

    // Cleanup on unmount / window close
    const cleanup = () => {
      mounted = false
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      screenStreamRef.current?.getTracks().forEach((track) => track.stop())
      webrtcRef.current?.close()
      webrtcRef.current = null
      videoSignalingService.leaveRoom(appointmentId)
      if (timerRef.current) clearInterval(timerRef.current)
    }

    const handleBeforeUnload = () => cleanup()
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      cleanup()
    }
  }, [appointmentId])

  // Call duration timer
  useEffect(() => {
    if (callStatus === "connected") {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [callStatus])

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled
      })
    }
    setIsMicOn((prev) => !prev)
  }, [])

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled
      })
    }
    setIsCameraOn((prev) => !prev)
  }, [])

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop())
      screenStreamRef.current = null
      setIsScreenSharing(false)
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        })
        screenStreamRef.current = screenStream
        // Listen for user ending screen share from browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false)
          screenStreamRef.current = null
        }
        setIsScreenSharing(true)
      } catch (err) {
        console.error("Failed to start screen sharing:", err)
      }
    }
  }, [isScreenSharing])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // End call
  const endCall = useCallback(() => {
    if (!appointmentId) {
      console.error("No appointment ID provided!")
      return
    }

    // Stop local media tracks
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    screenStreamRef.current?.getTracks().forEach((track) => track.stop())

    // Close WebRTC peer connection
    webrtcRef.current?.close()
    webrtcRef.current = null

    // Leave signaling room
    videoSignalingService.leaveRoom(appointmentId)

    // Clear timer
    if (timerRef.current) clearInterval(timerRef.current)

    // Update UI state
    setCallStatus("ended")
    setHasRemoteStream(false)
    endVideoCall({
      videoSessionId: appointmentId
    })
  }, [endVideoCall, appointmentId])

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Call ended screen
  if (callStatus === "ended") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a1a1a]">
        <div className="text-center space-y-6">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-red-500/20">
            <PhoneOff className="h-10 w-10 text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">Call Ended</h2>
            <p className="text-gray-400 mt-2">
              Duration: {formatDuration(callDuration)}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => window.close()}
              className="bg-[#1E3D3D] hover:bg-[#1E3D3D]/90 text-white px-8"
            >
              Close Window
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-[#1E3D3D] text-[#D2EFEC] hover:bg-[#1E3D3D] hover:text-white px-8"
            >
              Rejoin
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div ref={containerRef} className="flex flex-col h-screen bg-[#0a1a1a] overflow-hidden select-none">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0f2626] border-b border-[#1E3D3D]/30">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D2EFEC]">
              <Video className="h-4 w-4 text-[#1E3D3D]" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">PawTrack Video Consultation</h1>
              <p className="text-xs text-gray-400">Appointment #{appointmentId.slice(0, 8)}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Call duration */}
            {callStatus === "connected" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E3D3D]/50 border border-[#1E3D3D]/30">
                <Clock className="h-3.5 w-3.5 text-[#D2EFEC]" />
                <span className="text-xs font-mono text-[#D2EFEC]">{formatDuration(callDuration)}</span>
              </div>
            )}

            {/* Connection status */}
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${callStatus === "connected" ? "bg-green-400 animate-pulse" : "bg-yellow-400 animate-pulse"}`} />
              <span className="text-xs text-gray-400">
                {callStatus === "connecting" ? "Connecting..." : "Connected"}
              </span>
            </div>

            {/* Participants count */}
            <div className="flex items-center gap-1 text-gray-400">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs">2</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Video Area */}
          <div className="flex-1 relative">
            {/* Remote Video (Main) */}
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f1f1f]">
              {callStatus === "connecting" ? (
                <div className="text-center space-y-4">
                  <div className="relative mx-auto">
                    <Avatar className="h-24 w-24">
                      <AvatarFallback className="bg-[#1E3D3D] text-[#D2EFEC] text-2xl">
                        DV
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 rounded-full border-2 border-[#D2EFEC]/40 animate-ping" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{participantName}</p>
                    <p className="text-gray-400 text-sm">Connecting...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Remote video placeholder - replace with actual WebRTC remote stream */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!hasRemoteStream && !isScreenSharing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <Avatar className="h-28 w-28 mx-auto">
                          <AvatarFallback className="bg-[#1E3D3D] text-[#D2EFEC] text-3xl">
                            DV
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-white font-medium text-lg">{participantName}</p>
                        <p className="text-gray-500 text-sm">Waiting for video...</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute bottom-4 right-4 w-48 h-36 rounded-xl overflow-hidden border-2 border-[#1E3D3D]/50 shadow-2xl bg-[#0a1515] group cursor-move z-10">
              {isCameraOn ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: "scaleX(-1)" }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#0f1f1f]">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-[#1E3D3D] text-[#D2EFEC] text-lg">
                      You
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              {/* Name label on PiP */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white font-medium">{localName}</span>
                  {!isMicOn && <MicOff className="h-3 w-3 text-red-400" />}
                </div>
              </div>
            </div>

            {/* Screen sharing indicator */}
            {isScreenSharing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-[#1E3D3D] border border-[#D2EFEC]/30 z-10">
                <Monitor className="h-4 w-4 text-[#D2EFEC]" />
                <span className="text-sm text-[#D2EFEC]">You are sharing your screen</span>
                <button
                  onClick={toggleScreenShare}
                  className="ml-2 text-xs text-red-400 hover:text-red-300 font-medium"
                >
                  Stop
                </button>
              </div>
            )}
          </div>

          {/* Chat Sidebar */}
          {isChatOpen && (
            <div className="w-80 border-l border-[#1E3D3D]/30 bg-[#0f2626] flex flex-col">
              <VideoCallChat
                appointmentId={appointmentId}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          )}

          {/* Settings Sidebar */}
          {isSettingsOpen && (
            <div className="w-80 border-l border-[#1E3D3D]/30 bg-[#0f2626] flex flex-col">
              <VideoCallSettings onClose={() => setIsSettingsOpen(false)} />
            </div>
          )}
        </div>

        {/* Bottom Controls Bar */}
        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0f2626] border-t border-[#1E3D3D]/30">
          {/* Left group - secondary controls */}
          <div className="flex items-center gap-2 mr-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsChatOpen((prev) => !prev)
                    if (isSettingsOpen) setIsSettingsOpen(false)
                  }}
                  className={`h-10 w-10 rounded-full ${isChatOpen ? "bg-[#1E3D3D] text-[#D2EFEC]" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1E3D3D] text-[#D2EFEC] border-[#1E3D3D]">
                {isChatOpen ? "Close Chat" : "Open Chat"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsSettingsOpen((prev) => !prev)
                    if (isChatOpen) setIsChatOpen(false)
                  }}
                  className={`h-10 w-10 rounded-full ${isSettingsOpen ? "bg-[#1E3D3D] text-[#D2EFEC]" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1E3D3D] text-[#D2EFEC] border-[#1E3D3D]">
                Settings
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Center group - primary controls */}
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMic}
                  className={`h-12 w-12 rounded-full transition-all ${
                    isMicOn
                      ? "bg-[#1E3D3D] text-white hover:bg-[#1E3D3D]/80"
                      : "bg-red-500/90 text-white hover:bg-red-500"
                  }`}
                >
                  {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1E3D3D] text-[#D2EFEC] border-[#1E3D3D]">
                {isMicOn ? "Mute Microphone" : "Unmute Microphone"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCamera}
                  className={`h-12 w-12 rounded-full transition-all ${
                    isCameraOn
                      ? "bg-[#1E3D3D] text-white hover:bg-[#1E3D3D]/80"
                      : "bg-red-500/90 text-white hover:bg-red-500"
                  }`}
                >
                  {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1E3D3D] text-[#D2EFEC] border-[#1E3D3D]">
                {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleScreenShare}
                  className={`h-12 w-12 rounded-full transition-all ${
                    isScreenSharing
                      ? "bg-[#D2EFEC] text-[#1E3D3D] hover:bg-[#D2EFEC]/80"
                      : "bg-[#1E3D3D] text-white hover:bg-[#1E3D3D]/80"
                  }`}
                >
                  {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1E3D3D] text-[#D2EFEC] border-[#1E3D3D]">
                {isScreenSharing ? "Stop Sharing" : "Share Screen"}
              </TooltipContent>
            </Tooltip>

            {/* End Call Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={endCall}
                  disabled={isEndingCall}
                  className="h-12 w-14 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {isEndingCall ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <PhoneOff className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-red-600 text-white border-red-600">
                {isEndingCall ? "Ending Call..." : "End Call"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Right group - layout controls */}
          <div className="flex items-center gap-2 ml-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="h-10 w-10 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
                >
                  {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1E3D3D] text-[#D2EFEC] border-[#1E3D3D]">
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
