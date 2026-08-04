// SpayModal.tsx
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

interface SpayModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface SpayFormData {
  anesthesiaType: string
  incisionDetails: string
  complications: string
  postOpInstructions: string
  painManagement: string
  ownerConsent: boolean
}

export default function SpayModal({ open, onClose, patientId, appointmentId, procedureId }: SpayModalProps) {
  const [formData, setFormData] = useState<SpayFormData>({
    anesthesiaType: "",
    incisionDetails: "",
    complications: "",
    postOpInstructions: "",
    painManagement: "",
    ownerConsent: false,
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
          incisionDetails: parsedDetails.incisionDetails || "",
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
        incisionDetails: "",
        complications: "",
        postOpInstructions: "",
        painManagement: "",
        ownerConsent: false,
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const handleInputChange = (field: keyof SpayFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const saveDocumentation = async () => {
    if (!formData.anesthesiaType) {
      toast.error("Please fill in the required anesthesia type field")
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
      
      toast.success("Spay procedure documentation updated successfully!")
      return true
    } catch (error) {
      console.error("Error saving spay procedure documentation:", error)
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
      <SheetContent side="right" className="w-full sm:max-w-full md:max-w-[70%] lg:max-w-[70%] overflow-x-hidden overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🐶 Spay (Ovariohysterectomy) Documentation
          </SheetTitle>
        </SheetHeader>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This procedure involves surgical removal of the ovaries and uterus. Ensure all post-op instructions are clearly recorded.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="anesthesiaType">Anesthesia Type <span className="text-red-500">*</span></Label>
              <Input
                value={formData.anesthesiaType}
                onChange={(e) => handleInputChange("anesthesiaType", e.target.value)}
                placeholder="e.g., Isoflurane, Propofol"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="incisionDetails">Incision Details</Label>
              <Textarea
                value={formData.incisionDetails}
                onChange={(e) => handleInputChange("incisionDetails", e.target.value)}
                placeholder="e.g., Midline incision, 2 inches"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complications">Complications Noted</Label>
              <Textarea
                value={formData.complications}
                onChange={(e) => handleInputChange("complications", e.target.value)}
                placeholder="Describe any intraoperative or postoperative complications."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="painManagement">Pain Management</Label>
              <Input
                value={formData.painManagement}
                onChange={(e) => handleInputChange("painManagement", e.target.value)}
                placeholder="e.g., Meloxicam 0.1mg/kg q24h for 3 days"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postOpInstructions">Post-op Instructions</Label>
              <Textarea
                value={formData.postOpInstructions}
                onChange={(e) => handleInputChange("postOpInstructions", e.target.value)}
                placeholder="e.g., Monitor incision site, restrict activity for 10 days"
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
                Owner consent obtained for procedure <span className="text-red-500">*</span>
              </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
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
