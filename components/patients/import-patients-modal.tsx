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

// Columns for the veterinary patient import template. Header names and order
// MUST exactly match what the backend CSV parser (bulk-create) expects —
// owner columns first, then pet columns, PascalCase with no spaces.
const TEMPLATE_HEADERS = [
  "OwnerFirstName",
  "OwnerLastName",
  "OwnerEmail",
  "OwnerPhone",
  "OwnerAddress",
  "OwnerCity",
  "OwnerState",
  "OwnerPostalCode",
  "Name",
  "Species",
  "Breed",
  "SecondaryBreed",
  "Color",
  "Gender",
  "IsNeutered",
  "DateOfBirth",
  "WeightKg",
  "MicrochipNumber",
  "RegistrationNumber",
  "InsuranceProvider",
  "InsurancePolicyNumber",
  "Allergies",
  "MedicalConditions",
  "BehavioralNotes",
  "IsActive",
]

// A single example row to guide the user on expected formats.
const EXAMPLE_ROW = {
  OwnerFirstName: "Rakesh",
  OwnerLastName: "Mishra",
  OwnerEmail: "rakesh.mishra@example.com",
  OwnerPhone: "+919876543501",
  OwnerAddress: "11 Green Park Road",
  OwnerCity: "Bengaluru",
  OwnerState: "Karnataka",
  OwnerPostalCode: "560027",
  Name: "Shadow",
  Species: "Dog",
  Breed: "Doberman",
  SecondaryBreed: "",
  Color: "Black & Tan",
  Gender: "Male",
  IsNeutered: "TRUE",
  DateOfBirth: "2020-02-14",
  WeightKg: 31.2,
  MicrochipNumber: "985141000123456",
  RegistrationNumber: "REG-DOG-001",
  InsuranceProvider: "PetCare Insurance",
  InsurancePolicyNumber: "PCI-031",
  Allergies: "None",
  MedicalConditions: "None",
  BehavioralNotes: "Alert and active",
  IsActive: "TRUE",
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

        // Backend (BulkImportResultDto) returns successCount / failedCount /
        // results[]. Fall back to the simpler imported/failed shape if present.
        const imported =
          typeof result?.successCount === "number"
            ? result.successCount
            : typeof result?.imported === "number"
              ? result.imported
              : undefined
        const failed =
          typeof result?.failedCount === "number"
            ? result.failedCount
            : typeof result?.failed === "number"
              ? result.failed
              : undefined

        // Collect row-level error messages from results[] (or the errors[] alias).
        const rowErrors: string[] = Array.isArray(result?.results)
          ? result.results
              .filter((r) => r && r.success === false)
              .map((r) =>
                `Row ${r.rowNumber ?? "?"}: ${r.errorMessage ?? "failed"}`.trim()
              )
          : Array.isArray(result?.errors)
            ? result.errors
            : []

        // Build a human-readable summary, e.g. "8 imported, 2 failed."
        const parts: string[] = []
        if (imported != null) parts.push(`${imported} imported`)
        if (failed != null && failed > 0) parts.push(`${failed} failed`)
        const summary =
          parts.length > 0 ? parts.join(", ") + "." : "Patients imported successfully."

        // First few row-level errors appended to the toast.
        const errorDetail =
          rowErrors.length > 0 ? " " + rowErrors.slice(0, 3).join(" ") : ""

        // Nothing imported but rows failed → hard failure; keep the modal open.
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
