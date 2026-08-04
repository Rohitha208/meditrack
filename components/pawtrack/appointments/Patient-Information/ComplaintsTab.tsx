"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useGetSymptoms } from "@/queries/symptoms/get-symptoms"
import { useCreateSymptom } from "@/queries/symptoms/create-symptom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, X, Mic, Search, Sparkles, Loader2 } from "lucide-react"
import { useCreateComplaintDetail } from "@/queries/complaint/create-complaint-detail"
import { useGetComplaintByVisitId } from "@/queries/complaint/get-complaint-by-visit-id"
import { useUpdateComplaintDetail } from "@/queries/complaint/update-complaint-detail"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useTabCompletion } from "@/context/TabCompletionContext"
import { useTranscriber } from "@/components/pawtrack/audioTranscriber/hooks/useTranscriber"
import { AudioManager } from "@/components/pawtrack/audioTranscriber/AudioManager"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { useGetPatientById } from "@/queries/patients/get-patient-by-id"
import { Combobox } from "@/components/ui/combobox"
import { complaintsAnalysis } from "@/app/actions/reasonformatting"
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { SelectedFilesProvider } from "@/components/pawtrack/ai-assistant/contexts/selectFiles"
// Add these imports to your existing imports
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Bot, User, Send } from "lucide-react"
import { toast } from "@/hooks/use-toast"


// Add onComplete prop to ComplaintsTab interface
interface ComplaintsTabProps {
  patientId: string
  appointmentId: string
  onNext?: () => void
  onComplete?: (completed: boolean) => void;
}

