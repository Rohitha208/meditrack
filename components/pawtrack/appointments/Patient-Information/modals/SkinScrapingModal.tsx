"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { X } from "lucide-react"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/get-procedure-documentation-details"
import { useUpdateProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/update-procedure-documentation-details"

interface SkinScrapingModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface SkinScrapingFormData {
  sampleSite: string
  collectionTime: string
  clinicalNotes: string
  ownerConsent: boolean
}

export default function SkinScrapingModal({ open, onClose, patientId, appointmentId, procedureId }: SkinScrapingModalProps) {
  const [formData, setFormData] = useState<SkinScrapingFormData>({
    sampleSite: "",
    collectionTime: new Date().toISOString().slice(0, 16),
    clinicalNotes: "",
    ownerConsent: false
  })

  const [formInitialized, setFormInitialized] = useState(false)

  // Get visit data from appointment ID
  const { data: visitData } = useGetVisitByAppointmentId(appointmentId)

  // Get procedure documentation details using visit ID and procedure ID
  const { data: procedureDocumentDetails, isLoading } = useProcedureDocumentDetails(
    visitData?.id,
    procedureId,
    !!visitData?.id && !!procedureId && open
  )

  // Get update mutation
  const updateDocumentMutation = useUpdateProcedureDocumentDetails()

  // Populate form with existing data when available
  useEffect(() => {
    if (procedureDocumentDetails && procedureDocumentDetails.documentDetails) {
      try {
        const parsedDetails = JSON.parse(procedureDocumentDetails.documentDetails)
        console.log("Loaded procedure documentation details:", parsedDetails)
        
        // Create a new form data object with the parsed details
        const newFormData = {
          sampleSite: parsedDetails.sampleSite || "",
          collectionTime: parsedDetails.collectionTime || new Date().toISOString().slice(0, 16),
          clinicalNotes: parsedDetails.clinicalNotes || "",
          
          // Ensure boolean values for checkboxes
          ownerConsent: !!parsedDetails.ownerConsent
        }
        
        if (JSON.stringify(formData) !== JSON.stringify(newFormData)) {
          setFormData(newFormData)
          setFormInitialized(true)
        }
      } catch (error) {
        console.error("Failed to parse procedure document details:", error)
      }
    } else if (formInitialized) {
      // Only reset if not already reset
      setFormData({
        sampleSite: "",
        collectionTime: new Date().toISOString().slice(0, 16),
        clinicalNotes: "",
        ownerConsent: false
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const handleInputChange = (field: keyof SkinScrapingFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    if (!formData.sampleSite || !formData.collectionTime) {
      toast.error("Please fill in required fields: sample site and collection time")
      return false
    }

    if (!formData.ownerConsent) {
      toast.error("Owner consent is required")
      return false
    }

    if (!visitData?.id || !procedureId) {
      toast.error("Visit data or procedure ID not available")
      return false
    }

    try {
      if (!procedureDocumentDetails?.id) {
        toast.error("No documentation record found to update")
        return false
      }

      // Convert form data to JSON string
      const documentDetailsJson = JSON.stringify(formData)
      
      // Update existing documentation
      await updateDocumentMutation.mutateAsync({
        id: procedureDocumentDetails.id,
        documentDetails: documentDetailsJson
      })
      
      toast.success("Skin scraping documentation updated successfully")
      return true
    } catch (error) {
      console.error("Error saving skin scraping documentation:", error)
      // Check for Zod validation errors
      if (error instanceof Error && error.message.includes("Zod")) {
        toast.error(`Validation error: ${error.message}`)
      } else {
        toast.error(`Failed to save documentation: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await saveDocumentation()
    if (success) {
      onClose()
    }
  }

  // This is a direct button click handler that doesn't rely on the form submission
  const handleSaveClick = async () => {
    const success = await saveDocumentation()
    if (success) {
      onClose()
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[70%] lg:!max-w-[70%] overflow-x-hidden overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🧫 Skin Scraping Documentation
          </SheetTitle>
        </SheetHeader>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This procedure is used to detect mites or fungal infections on the skin.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sampleSite">
                Sample Site <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                id="sampleSite"
                value={formData.sampleSite}
                onChange={(e) => handleInputChange("sampleSite", e.target.value)}
                placeholder="e.g., Dorsal neck, inner thigh"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collectionTime">
                Collection Date & Time <span className="text-red-500">*</span>
              </Label>
              <Input
                type="datetime-local"
                id="collectionTime"
                value={formData.collectionTime}
                onChange={(e) => handleInputChange("collectionTime", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicalNotes">Clinical Notes</Label>
              <Textarea
                id="clinicalNotes"
                value={formData.clinicalNotes}
                onChange={(e) => handleInputChange("clinicalNotes", e.target.value)}
                placeholder="Observed skin lesions, irritation, suspected parasites, etc."
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ownerConsent"
                  checked={formData.ownerConsent}
                  onCheckedChange={(checked) => handleInputChange("ownerConsent", checked as boolean)}
                />
                <Label htmlFor="ownerConsent">
                  Owner consent obtained <span className="text-red-500">*</span>
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSaveClick} 
                disabled={updateDocumentMutation.isPending}
              >
                {updateDocumentMutation.isPending 
                  ? "Saving..." 
                  : "Save"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
