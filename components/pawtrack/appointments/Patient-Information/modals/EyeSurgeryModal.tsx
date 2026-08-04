"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { X } from "lucide-react"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/get-procedure-documentation-details"
import { useUpdateProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/update-procedure-documentation-details"

interface EyeSurgeryModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface EyeSurgeryFormData {
  surgeryType: string
  eyeSide: string
  anesthesiaType: string
  surgeryDateTime: string
  surgeon: string
  complications: string
  postOpInstructions: string
  ownerConsent: boolean
  notes: string
}

export default function EyeSurgeryModal({ open, onClose, patientId, appointmentId, procedureId }: EyeSurgeryModalProps) {
  const surgeryTypes = [
    { value: "entropion", label: "Entropion Correction" },
    { value: "cherry-eye", label: "Cherry Eye Repair" },
    { value: "eyelid-mass", label: "Eyelid Mass Removal" },
    { value: "enucleation", label: "Enucleation" },
    { value: "other", label: "Other" }
  ]

  const eyeSides = [
    { value: "left", label: "Left Eye" },
    { value: "right", label: "Right Eye" },
    { value: "both", label: "Both Eyes" }
  ]

  const anesthesiaTypes = [
    { value: "general", label: "General" },
    { value: "local", label: "Local" },
    { value: "sedation", label: "Sedation" }
  ]

  const [formData, setFormData] = useState<EyeSurgeryFormData>({
    surgeryType: "",
    eyeSide: "",
    anesthesiaType: "",
    surgeryDateTime: new Date().toISOString().slice(0, 16),
    surgeon: "",
    complications: "",
    postOpInstructions: "",
    ownerConsent: false,
    notes: ""
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
        const newFormData = {
          surgeryType: parsedDetails.surgeryType || "",
          eyeSide: parsedDetails.eyeSide || "",
          anesthesiaType: parsedDetails.anesthesiaType || "",
          surgeryDateTime: parsedDetails.surgeryDateTime || new Date().toISOString().slice(0, 16),
          surgeon: parsedDetails.surgeon || "",
          complications: parsedDetails.complications || "",
          postOpInstructions: parsedDetails.postOpInstructions || "",
          ownerConsent: !!parsedDetails.ownerConsent,
          notes: parsedDetails.notes || ""
        }
        // Only update if different
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
        surgeryType: "",
        eyeSide: "",
        anesthesiaType: "",
        surgeryDateTime: new Date().toISOString().slice(0, 16),
        surgeon: "",
        complications: "",
        postOpInstructions: "",
        ownerConsent: false,
        notes: ""
      })
      setFormInitialized(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureDocumentDetails])

  const handleInputChange = (field: keyof EyeSurgeryFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    // Validate required fields
    const requiredFields = ['surgeryType', 'eyeSide', 'anesthesiaType', 'surgeryDateTime', 'surgeon']
    const missingFields = requiredFields.filter(field => !formData[field as keyof EyeSurgeryFormData])
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`)
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
      // Convert form data to JSON string
      const documentDetailsJson = JSON.stringify(formData)
      
      if (procedureDocumentDetails?.id) {
        // Update existing documentation
        await updateDocumentMutation.mutateAsync({
          id: procedureDocumentDetails.id,
          documentDetails: documentDetailsJson
        })
        
        toast.success("Eye surgery documentation updated successfully!")
        return true
      } else {
        // No existing documentation to update
        toast.error("No documentation record found to update")
        return false
      }
    } catch (error) {
      console.error("Error saving eye surgery documentation:", error)
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
            👁️ Eye Surgery Documentation
          </SheetTitle>
        </SheetHeader>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Info:</strong> Pet and client information will be automatically linked from the existing appointment record.
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
                <Label htmlFor="surgeryType">
                  Surgery Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.surgeryType} onValueChange={(value) => handleInputChange('surgeryType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select surgery type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {surgeryTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eyeSide">
                  Eye Side <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.eyeSide} onValueChange={(value) => handleInputChange('eyeSide', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select eye..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eyeSides.map(side => (
                      <SelectItem key={side.value} value={side.value}>{side.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="anesthesiaType">
                  Anesthesia Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.anesthesiaType} onValueChange={(value) => handleInputChange('anesthesiaType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select anesthesia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {anesthesiaTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="surgeryDateTime">
                  Surgery Date & Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.surgeryDateTime}
                  onChange={(e) => handleInputChange('surgeryDateTime', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="surgeon">
                Surgeon <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={formData.surgeon}
                onChange={(e) => handleInputChange('surgeon', e.target.value)}
                placeholder="Name of surgeon"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complications">Intra/Post-Op Complications</Label>
              <Textarea
                value={formData.complications}
                onChange={(e) => handleInputChange('complications', e.target.value)}
                placeholder="Describe any complications during or after surgery..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postOpInstructions">Post-Op Instructions</Label>
              <Textarea
                value={formData.postOpInstructions}
                onChange={(e) => handleInputChange('postOpInstructions', e.target.value)}
                placeholder="Instructions for post-operative care, medications, follow-up, etc."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any other relevant notes..."
                rows={3}
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ownerConsent"
                  checked={formData.ownerConsent}
                  onCheckedChange={(checked) => handleInputChange('ownerConsent', checked as boolean)}
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