export default function ComplaintsTab({ patientId, appointmentId, onNext, onComplete }: ComplaintsTabProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [rightSideSearchQuery, setRightSideSearchQuery] = useState("")
  const [notes, setNotes] = useState("")
  const { markTabAsCompleted, isTabCompleted } = useTabCompletion()

  // AI Analysis state
  const [analysisResult, setAnalysisResult] = useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  // Add these state variables with your other state declarations
  const [isChatMode, setIsChatMode] = useState(false)
  const [chatInput, setChatInput] = useState("")  

  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    selectedSymptoms: [] as string[],
    notes: ""
  })
  
  // Get patient data to access breed information
  const { data: patientData } = useGetPatientById(patientId)
  
  // Get visit data from appointment ID
  const { data: visitData, isLoading: visitLoading } = useGetVisitByAppointmentId(appointmentId)
  
  // Get symptoms with species parameter (sent as breed)
  const { data: symptoms = [], isLoading } = useGetSymptoms(
    patientData?.species.toLowerCase() ? { breed: patientData.species.toLowerCase() } : undefined
  )
  const { data: existingComplaint, refetch: refetchComplaint } = useGetComplaintByVisitId(
    visitData?.id || ""
  )
  const { data: appointmentData } = useGetAppointmentById(appointmentId)
  
  // Initialize selected symptoms and notes from existing data
  useEffect(() => {
    if (existingComplaint) {
      const symptomIds = existingComplaint.symptoms.map(s => s.id)
      setSelectedSymptoms(symptomIds)
      setNotes(existingComplaint.notes || "")

      // Store original values for change detection
      setOriginalValues({
        selectedSymptoms: symptomIds,
        notes: existingComplaint.notes || ""
      })
    }
  }, [existingComplaint, markTabAsCompleted])

  // Show "Add new symptom" option when search query doesn't match any existing symptoms
  const hasExactMatch = symptoms.some(symptom => 
    symptom.name.toLowerCase() === rightSideSearchQuery.toLowerCase()
  )
  const showAddOption = rightSideSearchQuery.trim() && !hasExactMatch

  // Filter symptoms for right side (all symptoms with search, excluding common symptoms)
  const filteredRightSideSymptoms = symptoms.filter(symptom => 
    !symptom.isComman &&
    symptom.name.toLowerCase().includes(rightSideSearchQuery.toLowerCase())
  )

  // Get common symptoms
  const commonSymptoms = symptoms.filter(symptom => symptom.isComman)
  
    // Add this with your other useRef declarations
  const complaintsContextRef = useRef<string>("")
  
  // Add this function
  const buildComplaintsContext = useCallback(() => {
    if (!patientData?.species) return ""
    
    const symptomNames = selectedSymptoms
      .map(id => symptoms.find(s => s.id === id)?.name)
      .filter((name): name is string => !!name)
    
    const symptomsInfo = symptomNames.join(', ')
    
    return `Current Symptoms:\n${symptomsInfo}\n${notes ? 'Notes: ' + notes : ''}`.trim()
  }, [selectedSymptoms, symptoms, notes, patientData?.species])
  
  // Add this useEffect to update context
  useEffect(() => {
    complaintsContextRef.current = buildComplaintsContext()
  }, [buildComplaintsContext])

  const createSymptomMutation = useCreateSymptom({
    onSuccess: () => {
      setRightSideSearchQuery("")
      toast({
        title: "Success",
        description: "Symptom added successfully",
        variant: "success"
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add symptom: ${error.message}`,
        variant: "destructive"
      })
    }
  })

  // Chat hook with complaints context
  const { messages, sendMessage, status, setMessages } = useChat({
    id: `complaints-${patientId}-${appointmentId}`,
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: ({ id, messages }) => {
        const complaintsContext = complaintsContextRef.current

        return {
          body: {
            id,
            messages,
            patientId: patientId ?? null,
            complaintsContext: complaintsContext || undefined,
          },
        }
      },
    }),
  })

  const createComplaintMutation = useCreateComplaintDetail({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Complaint details saved successfully",
        variant: "success"
      })
      markTabAsCompleted("cc-hpi")
      if (onComplete) {
        onComplete(true);
      }
      refetchComplaint()
      if (onNext) onNext()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save complaint details: ${error.message}`,
        variant: "destructive"
      })
    }
  })

  const updateComplaintMutation = useUpdateComplaintDetail({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Complaint details updated successfully",
        variant: "success"
      })
      markTabAsCompleted("cc-hpi")
      if (onComplete) {
        onComplete(true);
      }
      refetchComplaint()
      if (onNext) onNext()
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update complaint details: ${error.message}`,
        variant: "destructive"
      })
    }
  })

  const handleSymptomClick = (id: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(id) 
        ? prev.filter(symId => symId !== id)
        : [...prev, id]
    )
  }

  const handleAddSymptom = (symptomName: string) => {
    if (symptomName.trim()) {
      createSymptomMutation.mutate({
        name: symptomName.trim(),
        breed: patientData?.species?.toLowerCase() || null
      }, {
        onSuccess: (newSymptom) => {
          setSelectedSymptoms((prev) => [...prev, newSymptom.id]);
        }
      });
    }
  };

  const handleSave = () => {
    if (!visitData?.id) {
      toast({
        title: "Error",
        description: "No visit data found for this appointment",
        variant: "destructive"
      })
      return
    }
    if (selectedSymptoms.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one symptom before saving.",
        variant: "destructive"
      })
      return
    }
    
    if (existingComplaint) {
      // Update existing complaint
      updateComplaintMutation.mutate({
        id: existingComplaint.id,
        symptomIds: selectedSymptoms,
        notes,
        isCompleted: true
      })
    } else {
      // Create new complaint
      createComplaintMutation.mutate({
        visitId: visitData.id,
        symptomIds: selectedSymptoms,
        notes,
        isCompleted: true
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

    // Check if there are any symptoms selected
    if (selectedSymptoms.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one symptom before analyzing",
        variant: "destructive"
      })
      return
    }

    setIsAnalyzing(true)
    try {
      // Get symptom names from selected symptom IDs
      const symptomNames = selectedSymptoms
        .map(id => symptoms.find(s => s.id === id)?.name)
        .filter((name): name is string => !!name)

      const analysis = await complaintsAnalysis(patientData.species, {
        symptoms: symptomNames,
        notes
      })
      setAnalysisResult(analysis)

      // Initialize chat mode with the analysis result
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
        description: "Complaints analysis completed",
        variant: "success"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze complaints",
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

  const [audioModalOpen, setAudioModalOpen] = useState(false)
  const transcriber = useTranscriber()

  useEffect(() => {
    const output = transcriber.output
    if (output && !output.isBusy && output.text) {
      setNotes(prev => prev ? prev + "\n" + output.text : output.text)
    }
    // eslint-disable-next-line
  }, [transcriber.output?.isBusy])

  const isReadOnly = appointmentData?.status === "completed"

  // Check if any changes have been made to existing data
  const hasChanges = () => {
    if (!existingComplaint) return true // For new records, allow save if data exists

    const currentSymptoms = [...selectedSymptoms].sort()
    const originalSymptoms = [...originalValues.selectedSymptoms].sort()

    return (
      JSON.stringify(currentSymptoms) !== JSON.stringify(originalSymptoms) ||
      notes !== originalValues.notes
    )
  }

  if (visitLoading || isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Loading data...</p>
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
    <SelectedFilesProvider>
    <Card>
      <CardContent className="p-0">
      <div className="h-[calc(100vh-23rem)] overflow-y-auto p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Chief Complaint</h2>
        </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left side - Common Symptoms */}
          <div>
            <h3 className="text-sm font-medium mb-3">Common Symptoms</h3>
            <div className="flex flex-wrap gap-2">
              {commonSymptoms.map(symptom => (
                <button
                  key={symptom.id}
                  onClick={() => handleSymptomClick(symptom.id)}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                    selectedSymptoms.includes(symptom.id)
                      ? 'bg-green-100 border-green-300 text-green-800'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  disabled={isReadOnly}
                >
                  {symptom.name}
                </button>
              ))}
            </div>
          </div>

          {/* Right side - All Symptoms with Checkboxes */}
          <div>
            <h3 className="text-sm font-medium mb-3">All Symptoms</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search and Add new symptoms..."
                value={rightSideSearchQuery}
                onChange={(e) => setRightSideSearchQuery(e.target.value)}
                className="pl-10"
                disabled={isReadOnly}
              />
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-md p-3">
              {/* Show "Add new symptom" option when search doesn't match existing symptoms */}
              {showAddOption && !isReadOnly && (
                <div 
                  className="flex items-center space-x-2 py-2 px-2 hover:bg-blue-50 cursor-pointer border-b border-gray-200 mb-2"
                  onClick={() => handleAddSymptom(rightSideSearchQuery)}
                >
                  <PlusCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium">
                    Add new symptom: "{rightSideSearchQuery}"
                  </span>
                </div>
              )}
              
              {filteredRightSideSymptoms.map(symptom => (
                <label key={symptom.id} className="flex items-center space-x-2 py-1 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSymptoms.includes(symptom.id)}
                    onChange={() => handleSymptomClick(symptom.id)}
                    disabled={isReadOnly}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">{symptom.name}</span>
                </label>
              ))}
              
              {/* Show message when no symptoms found and no search query */}
              {filteredRightSideSymptoms.length === 0 && !showAddOption && rightSideSearchQuery && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No symptoms found matching "{rightSideSearchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>



        {/* Selected Symptoms */}
        {selectedSymptoms.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Selected Symptoms:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedSymptoms.map(id => {
                const symptom = symptoms.find(s => s.id === id)
                return symptom ? (
                  <div 
                    key={symptom.id}
                    className="flex items-center bg-green-100 text-green-800 rounded-full px-3 py-1 text-sm"
                  >
                    {symptom.name}
                    <button 
                      className="ml-2 hover:text-red-500"
                      onClick={() => handleSymptomClick(symptom.id)}
                      disabled={isReadOnly}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : null
              })}
            </div>
          </div>
        )}

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
              disabled={isReadOnly}
            >
              <Mic className="w-4 h-4" />
            </Button>
          </div>
          <textarea
            className="w-full border rounded-md p-2 min-h-[100px]"
            placeholder="Add any additional details about the complaint..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isReadOnly}
          />
          <AudioManager
            open={audioModalOpen}
            onClose={() => setAudioModalOpen(false)}
            transcriber={transcriber}
            onTranscriptionComplete={(transcript: string) => {
              setNotes(prev => prev ? prev + "\n" + transcript : transcript)
              setAudioModalOpen(false)
            }}
          />
        </div>

        {/* AI Analysis Section */}
        <div className="mt-6 border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold">AI Symptoms Analysis</h3>
            {!isChatMode && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAnalyze}
                disabled={isAnalyzing || isReadOnly || selectedSymptoms.length === 0}
                className="flex items-center gap-2 font-semibold bg-gradient-to-r from-[#1E3D3D] to-[#1E3D3D] text-white shadow-lg hover:from-[#1E3D3D] hover:to-[#1E3D3D] hover:scale-105 transition-transform duration-150 border-0"
              >
                <Sparkles className="w-4 h-4" />
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Symptoms"
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
                  <h4 className="text-sm text-purple-700 dark:text-purple-300 font-semibold">AI Symptoms Assistant</h4>
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
                      placeholder="Ask about the symptoms analysis..."
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
              {!analysisResult && !isAnalyzing && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-center text-gray-500 dark:text-gray-400 text-sm">
                  {selectedSymptoms.length === 0 
                    ? "Select symptoms to enable AI analysis" 
                    : "Click 'Analyze Symptoms' to get AI-powered symptom pattern insights"}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end mb-4 mx-4">
          <Button 
            onClick={handleSave}
            disabled={
              createComplaintMutation.isPending ||
              updateComplaintMutation.isPending ||
              selectedSymptoms.length === 0 ||
              isReadOnly ||
              (!!existingComplaint && !hasChanges())
            }
            className="ml-2 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
          >
            {createComplaintMutation.isPending || updateComplaintMutation.isPending
              ? "Saving..."
              : existingComplaint ? "Update & Next" : "Save & Next"}
          </Button>
        </div>
      </div>
      </CardContent>
    </Card>
    </SelectedFilesProvider>
  )
}