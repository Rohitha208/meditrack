"use client"

import { useCallback } from "react"
import { ImportExcelModal } from "@/components/ui/import-excel-modal"
import { useImportPatients } from "@/queries/patients/import-patients"
import { toast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"

interface ImportPatientsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId?: string
  onImported?: () => void
}

// Columns for the veterinary patient import template. Order/labels mirror the
// patient export so a user can round-trip data.
const TEMPLATE_HEADERS = [
  "Patient Name",
  "Species",
  "Breed",
  "Secondary Breed",
  "Color",
  "Gender",
  "Neutered",
  "Date of Birth",
  "Weight (Kg)",
  "Microchip Number",
  "Registration Number",
  "Insurance Provider",
  "Insurance Policy Number",
  "Allergies",
  "Medical Conditions",
  "Behavioral Notes",
  "Client First Name",
  "Client Last Name",
  "Client Email",
  "Client Phone Primary",
  "Client Phone Secondary",
  "Client Address Line 1",
  "Client Address Line 2",
  "Client City",
  "Client State",
  "Client Postal Code",
  "Client Emergency Contact Name",
  "Client Emergency Contact Phone",
  "Client Notes",
]

// A single example row to guide the user on expected formats.
const EXAMPLE_ROW = {
  "Patient Name": "Bella",
  Species: "Dog",
  Breed: "German Shepherd",
  "Secondary Breed": "",
  Color: "Black & Tan",
  Gender: "Female",
  Neutered: "Yes",
  "Date of Birth": "2021-05-14",
  "Weight (Kg)": 28.5,
  "Microchip Number": "985141000123456",
  "Registration Number": "REG-00123",
  "Insurance Provider": "PetSecure",
  "Insurance Policy Number": "POL-556677",
  Allergies: "None",
  "Medical Conditions": "None",
  "Behavioral Notes": "Friendly",
  "Client First Name": "John",
  "Client Last Name": "Doe",
  "Client Email": "john.doe@example.com",
  "Client Phone Primary": "+230 5123 4567",
  "Client Phone Secondary": "",
  "Client Address Line 1": "12 Royal Road",
  "Client Address Line 2": "",
  "Client City": "Curepipe",
  "Client State": "Plaines Wilhems",
  "Client Postal Code": "74210",
  "Client Emergency Contact Name": "Jane Doe",
  "Client Emergency Contact Phone": "+230 5987 6543",
  "Client Notes": "",
}

export function ImportPatientsModal({
  open,
  onOpenChange,
  companyId,
  onImported,
}: ImportPatientsModalProps) {
  const { mutateAsync, isPending } = useImportPatients()

  const handleDownloadTemplate = useCallback(() => {
    // Escape a CSV cell: wrap in quotes if it contains a comma, quote, or newline.
    const escape = (value: unknown) => {
      const s = value == null ? "" : String(value)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }

    const headerLine = TEMPLATE_HEADERS.map(escape).join(",")
    const exampleLine = TEMPLATE_HEADERS.map((h) =>
      escape((EXAMPLE_ROW as Record<string, unknown>)[h])
    ).join(",")
    const csv = `${headerLine}\n${exampleLine}\n`

    // Prepend a UTF-8 BOM so Excel opens accented characters correctly.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "patient_import_template.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const result = await mutateAsync({ file, companyId })

        const imported = typeof result?.imported === "number" ? result.imported : undefined
        const skipped = typeof result?.skipped === "number" ? result.skipped : undefined
        const failed = typeof result?.failed === "number" ? result.failed : undefined

        // Build a human-readable summary from whatever counts the backend returns,
        // e.g. "8 imported, 2 skipped (duplicates), 1 failed."
        const parts: string[] = []
        if (imported != null) parts.push(`${imported} imported`)
        if (skipped != null && skipped > 0) parts.push(`${skipped} skipped (duplicates)`)
        if (failed != null && failed > 0) parts.push(`${failed} failed`)

        const summary =
          parts.length > 0 ? parts.join(", ") + "." : "Patients imported successfully."

        // First few row-level errors, if the backend returned any.
        const errorDetail =
          Array.isArray(result?.errors) && result.errors.length > 0
            ? " " + result.errors.slice(0, 3).join(" ")
            : ""

        // Nothing imported but rows failed → treat as a hard failure so the
        // catch block surfaces it and the modal stays open for a retry.
        const isTotalFailure = imported === 0 && (failed ?? 0) > 0
        if (isTotalFailure) {
          throw new Error((result?.message || "No patients were imported.") + errorDetail)
        }

        // Some rows failed but some succeeded → success toast with a warning tone.
        const isPartial = (failed ?? 0) > 0 && (imported ?? 0) > 0

        toast({
          title: isPartial ? "Import Completed with Errors" : "Import Successful",
          description: (result?.message || summary) + errorDetail,
          variant: "success",
        })

        // Refresh the list whenever at least one patient was imported.
        if (imported == null || imported > 0) {
          onImported?.()
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: getToastErrorMessage(error, "Failed to import patients"),
          variant: "destructive",
        })
        // Re-throw so the modal stays open for a retry.
        throw error
      }
    },
    [companyId, mutateAsync, onImported]
  )

  return (
    <ImportExcelModal
      open={open}
      onOpenChange={onOpenChange}
      title="Import Patients from Excel"
      description="Upload an Excel file to import multiple patients at once."
      allowedTypesText="Allowed types: dog, cat"
      onDownloadTemplate={handleDownloadTemplate}
      onImport={handleImport}
      isImporting={isPending}
    />
  )
}

export default ImportPatientsModal
