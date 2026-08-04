"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useGetVitalDetailByVisitId } from "@/queries/vitals/get-vital-detail-by-visit-id"
import { useCreateVitalDetail } from "@/queries/vitals/create-vital-detail"
import { useUpdateVitalDetail } from "@/queries/vitals/update-vital-detail"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useTabCompletion } from "@/context/TabCompletionContext"
import { Mic, Sparkles, Loader2, Send, Bot, User } from "lucide-react"
import { useTranscriber } from "@/components/pawtrack/audioTranscriber/hooks/useTranscriber"
import { AudioManager } from "@/components/pawtrack/audioTranscriber/AudioManager"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { useGetPatientById } from "@/queries/patients/get-patient-by-id"
import { vitalsAnalysis } from "@/app/actions/reasonformatting"
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface VitalsTabProps {
  patientId: string
  appointmentId: string
  onNext?: () => void
  onComplete?: (completed: boolean) => void;
}

export default function VitalsTab({ patientId, appointmentId, onNext, onComplete }: VitalsTabProps) {
  const { markTabAsCompleted } = useTabCompletion()
  const { toast } = useToast()

  // Get visit data from appointment ID
  const { data: visitData, isLoading: visitLoading } = useGetVisitByAppointmentId(appointmentId)

  // Get vital details by visitId if we have a visit
  const { data: vitalDetail, refetch: refetchVitalDetail } = useGetVitalDetailByVisitId(
    visitData?.id || ""
  )

  // Get appointment data
  const { data: appointmentData } = useGetAppointmentById(appointmentId)

  // Get patient data to access species
  const { data: patientData } = useGetPatientById(patientId)

  // State for form fields
  const [temperatureC, setTemperatureC] = useState<number | undefined>(undefined)
  const [heartRateBpm, setHeartRateBpm] = useState<number | undefined>(undefined)
  const [respiratoryRateBpm, setRespiratoryRateBpm] = useState<number | undefined>(undefined)
  const [mucousMembraneColor, setMucousMembraneColor] = useState<string>("")
  const [capillaryRefillTimeSec, setCapillaryRefillTimeSec] = useState<number | undefined>(undefined)
  const [hydrationStatus, setHydrationStatus] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [audioModalOpen, setAudioModalOpen] = useState(false)
  const transcriber = useTranscriber()

  // AI Analysis state
  const [analysisResult, setAnalysisResult] = useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isChatMode, setIsChatMode] = useState(false)
  const [chatInput, setChatInput] = useState("")
  
  // Build vitals context for chat
  const vitalsContextRef = useRef<string>("")
  
  const buildVitalsContext = () => {
    if (!patientData?.species) return ""
    
    const vitalsInfo = `
Current Vitals Data:
- Species: ${patientData.species}
- Temperature: ${temperatureC ? `${temperatureC}°C` : 'Not recorded'}
- Heart Rate: ${heartRateBpm ? `${heartRateBpm} BPM` : 'Not recorded'}
- Respiratory Rate: ${respiratoryRateBpm ? `${respiratoryRateBpm} BPM` : 'Not recorded'}
- Mucous Membrane Color: ${mucousMembraneColor || 'Not recorded'}
- Capillary Refill Time: ${capillaryRefillTimeSec ? `${capillaryRefillTimeSec} seconds` : 'Not recorded'}
- Hydration Status: ${hydrationStatus || 'Not recorded'}
${notes ? `- Additional Notes: ${notes}` : ''}
    `.trim()
    
    return vitalsInfo
  }
  
  // Update vitals context when vitals data changes
  useEffect(() => {
    vitalsContextRef.current = buildVitalsContext()
  }, [temperatureC, heartRateBpm, respiratoryRateBpm, mucousMembraneColor, capillaryRefillTimeSec, hydrationStatus, notes, patientData?.species])
  
  // Chat hook with vitals context
  const { messages, sendMessage, status, setMessages } = useChat({
    id: `vitals-${patientId}-${appointmentId}`,
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: ({ id, messages }) => {
        const vitalsContext = vitalsContextRef.current
        
        return {
          body: {
            id,
            messages,
            patientId: patientId ?? null,
            vitalsContext: vitalsContext || undefined,
          },
        }
      },
    }),
  })

  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    temperatureC: undefined as number | undefined,
    heartRateBpm: undefined as number | undefined,
    respiratoryRateBpm: undefined as number | undefined,
    mucousMembraneColor: "",
    capillaryRefillTimeSec: undefined as number | undefined,
    hydrationStatus: "",
    notes: ""
  })

  // Use mutateAsync pattern for better control flow
  const { mutateAsync: createVitalDetail, isPending: isCreating } = useCreateVitalDetail()
  const { mutateAsync: updateVitalDetail, isPending: isUpdating } = useUpdateVitalDetail()

  // Combined loading state
  const isPending = isCreating || isUpdating



  // Initialize form with existing data when available
  useEffect(() => {
    if (vitalDetail) {
      setTemperatureC(vitalDetail.temperatureC)
      setHeartRateBpm(vitalDetail.heartRateBpm)
      setRespiratoryRateBpm(vitalDetail.respiratoryRateBpm)
      setMucousMembraneColor(vitalDetail.mucousMembraneColor || "")
      setCapillaryRefillTimeSec(vitalDetail.capillaryRefillTimeSec)
      setHydrationStatus(vitalDetail.hydrationStatus || "")
      setNotes(vitalDetail.notes || "")

      // Store original values for change detection
      setOriginalValues({
        temperatureC: vitalDetail.temperatureC,
        heartRateBpm: vitalDetail.heartRateBpm,
        respiratoryRateBpm: vitalDetail.respiratoryRateBpm,
        mucousMembraneColor: vitalDetail.mucousMembraneColor || "",
        capillaryRefillTimeSec: vitalDetail.capillaryRefillTimeSec,
        hydrationStatus: vitalDetail.hydrationStatus || "",
        notes: vitalDetail.notes || ""
      })

      // Mark tab as completed if it was already completed or if basic vitals are present
      if (vitalDetail.isCompleted ||
        vitalDetail.temperatureC ||
        vitalDetail.heartRateBpm ||
        vitalDetail.respiratoryRateBpm) {
        markTabAsCompleted("vitals")
      }
    }
  }, [vitalDetail, markTabAsCompleted])

  // Always mark the tab as completed if we have vital measurements
  useEffect(() => {
    if (temperatureC || heartRateBpm || respiratoryRateBpm) {
      markTabAsCompleted("vitals")
    }
  }, [temperatureC, heartRateBpm, respiratoryRateBpm, markTabAsCompleted])

  // Handle transcription output in useEffect
  useEffect(() => {
    const output = transcriber.output;
    if (output && !output.isBusy && output.text) {
      setNotes(prev => prev ? prev + "\n" + output.text : output.text);
    }
  }, [transcriber.output?.isBusy, transcriber.output?.text]);
  // eslint-disable-next-line


  const handleSave = async () => {
    if (!visitData?.id) {
      toast({
        title: "Error",
        description: "No visit data found for this appointment",
        variant: "destructive"
      })
      return
    }

    const vitalData = {
      temperatureC,
      heartRateBpm,
      respiratoryRateBpm,
      mucousMembraneColor: mucousMembraneColor || undefined,
      capillaryRefillTimeSec,
      hydrationStatus: hydrationStatus || undefined,
      notes: notes || undefined,
      isCompleted: true
    }

    try {
      if (vitalDetail) {
        // update existing
        await updateVitalDetail({ id: vitalDetail.id, ...vitalData })
        toast({
          title: "Success",
          description: "Vital details updated successfully",
          variant: "success"
        })
      } else {
        // create new once
        await createVitalDetail({ visitId: visitData.id, ...vitalData })
        toast({
          title: "Success",
          description: "Vital details saved successfully",
          variant: "success"
        })
      }

      markTabAsCompleted("vitals")
      refetchVitalDetail()
      if (onComplete) {
        onComplete(true);
      }
      onNext?.()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    }
  }

  const handleAnalyze = async () => {
    if (!patientData?.species) {
      toast({
        title: "Error",
        description: "Patient species information is required for analysis",
        variant: "destructive"
      })
      return
    }

    // Check if there's any vital data to analyze
    if (!temperatureC && !heartRateBpm && !respiratoryRateBpm && !mucousMembraneColor && !capillaryRefillTimeSec && !hydrationStatus) {
      toast({
        title: "Error",
        description: "Please enter at least one vital sign before analyzing",
        variant: "destructive"
      })
      return
    }

    setIsAnalyzing(true)
    try {
      const analysis = await vitalsAnalysis(patientData.species, {
        temperatureC,
        heartRateBpm,
        respiratoryRateBpm,
        mucousMembraneColor,
        capillaryRefillTimeSec,
        hydrationStatus,
        notes
      })
      setAnalysisResult(analysis)
      
      // Initialize chat mode with the analysis result as the first message
      setIsChatMode(true)
      setMessages([
        {
          id: 'initial-analysis',
          role: 'assistant',
          parts: [{ type: 'text', text: analysis }]
        }
      ])
      
      toast({
        title: "Success",
        description: "Vitals analysis completed",
        variant: "success"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze vitals",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    
    await sendMessage({ text: chatInput })
    setChatInput("")
  }

  const isReadOnly = appointmentData?.status === "completed"
   
  // Check if any changes have been made to existing data
  const hasChanges = () => {
    if (!vitalDetail) return true // For new records, allow save if data exists

    return (
      temperatureC !== originalValues.temperatureC ||
      heartRateBpm !== originalValues.heartRateBpm ||
      respiratoryRateBpm !== originalValues.respiratoryRateBpm ||
      mucousMembraneColor !== originalValues.mucousMembraneColor ||
      capillaryRefillTimeSec !== originalValues.capillaryRefillTimeSec ||
      hydrationStatus !== originalValues.hydrationStatus ||
      notes !== originalValues.notes
    )
  }

  if (visitLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Loading visit data...</p>
        </CardContent>
      </Card>
    )
  }

  if (!visitData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-500">No visit found for this appointment. Please make sure a visit has been created.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
      <div className="h-[calc(100vh-23rem)] overflow-y-auto p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Patient Vitals</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="temperatureC">Temperature (°F)</Label>
              <Input
                id="temperatureC"
                type="number"
                step="0.1"
                placeholder="38.5"
                value={temperatureC || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numeric input (including decimal point)
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setTemperatureC(value === "" ? undefined : parseFloat(value));
                  }
                }}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="heartRateBpm">Heart Rate (BPM)</Label>
              <Input
                id="heartRateBpm"
                type="number"
                placeholder="80"
                value={heartRateBpm || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numeric input (integers only for heart rate)
                  if (value === "" || /^\d*$/.test(value)) {
                    setHeartRateBpm(value === "" ? undefined : parseFloat(value));
                  }
                }}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="respiratoryRateBpm">Respiratory Rate (BPM)</Label>
              <Input
                id="respiratoryRateBpm"
                type="number"
                placeholder="20"
                value={respiratoryRateBpm || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numeric input (integers only for respiratory rate)
                  if (value === "" || /^\d*$/.test(value)) {
                    setRespiratoryRateBpm(value === "" ? undefined : parseFloat(value));
                  }
                }}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mucousMembraneColor">Mucous Membrane Color</Label>
              <Select
                value={mucousMembraneColor}
                onValueChange={setMucousMembraneColor}
                disabled={isReadOnly}
              >
                <SelectTrigger id="mucousMembraneColor">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pink">Pink</SelectItem>
                  <SelectItem value="pale">Pale</SelectItem>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="blue">Blue/Cyanotic</SelectItem>
                  <SelectItem value="yellow">Yellow/Jaundiced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capillaryRefillTimeSec">Capillary Refill Time (seconds)</Label>
              <Input
                id="capillaryRefillTimeSec"
                type="number"
                step="0.5"
                placeholder="1.5"
                value={capillaryRefillTimeSec || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numeric input (including decimal point)
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setCapillaryRefillTimeSec(value === "" ? undefined : parseFloat(value));
                  }
                }}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hydrationStatus">Hydration Status</Label>
              <Select
                value={hydrationStatus}
                onValueChange={setHydrationStatus}
                disabled={isReadOnly}
              >
                <SelectTrigger id="hydrationStatus">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="mild">Mild Dehydration</SelectItem>
                  <SelectItem value="moderate">Moderate Dehydration</SelectItem>
                  <SelectItem value="severe">Severe Dehydration</SelectItem>
                  <SelectItem value="overhydrated">Overhydrated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2 mb-1">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Additional Notes
            </label>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setAudioModalOpen(true)}
              title="Record voice note"
            >
              <Mic className="w-4 h-4" />
            </Button>
          </div>
          <textarea
            id="notes"
            className="w-full border rounded-md p-2 min-h-[100px]"
            placeholder="Add any additional details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isReadOnly}
          />
          <AudioManager
            open={audioModalOpen}
            onClose={() => setAudioModalOpen(false)}
            transcriber={transcriber}
            onTranscriptionComplete={(transcript: string) => {
              setNotes(prev => prev ? prev + "\n" + transcript : transcript);
              setAudioModalOpen(false);
            }}
          />
        </div>

        {/* AI Analysis Section */}
        <div className="mt-6 border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold">AI Vitals Analysis</h3>
            {!isChatMode && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAnalyze}
                disabled={
                  isAnalyzing || 
                  isReadOnly || 
                  (!temperatureC && !heartRateBpm && !respiratoryRateBpm && !mucousMembraneColor && !capillaryRefillTimeSec && !hydrationStatus)
                }
                className="flex items-center gap-2 font-semibold bg-gradient-to-r from-[#1E3D3D] to-[#1E3D3D] text-white shadow-lg hover:from-[#1E3D3D] hover:to-[#1E3D3D] hover:scale-105 transition-transform duration-150 border-0"
              >
                <Sparkles className="w-4 h-4" />
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Vitals"
                )}
              </Button>
            )}
          </div>
          
          {isChatMode ? (
            <div className="border border-purple-200/50 dark:border-purple-800/50 rounded-lg bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-purple-950/20 shadow-sm">
              <div className="flex-shrink-0 border-b border-purple-200/30 dark:border-purple-800/30 p-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-900/20 dark:to-pink-900/20 rounded-t-lg">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-purple-500 to-pink-500">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                  <h4 className="text-sm text-purple-700 dark:text-purple-300 font-semibold">AI Vitals Assistant</h4>
                </div>
              </div>
              <div className="flex flex-col h-[400px]">
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-2",
                          message.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {message.role === "assistant" && (
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                              <Bot className="h-3 w-3" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "rounded-lg px-3 py-2 max-w-[80%]",
                            message.role === "user"
                              ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm"
                              : "bg-gradient-to-r from-slate-100 to-blue-50 dark:from-slate-800 dark:to-blue-950/30 border border-slate-200 dark:border-slate-700"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {message.parts?.map((part, index) => {
                              if (part.type === 'text') {
                                return part.text;
                              }
                              return '';
                            }).join('') || ''}
                          </p>
                        </div>
                        {message.role === "user" && (
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                              <User className="h-3 w-3" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    {status === 'submitted' && (
                      <div className="flex gap-2 justify-start">
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                            <Bot className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="flex-shrink-0 border-t p-2">
                  <form onSubmit={handleChatSend} className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about the vitals analysis..."
                      className="flex-1 h-9 text-sm"
                      disabled={status === 'submitted' || isReadOnly}
                    />
                    <Button 
                      type="submit" 
                      disabled={!chatInput.trim() || status === 'submitted' || isReadOnly} 
                      size="icon" 
                      className="h-9 w-9 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-sm"
                    >
                      <Send className="h-4 w-4" />
                      <span className="sr-only">Send message</span>
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <>
              {analysisResult && (
                <div className="p-4 bg-[#D2EFEC] dark:bg-[#1E3D3D] border border-[#1E3D3D]/20 dark:border-[#1E3D3D]/80 rounded-md">
                  <div className="text-sm whitespace-pre-wrap">{analysisResult}</div>
                </div>
              )}
              
              {!analysisResult && !isAnalyzing && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-center text-gray-500 dark:text-gray-400 text-sm">
                  {(!temperatureC && !heartRateBpm && !respiratoryRateBpm && !mucousMembraneColor && !capillaryRefillTimeSec && !hydrationStatus) 
                    ? "Enter vital signs data to enable AI analysis" 
                    : "Click 'Analyze Vitals' to get AI-powered insights"}
                </div>
              )}
            </>
          )}
        </div>
        </div>
        <div className="mt-6 flex justify-end mb-4 mx-4">
          <Button
            onClick={handleSave}
            disabled={Boolean(
              isPending ||
              isReadOnly ||
              (!temperatureC && !heartRateBpm && !respiratoryRateBpm && !mucousMembraneColor && !capillaryRefillTimeSec && !hydrationStatus) ||
              (vitalDetail && !hasChanges())
            )}
            className="ml-2 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
          >
            {isPending
              ? "Saving..."
              : vitalDetail ? "Update & Next" : "Save & Next"}
          </Button>

        </div>
      </CardContent>
    </Card>
  )
}