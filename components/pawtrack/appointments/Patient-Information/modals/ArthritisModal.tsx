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

interface ArthritisModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface ArthritisFormData {
  arthritisType: string
  affectedJoints: string[]
  painLevel: string
  mobilityScore: string
  weight: string
  medications: string[]
  supplements: string[]
  therapyTypes: string[]
  exerciseRestrictions: string
  hydrotherapy: boolean
  hydrotherapyFrequency: string
  acupuncture: boolean
  acupunctureFrequency: string
  massage: boolean
  massageFrequency: string
  dietModification: string
  weightManagementPlan: string
  environmentalModifications: string
  previousTreatments: string
  treatmentResponse: string
  treatmentDate: string
  nextAssessmentDate: string
  treatingVet: string
  therapist: string
  homeExercises: string
  ownerConsent: boolean
  notes: string
}

export default function ArthritisModal({ open, onClose, patientId, appointmentId, procedureId }: ArthritisModalProps) {
  const [formData, setFormData] = useState<ArthritisFormData>({
    arthritisType: "",
    affectedJoints: [],
    painLevel: "",
    mobilityScore: "",
    weight: "",
    medications: [],
    supplements: [],
    therapyTypes: [],
    exerciseRestrictions: "",
    hydrotherapy: false,
    hydrotherapyFrequency: "",
    acupuncture: false,
    acupunctureFrequency: "",
    massage: false,
    massageFrequency: "",
    dietModification: "",
    weightManagementPlan: "",
    environmentalModifications: "",
    previousTreatments: "",
    treatmentResponse: "",
    treatmentDate: new Date().toISOString().slice(0, 16),
    nextAssessmentDate: "",
    treatingVet: "",
    therapist: "",
    homeExercises: "",
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
          arthritisType: parsedDetails.arthritisType || "",
          painLevel: parsedDetails.painLevel || "",
          mobilityScore: parsedDetails.mobilityScore || "",
          weight: parsedDetails.weight || "",
          // Ensure array values
          affectedJoints: parsedDetails.affectedJoints || [],
          medications: parsedDetails.medications || [],
          supplements: parsedDetails.supplements || [],
          therapyTypes: parsedDetails.therapyTypes || [],
          // Ensure boolean values for checkboxes
          hydrotherapy: !!parsedDetails.hydrotherapy,
          acupuncture: !!parsedDetails.acupuncture,
          massage: !!parsedDetails.massage,
          ownerConsent: !!parsedDetails.ownerConsent,
          exerciseRestrictions: parsedDetails.exerciseRestrictions || "",
          hydrotherapyFrequency: parsedDetails.hydrotherapyFrequency || "",
          acupunctureFrequency: parsedDetails.acupunctureFrequency || "",
          massageFrequency: parsedDetails.massageFrequency || "",
          dietModification: parsedDetails.dietModification || "",
          weightManagementPlan: parsedDetails.weightManagementPlan || "",
          environmentalModifications: parsedDetails.environmentalModifications || "",
          previousTreatments: parsedDetails.previousTreatments || "",
          treatmentResponse: parsedDetails.treatmentResponse || "",
          treatmentDate: parsedDetails.treatmentDate || new Date().toISOString().slice(0, 16),
          nextAssessmentDate: parsedDetails.nextAssessmentDate || "",
          treatingVet: parsedDetails.treatingVet || "",
          therapist: parsedDetails.therapist || "",
          homeExercises: parsedDetails.homeExercises || "",
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
      // Reset the form when no data is available
      setFormData({
        arthritisType: "",
        affectedJoints: [],
        painLevel: "",
        mobilityScore: "",
        weight: "",
        medications: [],
        supplements: [],
        therapyTypes: [],
        exerciseRestrictions: "",
        hydrotherapy: false,
        hydrotherapyFrequency: "",
        acupuncture: false,
        acupunctureFrequency: "",
        massage: false,
        massageFrequency: "",
        dietModification: "",
        weightManagementPlan: "",
        environmentalModifications: "",
        previousTreatments: "",
        treatmentResponse: "",
        treatmentDate: new Date().toISOString().slice(0, 16),
        nextAssessmentDate: "",
        treatingVet: "",
        therapist: "",
        homeExercises: "",
        ownerConsent: false,
        notes: ""
      })
      setFormInitialized(false)
    }
  }, [procedureDocumentDetails])

  const arthritisTypes = [
    { value: "osteoarthritis", label: "Osteoarthritis" },
    { value: "rheumatoid", label: "Rheumatoid Arthritis" },
    { value: "immune-mediated", label: "Immune-Mediated Arthritis" },
    { value: "post-traumatic", label: "Post-Traumatic Arthritis" },
    { value: "septic", label: "Septic Arthritis" }
  ]

  const joints = [
    { value: "hip", label: "Hip" },
    { value: "knee", label: "Knee" },
    { value: "elbow", label: "Elbow" },
    { value: "shoulder", label: "Shoulder" },
    { value: "carpus", label: "Carpus" },
    { value: "tarsus", label: "Tarsus" },
    { value: "spine", label: "Spine" }
  ]

  const painLevels = [
    { value: "mild", label: "Mild (1-3)" },
    { value: "moderate", label: "Moderate (4-6)" },
    { value: "severe", label: "Severe (7-8)" },
    { value: "extreme", label: "Extreme (9-10)" }
  ]

  const mobilityScores = [
    { value: "excellent", label: "Excellent - Normal mobility" },
    { value: "good", label: "Good - Slight limitation" },
    { value: "fair", label: "Fair - Moderate limitation" },
    { value: "poor", label: "Poor - Severe limitation" }
  ]

  const medications = [
    { value: "nsaids", label: "NSAIDs" },
    { value: "gabapentin", label: "Gabapentin" },
    { value: "tramadol", label: "Tramadol" },
    { value: "adequan", label: "Adequan" },
    { value: "corticosteroids", label: "Corticosteroids" }
  ]

  const supplements = [
    { value: "glucosamine", label: "Glucosamine/Chondroitin" },
    { value: "omega3", label: "Omega-3 Fatty Acids" },
    { value: "msm", label: "MSM" },
    { value: "green-lipped-mussel", label: "Green Lipped Mussel" },
    { value: "turmeric", label: "Turmeric/Curcumin" }
  ]

  const therapyTypes = [
    { value: "physio", label: "Physiotherapy" },
    { value: "hydro", label: "Hydrotherapy" },
    { value: "acupuncture", label: "Acupuncture" },
    { value: "laser", label: "Laser Therapy" },
    { value: "massage", label: "Massage Therapy" },
    { value: "tens", label: "TENS Therapy" }
  ]

  const handleInputChange = (field: keyof ArthritisFormData, value: string | string[] | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    // Validate required fields
    const requiredFields = [
      'arthritisType',
      'painLevel',
      'mobilityScore',
      'weight',
      'treatmentDate',
      'nextAssessmentDate',
      'treatingVet'
    ]
    const missingFields = requiredFields.filter(field => !formData[field as keyof ArthritisFormData])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      return false
    }
    
    if (!formData.ownerConsent) {
      toast.error("Owner consent is required")
      return false
    }

    if (formData.affectedJoints.length === 0) {
      toast.error("At least one affected joint must be selected")
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
      
      toast.success("Arthritis management plan updated successfully!")
      return true
    } catch (error) {
      console.error("Error saving documentation:", error)
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
            🦴 Arthritis Management Documentation
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
                <Label htmlFor="arthritisType">
                  Type of Arthritis <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.arthritisType} onValueChange={(value) => handleInputChange('arthritisType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {arthritisTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">
                  Current Weight (kg) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  placeholder="Enter weight"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Affected Joints <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {joints.map(joint => (
                  <div key={joint.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`joint-${joint.value}`}
                      checked={formData.affectedJoints.includes(joint.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleInputChange('affectedJoints', [...formData.affectedJoints, joint.value])
                        } else {
                          handleInputChange('affectedJoints', formData.affectedJoints.filter(j => j !== joint.value))
                        }
                      }}
                    />
                    <Label htmlFor={`joint-${joint.value}`}>{joint.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="painLevel">
                  Pain Level <span className="text-red-500">*</span>
                </Label>
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
                <Label htmlFor="mobilityScore">
                  Mobility Score <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.mobilityScore} onValueChange={(value) => handleInputChange('mobilityScore', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mobility score..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mobilityScores.map(score => (
                      <SelectItem key={score.value} value={score.value}>{score.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prescribed Medications</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {medications.map(med => (
                  <div key={med.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`med-${med.value}`}
                      checked={formData.medications.includes(med.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleInputChange('medications', [...formData.medications, med.value])
                        } else {
                          handleInputChange('medications', formData.medications.filter(m => m !== med.value))
                        }
                      }}
                    />
                    <Label htmlFor={`med-${med.value}`}>{med.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recommended Supplements</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {supplements.map(sup => (
                  <div key={sup.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sup-${sup.value}`}
                      checked={formData.supplements.includes(sup.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleInputChange('supplements', [...formData.supplements, sup.value])
                        } else {
                          handleInputChange('supplements', formData.supplements.filter(s => s !== sup.value))
                        }
                      }}
                    />
                    <Label htmlFor={`sup-${sup.value}`}>{sup.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Therapy Types</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {therapyTypes.map(therapy => (
                  <div key={therapy.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`therapy-${therapy.value}`}
                      checked={formData.therapyTypes.includes(therapy.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleInputChange('therapyTypes', [...formData.therapyTypes, therapy.value])
                        } else {
                          handleInputChange('therapyTypes', formData.therapyTypes.filter(t => t !== therapy.value))
                        }
                      }}
                    />
                    <Label htmlFor={`therapy-${therapy.value}`}>{therapy.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exerciseRestrictions">Exercise Restrictions</Label>
              <Textarea
                value={formData.exerciseRestrictions}
                onChange={(e) => handleInputChange('exerciseRestrictions', e.target.value)}
                placeholder="Specify any exercise restrictions or recommendations..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hydrotherapy"
                    checked={formData.hydrotherapy}
                    onCheckedChange={(checked) => handleInputChange('hydrotherapy', checked as boolean)}
                  />
                  <Label htmlFor="hydrotherapy">Hydrotherapy</Label>
                </div>
                {formData.hydrotherapy && (
                  <Input
                    placeholder="Frequency"
                    value={formData.hydrotherapyFrequency}
                    onChange={(e) => handleInputChange('hydrotherapyFrequency', e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="acupuncture"
                    checked={formData.acupuncture}
                    onCheckedChange={(checked) => handleInputChange('acupuncture', checked as boolean)}
                  />
                  <Label htmlFor="acupuncture">Acupuncture</Label>
                </div>
                {formData.acupuncture && (
                  <Input
                    placeholder="Frequency"
                    value={formData.acupunctureFrequency}
                    onChange={(e) => handleInputChange('acupunctureFrequency', e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="massage"
                    checked={formData.massage}
                    onCheckedChange={(checked) => handleInputChange('massage', checked as boolean)}
                  />
                  <Label htmlFor="massage">Massage Therapy</Label>
                </div>
                {formData.massage && (
                  <Input
                    placeholder="Frequency"
                    value={formData.massageFrequency}
                    onChange={(e) => handleInputChange('massageFrequency', e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dietModification">Diet Modifications</Label>
              <Textarea
                value={formData.dietModification}
                onChange={(e) => handleInputChange('dietModification', e.target.value)}
                placeholder="Specify any dietary recommendations..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weightManagementPlan">Weight Management Plan</Label>
              <Textarea
                value={formData.weightManagementPlan}
                onChange={(e) => handleInputChange('weightManagementPlan', e.target.value)}
                placeholder="Outline weight management strategy..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="environmentalModifications">Environmental Modifications</Label>
              <Textarea
                value={formData.environmentalModifications}
                onChange={(e) => handleInputChange('environmentalModifications', e.target.value)}
                placeholder="Recommend any home modifications..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="homeExercises">Home Exercise Program</Label>
              <Textarea
                value={formData.homeExercises}
                onChange={(e) => handleInputChange('homeExercises', e.target.value)}
                placeholder="Detail recommended home exercises..."
                rows={3}
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
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextAssessmentDate">
                  Next Assessment Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.nextAssessmentDate}
                  onChange={(e) => handleInputChange('nextAssessmentDate', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="treatingVet">
                  Treating Veterinarian <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.treatingVet}
                  onChange={(e) => handleInputChange('treatingVet', e.target.value)}
                  placeholder="Name of treating vet"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="therapist">Physical Therapist</Label>
                <Input
                  type="text"
                  value={formData.therapist}
                  onChange={(e) => handleInputChange('therapist', e.target.value)}
                  placeholder="Name of therapist"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousTreatments">Previous Treatments</Label>
              <Textarea
                value={formData.previousTreatments}
                onChange={(e) => handleInputChange('previousTreatments', e.target.value)}
                placeholder="Document any previous treatments and their outcomes..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatmentResponse">Treatment Response</Label>
              <Textarea
                value={formData.treatmentResponse}
                onChange={(e) => handleInputChange('treatmentResponse', e.target.value)}
                placeholder="Document response to current treatment plan..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any other relevant notes about the arthritis management plan..."
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
                  Owner consent obtained for treatment plan <span className="text-red-500">*</span>
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