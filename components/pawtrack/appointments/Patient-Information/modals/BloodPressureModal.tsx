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

interface BloodPressureModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface BloodPressureFormData {
  systolic: string
  diastolic: string
  measurementTime: string
  clinicalNotes: string
  ownerConsent: boolean
}

export default function BloodPressureModal({ open, onClose, patientId, appointmentId, procedureId }: BloodPressureModalProps) {
  const [formData, setFormData] = useState<BloodPressureFormData>({
    systolic: "",
    diastolic: "",
    measurementTime: new Date().toISOString().slice(0, 16),
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
          systolic: parsedDetails.systolic || "",
          diastolic: parsedDetails.diastolic || "",
          measurementTime: parsedDetails.measurementTime || new Date().toISOString().slice(0, 16),
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
      // Reset the form when no data is available
      setFormData({
        systolic: "",
        diastolic: "",
        measurementTime: new Date().toISOString().slice(0, 16),
        clinicalNotes: "",
        ownerConsent: false
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const handleInputChange = (field: keyof BloodPressureFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    const requiredFields = ["systolic", "diastolic", "measurementTime"]
    const missingFields = requiredFields.filter(field => !formData[field as keyof BloodPressureFormData])

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(", ")}`)
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

    if (!procedureDocumentDetails?.id) {
      toast.error("No documentation record found to update")
      return false
    }

    try {
      const documentDetailsJson = JSON.stringify(formData)
      
      await updateDocumentMutation.mutateAsync({
        id: procedureDocumentDetails.id,
        documentDetails: documentDetailsJson
      })
      
      toast.success("Blood pressure documentation updated successfully!")
      return true
    } catch (error) {
      console.error("Error saving documentation:", error)
      // Check for Zod validation errors
      if (error instanceof Error && error.message.includes("Zod")) {
        toast.error(`Validation error: ${error.message}`)
      } else {
        toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  // Direct button click handler
  const handleSaveClick = async () => {
    const success = await saveDocumentation()
    if (success) {
      onClose()
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[60%] lg:!max-w-[60%] overflow-x-hidden overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🩺 Blood Pressure Measurement
          </SheetTitle>
        </SheetHeader>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Used to assess cardiovascular or kidney health. Pet and appointment info are auto-linked.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Systolic Pressure (mmHg) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={formData.systolic}
                  onChange={(e) => handleInputChange("systolic", e.target.value)}
                  min="0"
                  placeholder="e.g., 120"
                />
              </div>

              <div className="space-y-2">
                <Label>Diastolic Pressure (mmHg) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={formData.diastolic}
                  onChange={(e) => handleInputChange("diastolic", e.target.value)}
                  min="0"
                  placeholder="e.g., 80"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Measurement Date & Time <span className="text-red-500">*</span></Label>
              <Input
                type="datetime-local"
                value={formData.measurementTime}
                onChange={(e) => handleInputChange("measurementTime", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Clinical Notes</Label>
              <Textarea
                value={formData.clinicalNotes}
                onChange={(e) => handleInputChange("clinicalNotes", e.target.value)}
                placeholder="Include any observed signs or veterinarian comments"
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
