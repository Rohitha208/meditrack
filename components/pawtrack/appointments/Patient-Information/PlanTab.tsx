"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useGetPlans } from "@/queries/Plan/get-plans"
import { useCreatePlan } from "@/queries/Plan/create-plan"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, X, CheckCircle, Mic, Sparkles, Loader2 } from "lucide-react"
import { ChatInterface } from "@/components/pawtrack/ai-assistant/chat-interface"
import { SelectedFilesProvider } from "@/components/pawtrack/ai-assistant/contexts/selectFiles"
import { useGetPatientById } from "@/queries/patients/get-patient-by-id"
import { planAnalysis } from "@/app/actions/reasonformatting"
import { useToast } from "@/hooks/use-toast"
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCreatePlanDetail } from "@/queries/PlanDetail/create-plan-detail"
import { useGetPlanDetailByVisitId } from "@/queries/PlanDetail/get-plan-detail-by-visit-id"
import { useUpdatePlanDetail } from "@/queries/PlanDetail/update-plan-detail"
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId"
import { useUpdateAppointment } from "@/queries/appointment/update-appointment"
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

import { useTabCompletion } from "@/context/TabCompletionContext"
import { useTranscriber } from "@/components/pawtrack/audioTranscriber/hooks/useTranscriber"
import { AudioManager } from "@/components/pawtrack/audioTranscriber/AudioManager"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Bot, User, Send } from "lucide-react"


// Interface for extended visit data
interface ExtendedVisitData {
  isIntakeCompleted: boolean;
  isComplaintsCompleted: boolean;
  isVitalsCompleted: boolean;
  isProceduresCompleted: boolean;
  isPrescriptionCompleted: boolean;
  isPlanCompleted: boolean;
}

interface PlanTabProps {
  patientId: string
  appointmentId: string
  onNext?: () => void
  onClose?: () => void
  onComplete?: (completed: boolean) => void;
}

