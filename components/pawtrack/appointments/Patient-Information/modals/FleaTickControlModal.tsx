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

interface FleaTickControlModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface FleaTickControlFormData {
  productName: string
  productType: string
  dosage: string
  applicationMethod: string
  applicationDateTime: string
  nextDueDate: string
  ownerConsent: boolean
  notes: string
}

export default function FleaTickControlModal({ open, onClose, patientId, appointmentId, procedureId }: FleaTickControlModalProps) {
  const [formData, setFormData] = useState<FleaTickControlFormData>({
    productName: "",
    productType: "",
    dosage: "",
    applicationMethod: "",
    applicationDateTime: new Date().toISOString().slice(0, 16),
    nextDueDate: "",
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
          productName: parsedDetails.productName || "",
          productType: parsedDetails.productType || "",
          dosage: parsedDetails.dosage || "",
          applicationMethod: parsedDetails.applicationMethod || "",
          applicationDateTime: parsedDetails.applicationDateTime || new Date().toISOString().slice(0, 16),
          nextDueDate: parsedDetails.nextDueDate || "",
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
        productName: "",
        productType: "",
        dosage: "",
        applicationMethod: "",
        applicationDateTime: new Date().toISOString().slice(0, 16),
        nextDueDate: "",
        ownerConsent: false,
        notes: ""
      })
      setFormInitialized(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureDocumentDetails])

  const productTypes = [
    { value: "spot-on", label: "Spot-On Treatment" },
    { value: "oral", label: "Oral Medication" },
    { value: "collar", label: "Flea/Tick Collar" },
    { value: "spray", label: "Spray Treatment" },
    { value: "shampoo", label: "Medicated Shampoo" },
    { value: "injection", label: "Injectable Treatment" }
  ]

  const applicationMethods = [
    { value: "topical", label: "Topical Application" },
    { value: "oral", label: "Oral Administration" },
    { value: "collar", label: "Collar Placement" },
    { value: "injection", label: "Injection" },
    { value: "spray", label: "Spray Application" },
    { value: "bath", label: "Medicated Bath" }
  ]

  const handleInputChange = (field: keyof FleaTickControlFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    // Validate required fields
    const requiredFields = ['productName', 'productType', 'dosage', 'applicationMethod', 'applicationDateTime', 'nextDueDate']
    const missingFields = requiredFields.filter(field => !formData[field as keyof FleaTickControlFormData])
    
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
        
        toast.success("Flea and tick control documentation updated successfully!")
        return true
      } else {
        // No existing documentation to update
        toast.error("No documentation record found to update")
        return false
      }
    } catch (error) {
      console.error("Error saving flea/tick control documentation:", error)
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
      <SheetContent side="right" className="w-full sm:max-w-full md:max-w-[70%] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🐜 Flea & Tick Control Application
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
                <Label htmlFor="productName">
                  Product Name <span className="text-red-500">*</span>
                </Label>
                <Input 
                  value={formData.productName}
                  onChange={(e) => handleInputChange("productName", e.target.value)}
                  placeholder="e.g., Frontline Plus, Seresto"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="productType">
                  Product Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.productType} onValueChange={(val) => handleInputChange("productType", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dosage">
                Dosage <span className="text-red-500">*</span>
              </Label>
              <Input 
                value={formData.dosage}
                onChange={(e) => handleInputChange("dosage", e.target.value)}
                placeholder="e.g., 0.67ml for 10-20kg dog"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicationMethod">
                  Application Method <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.applicationMethod} onValueChange={(val) => handleInputChange("applicationMethod", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent>
                    {applicationMethods.map(method => (
                      <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="applicationDateTime">
                  Application Date & Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.applicationDateTime}
                  onChange={(e) => handleInputChange("applicationDateTime", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextDueDate">
                Next Due Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={formData.nextDueDate}
                onChange={(e) => handleInputChange("nextDueDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Record any other relevant details about the flea/tick treatment"
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