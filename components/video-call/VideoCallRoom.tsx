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

  // Refs for video elements
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // TODO: Replace with actual participant data from your API
  const participantName = "Dr. Veterinarian"
  const localName = "You"

  // Initialize local camera/mic
  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
        // Simulate connection after getting media
        setTimeout(() => setCallStatus("connected"), 2000)
      } catch (err) {
        console.error("Failed to access media devices:", err)
        // Even if camera fails, mark as connected
        setTimeout(() => setCallStatus("connected"), 2000)
      }
    }
    initMedia()

    return () => {
      // Cleanup streams on unmount
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      screenStreamRef.current?.getTracks().forEach((track) => track.stop())
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

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
      // Restore camera to remote video area
      if (localStreamRef.current && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }
      setIsScreenSharing(false)
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        })
        screenStreamRef.current = screenStream
        // Show screen share in the main video area
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = screenStream
        }
        // Listen for user ending screen share from browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false)
          screenStreamRef.current = null
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null
          }
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
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    screenStreamRef.current?.getTracks().forEach((track) => track.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    setCallStatus("ended")
  }, [])

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
              onClick={() => {
                setCallStatus("connecting")
                setCallDuration(0)
                const initMedia = async () => {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                    localStreamRef.current = stream
                    if (localVideoRef.current) localVideoRef.current.srcObject = stream
                    setTimeout(() => setCallStatus("connected"), 2000)
                  } catch (err) {
                    console.error("Failed to reinitialize media:", err)
                  }
                }
                initMedia()
              }}
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
                  {!remoteVideoRef.current?.srcObject && !isScreenSharing && (
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
                  className="h-12 w-14 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-red-600 text-white border-red-600">
                End Call
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
