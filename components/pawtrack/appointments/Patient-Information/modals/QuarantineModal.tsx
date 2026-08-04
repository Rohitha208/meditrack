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

interface QuarantineModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface QuarantineFormData {
  reasonForQuarantine: string
  startDate: string
  endDate: string
  quarantineLocation: string
  observation: string
  ownerConsent: boolean
  notes: string
}

export default function QuarantineModal({ open, onClose, patientId, appointmentId, procedureId }: QuarantineModalProps) {
  const [formData, setFormData] = useState<QuarantineFormData>({
    reasonForQuarantine: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    quarantineLocation: "",
    observation: "",
    ownerConsent: false,
    notes: ""
  })

  // Get visit data from appointment ID
  const { data: visitData } = useGetVisitByAppointmentId(appointmentId)
  const [formInitialized, setFormInitialized] = useState(false)

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
          reasonForQuarantine: parsedDetails.reasonForQuarantine || "",
          quarantineLocation: parsedDetails.quarantineLocation || "",
          // Ensure date values are correctly formatted
          startDate: parsedDetails.startDate || new Date().toISOString().slice(0, 10),
          endDate: parsedDetails.endDate || "",
          // Ensure boolean values for checkboxes
          ownerConsent: !!parsedDetails.ownerConsent,
          observation: parsedDetails.observation || "",
          notes: parsedDetails.notes || ""
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
        reasonForQuarantine: "",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: "",
        quarantineLocation: "",
        observation: "",
        ownerConsent: false,
        notes: ""
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const quarantineReasons = [
    { value: "infectious-disease", label: "Infectious Disease" },
    { value: "import-regulations", label: "Import Regulations" },
    { value: "exposure-rabies", label: "Rabies Exposure" },
    { value: "other", label: "Other" }
  ]

  const quarantineLocations = [
    { value: "home", label: "Home Quarantine" },
    { value: "clinic", label: "Clinic/Hospital" },
    { value: "specialized-facility", label: "Specialized Quarantine Facility" },
    { value: "other", label: "Other" }
  ]

  const handleInputChange = (field: keyof QuarantineFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    const requiredFields = ['reasonForQuarantine', 'startDate', 'endDate', 'quarantineLocation']
    const missingFields = requiredFields.filter(field => !formData[field as keyof QuarantineFormData])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      return
    }
    
    if (!formData.ownerConsent) {
      toast.error("Owner consent is required")
      return
    }

    if (!visitData?.id || !procedureId) {
      toast.error("Visit data or procedure ID not available")
      return
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
        
        toast.success("Quarantine documentation updated successfully!")
      } else {
        // No existing documentation to update
        toast.error("No documentation record found to update")
        return
      }
      
      onClose()
    } catch (error) {
      console.error("Error saving quarantine documentation:", error)
      toast.error(`Failed to save documentation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:!max-w-full md:!max-w-[70%] lg:!max-w-[70%] overflow-x-hidden overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🚨 Quarantine Documentation
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>

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
            <div className="space-y-2">
              <Label htmlFor="reasonForQuarantine">
                Reason for Quarantine <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.reasonForQuarantine || ""} 
                onValueChange={(value) => handleInputChange('reasonForQuarantine', value)}
              >
                <SelectTrigger id="reasonForQuarantine">
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  {quarantineReasons.map(reason => (
                    <SelectItem key={reason.value} value={reason.value}>{reason.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quarantineLocation">
                Quarantine Location <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.quarantineLocation || ""} 
                onValueChange={(value) => handleInputChange('quarantineLocation', value)}
              >
                <SelectTrigger id="quarantineLocation">
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {quarantineLocations.map(location => (
                    <SelectItem key={location.value} value={location.value}>{location.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observation">Observation Requirements</Label>
              <Textarea
                value={formData.observation}
                onChange={(e) => handleInputChange('observation', e.target.value)}
                placeholder="Specific observation instructions..."
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="ownerConsent"
                checked={formData.ownerConsent}
                onCheckedChange={(checked) => handleInputChange('ownerConsent', checked as boolean)}
                required
              />
              <Label htmlFor="ownerConsent">
                Owner consent obtained for quarantine procedure <span className="text-red-500">*</span>
              </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
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