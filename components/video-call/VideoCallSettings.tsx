"use client"

import React, { useState, useEffect } from "react"
import { X, Monitor, Mic, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface VideoCallSettingsProps {
  onClose: () => void
}

interface MediaDeviceOption {
  deviceId: string
  label: string
}

export default function VideoCallSettings({ onClose }: VideoCallSettingsProps) {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceOption[]>([])
  const [videoInputs, setVideoInputs] = useState<MediaDeviceOption[]>([])
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceOption[]>([])
  const [selectedAudioInput, setSelectedAudioInput] = useState("")
  const [selectedVideoInput, setSelectedVideoInput] = useState("")
  const [selectedAudioOutput, setSelectedAudioOutput] = useState("")

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioIn = devices
          .filter((device) => device.kind === "audioinput" && device.label)
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          }))
        const videoIn = devices
          .filter((device) => device.kind === "videoinput" && device.label)
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          }))
        const audioOut = devices
          .filter((device) => device.kind === "audiooutput" && device.label)
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label || `Speaker ${device.deviceId.slice(0, 8)}`,
          }))

        setAudioInputs(audioIn)
        setVideoInputs(videoIn)
        setAudioOutputs(audioOut)

        if (audioIn.length > 0) setSelectedAudioInput(audioIn[0].deviceId)
        if (videoIn.length > 0) setSelectedVideoInput(videoIn[0].deviceId)
        if (audioOut.length > 0) setSelectedAudioOutput(audioOut[0].deviceId)
      } catch (err) {
        console.error("Failed to enumerate devices:", err)
      }
    }
    loadDevices()
  }, [])

  return (
    <>
      {/* Settings Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E3D3D]/30">
        <h3 className="text-sm font-semibold text-[#D2EFEC]">Settings</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Microphone */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <Mic className="h-3.5 w-3.5" />
            Microphone
          </Label>
          <Select value={selectedAudioInput} onValueChange={setSelectedAudioInput}>
            <SelectTrigger className="bg-[#0a1a1a] border-[#1E3D3D]/30 text-white text-sm">
              <SelectValue placeholder="Select microphone" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f2626] border-[#1E3D3D]/30">
              {audioInputs.map((device) => (
                <SelectItem
                  key={device.deviceId}
                  value={device.deviceId}
                  className="text-white text-sm hover:bg-[#1E3D3D] focus:bg-[#1E3D3D] focus:text-[#D2EFEC]"
                >
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Camera */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <Video className="h-3.5 w-3.5" />
            Camera
          </Label>
          <Select value={selectedVideoInput} onValueChange={setSelectedVideoInput}>
            <SelectTrigger className="bg-[#0a1a1a] border-[#1E3D3D]/30 text-white text-sm">
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f2626] border-[#1E3D3D]/30">
              {videoInputs.map((device) => (
                <SelectItem
                  key={device.deviceId}
                  value={device.deviceId}
                  className="text-white text-sm hover:bg-[#1E3D3D] focus:bg-[#1E3D3D] focus:text-[#D2EFEC]"
                >
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Speaker */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <Monitor className="h-3.5 w-3.5" />
            Speaker
          </Label>
          <Select value={selectedAudioOutput} onValueChange={setSelectedAudioOutput}>
            <SelectTrigger className="bg-[#0a1a1a] border-[#1E3D3D]/30 text-white text-sm">
              <SelectValue placeholder="Select speaker" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f2626] border-[#1E3D3D]/30">
              {audioOutputs.map((device) => (
                <SelectItem
                  key={device.deviceId}
                  value={device.deviceId}
                  className="text-white text-sm hover:bg-[#1E3D3D] focus:bg-[#1E3D3D] focus:text-[#D2EFEC]"
                >
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info */}
        <div className="rounded-lg border border-[#1E3D3D]/20 bg-[#1E3D3D]/10 p-3">
          <p className="text-xs text-gray-400">
            Device changes will take effect immediately. Make sure to allow browser permissions for camera and microphone access.
          </p>
        </div>
      </div>
    </>
  )
}