export default function PlanTab({ patientId, appointmentId, onNext, onClose, onComplete }: PlanTabProps) {
  const { toast } = useToast()
  // State declarations
  const [selectedPlans, setSelectedPlans] = useState<string[]>([])
  const [analysisResult, setAnalysisResult] = useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [notes, setNotes] = useState("")
  const [followUpDate, setFollowUpDate] = useState<Date | null>(null)
  // Patient data for species
  const { data: patientData } = useGetPatientById(patientId)
  // AI Chat mode state
  const [isChatMode, setIsChatMode] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const planContextRef = useRef<string>("")
  
  // Fetch plans data
  const { data: plans = [], isLoading, refetch: refetchPlans } = useGetPlans()

    // Chat hook for plan analysis
    const { messages, sendMessage, status, setMessages } = useChat({
      id: `plan-${patientId}-${appointmentId}`,
      transport: new DefaultChatTransport({
        prepareSendMessagesRequest: ({ id, messages }) => {
          const planContext = planContextRef.current;
          return {
            body: {
              id,
              messages,
              patientId: patientId ?? null,
              planContext: planContext || undefined,
            }
          }
        },
      }),
    })

    // Build context for plan analysis
    const buildPlanContext = useCallback(() => {
      const plansList = selectedPlans.map(id => plans.find(p => p.id === id)?.name || 'Plan')
      return `Current Plans:\n- ${plansList.join('\n- ')}\n${notes ? 'Notes: ' + notes : ''}\nFollow-up: ${followUpDate ? followUpDate.toLocaleDateString() : 'None'}`.trim()
    }, [selectedPlans, plans, notes, followUpDate])

    useEffect(() => {
      planContextRef.current = buildPlanContext()
    }, [selectedPlans, notes, followUpDate, plans])

  const handleChatSend = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!chatInput.trim()) return
  
  await sendMessage({ text: chatInput })
  setChatInput("")
  }
    const handleAnalyzePlan = async () => {
    if (!patientData?.species) {
      toast({
        title: "Error",
        description: "Patient species information is required for analysis",
        variant: "destructive"
      })
      return
    }
    if (selectedPlans.length === 0) {
      toast({
        title: "Error",
        description: "Select at least one plan to analyze",
        variant: "destructive"
      })
      return
    }
    setIsAnalyzing(true)
    try {
      const plansList = selectedPlans.map(id => {
        const plan = plans.find(p => p.id === id)
        return { name: plan?.name || "Plan" }
      })
      const analysis = await planAnalysis(patientData.species, {
        plans: plansList,
        notes,
        followUpDate: followUpDate ? followUpDate.toISOString().split('T')[0] : null
      })
      setAnalysisResult(analysis)
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
        description: "Plan analysis completed",
        variant: "success"
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to analyze plan",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }
  const [isAddingPlan, setIsAddingPlan] = useState(false)
  const [newPlanName, setNewPlanName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  
  const { markTabAsCompleted, allTabsCompleted, completedTabs } = useTabCompletion()
  const [areAllTabsCompleted, setAreAllTabsCompleted] = useState(false)
  
  const completionCheckRef = useRef<NodeJS.Timeout | null>(null)
  
  // Get visit data from appointment ID
  const { data: visitData, isLoading: visitLoading } = useGetVisitByAppointmentId(appointmentId)
  
  // Get appointment data
  const { data: appointmentData } = useGetAppointmentById(appointmentId)
  
  // Check if appointment is already completed
  const isAppointmentCompleted = appointmentData?.status === "completed"
  

  
  const { data: existingPlanDetail, refetch: refetchPlanDetail } = useGetPlanDetailByVisitId(
    visitData?.id || ""
  )
  const { mutateAsync: createPlanDetail, isPending: isCreating } = useCreatePlanDetail()
  const { mutateAsync: updatePlanDetail, isPending: isUpdating } = useUpdatePlanDetail()
  
  // Combined loading state
  const isPending = isCreating || isUpdating


  
  // Initialize selected plans and notes from existing data
  useEffect(() => {
    if (existingPlanDetail) {
      setSelectedPlans(existingPlanDetail.plans.map(p => p.id))
      if (existingPlanDetail.notes) {
        setNotes(existingPlanDetail.notes)
      }
      if (existingPlanDetail.followUpDate) {
        setFollowUpDate(new Date(existingPlanDetail.followUpDate))
      }


      
      // Mark plan tab as completed if it was already completed
      if (existingPlanDetail.isCompleted) {
        markTabAsCompleted("plan")
      }
    }
    
    // Also check if the plan tab is completed based on visitData
    if (visitData) {
      const visit = visitData as unknown as ExtendedVisitData;
      if (visit.isPlanCompleted) {
        markTabAsCompleted("plan")
      }
    }
  }, [existingPlanDetail, visitData, markTabAsCompleted])
  
  // Update allTabsCompleted state when tabs are completed
  useEffect(() => {
    // Use a delayed check to ensure all tab completion updates have been processed
    if (completionCheckRef.current) {
      clearTimeout(completionCheckRef.current)
    }
    
    completionCheckRef.current = setTimeout(() => {
      const checkResult = allTabsCompleted()
      setAreAllTabsCompleted(checkResult)
    }, 100)
    
    return () => {
      if (completionCheckRef.current) {
        clearTimeout(completionCheckRef.current)
      }
    }
  }, [completedTabs, allTabsCompleted])
  
  const createPlanMutation = useCreatePlan({
    onSuccess: () => {
      setNewPlanName("")
      setIsAddingPlan(false)
      // Explicitly refetch plans to update the UI immediately
      refetchPlans()
      toast({
        title: "Success",
        description: "Plan added successfully",
        variant: "success"
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add plan: ${error.message}`,
        variant: "destructive"
      })
    }
  })

  const createPlanDetailMutation = useCreatePlanDetail({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Plan details saved successfully",
        variant: "success"
      })
      refetchPlanDetail()
      markTabAsCompleted("plan")
      if (onComplete) {
        onComplete(true);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save plan details: ${error.message}`,
        variant: "destructive"
      })
      setIsProcessing(false)
    }
  })

  const updatePlanDetailMutation = useUpdatePlanDetail({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Plan details updated successfully",
        variant: "success"
      })
      refetchPlanDetail()
      markTabAsCompleted("plan")
      if (onComplete) {
        onComplete(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update plan details: ${error.message}`,
        variant: "destructive"
      })
      setIsProcessing(false)
    }
  })
  
  const updateAppointmentMutation = useUpdateAppointment({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visit completed successfully",
        variant: "success"
      })
      setIsProcessing(false)
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update appointment status: ${error.message}`,
        variant: "destructive"
      })
      setIsProcessing(false)
    }
  })

  const handlePlanClick = (id: string) => {
    setSelectedPlans(prev => 
      prev.includes(id) 
        ? prev.filter(planId => planId !== id)
        : [...prev, id]
    )
  }

  const handleAddPlan = () => {
    if (newPlanName.trim()) {
      createPlanMutation.mutate({
        name: newPlanName.trim()
      })
    }
  }

  // Track whether the plan has been saved and checkout has been initiated
  const [hasInitiatedCheckout, setHasInitiatedCheckout] = useState(false)

  // Save or update plan detail (for Save/Update button)
  const handleSave = async () => {
    if (!visitData?.id) {
      toast({
        title: "Error",
        description: "No visit data found for this appointment",
        variant: "destructive"
      })
      return
    }
    if (selectedPlans.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one plan before saving.",
        variant: "destructive"
      })
      return
    }
    try {
      if (existingPlanDetail) {
        await updatePlanDetailMutation.mutateAsync({
          id: existingPlanDetail.id,
          planIds: selectedPlans,
          notes,
          followUpDate: followUpDate ? followUpDate : null,
          isCompleted: true
        })
      } else {
        await createPlanDetailMutation.mutateAsync({
          visitId: visitData.id,
          planIds: selectedPlans,
          notes,
          followUpDate: followUpDate ? followUpDate : null,
          isCompleted: true
        })
      }
      toast({
        title: "Success",
        description: "Plan details saved successfully",
        variant: "success"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save plan details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    }
  }

  const handleCheckout = async () => {
    if (!visitData?.id) {
      toast({
        title: "Error",
        description: "No visit data found for this appointment",
        variant: "destructive"
      })
      return
    }
    if (!appointmentData) {
      toast({
        title: "Error",
        description: "No appointment data found",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    setHasInitiatedCheckout(true)
    try {
      // First save the plan details as completed
      if (existingPlanDetail) {
        await updatePlanDetailMutation.mutateAsync({
          id: existingPlanDetail.id,
          planIds: selectedPlans,
          notes,
          isCompleted: true
        })
      } else {
        await createPlanDetailMutation.mutateAsync({
          visitId: visitData.id,
          planIds: selectedPlans,
          notes,
          isCompleted: true
        })
      }
      // Only update appointment status if not already completed
      if (!isAppointmentCompleted) {
        await updateAppointmentMutation.mutateAsync({
          id: appointmentId,
          data: {
            ...appointmentData,
            status: "completed"
          }
        })
      }
      // Ensure we close the form immediately after successful completion
      if (onClose) {
        onClose()
      }
    } catch (error) {
      console.error("Error during checkout process:", error)
      setIsProcessing(false)
    }
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
      <div className="h-[calc(100vh-26rem)] overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Treatment Plan</h2>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => setIsAddingPlan(!isAddingPlan)}
                disabled={isReadOnly}
              >
                <PlusCircle className="h-4 w-4" /> 
                Add Plan
              </Button>
            </div>
          </div>        {isAddingPlan && (
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="Enter new plan name"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              className="max-w-md"
              disabled={isReadOnly}
            />
            <Button
              onClick={handleAddPlan}
              disabled={!newPlanName.trim() || createPlanMutation.isPending || isReadOnly}
              className="bg-[#1E3D3D] hover:bg-[#1E3D3D]/90 text-white"
            >
              Add
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => {
                setIsAddingPlan(false)
                setNewPlanName("")
              }}
              disabled={isReadOnly}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}



        {isLoading ? (
          <div className="py-4 text-sm text-muted-foreground">Loading plans...</div>
        ) : (
          <>
            {selectedPlans.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Selected Plans:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPlans.map(id => {
                    const plan = plans.find(p => p.id === id)
                    return plan ? (
                      <div 
                        key={plan.id}
                        className="flex items-center bg-[#D2EFEC] text-[#1E3D3D] rounded-full px-3 py-1 text-sm"
                      >
                        {plan.name}
                        <button 
                          className="ml-2 hover:text-red-500"
                          onClick={() => handlePlanClick(plan.id)}
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

            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">All Plans</h3>
              <div className="flex flex-wrap gap-2">
                {plans.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => handlePlanClick(plan.id)}
                    className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                      selectedPlans.includes(plan.id)
                        ? 'bg-[#D2EFEC] border-[#1E3D3D] text-[#1E3D3D]'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    disabled={isReadOnly}
                  >
                    {plan.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex flex-row items-center gap-2 mb-2">
                <h3 className="text-sm font-medium">Additional Notes</h3>
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
                className="w-full border rounded-md p-2 min-h-[100px]"
                placeholder="Add any additional details about the treatment plan..."
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

            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between items-center">
                <div className="w-48">
                  <label className="block text-sm font-medium mb-1">Follow-up Date</label>
                  <DatePicker
                    selected={followUpDate}
                    onChange={(d: Date | null) => setFollowUpDate(d)}
                    minDate={new Date()}
                    placeholderText="dd/mm/yyyy"
                    dateFormat="dd/MM/yyyy"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>

            {/* AI Plan Analysis Section */}
            <div className="mt-8 border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-semibold">AI Plan Analysis</h3>
                {!isChatMode && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAnalyzePlan}
                    disabled={
                      isAnalyzing ||
                      isReadOnly ||
                      selectedPlans.length === 0
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
                      "Analyze Plan"
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
        <h4 className="text-sm text-purple-700 dark:text-purple-300 font-semibold">AI Plan Assistant</h4>
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
            placeholder="Ask about the plan analysis..."
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
)  : (
                <>
                  {!analysisResult && !isAnalyzing && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-center text-gray-500 dark:text-gray-400 text-sm">
                      {selectedPlans.length === 0
                        ? "Select treatment plans to enable AI analysis"
                        : "Click 'Analyze Plan' to get AI-powered insights"}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
        </div>
         <div className="flex justify-end my-4 mx-4 gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={isPending || selectedPlans.length === 0 || isReadOnly}
                    className="ml-2 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
                  >
                    {isPending ? "Saving..." : existingPlanDetail ? "Update" : "Save"}
                  </Button>
                  <Button
                    onClick={handleCheckout}
                    disabled={false}
                    className="ml-2 bg-[#1E3D3D] hover:bg-[#1E3D3D]/90 text-white"
                  >
                    Checkout
                  </Button>
                </div>
      </CardContent>
    </Card>
    </SelectedFilesProvider>
  )
}

