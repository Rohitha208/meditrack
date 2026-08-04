"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { X } from "lucide-react"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/get-procedure-documentation-details"
import { useUpdateProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/update-procedure-documentation-details"

interface DentalCleaningModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface DentalCleaningFormData {
  cleaningType: string
  anesthesiaType: string
  procedureDate: string
  findings: string
  notes: string
  complications: string
  ownerConsent: boolean
}

export default function DentalCleaningModal({ open, onClose, patientId, appointmentId, procedureId }: DentalCleaningModalProps) {
  const cleaningTypes = [
    { value: "scaling", label: "Scaling" },
    { value: "polishing", label: "Polishing" },
    { value: "scaling-polishing", label: "Scaling + Polishing" },
    { value: "other", label: "Other" }
  ]

  const anesthesiaTypes = [
    { value: "general", label: "General Anesthesia" },
    { value: "local", label: "Local Anesthesia" },
    { value: "none", label: "None" }
  ]
  
  const [formData, setFormData] = useState<DentalCleaningFormData>({
    cleaningType: "",
    anesthesiaType: "",
    procedureDate: new Date().toISOString().slice(0, 16),
    findings: "",
    notes: "",
    complications: "",
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

  const handleInputChange = (field: keyof DentalCleaningFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Populate form with existing data when available
  useEffect(() => {
    if (procedureDocumentDetails && procedureDocumentDetails.documentDetails) {
      try {
        const parsedDetails = JSON.parse(procedureDocumentDetails.documentDetails)
        console.log("Loaded procedure documentation details:", parsedDetails)
        
        // Create a new form data object with the parsed details
        const newFormData = {
          cleaningType: parsedDetails.cleaningType || "",
          anesthesiaType: parsedDetails.anesthesiaType || "",
          procedureDate: parsedDetails.procedureDate || new Date().toISOString().slice(0, 16),
          findings: parsedDetails.findings || "",
          notes: parsedDetails.notes || "",
          complications: parsedDetails.complications || "",
          
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
        cleaningType: "",
        anesthesiaType: "",
        procedureDate: new Date().toISOString().slice(0, 16),
        findings: "",
        notes: "",
        complications: "",
        ownerConsent: false
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const saveDocumentation = async () => {
    // Validate required fields
    const requiredFields = ['cleaningType', 'anesthesiaType', 'procedureDate']
    const missingFields = requiredFields.filter(field => !formData[field as keyof DentalCleaningFormData])
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
        
        toast.success("Dental cleaning documentation updated successfully!")
        return true
      } else {
        // No existing documentation to update
        toast.error("No documentation record found to update")
        return false
      }
    } catch (error) {
      console.error("Error saving dental cleaning documentation:", error)
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
            🦷 Dental Cleaning Documentation
          </SheetTitle>
        </SheetHeader>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Info:</strong> Scaling and polishing to prevent dental disease. Pet and client information will be automatically linked from the existing appointment record.
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
                <Label htmlFor="cleaningType">
                  Cleaning Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.cleaningType} onValueChange={(value) => handleInputChange('cleaningType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cleaning type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cleaningTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="anesthesiaType">
                  Anesthesia Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.anesthesiaType} onValueChange={(value) => handleInputChange('anesthesiaType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select anesthesia type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {anesthesiaTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="procedureDate">
                Procedure Date & Time <span className="text-red-500">*</span>
              </Label>
              <Input
                type="datetime-local"
                value={formData.procedureDate}
                onChange={(e) => handleInputChange('procedureDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="findings">Oral Findings</Label>
              <Textarea
                value={formData.findings}
                onChange={(e) => handleInputChange('findings', e.target.value)}
                placeholder="Describe any tartar, gingivitis, missing teeth, etc."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes or instructions..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complications">Complications (if any)</Label>
              <Textarea
                value={formData.complications}
                onChange={(e) => handleInputChange('complications', e.target.value)}
                placeholder="Describe any complications encountered during the procedure."
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