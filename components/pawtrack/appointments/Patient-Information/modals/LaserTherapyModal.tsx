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

interface LaserTherapyModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface LaserTherapyFormData {
  laserType: string
  wavelength: string
  power: string
  treatmentAreas: string[]
  treatmentMode: string
  energyDelivered: string
  treatmentDuration: string
  primaryCondition: string
  secondaryConditions: string[]
  painLevel: string
  inflammationLevel: string
  treatmentPhase: string
  skinPigmentation: string
  safetyChecklist: string[]
  previousTreatments: string
  treatmentFrequency: string
  totalSessions: string
  currentSession: string
  treatmentResponse: string
  sideEffects: string
  contraindications: string
  eyeProtection: boolean
  skinPreparation: string
  postTreatmentCare: string
  treatmentDate: string
  nextSessionDate: string
  treatingTherapist: string
  ownerConsent: boolean
  notes: string
}

export default function LaserTherapyModal({ open, onClose, patientId, appointmentId, procedureId }: LaserTherapyModalProps) {
  const [formData, setFormData] = useState<LaserTherapyFormData>({
    laserType: "",
    wavelength: "",
    power: "",
    treatmentAreas: [],
    treatmentMode: "",
    energyDelivered: "",
    treatmentDuration: "",
    primaryCondition: "",
    secondaryConditions: [],
    painLevel: "",
    inflammationLevel: "",
    treatmentPhase: "",
    skinPigmentation: "",
    safetyChecklist: [],
    previousTreatments: "",
    treatmentFrequency: "",
    totalSessions: "",
    currentSession: "",
    treatmentResponse: "",
    sideEffects: "",
    contraindications: "",
    eyeProtection: false,
    skinPreparation: "",
    postTreatmentCare: "",
    treatmentDate: new Date().toISOString().slice(0, 16),
    nextSessionDate: "",
    treatingTherapist: "",
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
          laserType: parsedDetails.laserType || "",
          wavelength: parsedDetails.wavelength || "",
          power: parsedDetails.power || "",
          treatmentMode: parsedDetails.treatmentMode || "",
          energyDelivered: parsedDetails.energyDelivered || "",
          treatmentDuration: parsedDetails.treatmentDuration || "",
          primaryCondition: parsedDetails.primaryCondition || "",
          painLevel: parsedDetails.painLevel || "",
          inflammationLevel: parsedDetails.inflammationLevel || "",
          treatmentPhase: parsedDetails.treatmentPhase || "",
          skinPigmentation: parsedDetails.skinPigmentation || "",
          previousTreatments: parsedDetails.previousTreatments || "",
          treatmentFrequency: parsedDetails.treatmentFrequency || "",
          totalSessions: parsedDetails.totalSessions || "",
          currentSession: parsedDetails.currentSession || "",
          treatmentResponse: parsedDetails.treatmentResponse || "",
          sideEffects: parsedDetails.sideEffects || "",
          contraindications: parsedDetails.contraindications || "",
          skinPreparation: parsedDetails.skinPreparation || "",
          postTreatmentCare: parsedDetails.postTreatmentCare || "",
          treatmentDate: parsedDetails.treatmentDate || new Date().toISOString().slice(0, 16),
          nextSessionDate: parsedDetails.nextSessionDate || "",
          treatingTherapist: parsedDetails.treatingTherapist || "",
          notes: parsedDetails.notes || "",
          
          // Ensure boolean values for checkboxes
          eyeProtection: !!parsedDetails.eyeProtection,
          ownerConsent: !!parsedDetails.ownerConsent,
          
          // Ensure array values
          treatmentAreas: Array.isArray(parsedDetails.treatmentAreas) 
            ? parsedDetails.treatmentAreas 
            : [],
          secondaryConditions: Array.isArray(parsedDetails.secondaryConditions) 
            ? parsedDetails.secondaryConditions 
            : [],
          safetyChecklist: Array.isArray(parsedDetails.safetyChecklist) 
            ? parsedDetails.safetyChecklist 
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
        laserType: "",
        wavelength: "",
        power: "",
        treatmentAreas: [],
        treatmentMode: "",
        energyDelivered: "",
        treatmentDuration: "",
        primaryCondition: "",
        secondaryConditions: [],
        painLevel: "",
        inflammationLevel: "",
        treatmentPhase: "",
        skinPigmentation: "",
        safetyChecklist: [],
        previousTreatments: "",
        treatmentFrequency: "",
        totalSessions: "",
        currentSession: "",
        treatmentResponse: "",
        sideEffects: "",
        contraindications: "",
        eyeProtection: false,
        skinPreparation: "",
        postTreatmentCare: "",
        treatmentDate: new Date().toISOString().slice(0, 16),
        nextSessionDate: "",
        treatingTherapist: "",
        ownerConsent: false,
        notes: ""
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const laserTypes = [
    { value: "class3b", label: "Class 3B Laser" },
    { value: "class4", label: "Class 4 Laser" },
    { value: "cold-laser", label: "Cold Laser" },
    { value: "therapeutic", label: "Therapeutic Laser" }
  ]

  const treatmentAreas = [
    { value: "joints", label: "Joints" },
    { value: "muscles", label: "Muscles" },
    { value: "spine", label: "Spine" },
    { value: "wounds", label: "Wounds" },
    { value: "surgical-sites", label: "Surgical Sites" },
    { value: "trigger-points", label: "Trigger Points" }
  ]

  const treatmentModes = [
    { value: "continuous", label: "Continuous Wave" },
    { value: "pulsed", label: "Pulsed" },
    { value: "superpulsed", label: "SuperPulsed" },
    { value: "custom", label: "Custom Protocol" }
  ]

  const conditions = [
    { value: "arthritis", label: "Arthritis" },
    { value: "wound-healing", label: "Wound Healing" },
    { value: "inflammation", label: "Inflammation" },
    { value: "muscle-strain", label: "Muscle Strain" },
    { value: "post-surgical", label: "Post-Surgical Recovery" },
    { value: "nerve-pain", label: "Nerve Pain" }
  ]

  const painLevels = [
    { value: "none", label: "None" },
    { value: "mild", label: "Mild" },
    { value: "moderate", label: "Moderate" },
    { value: "severe", label: "Severe" }
  ]

  const inflammationLevels = [
    { value: "none", label: "None" },
    { value: "mild", label: "Mild" },
    { value: "moderate", label: "Moderate" },
    { value: "severe", label: "Severe" }
  ]

  const treatmentPhases = [
    { value: "acute", label: "Acute" },
    { value: "subacute", label: "Sub-acute" },
    { value: "chronic", label: "Chronic" },
    { value: "maintenance", label: "Maintenance" }
  ]

  const safetyItems = [
    { value: "area-checked", label: "Treatment Area Checked" },
    { value: "contraindications-checked", label: "Contraindications Checked" },
    { value: "eye-protection", label: "Eye Protection Verified" },
    { value: "parameters-verified", label: "Treatment Parameters Verified" },
    { value: "equipment-checked", label: "Equipment Safety Checked" }
  ]

  const handleInputChange = (field: keyof LaserTherapyFormData, value: string | string[] | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    // Validate required fields
    const requiredFields = [
      'laserType',
      'wavelength',
      'power',
      'treatmentMode',
      'treatmentDuration',
      'primaryCondition',
      'treatmentPhase',
      'treatmentFrequency',
      'currentSession',
      'treatmentDate',
      'nextSessionDate',
      'treatingTherapist'
    ]
    const missingFields = requiredFields.filter(field => !formData[field as keyof LaserTherapyFormData])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      return false
    }
    
    if (!formData.ownerConsent) {
      toast.error("Owner consent is required")
      return false
    }

    if (!formData.eyeProtection) {
      toast.error("Eye protection must be verified")
      return false
    }

    if (formData.treatmentAreas.length === 0) {
      toast.error("At least one treatment area must be selected")
      return false
    }

    if (formData.safetyChecklist.length === 0) {
      toast.error("Safety checklist must be completed")
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
      
      toast.success("Laser therapy documentation updated successfully!")
      return true
    } catch (error) {
      console.error("Error saving laser therapy documentation:", error)
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
            🔆 Laser Therapy Documentation
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
                  <Label htmlFor="laserType">
                    Laser Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.laserType} onValueChange={(value) => handleInputChange('laserType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select laser type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {laserTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="treatmentMode">
                    Treatment Mode <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.treatmentMode} onValueChange={(value) => handleInputChange('treatmentMode', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode..." />
                    </SelectTrigger>
                    <SelectContent>
                      {treatmentModes.map(mode => (
                        <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wavelength">
                    Wavelength (nm) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.wavelength}
                    onChange={(e) => handleInputChange('wavelength', e.target.value)}
                    placeholder="e.g., 810"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="power">
                    Power (W) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.power}
                    onChange={(e) => handleInputChange('power', e.target.value)}
                    placeholder="e.g., 10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="energyDelivered">Energy Delivered (J)</Label>
                  <Input
                    type="text"
                    value={formData.energyDelivered}
                    onChange={(e) => handleInputChange('energyDelivered', e.target.value)}
                    placeholder="Enter energy delivered"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Treatment Areas <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {treatmentAreas.map(area => (
                    <div key={area.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`area-${area.value}`}
                        checked={formData.treatmentAreas.includes(area.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleInputChange('treatmentAreas', [...formData.treatmentAreas, area.value])
                          } else {
                            handleInputChange('treatmentAreas', formData.treatmentAreas.filter(a => a !== area.value))
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
                  <Label htmlFor="primaryCondition">
                    Primary Condition <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.primaryCondition} onValueChange={(value) => handleInputChange('primaryCondition', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition..." />
                    </SelectTrigger>
                    <SelectContent>
                      {conditions.map(condition => (
                        <SelectItem key={condition.value} value={condition.value}>{condition.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="treatmentPhase">
                    Treatment Phase <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.treatmentPhase} onValueChange={(value) => handleInputChange('treatmentPhase', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase..." />
                    </SelectTrigger>
                    <SelectContent>
                      {treatmentPhases.map(phase => (
                        <SelectItem key={phase.value} value={phase.value}>{phase.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Secondary Conditions</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {conditions.map(condition => (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="painLevel">Pain Level</Label>
                  <Select value={formData.painLevel} onValueChange={(value) => handleInputChange('painLevel', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pain level..." />
                    </SelectTrigger>
                    <SelectContent>
                      {painLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inflammationLevel">Inflammation Level</Label>
                  <Select value={formData.inflammationLevel} onValueChange={(value) => handleInputChange('inflammationLevel', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select inflammation level..." />
                    </SelectTrigger>
                    <SelectContent>
                      {inflammationLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Safety Checklist <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {safetyItems.map(item => (
                    <div key={item.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`safety-${item.value}`}
                        checked={formData.safetyChecklist.includes(item.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleInputChange('safetyChecklist', [...formData.safetyChecklist, item.value])
                          } else {
                            handleInputChange('safetyChecklist', formData.safetyChecklist.filter(s => s !== item.value))
                          }
                        }}
                      />
                      <Label htmlFor={`safety-${item.value}`}>{item.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="treatmentDuration">
                    Treatment Duration <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.treatmentDuration}
                    onChange={(e) => handleInputChange('treatmentDuration', e.target.value)}
                    placeholder="e.g., 10 minutes"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="treatmentFrequency">
                    Treatment Frequency <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.treatmentFrequency}
                    onChange={(e) => handleInputChange('treatmentFrequency', e.target.value)}
                    placeholder="e.g., 2x weekly"
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
                <Label htmlFor="skinPreparation">Skin Preparation</Label>
                <Textarea
                  value={formData.skinPreparation}
                  onChange={(e) => handleInputChange('skinPreparation', e.target.value)}
                  placeholder="Document skin preparation steps..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="previousTreatments">Previous Treatments</Label>
                <Textarea
                  value={formData.previousTreatments}
                  onChange={(e) => handleInputChange('previousTreatments', e.target.value)}
                  placeholder="Document previous treatments and responses..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatmentResponse">Treatment Response</Label>
                <Textarea
                  value={formData.treatmentResponse}
                  onChange={(e) => handleInputChange('treatmentResponse', e.target.value)}
                  placeholder="Document response to treatment..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sideEffects">Side Effects</Label>
                <Textarea
                  value={formData.sideEffects}
                  onChange={(e) => handleInputChange('sideEffects', e.target.value)}
                  placeholder="Document any side effects..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postTreatmentCare">Post-Treatment Care</Label>
                <Textarea
                  value={formData.postTreatmentCare}
                  onChange={(e) => handleInputChange('postTreatmentCare', e.target.value)}
                  placeholder="Document post-treatment care instructions..."
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
                <Label htmlFor="treatingTherapist">
                  Treating Therapist <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.treatingTherapist}
                  onChange={(e) => handleInputChange('treatingTherapist', e.target.value)}
                  placeholder="Name of therapist"
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
                    id="eyeProtection"
                    checked={formData.eyeProtection}
                    onCheckedChange={(checked) => handleInputChange('eyeProtection', checked as boolean)}
                  />
                  <Label htmlFor="eyeProtection">
                    Eye protection verified for patient and staff <span className="text-red-500">*</span>
                  </Label>
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