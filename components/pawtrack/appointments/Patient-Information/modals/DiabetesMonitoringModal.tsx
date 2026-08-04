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

interface DiabetesMonitoringModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  appointmentId: string
  procedureId?: string
}

interface DiabetesMonitoringFormData {
  diabetesType: string
  currentWeight: string
  glucoseReading: string
  readingTime: string
  feedingStatus: string
  fructosamineLevel: string
  bloodworkDate: string
  insulinType: string
  insulinDose: string
  administrationTime: string
  administrationRoute: string
  dietType: string
  feedingSchedule: string
  exerciseLevel: string
  clinicalSigns: string[]
  homeMonitoring: boolean
  monitoringSchedule: string
  glucometerType: string
  waterIntake: string
  urineOutput: string
  ketonesTesting: string
  concurrentMedications: string
  complications: string[]
  treatmentResponse: string
  treatmentDate: string
  nextCheckupDate: string
  treatingVet: string
  ownerConsent: boolean
  notes: string
}

export default function DiabetesMonitoringModal({ open, onClose, patientId, appointmentId, procedureId }: DiabetesMonitoringModalProps) {
  const diabetesTypes = [
    { value: "type1", label: "Type 1 Diabetes" },
    { value: "type2", label: "Type 2 Diabetes" },
    { value: "gestational", label: "Gestational Diabetes" },
    { value: "secondary", label: "Secondary Diabetes" }
  ]

  const feedingStatuses = [
    { value: "fasted", label: "Fasted" },
    { value: "post-prandial", label: "Post-prandial" },
    { value: "pre-meal", label: "Pre-meal" },
    { value: "random", label: "Random" }
  ]

  const insulinTypes = [
    { value: "nph", label: "NPH (Intermediate-acting)" },
    { value: "lente", label: "Lente (Intermediate-acting)" },
    { value: "glargine", label: "Glargine (Long-acting)" },
    { value: "detemir", label: "Detemir (Long-acting)" },
    { value: "regular", label: "Regular (Short-acting)" }
  ]

  const administrationRoutes = [
    { value: "subcutaneous", label: "Subcutaneous" },
    { value: "intramuscular", label: "Intramuscular" },
    { value: "oral", label: "Oral Medication" }
  ]

  const dietTypes = [
    { value: "prescription-dm", label: "Prescription DM Diet" },
    { value: "high-fiber", label: "High Fiber Diet" },
    { value: "weight-management", label: "Weight Management Diet" },
    { value: "custom", label: "Custom Diet" }
  ]

  const exerciseLevels = [
    { value: "sedentary", label: "Sedentary" },
    { value: "mild", label: "Mild Exercise" },
    { value: "moderate", label: "Moderate Exercise" },
    { value: "active", label: "Active" }
  ]

  const clinicalSignsList = [
    { value: "pu-pd", label: "Polyuria/Polydipsia" },
    { value: "lethargy", label: "Lethargy" },
    { value: "weight-loss", label: "Weight Loss" },
    { value: "increased-appetite", label: "Increased Appetite" },
    { value: "vomiting", label: "Vomiting" },
    { value: "weakness", label: "Weakness" }
  ]

  const complicationsList = [
    { value: "hypoglycemia", label: "Hypoglycemia" },
    { value: "ketoacidosis", label: "Ketoacidosis" },
    { value: "cataracts", label: "Cataracts" },
    { value: "neuropathy", label: "Neuropathy" },
    { value: "infections", label: "Recurrent Infections" }
  ]

  const [formData, setFormData] = useState<DiabetesMonitoringFormData>({
    diabetesType: "",
    currentWeight: "",
    glucoseReading: "",
    readingTime: new Date().toISOString().slice(0, 16),
    feedingStatus: "",
    fructosamineLevel: "",
    bloodworkDate: "",
    insulinType: "",
    insulinDose: "",
    administrationTime: new Date().toISOString().slice(0, 16),
    administrationRoute: "",
    dietType: "",
    feedingSchedule: "",
    exerciseLevel: "",
    clinicalSigns: [],
    homeMonitoring: false,
    monitoringSchedule: "",
    glucometerType: "",
    waterIntake: "",
    urineOutput: "",
    ketonesTesting: "",
    concurrentMedications: "",
    complications: [],
    treatmentResponse: "",
    treatmentDate: new Date().toISOString().slice(0, 16),
    nextCheckupDate: "",
    treatingVet: "",
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
        
        // Create a new form data object with the parsed details
        const newFormData = {
          diabetesType: parsedDetails.diabetesType || "",
          currentWeight: parsedDetails.currentWeight || "",
          glucoseReading: parsedDetails.glucoseReading || "",
          readingTime: parsedDetails.readingTime || new Date().toISOString().slice(0, 16),
          feedingStatus: parsedDetails.feedingStatus || "",
          fructosamineLevel: parsedDetails.fructosamineLevel || "",
          bloodworkDate: parsedDetails.bloodworkDate || "",
          insulinType: parsedDetails.insulinType || "",
          insulinDose: parsedDetails.insulinDose || "",
          administrationTime: parsedDetails.administrationTime || new Date().toISOString().slice(0, 16),
          administrationRoute: parsedDetails.administrationRoute || "",
          dietType: parsedDetails.dietType || "",
          feedingSchedule: parsedDetails.feedingSchedule || "",
          exerciseLevel: parsedDetails.exerciseLevel || "",
          monitoringSchedule: parsedDetails.monitoringSchedule || "",
          glucometerType: parsedDetails.glucometerType || "",
          waterIntake: parsedDetails.waterIntake || "",
          urineOutput: parsedDetails.urineOutput || "",
          ketonesTesting: parsedDetails.ketonesTesting || "",
          concurrentMedications: parsedDetails.concurrentMedications || "",
          treatmentResponse: parsedDetails.treatmentResponse || "",
          treatmentDate: parsedDetails.treatmentDate || new Date().toISOString().slice(0, 16),
          nextCheckupDate: parsedDetails.nextCheckupDate || "",
          treatingVet: parsedDetails.treatingVet || "",
          notes: parsedDetails.notes || "",
          
          // Ensure array values
          clinicalSigns: Array.isArray(parsedDetails.clinicalSigns) ? parsedDetails.clinicalSigns : [],
          complications: Array.isArray(parsedDetails.complications) ? parsedDetails.complications : [],
          
          // Ensure boolean values for checkboxes
          homeMonitoring: !!parsedDetails.homeMonitoring,
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
        diabetesType: "",
        currentWeight: "",
        glucoseReading: "",
        readingTime: new Date().toISOString().slice(0, 16),
        feedingStatus: "",
        fructosamineLevel: "",
        bloodworkDate: "",
        insulinType: "",
        insulinDose: "",
        administrationTime: new Date().toISOString().slice(0, 16),
        administrationRoute: "",
        dietType: "",
        feedingSchedule: "",
        exerciseLevel: "",
        clinicalSigns: [],
        homeMonitoring: false,
        monitoringSchedule: "",
        glucometerType: "",
        waterIntake: "",
        urineOutput: "",
        ketonesTesting: "",
        concurrentMedications: "",
        complications: [],
        treatmentResponse: "",
        treatmentDate: new Date().toISOString().slice(0, 16),
        nextCheckupDate: "",
        treatingVet: "",
        ownerConsent: false,
        notes: ""
      })
      setFormInitialized(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedureDocumentDetails])

  const handleInputChange = (field: keyof DiabetesMonitoringFormData, value: string | string[] | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveDocumentation = async () => {
    // Validate required fields
    const requiredFields = [
      'diabetesType',
      'currentWeight',
      'glucoseReading',
      'readingTime',
      'feedingStatus',
      'insulinType',
      'insulinDose',
      'administrationTime',
      'administrationRoute',
      'treatmentDate',
      'nextCheckupDate',
      'treatingVet'
    ]
    const missingFields = requiredFields.filter(field => !formData[field as keyof DiabetesMonitoringFormData])
    
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
        
        toast.success("Diabetes monitoring documentation updated successfully!")
        return true
      } else {
        // No existing documentation to update
        toast.error("No documentation record found to update")
        return false
      }
    } catch (error) {
      console.error("Error saving diabetes monitoring documentation:", error)
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
            🩺 Diabetes Monitoring Documentation
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
                <Label htmlFor="diabetesType">
                  Type of Diabetes <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.diabetesType} onValueChange={(value) => handleInputChange('diabetesType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {diabetesTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentWeight">
                  Current Weight (kg) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.currentWeight}
                  onChange={(e) => handleInputChange('currentWeight', e.target.value)}
                  placeholder="Enter weight"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="glucoseReading">
                  Blood Glucose (mg/dL) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.glucoseReading}
                  onChange={(e) => handleInputChange('glucoseReading', e.target.value)}
                  placeholder="Enter glucose reading"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedingStatus">
                  Feeding Status <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.feedingStatus} onValueChange={(value) => handleInputChange('feedingStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {feedingStatuses.map(status => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="readingTime">
                  Reading Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.readingTime}
                  onChange={(e) => handleInputChange('readingTime', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodworkDate">Bloodwork Date</Label>
                <Input
                  type="date"
                  value={formData.bloodworkDate}
                  onChange={(e) => handleInputChange('bloodworkDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fructosamineLevel">Fructosamine Level</Label>
                <Input
                  type="text"
                  value={formData.fructosamineLevel}
                  onChange={(e) => handleInputChange('fructosamineLevel', e.target.value)}
                  placeholder="Enter fructosamine level"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ketonesTesting">Ketones Testing</Label>
                <Input
                  type="text"
                  value={formData.ketonesTesting}
                  onChange={(e) => handleInputChange('ketonesTesting', e.target.value)}
                  placeholder="Enter ketones result"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insulinType">
                  Insulin Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.insulinType} onValueChange={(value) => handleInputChange('insulinType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select insulin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {insulinTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="insulinDose">
                  Insulin Dose <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.insulinDose}
                  onChange={(e) => handleInputChange('insulinDose', e.target.value)}
                  placeholder="Enter insulin dose"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="administrationTime">
                  Administration Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.administrationTime}
                  onChange={(e) => handleInputChange('administrationTime', e.target.value)}
                />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dietType">Diet Type</Label>
                <Select value={formData.dietType} onValueChange={(value) => handleInputChange('dietType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select diet..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dietTypes.map(diet => (
                      <SelectItem key={diet.value} value={diet.value}>{diet.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exerciseLevel">Exercise Level</Label>
                <Select value={formData.exerciseLevel} onValueChange={(value) => handleInputChange('exerciseLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level..." />
                  </SelectTrigger>
                  <SelectContent>
                    {exerciseLevels.map(level => (
                      <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Clinical Signs</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {clinicalSignsList.map(sign => (
                  <div key={sign.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sign-${sign.value}`}
                      checked={formData.clinicalSigns.includes(sign.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleInputChange('clinicalSigns', [...formData.clinicalSigns, sign.value])
                        } else {
                          handleInputChange('clinicalSigns', formData.clinicalSigns.filter(s => s !== sign.value))
                        }
                      }}
                    />
                    <Label htmlFor={`sign-${sign.value}`}>{sign.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Complications</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {complicationsList.map(comp => (
                  <div key={comp.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`comp-${comp.value}`}
                      checked={formData.complications.includes(comp.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleInputChange('complications', [...formData.complications, comp.value])
                        } else {
                          handleInputChange('complications', formData.complications.filter(c => c !== comp.value))
                        }
                      }}
                    />
                    <Label htmlFor={`comp-${comp.value}`}>{comp.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="homeMonitoring"
                  checked={formData.homeMonitoring}
                  onCheckedChange={(checked) => handleInputChange('homeMonitoring', checked as boolean)}
                />
                <Label htmlFor="homeMonitoring">Home glucose monitoring</Label>
              </div>

              {formData.homeMonitoring && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  <div className="space-y-2">
                    <Label htmlFor="monitoringSchedule">Monitoring Schedule</Label>
                    <Input
                      value={formData.monitoringSchedule}
                      onChange={(e) => handleInputChange('monitoringSchedule', e.target.value)}
                      placeholder="Enter monitoring schedule"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="glucometerType">Glucometer Type</Label>
                    <Input
                      value={formData.glucometerType}
                      onChange={(e) => handleInputChange('glucometerType', e.target.value)}
                      placeholder="Enter glucometer type"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="waterIntake">Water Intake</Label>
                <Input
                  type="text"
                  value={formData.waterIntake}
                  onChange={(e) => handleInputChange('waterIntake', e.target.value)}
                  placeholder="Enter water intake"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="urineOutput">Urine Output</Label>
                <Input
                  type="text"
                  value={formData.urineOutput}
                  onChange={(e) => handleInputChange('urineOutput', e.target.value)}
                  placeholder="Enter urine output"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedingSchedule">Feeding Schedule</Label>
              <Textarea
                value={formData.feedingSchedule}
                onChange={(e) => handleInputChange('feedingSchedule', e.target.value)}
                placeholder="Enter feeding schedule details..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="concurrentMedications">Concurrent Medications</Label>
              <Textarea
                value={formData.concurrentMedications}
                onChange={(e) => handleInputChange('concurrentMedications', e.target.value)}
                placeholder="List any concurrent medications..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatmentResponse">Treatment Response</Label>
              <Textarea
                value={formData.treatmentResponse}
                onChange={(e) => handleInputChange('treatmentResponse', e.target.value)}
                placeholder="Document response to current treatment..."
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
                <Label htmlFor="nextCheckupDate">
                  Next Checkup Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.nextCheckupDate}
                  onChange={(e) => handleInputChange('nextCheckupDate', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatingVet">
                Treating Veterinarian <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={formData.treatingVet}
                onChange={(e) => handleInputChange('treatingVet', e.target.value)}
                placeholder="Name of treating vet"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any other relevant notes about diabetes monitoring..."
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