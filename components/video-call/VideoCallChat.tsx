"use client"

import React, { useState, useRef, useEffect } from "react"
import { X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface ChatMessage {
  id: string
  sender: string
  text: string
  timestamp: Date
  isLocal: boolean
}

interface VideoCallChatProps {
  appointmentId: string
  onClose: () => void
}

export default function VideoCallChat({ appointmentId, onClose }: VideoCallChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = () => {
    if (!inputText.trim()) return

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "You",
      text: inputText.trim(),
      timestamp: new Date(),
      isLocal: true,
    }
    setMessages((prev) => [...prev, newMessage])
    setInputText("")

    // TODO: Send message via SignalR to the other participant
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <>
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E3D3D]/30">
        <h3 className="text-sm font-semibold text-[#D2EFEC]">Chat</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-500 text-sm">No messages yet</p>
            <p className="text-gray-600 text-xs mt-1">
              Send a message to the other participant
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.isLocal ? "flex-row-reverse" : "flex-row"}`}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className={`text-[10px] ${msg.isLocal ? "bg-[#1E3D3D] text-[#D2EFEC]" : "bg-[#D2EFEC] text-[#1E3D3D]"}`}>
                  {msg.sender.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[75%] ${msg.isLocal ? "items-end" : "items-start"}`}>
                <div
                  className={`px-3 py-2 rounded-xl text-sm ${
                    msg.isLocal
                      ? "bg-[#1E3D3D] text-[#D2EFEC] rounded-tr-sm"
                      : "bg-[#1a3333] text-gray-200 rounded-tl-sm"
                  }`}
                >
                  {msg.text}
                </div>
                <p className={`text-[10px] text-gray-500 mt-0.5 ${msg.isLocal ? "text-right" : "text-left"}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-[#1E3D3D]/30">
        <div className="flex gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-[#0a1a1a] border-[#1E3D3D]/30 text-white placeholder:text-gray-500 focus-visible:ring-[#1E3D3D]"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputText.trim()}
            size="icon"
            className="h-10 w-10 rounded-full bg-[#1E3D3D] hover:bg-[#1E3D3D]/80 text-[#D2EFEC] disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  )
}
