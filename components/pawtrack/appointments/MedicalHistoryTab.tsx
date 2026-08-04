"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Save, Mic } from "lucide-react"
import {
  useGetMedicalHistoryDetailByPatientId,
  useCreateMedicalHistoryDetail,
  useUpdateMedicalHistoryDetail,
  MedicalHistoryDetail
} from "@/queries/MedicalHistoryDetail"
import { useTabCompletion } from "@/context/TabCompletionContext"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { useTranscriber } from "@/components/pawtrack/audioTranscriber/hooks/useTranscriber"
import { AudioManager } from "@/components/pawtrack/audioTranscriber/AudioManager"

interface MedicalHistoryTabProps {
  patientId: string
  appointmentId: string
  onNext?: () => void
}

export default function MedicalHistoryTab({ patientId, appointmentId, onNext }: MedicalHistoryTabProps) {
  const { markTabAsCompleted } = useTabCompletion()
  const [formData, setFormData] = useState<Partial<MedicalHistoryDetail>>({
    chronicConditionsNotes: '',
    surgeriesNotes: '',
    currentMedicationsNotes: '',
    generalNotes: '',
    isCompleted: false,
  })
  const [medicalHistoryId, setMedicalHistoryId] = useState<string | null>(null)
  const [audioModalOpen, setAudioModalOpen] = useState(false)
  const [activeField, setActiveField] = useState<keyof MedicalHistoryDetail | null>(null)

  const transcriber = useTranscriber()

  // Get medical history data by patientId
  const { data: medicalHistoryDetail, isLoading: historyLoading } = useGetMedicalHistoryDetailByPatientId(patientId)
  const { data: appointmentData } = useGetAppointmentById(appointmentId)

  const { mutateAsync: createMedicalHistory, isPending: isCreating } = useCreateMedicalHistoryDetail()
  const { mutateAsync: updateMedicalHistory, isPending: isUpdating } = useUpdateMedicalHistoryDetail()

  const isPending = isCreating || isUpdating || historyLoading

  const isReadOnly = appointmentData?.status === "completed"

  useEffect(() => {
    if (medicalHistoryDetail) {
      setFormData({
        chronicConditionsNotes: medicalHistoryDetail.chronicConditionsNotes || '',
        surgeriesNotes: medicalHistoryDetail.surgeriesNotes || '',
        currentMedicationsNotes: medicalHistoryDetail.currentMedicationsNotes || '',
        generalNotes: medicalHistoryDetail.generalNotes || '',
        isCompleted: medicalHistoryDetail.isCompleted || false,
      })
      setMedicalHistoryId(medicalHistoryDetail.id)

      // Mark tab as completed if data exists and is completed
      if (medicalHistoryDetail.isCompleted) {
        markTabAsCompleted("medical-history")
      }
    }
  }, [medicalHistoryDetail, markTabAsCompleted])

  // Handle transcription output
  useEffect(() => {
    const output = transcriber.output
    if (output && !output.isBusy && output.text && activeField) {
      setFormData(prev => ({
        ...prev,
        [activeField]: prev[activeField] ? prev[activeField] + "\n" + output.text : output.text
      }))
    }
    // eslint-disable-next-line
  }, [transcriber.output?.isBusy])

  const handleInputChange = (field: keyof MedicalHistoryDetail, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleOpenAudioModal = (field: keyof MedicalHistoryDetail) => {
    setActiveField(field)
    setAudioModalOpen(true)
  }

  const handleSave = async () => {
    try {
      // Set isCompleted to true when saving
      const updatedFormData = {
        ...formData,
        isCompleted: true
      }

      if (medicalHistoryId) {
        await updateMedicalHistory({
          id: medicalHistoryId,
          ...updatedFormData,
        })
        toast.success("Medical history has been updated successfully.")
      } else {
        const result = await createMedicalHistory({
          ...updatedFormData,
          patientId: patientId,
        })
        setMedicalHistoryId(result.id)
        toast.success("Medical history has been created successfully.")
      }

      // Mark the tab as completed
      markTabAsCompleted("medical-history")

      if (onNext) {
        onNext()
      }
    } catch (error) {
      console.error('Error saving medical history:', error)
      toast.error(error instanceof Error ? error.message : "Failed to save medical history information.")
    }
  }

  if (historyLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading medical history...</span>
        </CardContent>
      </Card>
    )
  }
  const isRequiredFieldsEmpty = () => {
    return !formData.chronicConditionsNotes ||
      !formData.surgeriesNotes ||
      !formData.currentMedicationsNotes;

  }


  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="chronicConditions">Chronic Conditions</Label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleOpenAudioModal('chronicConditionsNotes')}
                title="Record voice note"
                disabled={isReadOnly}
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              id="chronicConditions"
              placeholder="Enter any chronic conditions..."
              value={formData.chronicConditionsNotes}
              onChange={(e) => handleInputChange('chronicConditionsNotes', e.target.value)}
              className="min-h-[100px]"
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="surgeries">Surgeries</Label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleOpenAudioModal('surgeriesNotes')}
                title="Record voice note"
                disabled={isReadOnly}
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              id="surgeries"
              placeholder="Enter any surgeries..."
              value={formData.surgeriesNotes}
              onChange={(e) => handleInputChange('surgeriesNotes', e.target.value)}
              className="min-h-[100px]"
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="currentMedications">Current Medications</Label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleOpenAudioModal('currentMedicationsNotes')}
                title="Record voice note"
                disabled={isReadOnly}
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              id="currentMedications"
              placeholder="Enter current medications..."
              value={formData.currentMedicationsNotes}
              onChange={(e) => handleInputChange('currentMedicationsNotes', e.target.value)}
              className="min-h-[100px]"
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="generalNotes">General Notes</Label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleOpenAudioModal('generalNotes')}
                title="Record voice note"
                disabled={isReadOnly}
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              id="generalNotes"
              placeholder="Enter any additional notes..."
              value={formData.generalNotes}
              onChange={(e) => handleInputChange('generalNotes', e.target.value)}
              className="min-h-[100px]"
              disabled={isReadOnly}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              onClick={handleSave}
              disabled={isPending || isReadOnly || isRequiredFieldsEmpty()}
              className="mt-4 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isPending && <Save className="mr-2 h-4 w-4" />}
              {medicalHistoryId ? "Update" : "Save"}
            </Button>

          </div>
        </div>

        <AudioManager
          open={audioModalOpen}
          onClose={() => setAudioModalOpen(false)}
          transcriber={transcriber}
          onTranscriptionComplete={(transcript: string) => {
            if (activeField) {
              setFormData(prev => ({
                ...prev,
                [activeField]: prev[activeField] ? prev[activeField] + "\n" + transcript : transcript
              }))
            }
            setAudioModalOpen(false)
          }}
        />
      </CardContent>
    </Card>
  )
}