"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useChatTabs, ChatTab } from "./contexts/ChatTabsContext"
import { useSelectedPatient } from "./contexts/selectedDoctor"

export function ChatTabs() {
  const { tabs, activeTabId, setActiveTab, removeTab } = useChatTabs()
  const { setSelectedPatient } = useSelectedPatient()

  const handleRemoveTab = (tabId: string) => {
    const tabToRemove = tabs.find(t => t.id === tabId)
    const isActiveTab = tabToRemove?.isActive
    const remainingTabs = tabs.filter(t => t.id !== tabId)
    
    removeTab(tabId)
    
    // If we removed the last tab, clear selected patient
    if (remainingTabs.length === 0) {
      setSelectedPatient(null)
    } else if (isActiveTab && remainingTabs.length > 0) {
      // If we removed the active tab, update selectedPatient to match the new active tab
      // The context will activate the last tab, so use that
      setSelectedPatient(remainingTabs[remainingTabs.length - 1].patient)
    }
  }

  if (tabs.length === 0) {
    return null
  }

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[#1E3D3D]/20 dark:border-[#1E3D3D]/50 bg-gradient-to-r from-[#D2EFEC]/30 to-[#D2EFEC]/20 dark:from-[#1E3D3D]/10 dark:to-[#1E3D3D]/20 px-2 py-1">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-t-md border-b-2 transition-colors cursor-pointer min-w-fit",
            tab.isActive
              ? "bg-white dark:bg-slate-900 border-[#1E3D3D] text-[#1E3D3D] dark:text-[#D2EFEC]"
              : "bg-[#D2EFEC]/50 dark:bg-[#1E3D3D]/30 border-transparent text-[#1E3D3D] dark:text-[#D2EFEC] hover:bg-[#D2EFEC]/70 dark:hover:bg-[#1E3D3D]/50"
          )}
          onClick={() => {
            setActiveTab(tab.id)
            // Update selectedPatient to match the tab's patient so EMR files update
            // This will trigger the useEffect in index.tsx, but it will see the tab already exists
            // and is active, so it won't cause issues
            setSelectedPatient(tab.patient)
          }}
        >
          <span className="text-xs font-medium truncate max-w-[120px]">
            {tab.patient.name}
          </span>
          <div
            className="flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleRemoveTab(tab.id)
              }}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Close tab</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

