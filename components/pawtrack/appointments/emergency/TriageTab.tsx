import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";
import { useCreateEmergencyVisit } from "@/queries/emergency/triage/create-emergency-visit";
import { useGetEmergencyVisitByVisitId } from "@/queries/emergency/triage/get-emergency-visit-by-visit-id";
import { useUpdateEmergencyVisit } from "@/queries/emergency/triage/update-emergency-visit";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id";
import { useUpdateVisit } from "@/queries/visit/update-visit";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useGetPatientById } from "@/queries/patients/get-patient-by-id";
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { emergencyTriageAnalysis } from "@/app/actions/reasonformatting";
import { toast } from "@/hooks/use-toast";

interface TriageTabProps {
  patientId: string;
  appointmentId: string;
  onNext?: () => void;
}

const triageCategories = [
  { value: "Critical", label: "Critical", color: "text-red-600" },
  { value: "High", label: "High", color: "text-orange-600" },
  { value: "Medium", label: "Medium", color: "text-yellow-600" },
  { value: "Low", label: "Low", color: "text-green-600" },
];

export default function TriageTab({ patientId, appointmentId, onNext }: TriageTabProps) {
  const [arrivalTime, setArrivalTime] = useState<Date>(() => new Date());
  const [nurse, setNurse] = useState("");
  const [triageCategory, setTriageCategory] = useState("");
  const [painScore, setPainScore] = useState("");
  const [allergies, setAllergies] = useState("");
  const [immediateIntervention, setImmediateIntervention] = useState(false);
  const [reason, setReason] = useState("");
  const [triageLevel, setTriageLevel] = useState("");
  const [triageLevelError, setTriageLevelError] = useState("");
  const [triageCategoryError, setTriageCategoryError] = useState("");
  const [presentingComplaint, setPresentingComplaint] = useState("");
  const [notes, setNotes] = useState("");
  const { data: visitData, isLoading: visitLoading } = useGetVisitByAppointmentId(appointmentId);
  const { data: triageData, isLoading: triageLoading, refetch: refetchTriage } = useGetEmergencyVisitByVisitId(visitData?.id || "", !!visitData?.id);
  const createTriage = useCreateEmergencyVisit();
  const updateTriage = useUpdateEmergencyVisit();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [chatInput, setChatInput] = useState("");
  const isTriageComplete = (): boolean => {
    const painNum = Number(painScore);

    return (
      !!arrivalTime &&
      nurse.trim() !== "" &&
      triageCategory.trim() !== "" &&
      painScore.trim() !== "" &&
      !isNaN(painNum) &&
      painNum >= 0 && painNum <= 10 &&
      allergies.trim() !== "" &&
      reason.trim() !== "" &&
      presentingComplaint.trim() !== ""
    );
  };

  const hasAnyInput = (): boolean => {
    const painNum = Number(painScore);
    return (
      !!arrivalTime ||
      nurse.trim() !== "" ||
      triageCategory.trim() !== "" ||
      painScore.trim() !== "" || (!isNaN(painNum) && painNum >= 0) ||
      allergies.trim() !== "" ||
      immediateIntervention === true ||
      reason.trim() !== "" ||
      presentingComplaint.trim() !== "" ||
      notes.trim() !== ""
    );
  };

  const { data: patientData } = useGetPatientById(patientId);

  const { data: appointmentData } = useGetAppointmentById(appointmentId);
  const updateVisit = useUpdateVisit();

  const isReadOnly = appointmentData?.status === "completed";

  useEffect(() => {
    const data = triageData;
    if (data) {
      setArrivalTime(data.arrivalTime ? new Date(data.arrivalTime) : new Date());

      setNurse(data.triageNurseDoctor || "");
      setTriageCategory(data.triageCategory || "");
      setPainScore(data.painScore !== undefined ? String(data.painScore) : "");
      setAllergies(data.allergies || "");
      setImmediateIntervention(!!data.immediateInterventionRequired);
      setReason(data.reasonForEmergency || "");
      setTriageLevel(data.triageLevel ? data.triageLevel.replace('Level ', '') : "");
      setPresentingComplaint(data.presentingComplaint || "");
      setNotes(data.initialNotes || "");
    }
  }, [triageData]);

  const validateForm = () => {
    let isValid = true;

    if (!triageCategory) {
      setTriageCategoryError("Triage category is required");
      isValid = false;
    } else if (!["Critical", "High", "Medium", "Low"].includes(triageCategory)) {
      setTriageCategoryError("Triage category must be Critical, High, Medium, or Low");
      isValid = false;
    } else {
      setTriageCategoryError("");
    }

    setTriageLevelError("");

    return isValid;
  };
  // Build triage context for chat
const triageContextRef = useRef("");

const buildTriageContext = useCallback(() => {
  if (!patientId) return "";

  const triageInfo = `
Current Triage Data:
- Arrival Time: ${arrivalTime ? arrivalTime.toISOString() : "Not recorded"}
- Triage Nurse/Doctor: ${nurse || "Not specified"}
- Triage Category: ${triageCategory || "Not specified"}
- Pain Score: ${painScore || "Not recorded"}
- Allergies: ${allergies || "None reported"}
- Immediate Intervention Required: ${immediateIntervention ? "Yes" : "No"}
- Reason for Emergency: ${reason || "Not specified"}
- Presenting Complaint: ${presentingComplaint || "Not specified"}
${notes ? `- Initial Notes: ${notes}` : ""}
  `.trim();

  return triageInfo;
}, [
  arrivalTime,
  nurse,
  triageCategory,
  painScore,
  allergies,
  immediateIntervention,
  reason,
  presentingComplaint,
  notes,
  patientId,
]);

useEffect(() => {
  triageContextRef.current = buildTriageContext();
}, [buildTriageContext]);

const { messages, sendMessage, status, setMessages } = useChat({
  id: `triage-${patientId}-${appointmentId}`,
  transport: new DefaultChatTransport({
    prepareSendMessagesRequest: ({ id, messages }) => {
      const triageContext = triageContextRef.current;

      return {
        body: {
          id,
          messages,
          patientId: patientId ?? null,
          triageContext: triageContext || undefined,
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

  if (!hasAnyInput()) {
    toast({
      title: "Error",
      description: "Please enter at least one triage detail before analyzing",
      variant: "destructive"
    });
    return;
  }

  setIsAnalyzing(true);
  try {
    const analysis = await emergencyTriageAnalysis(
      patientData.species, // 
      {
        arrivalTime: arrivalTime?.toISOString(),
        triageNurseDoctor: nurse || undefined,
        triageCategory: triageCategory || undefined,
        painScore: painScore ? Number(painScore) : undefined,
        allergies: allergies || undefined,
        immediateInterventionRequired: immediateIntervention,
        reasonForEmergency: reason || undefined,
        presentingComplaint: presentingComplaint || undefined,
        initialNotes: notes || undefined,
      }
    );

    setAnalysisResult(analysis);
    setIsChatMode(true);

    setMessages([
      {
        id: "initial-triage-analysis",
        role: "assistant",
        parts: [{ type: "text", text: analysis }],
      },
    ]);

    toast({
      title: "Success",
      description: "Triage analysis completed",
      variant: "success"
    });
  } catch (error) {
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to analyze triage data",
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

  const handleSubmit = async () => {
    if (!visitData?.id) {
      toast({
        title: "Error",
        description: "No visit data found for this appointment",
        variant: "destructive"
      });
      return;
    }
  
    if (!validateForm()) {
      return;
    }
  
    setIsSubmitting(true);
    try {
      let response;
      let isUpdate = false;
  
      if (triageData && triageData.id) {
        isUpdate = true;
        response = await updateTriage.mutateAsync({
          id: triageData.id,
          arrivalTime: arrivalTime?.toISOString(),
          triageNurseDoctor: nurse,
          triageCategory,
          painScore: painScore ? Number(painScore) : 0,
          allergies,
          immediateInterventionRequired: immediateIntervention,
          reasonForEmergency: reason,
          presentingComplaint,
          initialNotes: notes,
          visitId: visitData.id,
          isComplete: isTriageComplete(),
        });
      } else {
        response = await createTriage.mutateAsync({
          arrivalTime: arrivalTime?.toISOString(),
          triageNurseDoctor: nurse,
          triageCategory,
          painScore: painScore ? Number(painScore) : 0,
          allergies,
          immediateInterventionRequired: immediateIntervention,
          reasonForEmergency: reason,
          presentingComplaint,
          initialNotes: notes,
          visitId: visitData.id,
          isComplete: isTriageComplete(),
        });
      }
  
      // ✅ Different success messages for create vs update
      const successMessage =
        response?.data?.message ||
        response?.message ||
        (isUpdate ? "Triage updated successfully" : "Triage created successfully");
  
      toast({
        title: "Success",
        description: successMessage,
        variant: "success"
      });
  
      await refetchTriage();
      if (visitData?.id) {
        try {
          await updateVisit.mutateAsync({ id: visitData.id, isEmergencyTriageCompleted: true });
        } catch {}
      }
      if (onNext) onNext();
    } catch (error: any) {
      console.error("Triage error:", error);
  
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to save triage record";
  
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  


  return (
    <Card>
      <CardContent className="p-0">
      <div className="h-[calc(100vh-23rem)] overflow-y-auto p-6">
        <div className={isReadOnly ? "pointer-events-none opacity-60" : ""}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="mb-4">
            <Label htmlFor="arrivalTime">Arrival Time</Label>
            <DatePicker
              selected={arrivalTime}
              onChange={(date) => {
                if (date instanceof Date && !isNaN(date.getTime())) {
                  setArrivalTime(date);
                }
              }}
              showTimeSelect
              timeIntervals={5}
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              dateFormat="dd/MM/yyyy h:mm aa"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="nurse">Triage Nurse/Doctor</Label>
            <Input
              id="nurse"
              placeholder="Name of triage nurse/doctor"
              value={nurse}
              onChange={e => setNurse(e.target.value)}
            />
          </div>
        </div>
        <div className="mb-4">
          <Label htmlFor="triageCategory">Triage Category</Label>
          <Select onValueChange={setTriageCategory} value={triageCategory}>
            <SelectTrigger className={triageCategoryError ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select triage category" />
            </SelectTrigger>
            <SelectContent>
              {triageCategories.map((category) => (
                <SelectItem key={category.value} value={category.value} className={category.color}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {triageCategoryError && (
            <p className="text-sm text-red-500 mt-1">{triageCategoryError}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="painScore">Pain Score (0-10)</Label>
            <Input
              id="painScore"
              type="number"
              min={1}
              max={10}
              value={painScore}
              onChange={e => {
                const val = e.target.value;
                // Allow empty string for controlled input
                if (val === "") {
                  setPainScore("");
                  return;
                }
                // Only allow numbers between 1 and 10
                const num = Number(val);
                if (num >= 1 && num <= 10) {
                  setPainScore(val);
                }
              }}
            />
          </div>
          <div>
            <Label htmlFor="allergies">Allergies</Label>
            <Input
              id="allergies"
              placeholder="List any allergies"
              value={allergies}
              onChange={e => setAllergies(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="immediateIntervention"
            checked={immediateIntervention}
            onCheckedChange={checked => setImmediateIntervention(checked === true)}
          />
          <Label htmlFor="immediateIntervention">Immediate intervention required</Label>
        </div>
        <div className="mb-4">
          <Label htmlFor="reason">Reason for Emergency</Label>
          <Textarea
            id="reason"
            placeholder="Describe the reason for emergency visit in detail"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="presentingComplaint">Presenting Complaint</Label>
          <Input
            id="presentingComplaint"
            placeholder="Describe the main issue"
            value={presentingComplaint}
            onChange={e => setPresentingComplaint(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="triageNotes">Initial Notes</Label>
          <Textarea
            id="triageNotes"
            placeholder="Additional triage notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        </div>
          {/* AI Triage Analysis Section */}
          <div className="mt-8 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold">AI Triage Analysis</h3>
              {!isChatMode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAnalyze}
                  disabled={
                    isAnalyzing ||
                    isReadOnly ||
                    !hasAnyInput()
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
                    "Analyze Triage"
                  )}
                </Button>
              )}
            </div>
            {isChatMode ? (
              <div className="border border-purple-200/50 dark:border-purple-800/50 rounded-lg bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-900 dark:to-purple-950/20 shadow-sm">
                <div className="flex items-center justify-between p-3 border-b border-purple-200/30 dark:border-purple-800/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-900/20 dark:to-pink-900/20 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                    <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Triage Assistant</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsChatMode(false)}
                    className="h-7 text-xs text-purple-600 hover:bg-purple-100/50 dark:text-purple-300 dark:hover:bg-purple-900/30"
                  >
                    Back to Form
                  </Button>
                </div>
                <div className="flex flex-col h-[400px]">
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3",
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
                      {status === "streaming" && (
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
                        placeholder="Ask about this triage..."
                        className="flex-1 h-9 text-sm"
                        disabled={status === 'streaming' || isReadOnly}
                      />
                      <Button 
                        type="submit" 
                        disabled={!chatInput.trim() || status === 'streaming' || isReadOnly} 
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
              <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900/50 dark:to-purple-950/20 border border-dashed border-blue-200 dark:border-purple-900/50 rounded-lg text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {hasAnyInput()
                    ? "Click 'Analyze Triage' to get AI-powered insights and recommendations for this emergency case."
                    : "Enter triage details to enable AI analysis and get personalized recommendations."}
                </p>
              </div>
            )}
        </div>
            <div className="flex justify-end mb-4 mx-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || visitLoading || triageLoading || !hasAnyInput() || isReadOnly}
              className="ml-2 mt-2 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
          >
              {isSubmitting ? "Saving..." : (triageData && triageData.id ? "Update & Next" : "Save & Next")}
          </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 