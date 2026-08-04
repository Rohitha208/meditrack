import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useCreateDewormingMedication } from "@/queries/deworming/medication/create-deworming-medication";
import { useUpdateDewormingMedication } from "@/queries/deworming/medication/update-deworming-medication";
import { useGetDewormingMedicationByVisitId, } from "@/queries/deworming/medication/get-deworming-medication-by-visit-id";
import { Card, CardContent } from "@/components/ui/card";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useGetPatientById } from "@/queries/patients/get-patient-by-id";
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { dewormingMedicationAnalysis } from "@/app/actions/reasonformatting";
import { useToast } from "@/hooks/use-toast";

interface MedicationTabProps {
  patientId: string;
  appointmentId: string;
  visitId?: string;
  onComplete?: (completed: boolean) => void;
  onNext?: () => void;
  isCompleted?: boolean;
}

export default function MedicationTab({ patientId, appointmentId, visitId, onComplete, onNext, isCompleted = false }: MedicationTabProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [route, setRoute] = useState("Oral");
  const [dateTimeGiven, setDateTimeGiven] = useState("");
  const [veterinarianName, setVeterinarianName] = useState("");
  const [administeredBy, setAdministeredBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get patient data for species information
  const { data: patientData } = useGetPatientById(patientId);

  // Build medication context for chat
  const medicationContextRef = useRef("");
  const [chatInput, setChatInput] = useState("");

  const buildMedicationContext = () => {
    if (!patientData) return "";

    const medicationInfo = `
Current Medication Data:
- Patient: ${patientData.name || 'Unknown'}
- Species: ${patientData.species || 'Unknown'}
- Route: ${route || 'Not specified'}
- Date/Time Given: ${dateTimeGiven || 'Not recorded'}
- Veterinarian: ${veterinarianName || 'Not specified'}
- Administered By: ${administeredBy || 'Not specified'}
${remarks ? `- Remarks: ${remarks}` : ''}
    `.trim();

    return medicationInfo;
  };

  // Update medication context when data changes
  useEffect(() => {
    medicationContextRef.current = buildMedicationContext();
  }, [route, dateTimeGiven, veterinarianName, administeredBy, remarks, patientData]);

  // Set up the chat interface
  const { messages, sendMessage, status, setMessages } = useChat({
    id: `deworming-${patientId}-${appointmentId}`,
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: ({ id, messages }) => {
        const medicationContext = medicationContextRef.current;

        return {
          body: {
            id,
            messages,
            patientId: patientId ?? null,
            medicationContext: medicationContext || undefined,
          },
        };
      },
    }),
  });

  const handleAnalyze = async () => {
  if (!patientData?.species) {
    toast({
      title: "Error",
      description: "Patient species information is required for analysis",
      variant: "destructive"
    });
    return;
  }

  // Check if there's any medication data to analyze
  if (!route && !dateTimeGiven && !veterinarianName && !administeredBy && !remarks) {
    toast({
      title: "Error",
      description: "Please enter at least one medication detail before analyzing",
      variant: "destructive"
    });
    return;
  }

  setIsAnalyzing(true);
  try {
    const analysis = await dewormingMedicationAnalysis(patientData.species, {
      route,
      dateTimeGiven,
      veterinarianName,
      administeredBy,
      remarks
    });
    
    setAnalysisResult(analysis);
    setIsChatMode(true);
    
    // Initialize chat with the analysis result as the first message
    setMessages([
      {
        id: 'initial-analysis',
        role: 'assistant',
        parts: [{ type: 'text', text: analysis }]
      }
    ]);
    
    toast({
      title: "Success",
      description: "Medication analysis completed",
      variant: "success"
    });
  } catch (error) {
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to analyze medication",
      variant: "destructive"
    });
  } finally {
    setIsAnalyzing(false);
  }
};
const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    await sendMessage({ text: chatInput });
    setChatInput("");
  };
  

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Use visitId if available, otherwise fall back to appointmentId
  const effectiveVisitId = visitId || appointmentId;
  // Use the hook for medication data
  const { data: medicationData, isLoading, isError, refetch } = useGetDewormingMedicationByVisitId(effectiveVisitId);
  const createMedication = useCreateDewormingMedication();
  const updateMedication = useUpdateDewormingMedication();

  const isMedicationFormComplete = () => {
    return (
      route.trim() !== "" &&
      dateTimeGiven.trim() !== "" &&
      veterinarianName.trim() !== "" &&
      administeredBy.trim() !== ""
    );
  };
  const { data: appointmentData } = useGetAppointmentById(appointmentId);
  const isReadOnly = appointmentData?.status === "completed";
  const hasExistingData = medicationData && medicationData.length > 0;

  // Load medications when component mounts or data changes
  useEffect(() => {
    if (medicationData && medicationData.length > 0) {
      const latestMedication = medicationData[0];

      // Set common medication data
      setRoute(latestMedication.route || "Oral");
      setDateTimeGiven(latestMedication.dateTimeGiven || "");
      setVeterinarianName(latestMedication.veterinarianName || "");
      setAdministeredBy(latestMedication.administeredBy || "");
      setRemarks(latestMedication.remarks || "");

      // Notify parent about completion status
      if (onComplete) {
        onComplete(latestMedication.isCompleted);
      }
    }
  }, [medicationData, onComplete]);

  const handleSaveMedications = async () => {
    setIsSaving(true);
    try {
      // Create payload with the API structure
      const payload = {
        visitId: effectiveVisitId,
        route: route,
        dateTimeGiven: dateTimeGiven || new Date().toISOString(),
        veterinarianName: veterinarianName,
        administeredBy: administeredBy,
        remarks: remarks,
        isCompleted: true
      };

      // If we have existing data, use update, otherwise create
      if (medicationData && medicationData.length > 0) {
        await updateMedication.mutateAsync({
          id: medicationData[0].id,
          ...payload
        });
      } else {
        await createMedication.mutateAsync(payload);
      }

      // After successful save, refetch data
      await refetch();

      // Notify parent about completion
      if (onComplete) {
        onComplete(true);
      }
      const operation = medicationData && medicationData.length > 0 ? 'updated' : 'created';
      
      toast({
        title: "Success",
        description: `Medication information ${operation} successfully`,
        variant: "success"
      });

      // Move to next tab if provided
      if (onNext) {
        onNext();
      }
    } catch (error) {
      console.error("Error saving medications:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card className="relative">
      <CardContent className="p-0">
      <div className="h-[calc(100vh-20.5rem)] overflow-y-auto p-6">
        <div className="space-y-6">
          {isError && (
            <div className="p-3 bg-red-50 text-red-600 rounded border border-red-200">
              Error loading medication data. You can still add new medications.
            </div>
          )}

          {/* Common Medication Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4">Medication Administration Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div >
                <Label htmlFor="route">Route</Label>
                <Select
                  value={route}
                  onValueChange={setRoute}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Oral">Oral</SelectItem>
                    <SelectItem value="Injectable">Injectable</SelectItem>
                    <SelectItem value="Topical">Topical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dateTimeGiven">Date/Time Given</Label>
                <Input
                  id="dateTimeGiven"
                  type="datetime-local"
                  value={dateTimeGiven}
                  onChange={e => setDateTimeGiven(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Label htmlFor="veterinarianName">Veterinarian</Label>
                <Input
                  id="veterinarianName"
                  value={veterinarianName}
                  onChange={e => setVeterinarianName(e.target.value)}
                  placeholder="Enter veterinarian name"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Label htmlFor="administeredBy">Administered By</Label>
                <Input
                  id="administeredBy"
                  value={administeredBy}
                  onChange={e => setAdministeredBy(e.target.value)}
                  placeholder="Enter staff name"
                  disabled={isReadOnly}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Input
                  id="remarks"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Any special notes about administration"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {(createMedication.isError || updateMedication.isError) && (
            <div className="p-3 bg-red-50 text-red-600 rounded border border-red-200">
              Error saving medications. Please try again.
            </div>
          )}
          {(createMedication.isSuccess || updateMedication.isSuccess) && (
            <div className="p-3 bg-green-50 text-green-600 rounded border border-green-200">
              Medications saved successfully!
            </div>
          )}

          {/* Save Button */}
          
        </div>
        {/* AI Medication Analysis Section */}
<div className="mt-8 border-t pt-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-md font-semibold">AI Medication Analysis</h3>
    {!isChatMode && (
      <Button
        type="button"
        variant="outline"
        onClick={handleAnalyze}
        disabled={
          isAnalyzing ||
          isReadOnly ||
          (!route && !dateTimeGiven && !veterinarianName && !administeredBy && !remarks)
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
          "Analyze Medication"
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
          <h4 className="text-sm text-purple-700 dark:text-purple-300 font-semibold">AI Medication Assistant</h4>
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
              placeholder="Ask about the medication analysis..."
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
          {(!route && !dateTimeGiven && !veterinarianName && !administeredBy && !remarks)
            ? "Enter medication details to enable AI analysis"
            : "Click 'Analyze Medication' to get AI-powered insights"}
        </div>
      )}
    </>
  )}
</div>
        </div>
        <div className="flex justify-end mb-4 mx-4">
            <Button
              type="button"
              className="bg-[#1E3D3D] text-white px-6 py-2 rounded hover:bg-[#1E3D3D] hover:text-white disabled:opacity-50"
              onClick={handleSaveMedications}
              disabled={isSaving || !isMedicationFormComplete() || isReadOnly}
            >
              {isSaving ? "Saving..." : (hasExistingData ? "Update & Next" : "Save & Next")}
            </Button>
          </div>
      </CardContent>
    </Card>
  );
} 