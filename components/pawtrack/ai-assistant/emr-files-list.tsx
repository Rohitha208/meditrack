"use client"

import { useMemo, useState } from "react"
import { FileText, Calendar, Download, Eye, Loader2, Inbox, Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useGetPatientFiles } from "@/queries/patientFiles/get-patient-files"
import PatientFilePreviewSheet from "@/components/pawtrack/patients/files/patient-file-preview-sheet"
import { useSelectedFiles } from "./contexts/selectFiles"

interface EmrFilesListProps {
  patientId?: string
  patientName?: string
}

// Helper function to determine file category based on file type or name
const getFileCategory = (fileType: string, fileName: string): "medical_record" | "lab_result" | "prescription" | "imaging" | "other" => {
  const lowerType = fileType.toLowerCase()
  const lowerName = fileName.toLowerCase()
  
  if (lowerType.includes("image") || lowerName.includes("x-ray") || lowerName.includes("mri") || lowerName.includes("scan") || lowerName.includes("dicom")) {
    return "imaging"
  }
  if (lowerName.includes("lab") || lowerName.includes("test") || lowerName.includes("result")) {
    return "lab_result"
  }
  if (lowerName.includes("prescription") || lowerName.includes("medication") || lowerName.includes("drug")) {
    return "prescription"
  }
  if (lowerType.includes("pdf") && (lowerName.includes("report") || lowerName.includes("note") || lowerName.includes("record"))) {
    return "medical_record"
  }
  return "other"
}

const categoryLabels: Record<string, string> = {
  medical_record: "Medical Record",
  lab_result: "Lab Result",
  prescription: "Prescription",
  imaging: "Imaging",
  other: "Other",
}

const categoryColors: Record<string, string> = {
  medical_record: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  lab_result: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  prescription: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  imaging: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
}

