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

interface NeuterModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface NeuterFormData {
  anesthesiaType: string
  incisionLocation: string
  complications: string
  postOpInstructions: string
  painManagement: string
  ownerConsent: boolean
}

export default function NeuterModal({ open, onClose, patientId, appointmentId, procedureId }: NeuterModalProps) {
  const [formData, setFormData] = useState<NeuterFormData>({
    anesthesiaType: "",
    incisionLocation: "",
    complications: "",
    postOpInstructions: "",
    painManagement: "",
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
          anesthesiaType: parsedDetails.anesthesiaType || "",
          incisionLocation: parsedDetails.incisionLocation || "",
          complications: parsedDetails.complications || "",
          postOpInstructions: parsedDetails.postOpInstructions || "",
          painManagement: parsedDetails.painManagement || "",
          
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
        anesthesiaType: "",
        incisionLocation: "",
        complications: "",
        postOpInstructions: "",
        painManagement: "",
        ownerConsent: false
      })
      setFormInitialized(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureDocumentDetails])

  const handleInputChange = (field: keyof NeuterFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    if (!formData.anesthesiaType || !formData.incisionLocation || !formData.postOpInstructions || !formData.painManagement) {
      toast.error("Please fill in all required fields")
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
      
      toast.success("Neuter documentation updated successfully!")
      return true
    } catch (error) {
      console.error("Error saving neuter documentation:", error)
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
            🏥 Neuter (Castration) Documentation
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Anesthesia Type <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.anesthesiaType}
                  onChange={(e) => handleInputChange("anesthesiaType", e.target.value)}
                  placeholder="e.g., Isoflurane, Ketamine"
                />
              </div>

              <div className="space-y-2">
                <Label>Incision Location <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.incisionLocation}
                  onChange={(e) => handleInputChange("incisionLocation", e.target.value)}
                  placeholder="e.g., Pre-scrotal"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Intra/Post-Op Complications</Label>
              <Textarea
                value={formData.complications}
                onChange={(e) => handleInputChange("complications", e.target.value)}
                placeholder="e.g., Mild bleeding, scrotal swelling"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Post-Operative Instructions <span className="text-red-500">*</span></Label>
              <Textarea
                value={formData.postOpInstructions}
                onChange={(e) => handleInputChange("postOpInstructions", e.target.value)}
                placeholder="e.g., No licking, e-collar for 10 days, limit activity"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Pain Management Plan <span className="text-red-500">*</span></Label>
              <Textarea
                value={formData.painManagement}
                onChange={(e) => handleInputChange("painManagement", e.target.value)}
                placeholder="e.g., Meloxicam 0.1 mg/kg q24h for 3 days"
                rows={2}
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
                  Owner consent obtained for procedure <span className="text-red-500">*</span>
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
