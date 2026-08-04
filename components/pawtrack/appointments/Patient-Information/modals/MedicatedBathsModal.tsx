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

interface MedicatedBathsModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface MedicatedBathsFormData {
  primaryCondition: string
  secondaryConditions: string[]
  skinAssessment: string
  medicationName: string
  medicationType: string
  concentration: string
  dilutionRatio: string
  waterTemperature: string
  soakDuration: string
  affectedAreas: string[]
  preBathPreparation: string
  shampooType: string
  conditionerType: string
  dryingMethod: string
  skinReaction: string
  previousTreatments: string
  treatmentFrequency: string
  totalSessions: string
  currentSession: string
  postBathTreatment: string
  homeInstructions: string
  contraindicationChecked: boolean
  allergiesChecked: boolean
  eyeProtection: boolean
  treatmentDate: string
  nextSessionDate: string
  treatingGroomer: string
  ownerConsent: boolean
  notes: string
}

export default function MedicatedBathsModal({ open, onClose, patientId, appointmentId, procedureId }: MedicatedBathsModalProps) {
  const [formData, setFormData] = useState<MedicatedBathsFormData>({
    primaryCondition: "",
    secondaryConditions: [],
    skinAssessment: "",
    medicationName: "",
    medicationType: "",
    concentration: "",
    dilutionRatio: "",
    waterTemperature: "",
    soakDuration: "",
    affectedAreas: [],
    preBathPreparation: "",
    shampooType: "",
    conditionerType: "",
    dryingMethod: "",
    skinReaction: "",
    previousTreatments: "",
    treatmentFrequency: "",
    totalSessions: "",
    currentSession: "",
    postBathTreatment: "",
    homeInstructions: "",
    contraindicationChecked: false,
    allergiesChecked: false,
    eyeProtection: false,
    treatmentDate: new Date().toISOString().slice(0, 16),
    nextSessionDate: "",
    treatingGroomer: "",
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
          primaryCondition: parsedDetails.primaryCondition || "",
          skinAssessment: parsedDetails.skinAssessment || "",
          medicationName: parsedDetails.medicationName || "",
          medicationType: parsedDetails.medicationType || "",
          concentration: parsedDetails.concentration || "",
          dilutionRatio: parsedDetails.dilutionRatio || "",
          waterTemperature: parsedDetails.waterTemperature || "",
          soakDuration: parsedDetails.soakDuration || "",
          preBathPreparation: parsedDetails.preBathPreparation || "",
          shampooType: parsedDetails.shampooType || "",
          conditionerType: parsedDetails.conditionerType || "",
          dryingMethod: parsedDetails.dryingMethod || "",
          skinReaction: parsedDetails.skinReaction || "",
          previousTreatments: parsedDetails.previousTreatments || "",
          treatmentFrequency: parsedDetails.treatmentFrequency || "",
          totalSessions: parsedDetails.totalSessions || "",
          currentSession: parsedDetails.currentSession || "",
          postBathTreatment: parsedDetails.postBathTreatment || "",
          homeInstructions: parsedDetails.homeInstructions || "",
          treatmentDate: parsedDetails.treatmentDate || new Date().toISOString().slice(0, 16),
          nextSessionDate: parsedDetails.nextSessionDate || "",
          treatingGroomer: parsedDetails.treatingGroomer || "",
          notes: parsedDetails.notes || "",
          
          // Ensure boolean values for checkboxes
          contraindicationChecked: !!parsedDetails.contraindicationChecked,
          allergiesChecked: !!parsedDetails.allergiesChecked,
          eyeProtection: !!parsedDetails.eyeProtection,
          ownerConsent: !!parsedDetails.ownerConsent,
          
          // Ensure array values
          secondaryConditions: Array.isArray(parsedDetails.secondaryConditions) 
            ? parsedDetails.secondaryConditions 
            : [],
          affectedAreas: Array.isArray(parsedDetails.affectedAreas) 
            ? parsedDetails.affectedAreas 
            : []
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
        primaryCondition: "",
        secondaryConditions: [],
        skinAssessment: "",
        medicationName: "",
        medicationType: "",
        concentration: "",
        dilutionRatio: "",
        waterTemperature: "",
        soakDuration: "",
        affectedAreas: [],
        preBathPreparation: "",
        shampooType: "",
        conditionerType: "",
        dryingMethod: "",
        skinReaction: "",
        previousTreatments: "",
        treatmentFrequency: "",
        totalSessions: "",
        currentSession: "",
        postBathTreatment: "",
        homeInstructions: "",
        contraindicationChecked: false,
        allergiesChecked: false,
        eyeProtection: false,
        treatmentDate: new Date().toISOString().slice(0, 16),
        nextSessionDate: "",
        treatingGroomer: "",
        ownerConsent: false,
        notes: ""
      })
      setFormInitialized(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureDocumentDetails])

  const skinConditions = [
    { value: "bacterial", label: "Bacterial Infection" },
    { value: "fungal", label: "Fungal Infection" },
    { value: "allergic", label: "Allergic Dermatitis" },
    { value: "parasitic", label: "Parasitic Infestation" },
    { value: "seborrhea", label: "Seborrhea" },
    { value: "hotspots", label: "Hot Spots" }
  ]

  const medicationTypes = [
    { value: "antifungal", label: "Antifungal" },
    { value: "antibacterial", label: "Antibacterial" },
    { value: "antiparasitic", label: "Antiparasitic" },
    { value: "antipruritic", label: "Antipruritic" },
    { value: "antiseptic", label: "Antiseptic" },
    { value: "medicated", label: "Medicated Shampoo" }
  ]

  const bodyAreas = [
    { value: "full-body", label: "Full Body" },
    { value: "back", label: "Back" },
    { value: "belly", label: "Belly" },
    { value: "legs", label: "Legs" },
    { value: "paws", label: "Paws" },
    { value: "tail", label: "Tail" },
    { value: "neck", label: "Neck" }
  ]

  const dryingMethods = [
    { value: "towel", label: "Towel Dry" },
    { value: "air", label: "Air Dry" },
    { value: "blower", label: "Force Dryer" },
    { value: "cage-dryer", label: "Cage Dryer" }
  ]

  const handleInputChange = (field: keyof MedicatedBathsFormData, value: string | string[] | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    // Validate required fields
    const requiredFields = [
      'primaryCondition',
      'medicationName',
      'medicationType',
      'concentration',
      'waterTemperature',
      'soakDuration',
      'shampooType',
      'dryingMethod',
      'treatmentFrequency',
      'currentSession',
      'treatmentDate',
      'nextSessionDate',
      'treatingGroomer'
    ]
    const missingFields = requiredFields.filter(field => !formData[field as keyof MedicatedBathsFormData])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      return false
    }
    
    if (!formData.ownerConsent) {
      toast.error("Owner consent is required")
      return false
    }

    if (!formData.contraindicationChecked || !formData.allergiesChecked) {
      toast.error("Safety checks must be completed")
      return false
    }

    if (formData.affectedAreas.length === 0) {
      toast.error("At least one treatment area must be selected")
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
      
      toast.success("Medicated bath documentation updated successfully!")
      return true
    } catch (error) {
      console.error("Error saving medicated bath documentation:", error)
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
            🛁 Medicated Bath Documentation
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
                  <Label htmlFor="primaryCondition">
                    Primary Condition <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.primaryCondition} onValueChange={(value) => handleInputChange('primaryCondition', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition..." />
                    </SelectTrigger>
                    <SelectContent>
                      {skinConditions.map(condition => (
                        <SelectItem key={condition.value} value={condition.value}>{condition.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicationType">
                    Medication Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.medicationType} onValueChange={(value) => handleInputChange('medicationType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {medicationTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Secondary Conditions</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {skinConditions.map(condition => (
                    <div key={condition.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`condition-${condition.value}`}
                        checked={formData.secondaryConditions.includes(condition.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleInputChange('secondaryConditions', [...formData.secondaryConditions, condition.value])
                          } else {
                            handleInputChange('secondaryConditions', formData.secondaryConditions.filter(c => c !== condition.value))
                          }
                        }}
                      />
                      <Label htmlFor={`condition-${condition.value}`}>{condition.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skinAssessment">Initial Skin Assessment</Label>
                <Textarea
                  value={formData.skinAssessment}
                  onChange={(e) => handleInputChange('skinAssessment', e.target.value)}
                  placeholder="Document skin condition before treatment..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="medicationName">
                    Medication Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.medicationName}
                    onChange={(e) => handleInputChange('medicationName', e.target.value)}
                    placeholder="Enter medication name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concentration">
                    Concentration <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.concentration}
                    onChange={(e) => handleInputChange('concentration', e.target.value)}
                    placeholder="e.g., 2%"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dilutionRatio">Dilution Ratio</Label>
                  <Input
                    type="text"
                    value={formData.dilutionRatio}
                    onChange={(e) => handleInputChange('dilutionRatio', e.target.value)}
                    placeholder="e.g., 1:4"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="waterTemperature">
                    Water Temperature <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.waterTemperature}
                    onChange={(e) => handleInputChange('waterTemperature', e.target.value)}
                    placeholder="e.g., Lukewarm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Treatment Areas <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {bodyAreas.map(area => (
                    <div key={area.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`area-${area.value}`}
                        checked={formData.affectedAreas.includes(area.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleInputChange('affectedAreas', [...formData.affectedAreas, area.value])
                          } else {
                            handleInputChange('affectedAreas', formData.affectedAreas.filter(a => a !== area.value))
                          }
                        }}
                      />
                      <Label htmlFor={`area-${area.value}`}>{area.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="soakDuration">
                    Soak Duration <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.soakDuration}
                    onChange={(e) => handleInputChange('soakDuration', e.target.value)}
                    placeholder="e.g., 10 minutes"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dryingMethod">
                    Drying Method <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.dryingMethod} onValueChange={(value) => handleInputChange('dryingMethod', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dryingMethods.map(method => (
                        <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shampooType">
                    Shampoo Type <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.shampooType}
                    onChange={(e) => handleInputChange('shampooType', e.target.value)}
                    placeholder="Enter shampoo type"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conditionerType">Conditioner Type</Label>
                  <Input
                    type="text"
                    value={formData.conditionerType}
                    onChange={(e) => handleInputChange('conditionerType', e.target.value)}
                    placeholder="Enter conditioner type"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preBathPreparation">Pre-Bath Preparation</Label>
                <Textarea
                  value={formData.preBathPreparation}
                  onChange={(e) => handleInputChange('preBathPreparation', e.target.value)}
                  placeholder="Document pre-bath preparation steps..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skinReaction">Skin Reaction</Label>
                <Textarea
                  value={formData.skinReaction}
                  onChange={(e) => handleInputChange('skinReaction', e.target.value)}
                  placeholder="Document any skin reactions during treatment..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postBathTreatment">Post-Bath Treatment</Label>
                <Textarea
                  value={formData.postBathTreatment}
                  onChange={(e) => handleInputChange('postBathTreatment', e.target.value)}
                  placeholder="Document post-bath treatments applied..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="treatmentFrequency">
                    Treatment Frequency <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.treatmentFrequency}
                    onChange={(e) => handleInputChange('treatmentFrequency', e.target.value)}
                    placeholder="e.g., Weekly"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalSessions">Total Sessions Planned</Label>
                  <Input
                    type="text"
                    value={formData.totalSessions}
                    onChange={(e) => handleInputChange('totalSessions', e.target.value)}
                    placeholder="Enter total sessions"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentSession">
                    Current Session # <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.currentSession}
                    onChange={(e) => handleInputChange('currentSession', e.target.value)}
                    placeholder="Enter session number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeInstructions">Home Care Instructions</Label>
                <Textarea
                  value={formData.homeInstructions}
                  onChange={(e) => handleInputChange('homeInstructions', e.target.value)}
                  placeholder="Document home care instructions..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="treatmentDate">
                    Treatment Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    value={formData.treatmentDate}
                    onChange={(e) => handleInputChange('treatmentDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextSessionDate">
                    Next Session Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.nextSessionDate}
                    onChange={(e) => handleInputChange('nextSessionDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatingGroomer">
                  Treating Groomer <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.treatingGroomer}
                  onChange={(e) => handleInputChange('treatingGroomer', e.target.value)}
                  placeholder="Name of groomer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any other relevant notes about the treatment..."
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="contraindicationChecked"
                    checked={formData.contraindicationChecked}
                    onCheckedChange={(checked) => handleInputChange('contraindicationChecked', checked as boolean)}
                  />
                  <Label htmlFor="contraindicationChecked">
                    Contraindications checked <span className="text-red-500">*</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allergiesChecked"
                    checked={formData.allergiesChecked}
                    onCheckedChange={(checked) => handleInputChange('allergiesChecked', checked as boolean)}
                  />
                  <Label htmlFor="allergiesChecked">
                    Allergies and sensitivities checked <span className="text-red-500">*</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="eyeProtection"
                    checked={formData.eyeProtection}
                    onCheckedChange={(checked) => handleInputChange('eyeProtection', checked as boolean)}
                  />
                  <Label htmlFor="eyeProtection">Eye protection used</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ownerConsent"
                    checked={formData.ownerConsent}
                    onCheckedChange={(checked) => handleInputChange('ownerConsent', checked as boolean)}
                  />
                  <Label htmlFor="ownerConsent">
                    Owner consent obtained for treatment <span className="text-red-500">*</span>
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