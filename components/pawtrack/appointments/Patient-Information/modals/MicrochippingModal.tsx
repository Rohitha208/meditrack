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

interface MicrochippingModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface MicrochippingFormData {
  chipNumber: string
  manufacturer: string
  implantationSite: string
  implantationDateTime: string
  implanter: string
  ownerConsent: boolean
  notes: string
}

export default function MicrochippingModal({ open, onClose, patientId, appointmentId, procedureId }: MicrochippingModalProps) {
  const [formData, setFormData] = useState<MicrochippingFormData>({
    chipNumber: "",
    manufacturer: "",
    implantationSite: "",
    implantationDateTime: new Date().toISOString().slice(0, 16),
    implanter: "",
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
        console.log("Loaded procedure documentation details:", parsedDetails)
        
        // Create a new form data object with the parsed details
        const newFormData = {
          chipNumber: parsedDetails.chipNumber || "",
          manufacturer: parsedDetails.manufacturer || "",
          implantationSite: parsedDetails.implantationSite || "",
          implantationDateTime: parsedDetails.implantationDateTime || new Date().toISOString().slice(0, 16),
          implanter: parsedDetails.implanter || "",
          notes: parsedDetails.notes || "",
          
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
        chipNumber: "",
        manufacturer: "",
        implantationSite: "",
        implantationDateTime: new Date().toISOString().slice(0, 16),
        implanter: "",
        ownerConsent: false,
        notes: ""
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails, formData])

  const manufacturers = [
    { value: "avid", label: "AVID" },
    { value: "homeagain", label: "HomeAgain" },
    { value: "datamars", label: "Datamars" },
    { value: "trovan", label: "Trovan" },
    { value: "other", label: "Other" }
  ]

  const implantationSites = [
    { value: "scruff", label: "Scruff of Neck" },
    { value: "shoulder", label: "Shoulder Area" },
    { value: "other", label: "Other" }
  ]

  const handleInputChange = (field: keyof MicrochippingFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    // Validate required fields
    const requiredFields = ['chipNumber', 'manufacturer', 'implantationSite', 'implantationDateTime', 'implanter']
    const missingFields = requiredFields.filter(field => !formData[field as keyof MicrochippingFormData])
    
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
      
      toast.success("Microchipping documentation updated successfully!")
      return true
    } catch (error) {
      console.error("Error saving microchipping documentation:", error)
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
            🏷️ Microchipping Documentation
          </SheetTitle>
        </SheetHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Info:</strong> Pet and client information will be automatically linked from the existing appointment record.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chipNumber">
                    Microchip Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.chipNumber}
                    onChange={(e) => handleInputChange('chipNumber', e.target.value)}
                    placeholder="Enter microchip number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">
                    Manufacturer <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.manufacturer} onValueChange={(value) => handleInputChange('manufacturer', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select manufacturer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {manufacturers.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="implantationSite">
                    Implantation Site <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.implantationSite} onValueChange={(value) => handleInputChange('implantationSite', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select site..." />
                    </SelectTrigger>
                    <SelectContent>
                      {implantationSites.map(site => (
                        <SelectItem key={site.value} value={site.value}>{site.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="implantationDateTime">
                    Implantation Date & Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    value={formData.implantationDateTime}
                    onChange={(e) => handleInputChange('implantationDateTime', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="implanter">
                  Implanter <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.implanter}
                  onChange={(e) => handleInputChange('implanter', e.target.value)}
                  placeholder="Name of person who implanted"
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
          </>
        )}
      </SheetContent>
    </Sheet>
  )
} 