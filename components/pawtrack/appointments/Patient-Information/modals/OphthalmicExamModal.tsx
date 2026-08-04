"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
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

interface OphthalmicExamModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface OphthalmicExamData {
  eyePressure: string
  visualResponse: string
  dischargeNotes: string
  clinicalNotes: string
  ownerConsent: boolean
}

export default function OphthalmicExamModal({ open, onClose, patientId, appointmentId, procedureId }: OphthalmicExamModalProps) {
  const [formData, setFormData] = useState<OphthalmicExamData>({
    eyePressure: "",
    visualResponse: "",
    dischargeNotes: "",
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
          eyePressure: parsedDetails.eyePressure || "",
          visualResponse: parsedDetails.visualResponse || "",
          dischargeNotes: parsedDetails.dischargeNotes || "",
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
        eyePressure: "",
        visualResponse: "",
        dischargeNotes: "",
        clinicalNotes: "",
        ownerConsent: false
      })
      setFormInitialized(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureDocumentDetails])

  const handleInputChange = (field: keyof OphthalmicExamData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const saveDocumentation = async () => {
    if (!formData.eyePressure || !formData.visualResponse || !formData.ownerConsent) {
      toast.error("Please complete all required fields and confirm owner consent")
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
      
      toast.success("Ophthalmic exam documentation updated successfully!")
      return true
    } catch (error) {
      console.error("Error saving ophthalmic exam documentation:", error)
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
      <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[70%] lg:!max-w-[60%] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            👁️ Ophthalmic Exam Documentation
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This form documents results of the eye examination, including intraocular pressure and visual response.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="eyePressure">Intraocular Pressure (mmHg) <span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  value={formData.eyePressure}
                  onChange={(e) => handleInputChange("eyePressure", e.target.value)}
                  placeholder="e.g., OS: 15, OD: 16"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visualResponse">Visual Response <span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  value={formData.visualResponse}
                  onChange={(e) => handleInputChange("visualResponse", e.target.value)}
                  placeholder="Normal, sluggish, absent, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dischargeNotes">Ocular Discharge / Abnormalities</Label>
                <Textarea
                  value={formData.dischargeNotes}
                  onChange={(e) => handleInputChange("dischargeNotes", e.target.value)}
                  placeholder="Note presence of discharge, cloudiness, redness, etc."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicalNotes">Clinical Notes</Label>
                <Textarea
                  value={formData.clinicalNotes}
                  onChange={(e) => handleInputChange("clinicalNotes", e.target.value)}
                  placeholder="Additional remarks from the examination..."
                  rows={3}
                />
              </div>

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
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
