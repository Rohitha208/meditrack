"use client"

import React, { createContext, useContext, useState, useMemo, ReactNode } from "react"

export interface SelectedFile {
  id: string
  fileName: string
  displayName: string
  fileType?: string
  path?: string
  category?: string
  size?: string
}

interface SelectedFilesContextType {
  selectedFiles: SelectedFile[]
  addFile: (file: SelectedFile) => void
  removeFile: (fileId: string) => void
  toggleFile: (file: SelectedFile) => void
  clearFiles: () => void
  isFileSelected: (fileId: string) => boolean
}

const SelectedFilesContext = createContext<SelectedFilesContextType | undefined>(undefined)

interface SelectedFilesProviderProps {
  children: ReactNode
}

export function SelectedFilesProvider({ children }: SelectedFilesProviderProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])

  const addFile = (file: SelectedFile) => {
    setSelectedFiles((prev) => {
      if (prev.some((f) => f.id === file.id)) {
        return prev
      }
      return [...prev, file]
    })
  }

  const removeFile = (fileId: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const toggleFile = (file: SelectedFile) => {
    setSelectedFiles((prev) => {
      const isSelected = prev.some((f) => f.id === file.id)
      if (isSelected) {
        return prev.filter((f) => f.id !== file.id)
      } else {
        return [...prev, file]
      }
    })
  }

  const clearFiles = () => {
    setSelectedFiles([])
  }

  const isFileSelected = (fileId: string) => {
    return selectedFiles.some((f) => f.id === fileId)
  }

  const value = useMemo(
    () => ({
      selectedFiles,
      addFile,
      removeFile,
      toggleFile,
      clearFiles,
      isFileSelected,
    }),
    [selectedFiles]
  )

  return (
    <SelectedFilesContext.Provider value={value}>
      {children}
    </SelectedFilesContext.Provider>
  )
}

export function useSelectedFiles() {
  const context = useContext(SelectedFilesContext)
  if (context === undefined) {
    throw new Error("useSelectedFiles must be used within a SelectedFilesProvider")
  }
  return context
}

