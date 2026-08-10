"use client"

import { useCallback, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FileSpreadsheet, Upload, X } from "lucide-react"

const DEFAULT_ACCEPT = ".xlsx,.xls,.csv"
const DEFAULT_ACCEPT_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]

export interface ImportExcelModalProps {
  /** Controls visibility of the modal */
  open: boolean
  /** Called when the modal requests to open/close */
  onOpenChange: (open: boolean) => void
  /** Modal title, e.g. "Import Patients from Excel" */
  title: string
  /** Short instructional text shown under the title */
  description?: string
  /** Text listing allowed record types, e.g. "Allowed types: dog, cat" */
  allowedTypesText?: string
  /** Comma separated accept attribute for the file input */
  accept?: string
  /**
   * Handler that performs the actual import. Receives the selected file.
   * Should throw on failure so the modal can surface an error state.
   */
  onImport: (file: File) => Promise<void>
  /** Optional handler for the "Download Template" link */
  onDownloadTemplate?: () => void
  /** Whether an import request is currently in flight */
  isImporting?: boolean
}

/**
 * Generic, reusable Excel/CSV import modal.
 *
 * Provides a Download Template link, a drag-and-drop / click-to-browse file
 * picker, and Cancel / Import actions. All record-specific wording is passed in
 * via props so this component can be reused across modules (patients, customers,
 * etc.) without duplication.
 */
export function ImportExcelModal({
  open,
  onOpenChange,
  title,
  description,
  allowedTypesText,
  accept = DEFAULT_ACCEPT,
  onImport,
  onDownloadTemplate,
  isImporting = false,
}: ImportExcelModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const reset = useCallback(() => {
    setFile(null)
    setIsDragging(false)
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (isImporting) return
      if (!next) reset()
      onOpenChange(next)
    },
    [isImporting, onOpenChange, reset]
  )

  const isAllowed = useCallback(
    (candidate: File) => {
      const name = candidate.name.toLowerCase()
      const exts = accept.split(",").map((e) => e.trim().toLowerCase())
      const extOk = exts.some((ext) => ext && name.endsWith(ext))
      const mimeOk = DEFAULT_ACCEPT_MIME.includes(candidate.type)
      return extOk || mimeOk
    },
    [accept]
  )

  const selectFile = useCallback(
    (candidate: File | undefined | null) => {
      if (!candidate) return
      if (!isAllowed(candidate)) return
      setFile(candidate)
    },
    [isAllowed]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      if (isImporting) return
      selectFile(e.dataTransfer.files?.[0])
    },
    [isImporting, selectFile]
  )

  const handleImport = useCallback(async () => {
    if (!file || isImporting) return
    try {
      await onImport(file)
      reset()
      onOpenChange(false)
    } catch {
      // Error surfaced by the caller (toast). Keep the modal open so the user
      // can retry or pick a different file.
    }
  }, [file, isImporting, onImport, onOpenChange, reset])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {(description || onDownloadTemplate) && (
          <p className="text-sm text-muted-foreground">
            {description}{" "}
            {onDownloadTemplate && (
              <button
                type="button"
                onClick={onDownloadTemplate}
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                Download Template
              </button>
            )}
          </p>
        )}

        {allowedTypesText && (
          <p className="-mt-2 text-xs text-muted-foreground">{allowedTypesText}</p>
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={() => !isImporting && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !isImporting) {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (!isImporting) setIsDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDragging(false)
          }}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            isImporting ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary/60"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => selectFile(e.target.files?.[0])}
          />

          {file ? (
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <span className="font-medium text-foreground">{file.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  reset()
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm">
                <span className="font-medium text-primary">Choose an Excel file</span>{" "}
                <span className="text-muted-foreground">or drag and drop</span>
              </p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            className="theme-button text-white"
            onClick={handleImport}
            disabled={!file || isImporting}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? "Importing..." : "Import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ImportExcelModal
