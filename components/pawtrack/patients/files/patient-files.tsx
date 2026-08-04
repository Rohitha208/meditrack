"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { File, FileImage, FileText, Inbox, UploadCloud } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useGetPatientFiles } from "@/queries/patientFiles/get-patient-files"
import { useCreatePatientFiles } from "@/queries/patientFiles/create-patient-files"
import { getUserId } from "@/utils/clientCookie"
import PatientFilePreviewSheet from "./patient-file-preview-sheet"
import { useDebouncedValue } from "@/hooks/use-debounce"

type PatientFilesProps = { patientId: string }

export default function PatientFiles({ patientId }: PatientFilesProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [preview, setPreview] = useState<{ fileName: string; displayName: string; type?: string; path?: string } | null>(null)
  

  const { data, isLoading, refetch } = useGetPatientFiles(patientId)
  const createMutation = useCreatePatientFiles()
  const debouncedSearch = useDebouncedValue(searchTerm, 300)

  const files = useMemo(() => {
    const items = data?.items || []
    return items.map((f: any) => ({
      id: f.id,
      uploadFileName: f.attachments?.[0]?.fileName as string | undefined,
      name: f.name,
      type: f.attachments?.[0]?.fileType || "file",
      size: f.attachments?.[0]?.fileSize ? `${Math.round((f.attachments[0].fileSize / 1024 / 1024) * 10) / 10} MB` : "",
      date: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "",
      category: f.attachments?.[0]?.fileType || "",
      uploadedBy: f.createdByName || "",
      path: (() => {
        const p = f.attachments?.[0]?.filePath as string | undefined;
        if (!p) return "";
        return p.replace(/\\/g, "/");
      })(),
    }))
  }, [data])

  const filteredFiles = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    if (!term) return files
    return files.filter((file) =>
      file.name.toLowerCase().includes(term) ||
      (file.type || "").toLowerCase().includes(term) ||
      (file.uploadedBy || "").toLowerCase().includes(term)
    )
  }, [files, debouncedSearch])

  const openPreview = (fileName: string, displayName: string, type?: string, path?: string) => {
    setPreview({ fileName, displayName, type, path })
    setPreviewOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="bg-white dark:bg-slate-800 shadow-sm">
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upload Files</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag and drop files or click to browse. Supported formats: PDF, JPG, PNG, DICOM
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              multiple
              className="w-64"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
            />
            {selectedFiles.length > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-300 max-w-[280px] truncate">
                {selectedFiles.map(f => f.name).join(', ')}
              </div>
            )}
            <Button
              className="theme-button text-white"
              onClick={async () => {
                if (!patientId || selectedFiles.length === 0) return
                const createdBy = getUserId() || undefined
                await createMutation.mutateAsync({
                  patientId,
                  name: selectedFiles[0]?.name || "Attachment",
                  createdBy,
                  files: selectedFiles,
                })
                setSelectedFiles([])
                await refetch()
              }}
              disabled={createMutation.isPending || selectedFiles.length === 0}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              {createMutation.isPending ? "Uploading..." : "Upload Files"}
            </Button>
          </div>
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
        />
      )}



      {/* All Files */}
      <Card className="bg-white dark:bg-slate-800 shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Files</h3>
          </div>
          
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <Input
              id="search-files"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading files...</div>
            ) : filteredFiles.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Uploaded By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredFiles.map((file) => (
                    <tr key={file.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {file.type === 'pdf' ? (
                            <FileText className="h-6 w-6 text-red-500 dark:text-red-400 mr-3" />
                          ) : file.type === 'image' ? (
                            <FileImage className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-3" />
                          ) : (
                            <File className="h-6 w-6 text-gray-500 dark:text-gray-400 mr-3" />
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {file.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {file.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {file.size}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {file.uploadedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3"
                            onClick={() => openPreview((file.uploadFileName || "") as string, file.name, file.type, file.path)}
                          >
                            View
                          </Button>
                          {/* Download removed per request */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center">
                <div className="h-16 w-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                  <Inbox className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No files found</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Upload files to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 