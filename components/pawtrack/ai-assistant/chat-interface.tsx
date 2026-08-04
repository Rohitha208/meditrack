"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Bot, User, Loader2, FileText, X, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai'  
import { useSelectedFiles, SelectedFile } from "./contexts/selectFiles"
import ReactMarkdown from 'react-markdown'


interface ChatInterfaceProps {
  patientId?: string
  patientName?: string
  screenContext?: string | null
}
async function fetchFileContent(file: SelectedFile): Promise<string | null> {
  try {
    const actualFileName = file.path?.split(/[/\\]/).pop() || file.fileName
    const response = await fetch(`/api/get-file/${encodeURIComponent(actualFileName)}`)
    if (!response.ok) {
      console.error(`Failed to fetch file: ${response.status}`)
      return null
    }

    // For images, convert to base64
    if (file.fileType?.startsWith('image/') || file.fileType === '.webp' || file.fileType === '.jpeg' || file.fileType === '.jpg' || file.fileType === '.png') {
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }
    
    // For text-based files (PDF, txt, etc.)
    const text = await response.text()
    return text
  } catch (error) {
    console.error('Error fetching file content:', error)
    return null
  }
}

export function ChatInterface({ patientId, patientName, screenContext }: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const { selectedFiles, removeFile } = useSelectedFiles()
  const [filesWithContent, setFilesWithContent] = useState<Array<SelectedFile & { content?: string }>>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [historyMessages, setHistoryMessages] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false)
  const [chatKey, setChatKey] = useState<string>(`${patientId || 'no-patient'}-${Date.now()}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const extractTextContent = (message: any): string => {
    return (
      message?.parts?.map((part: any) => (part?.type === 'text' ? part.text : '')).join('') ||
      (typeof message?.content === 'string' ? message.content : '') ||
      ''
    )
  }
  
  // Reset input and chat key when patient changes
  useEffect(() => {
    setInput("")
    setChatKey(`${patientId || 'no-patient'}-${Date.now()}`)
  }, [patientId])
  
  // Use a ref to store the latest filesWithContent to avoid closure issues
  const filesWithContentRef = useRef<Array<SelectedFile & { content?: string }>>([])
  
  // Update ref whenever filesWithContent changes
  useEffect(() => {
    filesWithContentRef.current = filesWithContent
  }, [filesWithContent])

  // Load chat history when patientId changes
  // Simple version: fetch all messages (non-system) and show them, then scroll to bottom
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!patientId) {
        setHistoryMessages([])
        return
      }

      setIsLoadingHistory(true)
      setHistoryMessages([]) // Clear previous history immediately when switching
      
      try {
        const response = await fetch(`/api/conversation/messages?patientId=${patientId}`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          
          let messages: any[] = []
          if (Array.isArray(data)) {
            messages = data
          } else if (data.items && Array.isArray(data.items)) {
            messages = data.items
          } else if (data.messages && Array.isArray(data.messages)) {
            messages = data.messages
          }

          const formattedMessages = messages
            .filter((msg: any) => {
              // Exclude system role messages (summaries) from display
              const role = msg.role || msg.roleName || '';
              return role !== 'system' && (msg.content || msg.text);
            })
            .map((msg: any, index: number) => ({
              id: msg.id || `history-${patientId}-${index}-${Date.now()}`,
              _key: `history-${msg.id || `${patientId}-${index}`}`,
              role: msg.role || msg.roleName || 'user',
              content: msg.content || msg.text || '',
            }))

          setHistoryMessages(formattedMessages)
        } else {
          setHistoryMessages([])
        }
      } catch (error) {
        setHistoryMessages([])
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadChatHistory()
  }, [patientId])
  // Fetch content for selected files
  useEffect(() => {
    const loadFileContents = async () => {
      if (selectedFiles.length === 0) {
        setFilesWithContent([])
        setIsLoadingFiles(false)
        return
      }

      setIsLoadingFiles(true)

      const filesWithContentPromises = selectedFiles.map(async (file) => {
        // Skip if we already have content for this file
        const existing = filesWithContent.find(f => f.id === file.id)
        if (existing?.content) {
          return existing
        }
        const content = await fetchFileContent(file)
        return { ...file, content: content || undefined }
      })

      const loadedFiles = await Promise.all(filesWithContentPromises)
      setFilesWithContent(loadedFiles)
      setIsLoadingFiles(false)
    }

    loadFileContents()
  }, [selectedFiles])
  
  // Use patientId as the unique chat ID to persist conversations per patient
  // useChat maintains state per id, so switching patients will switch to that patient's chat state
  // Use chatKey state to force reset when creating new chat
  const { messages, sendMessage, status } = useChat({
    id: `${patientId || 'no-patient'}-${chatKey}`,
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: ({ id, messages }) => {
        const currentFiles = filesWithContentRef.current
        return {
          body: {
            id,
            messages,
            patientId: patientId ?? null,
            emrFiles: currentFiles
              .filter(f => f.content)
              .map(file => ({
                id: file.id,
                name: file.displayName,
                type: file.fileType,
                content: file.content
              }))
            ,
            screenContext: screenContext ?? null
          },
        }
      },
    }),
  })

  // Always scroll to bottom when history or live messages change
  useEffect(() => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
      }
    }, 0)
  }, [historyMessages, messages, status])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    if (isLoadingFiles) {
      return
    }
    await sendMessage({ text: input })
    setInput("")
  }

  const handleCreateNewChat = async () => {
    if (!patientId || isCreatingNewChat) return

    setIsCreatingNewChat(true)
    try {
      // Delete all messages for this patient
      const response = await fetch(`/api/conversation/delete-all?patientId=${patientId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setChatKey(`${patientId}-${Date.now()}`)
        setHistoryMessages([])
        setInput("")
      }
    } catch (error) {
      // Error handled silently - user can retry
    } finally {
      setIsCreatingNewChat(false)
    }
  }

  if (!patientId) {
    return (
      <Card className="h-full flex flex-col border border-[#1E3D3D]/50 dark:border-[#1E3D3D]/50 shadow-sm bg-gradient-to-br from-white to-[#D2EFEC]/30 dark:from-slate-900 dark:to-[#1E3D3D]/20">
        <CardHeader className="flex-shrink-0 p-2 pb-1 bg-gradient-to-r from-[#1E3D3D]/10 to-[#D2EFEC]/10 dark:from-[#1E3D3D]/20 dark:to-[#D2EFEC]/20 rounded-t-lg border-b border-[#1E3D3D]/30 dark:border-[#1E3D3D]/30">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-[#1E3D3D] to-[#1E3D3D]">
              <Bot className="h-3 w-3 text-white" />
            </div>
            <CardTitle className="text-sm text-[#1E3D3D] dark:text-[#D2EFEC]">AI Assistant</CardTitle>
          </div>
          <CardDescription className="text-xs">Chat with AI using patient context</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex items-center justify-center p-2">
          <div className="text-center">
            <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-1">
              No patient selected
            </p>
            <p className="text-[10px] text-muted-foreground">
              Please select a patient to start chatting
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col border border-[#1E3D3D]/50 dark:border-[#1E3D3D]/50 shadow-sm bg-gradient-to-br from-white to-[#D2EFEC]/30 dark:from-slate-900 dark:to-[#1E3D3D]/20">
      <CardHeader className="flex-shrink-0 border-b border-[#1E3D3D]/30 dark:border-[#1E3D3D]/30 p-2 pb-1 bg-gradient-to-r from-[#1E3D3D]/10 to-[#D2EFEC]/10 dark:from-[#1E3D3D]/20 dark:to-[#D2EFEC]/20 rounded-t-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-[#1E3D3D] to-[#1E3D3D]">
              <Bot className="h-3 w-3 text-white" />
            </div>
            <CardTitle className="text-sm text-[#1E3D3D] dark:text-[#D2EFEC]">AI Assistant</CardTitle>
          </div>
          {patientId && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs border-[#1E3D3D] dark:border-[#D2EFEC] text-[#1E3D3D] dark:text-[#D2EFEC] hover:bg-[#1E3D3D] hover:text-white dark:hover:bg-[#D2EFEC] dark:hover:text-[#1E3D3D] transition-all duration-300"
              onClick={handleCreateNewChat}
              disabled={isCreatingNewChat}
            >
              {isCreatingNewChat ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  New Chat
                </>
              )}
            </Button>
          )}
        </div>
        {patientName && (
          <CardDescription className="text-xs">
            {patientName}'s medical records
          </CardDescription>
        )}
        {selectedFiles.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t">
            <p className="text-[10px] text-muted-foreground mb-1">
              Context files ({selectedFiles.length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedFiles.map((file: SelectedFile) => {
                const hasContent = filesWithContent.find(f => f.id === file.id)?.content
                return (
                  <Badge
                    key={file.id}
                    variant="secondary"
                    className={cn(
                      "flex items-center gap-1 pr-0.5 text-[10px] h-5 border-[#1E3D3D]/20 dark:border-[#1E3D3D]/80",
                      hasContent 
                        ? "bg-[#D2EFEC] text-[#1E3D3D] dark:bg-[#1E3D3D]/50 dark:text-[#D2EFEC]" 
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    )}
                  >
                    {hasContent ? (
                      <FileText className="h-2.5 w-2.5" />
                    ) : (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    )}
                    <span className="truncate max-w-[100px]">{file.displayName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-3 w-3 p-0 hover:bg-destructive/20 hover:text-destructive"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-2.5 w-2.5" />
                      <span className="sr-only">Remove file</span>
                    </Button>
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">
        <div 
          className="flex-1 p-2 overflow-y-auto"
        >
          <div className="space-y-2">
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Loader2 className="h-8 w-8 text-muted-foreground mb-2 animate-spin" />
                <p className="text-xs text-muted-foreground">Loading chat history...</p>
              </div>
            ) : [...historyMessages, ...messages].length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Bot className="h-8 w-8 text-muted-foreground mb-2" />
                <h3 className="font-medium text-sm mb-1">Start a conversation</h3>
                <p className="text-xs text-muted-foreground max-w-md mb-3">
                  Ask questions about the patient's medical history, lab results, prescriptions, or any other information from their EMR files.
                </p>
                <div className="grid grid-cols-1 gap-1 w-full max-w-md">
                  <Button
                    variant="outline"
                    className="justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setInput("What are the patient's recent lab results?")}
                  >
                    What are the patient's recent lab results?
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setInput("Summarize the patient's medical history")}
                  >
                    Summarize the patient's medical history
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start text-left h-auto py-1.5 px-2 text-xs"
                    onClick={() => setInput("What medications is the patient currently taking?")}
                  >
                    What medications is the patient currently taking?
                  </Button>
                </div>
              </div>
            ) : (
              // Display messages: history first, then useChat messages (new messages from current session)
              // Deduplicate by ID - useChat messages take precedence over history
              (() => {
                // Get history messages that aren't in useChat (to avoid duplicates)
                const historyOnly = historyMessages.filter((msg) => 
                  msg.id && !messages.some((m) => m.id === msg.id)
                );
                
                // Combine: history first, then new messages from current session
                const allMessages = [
                  ...historyOnly,
                  ...messages.map((m: any) => ({ ...m, _key: `live-${m.id || `idx-${Math.random()}`}` })),
                ];
                
                return allMessages;
              })().map((message, idx) => (
                <div
                  key={(message as any)._key || `${message.id}-${idx}`}
                  className={cn(
                    "flex gap-1.5",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-5 w-5 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-[#1E3D3D] to-[#1E3D3D] text-white">
                        <Bot className="h-2.5 w-2.5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "rounded-md px-2 py-1 max-w-[80%]",
                      message.role === "user"
                        ? "bg-gradient-to-r from-[#1E3D3D] to-[#1E3D3D] text-white shadow-sm"
                        : "bg-gradient-to-r from-slate-100 to-[#D2EFEC] dark:from-slate-800 dark:to-[#1E3D3D]/30 border border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <div className="text-xs prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:font-semibold prose-em:italic">
                      <ReactMarkdown
                        components={{
                          p: ({ children }: { children?: React.ReactNode }) => <p className="mb-1 last:mb-0">{children}</p>,
                          strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
                          code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-[11px] font-mono">{children}</code>
                            ) : (
                              <code className={cn("block bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-[11px] font-mono whitespace-pre-wrap my-1", className)}>{children}</code>
                            );
                          },
                          ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>,
                          ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>,
                          li: ({ children }: { children?: React.ReactNode }) => <li className="ml-2">{children}</li>,
                          h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-sm font-bold mb-1">{children}</h1>,
                          h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-xs font-bold mb-1">{children}</h2>,
                          h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-xs font-semibold mb-1">{children}</h3>,
                          blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-2 border-gray-300 dark:border-gray-600 pl-2 italic my-1">{children}</blockquote>,
                        }}
                      >
                        {extractTextContent(message)}
                      </ReactMarkdown>
                    </div>
                    <p className="text-[10px] mt-0.5 opacity-70">
                      {new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-5 w-5 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-[#1E3D3D] to-[#1E3D3D] text-white">
                        <User className="h-2.5 w-2.5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            {status === 'submitted' && (
              <div className="flex gap-1.5 justify-start">
                <Avatar className="h-5 w-5 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-[#1E3D3D] to-[#1E3D3D] text-white">
                    <Bot className="h-2.5 w-2.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-md px-2 py-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </div>
              </div>
            )}
            {/* Scroll anchor for auto-scroll */}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className="flex-shrink-0 border-t p-1.5">
          <form onSubmit={handleSend} className="flex gap-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the patient's medical history..."
              className="flex-1 h-8 text-xs"
              disabled={status === 'submitted' || isLoadingFiles}
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || status === 'submitted' || isLoadingFiles} 
              size="icon" 
              className="h-8 w-8 bg-gradient-to-r from-[#1E3D3D] to-[#1E3D3D] hover:from-[#1E3D3D] hover:to-[#1E3D3D] text-white shadow-sm"
            >
              {isLoadingFiles ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}