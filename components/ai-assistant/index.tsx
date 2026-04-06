"use client"

import { Bot, Sparkles, GripVertical } from "lucide-react"
import { PatientSearchDropdown } from "./patient-search-dropdown"
import { EmrFilesList } from "./emr-files-list"
import { ChatInterface } from "./chat-interface"
import { ChatTabs } from "./chat-tabs"
import { SelectedPatientProvider, useSelectedPatient } from "./contexts/selectedDoctor"
import { SelectedFilesProvider } from "./contexts/selectFiles"
import { AiSessionProvider, useAiSession } from "./contexts/AiSessionContext"
import { ChatTabsProvider, useChatTabs } from "./contexts/ChatTabsContext"
import { useEffect, useState, useRef } from "react"

function AiAssistantContent() {
  const { selectedPatient, setSelectedPatient } = useSelectedPatient()
  const { screenContext, setScreenContext } = useAiSession()
  const { tabs, addTab, getActiveTab, getTabByPatientId, setActiveTab } = useChatTabs()
  const [chatWidth, setChatWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-assistant-chat-width')
      return saved ? parseFloat(saved) : 66.67 // Default 2/3 (lg:col-span-2)
    }
    return 66.67
  })
  const defaultChatWidth = 66.67 // Minimum width (current default)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  useEffect(() => {
    if (!screenContext) {
      setScreenContext("ai-assistant")
    }
  }, [screenContext, setScreenContext])

  // Restore tabs from localStorage on mount and set selectedPatient
  useEffect(() => {
    if (tabs.length > 0) {
      const activeTab = getActiveTab()
      if (activeTab) {
        setSelectedPatient(activeTab.patient)
      } else {
        // If no active tab but tabs exist, activate the first one
        setActiveTab(tabs[0].id)
        setSelectedPatient(tabs[0].patient)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length]) // Run when tabs are loaded

  // Add tab when patient is selected from search
  useEffect(() => {
    if (selectedPatient) {
      const existingTab = getTabByPatientId(selectedPatient.id)
      const activeTab = getActiveTab()
      
      if (!activeTab || activeTab.patient.id !== selectedPatient.id) {
        if (!existingTab) {
          addTab(selectedPatient)
        } else {
          setActiveTab(existingTab.id)
        }
      }
    }
  }, [selectedPatient, addTab, getTabByPatientId, getActiveTab, setActiveTab])

  // Get the active tab - this is the source of truth for which patient to display
  const activeTab = getActiveTab()
  const displayPatient = activeTab?.patient || selectedPatient

  // If user switches to another patient tab, reset size to default (normal)
  useEffect(() => {
    setChatWidth(defaultChatWidth)
  }, [displayPatient?.id])

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return
      
      const container = resizeRef.current.closest('.resize-container')
      if (!container) return
      
      const containerWidth = container.clientWidth
      const deltaX = e.clientX - startXRef.current
      const deltaPercent = (deltaX / containerWidth) * 100
      // Ensure minimum width is the default (66.67%), can only increase
      const newWidth = Math.max(defaultChatWidth, Math.min(90, startWidthRef.current + deltaPercent))
      
      setChatWidth(newWidth)
    }

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false)
        localStorage.setItem('ai-assistant-chat-width', chatWidth.toString())
      }
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, chatWidth, defaultChatWidth])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = chatWidth
  }

  const emrWidth = 100 - chatWidth

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - matching other pages */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC] flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-br from-[#1E3D3D] to-[#1E3D3D]">
            <Bot className="h-5 w-5 text-white" />
          </div>
          AI Assistant
          <Sparkles className="h-5 w-5 text-yellow-400" />
        </h1>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 flex flex-col gap-2 p-2 overflow-hidden bg-gradient-to-br from-[#D2EFEC]/50 via-[#D2EFEC]/30 to-[#D2EFEC]/50 dark:from-[#1E3D3D]/20 dark:via-[#1E3D3D]/10 dark:to-[#1E3D3D]/20 resize-container">
        {/* Header Section - Patient Search */}
        <div className="flex-shrink-0">
          <div className="pt-2">
            <PatientSearchDropdown />
          </div>
        </div>

        {/* Chat Tabs */}
        <div className="flex-shrink-0">
          <ChatTabs />
        </div>

        {/* Main Content Area - EMR Files and Chat */}
        <div className="flex-1 flex gap-2 min-h-0 overflow-hidden h-full" ref={resizeRef}>
          {/* Left Sidebar - EMR Files List */}
          <div className="min-h-0 flex flex-col h-full" style={{ width: `${emrWidth}%` }}>
            <EmrFilesList
              patientId={displayPatient?.id}
              patientName={displayPatient?.name}
            />
          </div>

          {/* Right Side - AI Chat Interface */}
          <div className="min-h-0 flex flex-col h-full relative" style={{ width: `${chatWidth}%`, minWidth: '33.33%' }}>
            {/* Invisible resize zone on the left border of chatbox (no separate visible bar) */}
            <div
              className="absolute left-0 top-0 h-full w-2 cursor-col-resize z-20"
              onMouseDown={handleResizeStart}
              title="Drag border to resize chat area"
            />
            {displayPatient ? (
              <ChatInterface
                patientId={displayPatient.id}
                patientName={displayPatient.name}
                screenContext={screenContext}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Select a patient to start chatting
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AiAssistant() {
  return (
    <SelectedPatientProvider>
      <SelectedFilesProvider>
        <AiSessionProvider>
          <ChatTabsProvider>
            <AiAssistantContent />
          </ChatTabsProvider>
        </AiSessionProvider>
      </SelectedFilesProvider>
    </SelectedPatientProvider>
  )
}
