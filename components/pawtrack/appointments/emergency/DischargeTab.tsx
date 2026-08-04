import { useState,useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";
import { useCreateEmergencyDischarge } from "@/queries/emergency/discharge/create-emergency-discharge";
import { useUpdateEmergencyDischarge } from "@/queries/emergency/discharge/update-emergency-discharge";
import { useToast } from "@/hooks/use-toast";
import { useRootContext } from '@/context/RootContext';
import { useGetUsers } from '@/queries/users/get-users';
import { useGetRoomsByClinicId } from '@/queries/rooms/get-room-by-clinic-id';
import { useGetAppointmentType, AppointmentType } from '@/queries/appointmentType/get-appointmentType';
import { useGetAvailableSlotsByUserId } from '@/queries/users/get-availabelSlots-by-userId';
import { useCreateAppointment } from '@/queries/appointment/create-appointment';
import { useGetRole } from "@/queries/roles/get-role";
import { Card, CardContent } from "@/components/ui/card";
import { useGetEmergencyDischargeByVisitId } from '@/queries/emergency/discharge/get-emergency-discharge-by-visit-id';
import { useEffect } from 'react';
import { useUpdateAppointment } from "@/queries/appointment/update-appointment";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id";
import { useUpdateVisit } from "@/queries/visit/update-visit";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { emergencydischargeAnalysis } from "@/app/actions/reasonformatting";


interface DischargeTabProps {
  patientId: string;
  appointmentId: string;
  onClose?: () => void;
  externalFollowUpDate?: string;
  onExternalFollowUpDateChange?: (v: string) => void;
}

const dischargeStatuses = [
  { value: "Discharged", label: "Discharged" },
  { value: "Transferred", label: "Transferred" },
  { value: "Deceased", label: "Deceased" },
  { value: "Against Medical Advice", label: "Against Medical Advice" },
];

export default function DischargeTab({ patientId, appointmentId, onClose, externalFollowUpDate, onExternalFollowUpDateChange }: DischargeTabProps) {
  const { toast } = useToast()
  const [status, setStatus] = useState("");
  const [dischargeTime, setDischargeTime] = useState<Date>(() => new Date());
  const [clinician, setClinician] = useState("");
  const [summary, setSummary] = useState("");
  const [instructions, setInstructions] = useState("");
  const [medications, setMedications] = useState<any[]>([]);
  const [medicationRow, setMedicationRow] = useState({ name: "", dose: "", frequency: "", duration: "" });
  const [followUp, setFollowUp] = useState("");
  const [nextAppointment, setNextAppointment] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [nextApptVet, setNextApptVet] = useState("");
  const [followUpDate, setFollowUpDate] = useState<Date | null>(null);
  const [isDischargeSaved, setIsDischargeSaved] = useState(false);
  const [veterinarianRoleId, setVeterinarianRoleId] = useState<string | null>(null);

  const { clinic, user } = useRootContext();
  const { data: apptTypes = [] } = useGetAppointmentType(1, 100, '', true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
const [isChatMode, setIsChatMode] = useState(false);
const [analysisResult, setAnalysisResult] = useState("");
const [chatInput, setChatInput] = useState("");

const messagesEndRef = useRef<HTMLDivElement | null>(null);

const dischargeContextRef = useRef("");

const buildDischargeContext = () => {
  const dischargeInfo = `
Current Discharge Data:
- Discharge Status: ${status || "Not specified"}
- Discharge Time: ${
    dischargeTime ? dischargeTime.toISOString() : "Not recorded"
  }
- Responsible Clinician: ${clinician || "Not specified"}

- Discharge Summary:
${summary || "Not provided"}

- Home Care Instructions:
${instructions || "Not provided"}

- Follow-up Instructions:
${followUp || "Not provided"}

- Follow-up Date: ${
    followUpDate ? followUpDate.toISOString() : "Not scheduled"
  }

- Reviewed With Client: ${
    confirmed === true
      ? "Yes"
      : confirmed === false
      ? "No"
      : "Not recorded"
  }
  `.trim();

  return dischargeInfo;
};
useEffect(() => {
  dischargeContextRef.current = buildDischargeContext();
}, [
  status,
  dischargeTime,
  clinician,
  summary,
  instructions,
  followUp,
  followUpDate,
  confirmed,
]);
const { messages, sendMessage, status: chatStatus, setMessages } = useChat({
  id: `discharge-analysis-${patientId}-${appointmentId}`,
  transport: new DefaultChatTransport({
    prepareSendMessagesRequest: ({ id, messages }) => {
      const dischargeContext = dischargeContextRef.current;

      return {
        body: {
          id,
          messages,
          patientId: patientId ?? null,
          dischargeContext: dischargeContext || undefined,
        },
      };
    },
  }),
});


  const { data: rolesData } = useGetRole();

  useEffect(() => {
    if (rolesData?.data) {
      const vetRole = rolesData.data.find(
        (role: any) => role.name.toLowerCase() === 'veterinarian'
      );
      if (vetRole) {
        setVeterinarianRoleId(vetRole.id);
      }
    }
  }, [rolesData]);

  const { data: usersData, isLoading: usersLoading } = useGetUsers(
    1,
    100,
    '',
    !!clinic?.id && !!veterinarianRoleId,
    '',
    clinic?.id ? [clinic.id] : [],
    veterinarianRoleId ? [veterinarianRoleId] : []
  );

  const { data: roomsData, isLoading: roomsLoading } = useGetRoomsByClinicId(clinic?.id || '', !!clinic?.id);

  const { data: visitData, isLoading: visitLoading, refetch: refetchVisit } = useGetVisitByAppointmentId(appointmentId);
  const { data: dischargeData, isLoading: dischargeLoading } = useGetEmergencyDischargeByVisitId(visitData?.id || '', !!visitData?.id);
  const createDischarge = useCreateEmergencyDischarge({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Discharge record saved successfully",
        variant: "success"
      });
      setIsDischargeSaved(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save discharge record",
        variant: "destructive"
      });
    }
  });

  const updateDischarge = useUpdateEmergencyDischarge({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Discharge record updated successfully",
        variant: "success"
      });
      setIsDischargeSaved(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update discharge record",
        variant: "destructive"
      });
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: appointmentData } = useGetAppointmentById(appointmentId);
  const updateVisit = useUpdateVisit();
  const updateAppointmentMutation = useUpdateAppointment({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visit completed successfully",
        variant: "success"
      });
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update appointment status: ${error.message}`,
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  });

  // Prefill form if discharge data exists
  useEffect(() => {
    if (dischargeData) {
      setStatus(dischargeData.dischargeStatus || '');
      setDischargeTime(dischargeData.dischargeTime ? new Date(dischargeData.dischargeTime) : new Date());
      setClinician(dischargeData.responsibleClinician || '');
      setSummary(dischargeData.dischargeSummary || '');
      setInstructions(dischargeData.homeCareInstructions || '');
      setFollowUp(dischargeData.followupInstructions || '');
      const apiFollowUpDate = (dischargeData as any)?.followupDate || (dischargeData as any)?.followUpDate as string | undefined;
      const parsed = apiFollowUpDate ? new Date(apiFollowUpDate) : null;
      setFollowUpDate(parsed);
      if (parsed && onExternalFollowUpDateChange) {
        onExternalFollowUpDateChange(parsed.toISOString());
      }
      setConfirmed(!!dischargeData.reviewedWithClient);
      setIsDischargeSaved(true); // ✅ Mark as saved
    }
  }, [dischargeData]);

  // Keep internal Follow-up Date in sync with footer picker (if provided)
  useEffect(() => {
    if (typeof externalFollowUpDate !== "undefined" && externalFollowUpDate !== "") {
      setFollowUpDate(externalFollowUpDate ? new Date(externalFollowUpDate) : null);
    }
  }, [externalFollowUpDate]);

  const handleAnalyze = async () => {
    const species = appointmentData?.patient?.species;
  
    if (!species) {
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
        description: "Please enter at least one discharge detail before analyzing",
        variant: "destructive"
      });
      return;
    }
  
    setIsAnalyzing(true);
  
    try {
      const analysis = await emergencydischargeAnalysis(species, {
        dischargeStatus: status,
        dischargeTime: dischargeTime ? dischargeTime.toISOString() : undefined,
        responsibleClinician: clinician,
        dischargeSummary: summary,
        homeCareInstructions: instructions,
        followupInstructions: followUp,
        followupDate: followUpDate
          ? followUpDate.toISOString()
          : undefined,
        reviewedWithClient: confirmed,
      });
  
      setAnalysisResult(analysis);
      setIsChatMode(true);
  
      setMessages([
        {
          id: "initial-discharge-analysis",
          role: "assistant",
          parts: [{ type: "text", text: analysis }],
        },
      ]);
  
      toast({
        title: "Success",
        description: "Discharge analysis completed",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "Failed to analyze discharge",
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
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
    

  const isDischargeComplete = (): boolean => {
    return (
      status.trim() !== "" ||
      !!dischargeTime ||
      clinician.trim() !== "" ||
      summary.trim() !== "" ||
      instructions.trim() !== "" ||
      confirmed
    );
  };

  const hasAnyInput = (): boolean => {
    return (
      status.trim() !== "" ||
      clinician.trim() !== "" ||
      summary.trim() !== "" ||
      instructions.trim() !== "" ||
      followUp.trim() !== "" ||
      !!followUpDate ||
      confirmed === true
    );
  };

  // Check if any one emergency tab is completed
  const isAnyEmergencyTabCompleted = () => {
    if (!visitData) return false;

    // Cast visitData to access emergency completion properties
    const visit = visitData as unknown as {
      isEmergencyTriageCompleted?: boolean;
      isEmergencyVitalCompleted?: boolean;
      isEmergencyProcedureCompleted?: boolean;
      isEmergencyDischargeCompleted?: boolean;
    };

    return (
      Boolean(visit.isEmergencyTriageCompleted) ||
      Boolean(visit.isEmergencyVitalCompleted) ||
      Boolean(visit.isEmergencyProcedureCompleted) ||
      isDischargeComplete()
    );
  };

  // Get appointment data
  const { data: emergencyData } = useGetAppointmentById(appointmentId);

  const isReadOnly = emergencyData?.status === "completed";
  // Using Date objects and ISO strings for consistency

  const toLocalDateStartString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}T00:00:00`;
  };

  const handleSubmit = async () => {
    // Ensure we have a visit id, try refetch and use the returned data if needed
    let currentVisitId = visitData?.id as string | undefined;
    if (!currentVisitId) {
      try {
        const ref = await refetchVisit();
        currentVisitId = (ref.data as any)?.id;
      } catch {}
      if (!currentVisitId) {
        toast({
          title: "Error",
          description: "No visit data found for this appointment",
          variant: "destructive"
        });
        return;
      }
    }
    // Allow proceeding even if appointment data hasn't loaded yet
    setIsSubmitting(true);
    try {
      const payload = {
        visitId: currentVisitId,
        dischargeStatus: status,
        dischargeTime: dischargeTime.toISOString(),
        responsibleClinician: clinician,
        dischargeSummary: summary,
        homeCareInstructions: instructions,
        followupInstructions: followUp,
        followupDate: followUpDate ? toLocalDateStartString(followUpDate) : undefined,
        reviewedWithClient: confirmed,
        isCompleted: true,
      };

      console.log('Submitting discharge payload:', JSON.stringify(payload, null, 2));

      if (dischargeData?.id) {
        await updateDischarge.mutateAsync({ id: dischargeData.id, ...payload });
      } else {
        await createDischarge.mutateAsync(payload as any);
      }
      // Only mark visit flag completed if discharge is complete
      if (visitData?.id && isDischargeComplete()) {
        try { await updateVisit.mutateAsync({ id: visitData.id, isEmergencyDischargeCompleted: true }); } catch {}
      }
    } catch (e) {
      // error handled in onError   
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    if (!visitData?.id) {
      toast({
        title: "Error",
        description: "No visit data found for this appointment",
        variant: "destructive"
      });
      return;
    }
    // Proceed even if appointment data hasn't loaded; we'll skip appointment status update in that case
    setIsSubmitting(true);
    try {
      // Only save discharge on checkout if any input is present
      if (hasAnyInput()) {
        const payload = {
          visitId: visitData.id,
          dischargeStatus: status,
          dischargeTime: dischargeTime.toISOString(),
          responsibleClinician: clinician,
          dischargeSummary: summary,
          homeCareInstructions: instructions,
          followupInstructions: followUp,
          followupDate: followUpDate ? toLocalDateStartString(followUpDate) : undefined,
          reviewedWithClient: confirmed,
          isCompleted: true,
        };

        if (dischargeData?.id) {
          await updateDischarge.mutateAsync({ id: dischargeData.id, ...payload });
        } else {
          await createDischarge.mutateAsync(payload as any);
        }

        // Mark visit flag completed ONLY when discharge is complete during checkout (same pattern as Triage)
         if (visitData?.id) {
            await updateVisit.mutateAsync({ 
            id: visitData.id, 
            isEmergencyDischargeCompleted: true 
            });
          }
      }

      // Mark appointment as completed only if we have appointmentData
      if (appointmentData && appointmentData.status !== "completed") {
        await updateAppointmentMutation.mutateAsync({
          id: appointmentId,
          data: {
            ...appointmentData,
            status: "completed"
          }
        });
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error during checkout process:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
      <div className="h-[calc(100vh-26rem)] overflow-y-auto p-6">
        <div className={isReadOnly ? "pointer-events-none opacity-60" : ""}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <Label htmlFor="status">Discharge Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {dischargeStatuses.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mb-4">
            <Label htmlFor="dischargeTime">Discharge Time</Label>
            <DatePicker
              selected={dischargeTime}
              onChange={(date) => date && setDischargeTime(date)}
              showTimeSelect
              timeIntervals={5}
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              dateFormat="dd/MM/yyyy h:mm aa"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="mb-4">
          <Label htmlFor="clinician">Responsible Clinician</Label>
          <Input
            id="clinician"
            placeholder="Name of clinician"
            value={clinician}
            onChange={e => setClinician(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="dischargeSummary">Discharge Summary</Label>
          <Textarea
            id="dischargeSummary"
            placeholder="Summarize the emergency care provided"
            value={summary}
            onChange={e => setSummary(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="instructions">Home Care Instructions</Label>
          <Textarea
            id="instructions"
            placeholder="Discharge instructions for the client"
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="followUpDate">Follow-up Date</Label>
          <DatePicker
            selected={followUpDate}
            onChange={(date) => {
              setFollowUpDate(date);
              if (onExternalFollowUpDateChange) {
                onExternalFollowUpDateChange(date ? date.toISOString() : "");
              }
            }}
            minDate={new Date()}
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="followUp">Follow-up Instructions</Label>
          <Textarea
            id="followUp"
            placeholder="Follow-up instructions for the client"
            value={followUp}
            onChange={e => setFollowUp(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox id="confirmed" checked={confirmed} onCheckedChange={val => setConfirmed(val === true)} />
          <Label htmlFor="confirmed">Reviewed with client / Signature</Label>
        </div>
        </div>
        {/* AI Emergency Procedures Analysis */}
        <div className="mt-8 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold">AI Emergency Procedures Analysis</h3>
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
                    "Analyze Procedures"
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
                    <h4 className="text-sm text-purple-700 dark:text-purple-300 font-semibold">
                      AI Emergency Procedures Assistant
                    </h4>
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
                              {message.parts
                                ?.map((part) =>
                                  part.type === "text" ? part.text : ""
                                )
                                .join("") || ""}
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
                      {status === "submitted" && (
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
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  <div className="flex-shrink-0 border-t p-2">
                    <form onSubmit={handleChatSend} className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask about the emergency discharge analysis..."
                        className="flex-1 h-9 text-sm"
                        disabled={status === "submitted" || isReadOnly}
                      />
                      <Button
                        type="submit"
                        disabled={
                          !chatInput.trim() ||
                          status === "submitted" ||
                          isReadOnly
                        }
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
                    {!hasAnyInput()
                      ? "Enter emergency procedures data to enable AI analysis"
                      : "Click 'Analyze Procedures' to get AI-powered insights"}
                  </div>
                )}
              </>
            )}
          </div>
      </div>
        <div className="flex justify-end gap-2 my-4 mx-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || visitLoading || !hasAnyInput() || isReadOnly}
            className="ml-2 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
          >
            {isSubmitting ? "Saving..." : (isDischargeSaved ? "Update Discharge" : "Save Discharge")}
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={isSubmitting || visitLoading || !isAnyEmergencyTabCompleted() || isReadOnly}
            className="ml-2 bg-[#1E3D3D] hover:bg-[#1E3D3D] text-white"
          >
            {isSubmitting ? "Processing..." : "Checkout"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 
