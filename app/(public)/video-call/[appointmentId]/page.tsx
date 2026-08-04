"use client"

import { useParams } from "next/navigation"
import VideoCallRoom from "@/components/pawtrack/video-call/VideoCallRoom"

export default function VideoCallPage() {
  const params = useParams()
  const id = params.appointmentId as string

  return <VideoCallRoom sessionId={id} />
}
