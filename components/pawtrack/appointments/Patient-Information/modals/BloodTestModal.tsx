"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { X } from "lucide-react"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/get-procedure-documentation-details"
import { useUpdateProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/update-procedure-documentation-details"

interface BloodTestModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface BloodTestFormData {
  testType: string
  collectionSite: string
  collectedBy: string
  sampleVolume: string
  notes: string
  fastingStatus: boolean
  ownerConsent: boolean
}

export default function BloodTestModal({ open, onClose, patientId, appointmentId, procedureId }: BloodTestModalProps) {
  const [formData, setFormData] = useState<BloodTestFormData>({
    testType: "",
    collectionSite: "",
    collectedBy: "",
    sampleVolume: "",
    notes: "",
    fastingStatus: false,
    ownerConsent: false
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
          testType: parsedDetails.testType || "",
          collectionSite: parsedDetails.collectionSite || "",
          collectedBy: parsedDetails.collectedBy || "",
          sampleVolume: parsedDetails.sampleVolume || "",
          // Ensure boolean values for checkboxes
          fastingStatus: !!parsedDetails.fastingStatus,
          ownerConsent: !!parsedDetails.ownerConsent,
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
        testType: "",
        collectionSite: "",
        collectedBy: "",
        sampleVolume: "",
        notes: "",
        fastingStatus: false,
        ownerConsent: false
      })
    }
  }, [procedureDocumentDetails])

  const testTypes = [
    { value: "cbc", label: "Complete Blood Count (CBC)" },
    { value: "chemistry", label: "Chemistry Panel" },
    { value: "electrolytes", label: "Electrolytes" },
    { value: "thyroid", label: "Thyroid Panel" },
    { value: "heartworm", label: "Heartworm Test" },
    { value: "feline-viral", label: "Feline Viral Panel" }
  ]

  const collectionSites = [
    { value: "jugular", label: "Jugular Vein" },
    { value: "cephalic", label: "Cephalic Vein" },
    { value: "saphenous", label: "Saphenous Vein" },
    { value: "ear-prick", label: "Ear Prick" }
  ]

  const handleInputChange = (field: keyof BloodTestFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    const requiredFields = ['testType', 'collectionSite', 'collectedBy']
    const missingFields = requiredFields.filter(field => !formData[field as keyof BloodTestFormData])
    
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
        
        toast.success("Blood test documentation updated successfully!")
      } else {
        // No existing documentation to update
        toast.error("No documentation record found to update")
        return
      }
      
      onClose()
    } catch (error) {
      console.error("Error saving blood test documentation:", error)
      toast.error(`Failed to save documentation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:!max-w-[600px] md:!max-w-[600px] overflow-x-hidden overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🩸 Blood Test Documentation
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
              <Label htmlFor="testType">
                Blood Test Type <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.testType || ""} 
                onValueChange={(value) => handleInputChange('testType', value)}
              >
                <SelectTrigger id="testType">
                  <SelectValue placeholder="Select test type..." />
                </SelectTrigger>
                <SelectContent>
                  {testTypes.map(test => (
                    <SelectItem key={test.value} value={test.value}>{test.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="collectionSite">
                Collection Site <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.collectionSite || ""} 
                onValueChange={(value) => handleInputChange('collectionSite', value)}
              >
                <SelectTrigger id="collectionSite">
                  <SelectValue placeholder="Select collection site..." />
                </SelectTrigger>
                <SelectContent>
                  {collectionSites.map(site => (
                    <SelectItem key={site.value} value={site.value}>{site.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="collectedBy">
                  Collected By <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="collectedBy"
                  value={formData.collectedBy}
                  onChange={(e) => handleInputChange('collectedBy', e.target.value)}
                  placeholder="Enter name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sampleVolume">Sample Volume (ml)</Label>
                <Input
                  id="sampleVolume"
                  type="text"
                  value={formData.sampleVolume}
                  onChange={(e) => handleInputChange('sampleVolume', e.target.value)}
                  placeholder="e.g., 5ml"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional observations"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fastingStatus"
                  checked={formData.fastingStatus}
                  onCheckedChange={(checked) => handleInputChange('fastingStatus', checked as boolean)}
                />
                <Label htmlFor="fastingStatus">Pet was fasting at time of collection</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ownerConsent"
                  checked={formData.ownerConsent}
                  onCheckedChange={(checked) => handleInputChange('ownerConsent', checked as boolean)}
                  required
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