export function EmrFilesList({ patientId, patientName }: EmrFilesListProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [preview, setPreview] = useState<{ fileName: string; displayName: string; type?: string; path?: string } | null>(null)
  const { toggleFile, isFileSelected } = useSelectedFiles()

  const { data, isLoading, error } = useGetPatientFiles(patientId || "")

  const files = useMemo(() => {
    if (!data?.items) return []
    return data.items.map((f: any) => {
      const attachment = f.attachments?.[0]
      const category = getFileCategory(attachment?.fileType || "", f.name)
      
      return {
        id: f.id,
        uploadFileName: attachment?.fileName as string | undefined,
        name: f.name,
        type: attachment?.fileType || "file",
        size: attachment?.fileSize ? `${Math.round((attachment.fileSize / 1024 / 1024) * 10) / 10} MB` : "",
        date: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "",
        category,
        uploadedBy: f.createdByName || "",
        path: (() => {
          const p = attachment?.filePath as string | undefined
          if (!p) return ""
          return p.replace(/\\/g, "/")
        })(),
      }
    })
  }, [data])

  const openPreview = (fileName: string, displayName: string, type?: string, path?: string) => {
    setPreview({ fileName, displayName, type, path })
    setPreviewOpen(true)
  }

  if (!patientId) {
    return (
      <Card className="h-full flex flex-col border border-[#1E3D3D]/50 dark:border-[#1E3D3D]/50 shadow-sm bg-gradient-to-br from-white to-[#D2EFEC]/30 dark:from-slate-900 dark:to-[#1E3D3D]/20">
        <CardHeader className="flex-shrink-0 border-b border-[#1E3D3D]/30 dark:border-[#1E3D3D]/30 p-2 pb-1 bg-gradient-to-r from-[#1E3D3D]/10 to-[#D2EFEC]/10 dark:from-[#1E3D3D]/20 dark:to-[#D2EFEC]/20 rounded-t-lg">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-[#1E3D3D] to-[#1E3D3D]">
              <FileText className="h-3 w-3 text-white" />
            </div>
            <CardTitle className="text-sm text-[#1E3D3D] dark:text-[#D2EFEC]">EMR Files</CardTitle>
          </div>
          <CardDescription className="text-xs">Select a patient to view their EMR files</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center p-2">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <FileText className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">
              No patient selected
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="h-full flex flex-col border border-[#1E3D3D]/50 dark:border-[#1E3D3D]/50 shadow-sm bg-gradient-to-br from-white to-[#D2EFEC]/30 dark:from-slate-900 dark:to-[#1E3D3D]/20">
        <CardHeader className="flex-shrink-0 border-b border-[#1E3D3D]/30 dark:border-[#1E3D3D]/30 p-2 pb-1 bg-gradient-to-r from-[#1E3D3D]/10 to-[#D2EFEC]/10 dark:from-[#1E3D3D]/20 dark:to-[#D2EFEC]/20 rounded-t-lg">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-[#1E3D3D] to-[#1E3D3D]">
              <FileText className="h-3 w-3 text-white" />
            </div>
            <CardTitle className="text-sm text-[#1E3D3D] dark:text-[#D2EFEC]">EMR Files</CardTitle>
          </div>
          {patientName && (
            <CardDescription className="text-xs">
              Files for {patientName}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden p-2 pt-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <FileText className="h-6 w-6 text-destructive mb-2" />
              <p className="text-xs text-destructive">
                Error loading files
              </p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center mb-2">
                <Inbox className="h-5 w-5 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-medium mb-1">No files</h4>
              <p className="text-xs text-muted-foreground">No files available</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-1 pr-2">
                {files.map((file) => {
                  const isSelected = isFileSelected(file.id)
                  return (
                    <div
                      key={file.id}
                      className={cn(
                        "flex items-center justify-between p-1.5 border rounded-md hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors group",
                        isSelected && "bg-gradient-to-r from-blue-100/50 to-cyan-100/50 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-300 dark:border-blue-700 shadow-sm"
                      )}
                    >
                      <div className="flex items-start gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1 pt-0.5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {
                              toggleFile({
                                id: file.id,
                                fileName: file.uploadFileName || "",
                                displayName: file.name,
                                fileType: file.type,
                                path: file.path,
                                category: file.category,
                                size: file.size,
                              })
                            }}
                            className="h-3 w-3"
                          />
                        </div>
                        <div className="flex-shrink-0 w-6 h-6 rounded bg-gradient-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-500/30 dark:to-cyan-500/30 flex items-center justify-center border border-blue-300/30 dark:border-blue-700/30">
                          <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <h4 className="font-medium text-xs truncate text-[#1E3D3D] dark:text-[#D2EFEC]">{file.name}</h4>
                            <Badge
                              variant="secondary"
                              className={cn("text-[10px] px-1 py-0", categoryColors[file.category] || categoryColors.other)}
                            >
                              {categoryLabels[file.category] || categoryLabels.other}
                            </Badge>
                            {isSelected && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-primary/10 text-primary border-primary/20">
                                <Check className="h-2 w-2 mr-0.5" />
                                Selected
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              <span>{file.date}</span>
                            </div>
                            {file.size && <span>{file.size}</span>}
                            <span className="uppercase">{file.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => openPreview(
                            file.uploadFileName || "",
                            file.name,
                            file.type,
                            file.path
                          )}
                        >
                          <Eye className="h-3 w-3" />
                          <span className="sr-only">View</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            if (file.path) {
                              const fileName = file.path.split("/").pop() || ""
                              window.open(`/api/get-file/${encodeURIComponent(fileName)}`, "_blank")
                            }
                          }}
                        >
                          <Download className="h-3 w-3" />
                          <span className="sr-only">Download</span>
                        </Button>
                      </div>
                    </div>
                  )
                })}
                
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Preview Sheet */}
      {preview && (
        <PatientFilePreviewSheet
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          fileName={preview.fileName}
          displayName={preview.displayName}
          fileType={preview.type}
          path={preview.path || ""}
          enableAnalysis={false}
        />
      )}
    </>
  )
}

