"use client"

import React, { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PatientFilePreviewSheetProps {
  isOpen: boolean
  onClose: () => void
  fileName: string // actual uploaded filename used for fetching
  displayName: string // label to show in UI
  fileType?: string
  path: string
  enableAnalysis?: boolean
}

export default function PatientFilePreviewSheet({
  isOpen,
  onClose,
  fileName,
  displayName,
  fileType,
  path,
  enableAnalysis = true,
}: PatientFilePreviewSheetProps) {
  const isPdf = (fileType || "").includes("pdf") || fileName.toLowerCase().endsWith(".pdf")
  const isImage = (fileType || "").startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(fileName)
  const fileUrl = `${window.location.origin}/api/get-file/${encodeURIComponent(path.split("/").pop() || "")}`

  const [analysisHtml, setAnalysisHtml] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!path) return

    setIsLoading(true)
    setError(null)
    setAnalysisHtml("")

    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, messages: [] }),
      })

      if (!response.ok) {
        throw new Error("Failed to start analysis")
      }

      if (!response.body) {
        throw new Error("No response body")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullHtml = ""
      let done = false

      // Collect the entire HTML response
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading

        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          fullHtml += chunk
        }
      }

      // Set the complete HTML once received
      setAnalysisHtml(fullHtml)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze file")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {

    return () => {
      setIsLoading(false)
      setAnalysisHtml("")
      setError(null)
    }
  }, [isOpen])


  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[95%] sm:!max-w-full md:!max-w-[85%] lg:!max-w-[80%] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="truncate">{displayName || fileName || "File preview"}</SheetTitle>
        </SheetHeader>
        <div className="w-full h-[calc(100vh-90px)] bg-white dark:bg-slate-900 flex flex-col md:flex-row">
          <div className={cn(
            "overflow-auto min-h-0",
            enableAnalysis 
              ? "md:basis-1/3 lg:basis-2/5 border-r border-gray-200 dark:border-slate-800"
              : "w-full"
          )}>
            {isPdf ? (
              <iframe
                title={fileName}
                src={fileUrl}
                className="w-full h-full"
              />
            ) : isImage ? (
              <div className="w-full h-full flex items-center justify-center p-2">
                <img src={fileUrl} alt={fileName} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="p-6 text-sm text-gray-600 dark:text-gray-300">
                Unable to preview this file type. You can open it in a new window.
                <div className="mt-3">
                  <a className="underline" href={fileUrl} target="_blank" rel="noreferrer noopener">Open in new window</a>
                </div>
              </div>
            )}
          </div>
          {enableAnalysis && (
            <div className="flex-1 md:basis-2/3 lg:basis-3/5 p-4 flex flex-col min-h-0">
              <div className="mb-4 flex-shrink-0">
                <Button
                  onClick={handleAnalyze}
                  disabled={isLoading}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {isLoading ? "Analyzing..." : "Analyze File"}
                </Button>
              </div>
              <div className="flex-1 min-h-0 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 overflow-y-auto overflow-x-hidden">
                {error && (
                  <div className="text-red-500 text-sm mb-2">
                    Error: {error}
                  </div>
                )}
                {isLoading && !analysisHtml && (
                  <div className="text-gray-500 dark:text-gray-400 text-sm">
                    Starting analysis...
                  </div>
                )}
                {analysisHtml && (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none w-full"
                    dangerouslySetInnerHTML={{ __html: analysisHtml }}
                  />
                )}
                {!isLoading && !analysisHtml && !error && (
                  <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                    Click "Analyze File" to get AI-powered analysis
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}


