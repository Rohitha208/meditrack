"use client"

import { useParams } from "next/navigation"
import VideoCallRoom from "@/components/video-call/VideoCallRoom"

export default function VideoCallPage() {
  const params = useParams()
  const appointmentId = params.appointmentId as string

  return <VideoCallRoom appointmentId={appointmentId} />
}
