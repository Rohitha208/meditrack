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
import { X, AlertTriangle } from "lucide-react"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/get-procedure-documentation-details"
import { useUpdateProcedureDocumentDetails } from "@/queries/procedureDocumentationDetails/update-procedure-documentation-details"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AllergyModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface AllergyFormData {
  therapyType: string
  allergenType: string[]
  administrationRoute: string
  concentration: string
  dosage: string
  frequency: string
  startDate: string
  nextDueDate: string
  previousReactions: string
  skinTestDate: string
  bloodTestDate: string
  allergenManufacturer: string
  batchNumber: string
  expiryDate: string
  administeredBy: string
  observationPeriod: string
  postInjectionReaction: string
  emergencyKitChecked: boolean
  premedication: string
  ownerConsent: boolean
  notes: string
}

export default function AllergyModal({ open, onClose, patientId, appointmentId, procedureId }: AllergyModalProps) {
  const [formData, setFormData] = useState<AllergyFormData>({
    therapyType: "",
    allergenType: [],
    administrationRoute: "",
    concentration: "",
    dosage: "",
    frequency: "",
    startDate: new Date().toISOString().slice(0, 16),
    nextDueDate: "",
    previousReactions: "",
    skinTestDate: "",
    bloodTestDate: "",
    allergenManufacturer: "",
    batchNumber: "",
    expiryDate: "",
    administeredBy: "",
    observationPeriod: "",
    postInjectionReaction: "",
    emergencyKitChecked: false,
    premedication: "",
    ownerConsent: false,
    notes: ""
  })
  
  const [formInitialized, setFormInitialized] = useState(false)

  // Get visit data from appointment ID
  const { data: visitData, isLoading: isVisitLoading } = useGetVisitByAppointmentId(appointmentId)

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
        
        // Create a new form data object with the parsed details
        const newFormData = {
          therapyType: parsedDetails.therapyType || "",
          administrationRoute: parsedDetails.administrationRoute || "",
          frequency: parsedDetails.frequency || "",
          observationPeriod: parsedDetails.observationPeriod || "",
          // Ensure array values
          allergenType: parsedDetails.allergenType || [],
          // Ensure boolean values for checkboxes
          emergencyKitChecked: !!parsedDetails.emergencyKitChecked,
          ownerConsent: !!parsedDetails.ownerConsent,
          notes: parsedDetails.notes || "",
          concentration: parsedDetails.concentration || "",
          dosage: parsedDetails.dosage || "",
          startDate: parsedDetails.startDate || new Date().toISOString().slice(0, 16),
          nextDueDate: parsedDetails.nextDueDate || "",
          previousReactions: parsedDetails.previousReactions || "",
          skinTestDate: parsedDetails.skinTestDate || "",
          bloodTestDate: parsedDetails.bloodTestDate || "",
          allergenManufacturer: parsedDetails.allergenManufacturer || "",
          batchNumber: parsedDetails.batchNumber || "",
          expiryDate: parsedDetails.expiryDate || "",
          administeredBy: parsedDetails.administeredBy || "",
          postInjectionReaction: parsedDetails.postInjectionReaction || "",
          premedication: parsedDetails.premedication || "",
        }
        
        if (JSON.stringify(formData) !== JSON.stringify(newFormData)) {
          setFormData(newFormData)
          setFormInitialized(true)
        }
      } catch (error) {
        // Silent fail - if we can't parse the data, we'll just use the default form
      }
    } else if (formInitialized) {
      // Only reset if not already reset
      setFormData({
        therapyType: "",
        allergenType: [],
        administrationRoute: "",
        concentration: "",
        dosage: "",
        frequency: "",
        startDate: new Date().toISOString().slice(0, 16),
        nextDueDate: "",
        previousReactions: "",
        skinTestDate: "",
        bloodTestDate: "",
        allergenManufacturer: "",
        batchNumber: "",
        expiryDate: "",
        administeredBy: "",
        observationPeriod: "",
        postInjectionReaction: "",
        emergencyKitChecked: false,
        premedication: "",
        ownerConsent: false,
        notes: ""
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const therapyTypes = [
    { value: "subcutaneous", label: "Subcutaneous Immunotherapy (SCIT)" },
    { value: "sublingual", label: "Sublingual Immunotherapy (SLIT)" },
    { value: "oral", label: "Oral Immunotherapy" },
    { value: "custom", label: "Custom Protocol" }
  ]

  const allergenTypes = [
    { value: "dust-mites", label: "Dust Mites" },
    { value: "pollen", label: "Pollen" },
    { value: "mold", label: "Mold" },
    { value: "dander", label: "Dander" },
    { value: "insects", label: "Insects" },
    { value: "food", label: "Food Proteins" }
  ]

  const administrationRoutes = [
    { value: "subcutaneous", label: "Subcutaneous Injection" },
    { value: "sublingual", label: "Sublingual Drops" },
    { value: "oral", label: "Oral Administration" }
  ]

  const frequencies = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "custom", label: "Custom Schedule" }
  ]

  const observationPeriods = [
    { value: "15", label: "15 Minutes" },
    { value: "30", label: "30 Minutes" },
    { value: "45", label: "45 Minutes" },
    { value: "60", label: "60 Minutes" }
  ]

  const handleInputChange = (field: keyof AllergyFormData, value: string | string[] | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    if (!procedureId) {
      toast.error("No procedure ID available. Please select a procedure first.")
      return false
    }
    
    // Validate required fields
    const requiredFields = [
      'therapyType',
      'administrationRoute',
      'concentration',
      'dosage',
      'frequency',
      'startDate',
      'nextDueDate',
      'allergenManufacturer',
      'batchNumber',
      'expiryDate',
      'administeredBy',
      'observationPeriod'
    ]
    const missingFields = requiredFields.filter(field => !formData[field as keyof AllergyFormData])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      return false
    }
    
    if (!formData.ownerConsent) {
      toast.error("Owner consent is required")
      return false
    }

    if (formData.allergenType.length === 0) {
      toast.error("At least one allergen type must be selected")
      return false
    }

    if (!formData.emergencyKitChecked) {
      toast.error("Emergency kit must be checked before proceeding")
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
      
      toast.success("Allergy desensitization documentation updated successfully!")
      return true
    } catch (error) {
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

  // Update handleSaveClick to better handle loading states
  const handleSaveClick = async () => {
    if (isVisitLoading || isLoading) {
      toast.error("Please wait until data is fully loaded before saving")
      return
    }
    
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
            💉 Allergy Desensitization Documentation
          </SheetTitle>
        </SheetHeader>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Info:</strong> Pet and client information will be automatically linked from the existing appointment record.
          </p>
        </div>
        
        {!procedureId && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No procedure ID provided. Please go back and select a procedure first.
            </AlertDescription>
          </Alert>
        )}

        {(isLoading || isVisitLoading) ? (
          <div className="flex items-center justify-center p-8">
            <p>Loading procedure documentation...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* The form fields remain the same */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="therapyType">
                  Therapy Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.therapyType} onValueChange={(value) => handleInputChange('therapyType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select therapy type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {therapyTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="administrationRoute">
                  Administration Route <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.administrationRoute} onValueChange={(value) => handleInputChange('administrationRoute', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select route..." />
                  </SelectTrigger>
                  <SelectContent>
                    {administrationRoutes.map(route => (
                      <SelectItem key={route.value} value={route.value}>{route.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Allergen Types <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {allergenTypes.map(allergen => (
                  <div key={allergen.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`allergen-${allergen.value}`}
                      checked={formData.allergenType.includes(allergen.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleInputChange('allergenType', [...formData.allergenType, allergen.value])
                        } else {
                          handleInputChange('allergenType', formData.allergenType.filter(a => a !== allergen.value))
                        }
                      }}
                    />
                    <Label htmlFor={`allergen-${allergen.value}`}>{allergen.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="concentration">
                  Concentration <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.concentration}
                  onChange={(e) => handleInputChange('concentration', e.target.value)}
                  placeholder="e.g., 1:10,000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dosage">
                  Dosage <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => handleInputChange('dosage', e.target.value)}
                  placeholder="e.g., 0.2 ml"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">
                  Frequency <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.frequency} onValueChange={(value) => handleInputChange('frequency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency..." />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencies.map(freq => (
                      <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextDueDate">
                  Next Due Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.nextDueDate}
                  onChange={(e) => handleInputChange('nextDueDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="skinTestDate">Skin Test Date</Label>
                <Input
                  type="date"
                  value={formData.skinTestDate}
                  onChange={(e) => handleInputChange('skinTestDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodTestDate">Blood Test Date</Label>
                <Input
                  type="date"
                  value={formData.bloodTestDate}
                  onChange={(e) => handleInputChange('bloodTestDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="allergenManufacturer">
                  Manufacturer <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.allergenManufacturer}
                  onChange={(e) => handleInputChange('allergenManufacturer', e.target.value)}
                  placeholder="Enter manufacturer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batchNumber">
                  Batch Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.batchNumber}
                  onChange={(e) => handleInputChange('batchNumber', e.target.value)}
                  placeholder="Enter batch number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">
                  Expiry Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="administeredBy">
                  Administered By <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.administeredBy}
                  onChange={(e) => handleInputChange('administeredBy', e.target.value)}
                  placeholder="Name of administrator"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observationPeriod">
                  Observation Period <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.observationPeriod} onValueChange={(value) => handleInputChange('observationPeriod', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period..." />
                  </SelectTrigger>
                  <SelectContent>
                    {observationPeriods.map(period => (
                      <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousReactions">Previous Reactions</Label>
              <Textarea
                value={formData.previousReactions}
                onChange={(e) => handleInputChange('previousReactions', e.target.value)}
                placeholder="Document any previous reactions to immunotherapy..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postInjectionReaction">Post-Administration Reaction</Label>
              <Textarea
                value={formData.postInjectionReaction}
                onChange={(e) => handleInputChange('postInjectionReaction', e.target.value)}
                placeholder="Document any reactions during observation period..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="premedication">Premedication</Label>
              <Input
                type="text"
                value={formData.premedication}
                onChange={(e) => handleInputChange('premedication', e.target.value)}
                placeholder="Enter any premedication given"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any other relevant notes about the desensitization procedure..."
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emergencyKitChecked"
                  checked={formData.emergencyKitChecked}
                  onCheckedChange={(checked) => handleInputChange('emergencyKitChecked', checked as boolean)}
                />
                <Label htmlFor="emergencyKitChecked">
                  Emergency kit checked and available <span className="text-red-500">*</span>
                </Label>
              </div>

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