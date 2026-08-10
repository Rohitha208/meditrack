import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler"

export interface ImportPatientsResult {
  message?: string
  imported?: number
  failed?: number
  errors?: string[]
  [key: string]: unknown
}

export interface ImportPatientsRequest {
  file: File
  companyId?: string
}

const importPatients = async ({
  file,
  companyId,
}: ImportPatientsRequest): Promise<ImportPatientsResult> => {
  const formData = new FormData()
  formData.append("file", file)
  if (companyId) formData.append("companyId", companyId)

  const response = await fetch("/api/patients/import", {
    method: "POST",
    credentials: "include",
    // No Content-Type header: the browser sets the multipart boundary.
    body: formData,
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to import patients"))
  }
  return result as ImportPatientsResult
}

export function useImportPatients() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ImportPatientsRequest) => importPatients(data),
    retry: false,
    onSuccess: () => {
      // Refresh the patients list after a successful import.
      queryClient.invalidateQueries({ queryKey: ["patients"] })
    },
  })
}
