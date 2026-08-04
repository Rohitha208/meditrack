import React, { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";
import { useGetSurgeryDischargeByVisitId } from "@/queries/surgery/discharge/get-surgery-discharge-by-visit-id";
import { useCreateSurgeryDischarge } from "@/queries/surgery/discharge/create-surgery-discharge";
import { useUpdateSurgeryDischarge } from "@/queries/surgery/discharge/update-surgery-discharge";
import { useGetPrescriptionDetailByVisitId } from "@/queries/PrescriptionDetail/get-prescription-detail-by-visit-id";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUpdateAppointment } from "@/queries/appointment/update-appointment";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useTabCompletion } from "@/context/TabCompletionContext";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { surgeryDischargeAnalysis } from "@/app/actions/reasonformatting";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "@/hooks/use-toast";


interface DischargeTabProps {
  patientId: string;
  appointmentId: string;
  onClose: () => void;
  externalFollowUpDate?: string;
  onExternalFollowUpDateChange?: (v: string) => void;
  allTabsCompleted?: boolean;
}
interface ExtendedVisitData {
  isSurgeryPostOpCompleted: boolean;
  isSurgeryDischargeCompleted: boolean;
  isSurgeryDetailsCompleted: boolean;
  isSurgeryPreOpCompleted: boolean;
  isSurgeryPrescriptionCompleted: boolean;
}

const dischargeStatus = ["Ready for discharge", "Needs monitoring", "Referred to specialist", "Admitted for observation"];

export default function DischargeTab({ patientId, appointmentId, onClose, externalFollowUpDate, onExternalFollowUpDateChange, allTabsCompleted = false }: DischargeTabProps) {
  const [status, setStatus] = useState("");
  const [dischargeTime, setDischargeTime] = useState("");
  const [homeCare, setHomeCare] = useState("");
  const [medications, setMedications] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [followUpDate, setFollowUpDate] = useState<string>("");
  const [followUpUpdate, setFollowUpUpdate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { data: visitData } = useGetVisitByAppointmentId(appointmentId);
  const { data: appointmentData } = useGetAppointmentById(appointmentId);
  const isReadOnly = appointmentData?.status === "completed";
  const updateAppointmentMutation = useUpdateAppointment({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visit completed successfully",
        variant: "success"
      });
      setIsProcessing(false);
      if (onClose) onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update appointment status: ${error.message}`,
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  });
  const { data: dischargeData, refetch } = useGetSurgeryDischargeByVisitId(visitData?.id || "", !!visitData?.id);
  const createDischarge = useCreateSurgeryDischarge();
  const updateDischarge = useUpdateSurgeryDischarge();
  const { markTabAsCompleted, isTabCompleted } = useTabCompletion();
  const { data: prescriptionData } = useGetPrescriptionDetailByVisitId(visitData?.id || "", !!visitData?.id);
  const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const areAnyVisitTabsCompleted = (): boolean => {
    if (!visitData) return false;
    const visit = visitData as unknown as ExtendedVisitData;
    return (
      visit.isSurgeryPostOpCompleted ||
      visit.isSurgeryPrescriptionCompleted ||
      visit.isSurgeryDetailsCompleted ||
      visit.isSurgeryPreOpCompleted
    );
  };

  const isPrescriptionCompletedViaVisitData = (): boolean => {
    if (!visitData) return false;
    const visit = visitData as unknown as ExtendedVisitData;
    return Boolean(visit.isSurgeryPrescriptionCompleted);
  };

  const hasPrescriptionData = (): boolean => {
    return Boolean(prescriptionData && Array.isArray(prescriptionData) && prescriptionData.length > 0);
  };

  const areAnySurgeryTabsCompletedInContext = (): boolean => {
    return (
      isTabCompleted("surgery-pre-op") ||
      isTabCompleted("surgery-details") ||
      isTabCompleted("surgery-post-op") ||
      isTabCompleted("prescription") ||
      isTabCompleted("surgery-discharge")
    );
  };
  const isAppointmentCompleted = appointmentData?.status === "completed";

  const hasAnyFieldFilled = useMemo(() => {
    const nonDefaultSelects = status !== dischargeStatus[0];
    const hasTexts =
      dischargeTime.trim() !== "" ||
      homeCare.trim() !== "" ||
      medications.trim() !== "" ||
      followUp.trim() !== "" ||
      followUpUpdate.trim() !== "" ||
      followUpDate.trim() !== "";
    return nonDefaultSelects || hasTexts;
  }, [status, dischargeTime, homeCare, medications, followUp, followUpUpdate, followUpDate]);

  useEffect(() => {
    if (dischargeData && dischargeData.length > 0) {
      const data = dischargeData[0];
      setStatus(data.dischargeStatus || dischargeStatus[0]);
      setDischargeTime(data.dischargeDatetime ? data.dischargeDatetime.slice(0, 16) : "");
      setHomeCare(data.homeCareInstructions || "");
      setMedications(data.medicationsToGoHome || "");
      setFollowUp(data.followUpInstructions || "");
      const apiFollowUpDate = (data as any)?.followupDate as string | undefined;
      if (apiFollowUpDate) {
        setFollowUpDate(apiFollowUpDate);
      }
    }
  }, [dischargeData]);

  useEffect(() => {
    if (typeof externalFollowUpDate !== "undefined" && externalFollowUpDate !== "") {
      setFollowUpDate(externalFollowUpDate);
    }
  }, [externalFollowUpDate]);

  const surgeryDischargeContextRef = useRef("");

  const buildSurgeryDischargeContext = () => {
    const dischargeInfo = `
Current Surgery Discharge Data:
- Discharge Status: ${dischargeStatus || "Not specified"}
- Discharge Datetime: ${dischargeTime ? dischargeTime.toString() : "Not recorded"}
- Home Care Instructions: ${homeCare || "Not provided"}
- Medications To Go Home: ${medications || "Not provided"}
- Follow-up Instructions: ${followUp || "Not provided"}
- Follow-up Date: ${followUpDate ? followUpDate.toString() : "Not scheduled"}
`.trim();

    return dischargeInfo;
  };

  useEffect(() => {
    surgeryDischargeContextRef.current = buildSurgeryDischargeContext();
  }, [
    dischargeStatus,
    dischargeTime,
    homeCare,
    medications,
    followUp,
    followUpDate,
  ]);

  const { messages, sendMessage, status: chatStatus, setMessages } = useChat({
    id: `surgery-discharge-analysis-${patientId}-${appointmentId}`,
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: ({ id, messages }) => {
        const dischargeContext = surgeryDischargeContextRef.current;

        return {
          body: {
            id,
            messages,
            patientId: patientId ?? null,
            surgeryDischargeContext: dischargeContext || undefined,
          },
        };
      },
    }),
  });
  const hasAnyInput = () => {
    return (
      status?.trim() ||
      dischargeTime?.trim() ||
      homeCare?.trim() ||
      medications?.trim() ||
      followUp?.trim() ||
      followUpUpdate?.trim() ||
      followUpDate
    );
  };

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
      const analysis = await surgeryDischargeAnalysis(species, {
        dischargeStatus: status,
        dischargeDatetime: dischargeTime ? dischargeTime.toString() : undefined,
        homeCareInstructions: homeCare,
        medicationsToGoHome: medications,
        followUpInstructions: followUp,
        followupDate: followUpDate ? followUpDate.toString() : undefined,
      });

      setAnalysisResult(analysis);
      setIsChatMode(true);

      setMessages([
        {
          id: "initial-surgery-discharge-analysis",
          role: "assistant",
          parts: [{ type: "text", text: analysis }],
        },
      ]);

      toast({
        title: "Success",
        description: "Surgery discharge analysis completed",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze surgery discharge",
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


  const handleSubmit = async () => {
    if (!visitData?.id) {
      toast({
        title: "Error",
        description: "No visit data found for this appointment",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);
    const payload = {
      visitId: visitData.id,
      dischargeStatus: status,
      dischargeDatetime: dischargeTime ? new Date(dischargeTime).toISOString() : undefined,
      homeCareInstructions: homeCare,
      medicationsToGoHome: medications,
      followUpInstructions: followUp,
      followupDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      isCompleted: true,
    };
    try {
      if (dischargeData && dischargeData.length > 0) {
        await updateDischarge.mutateAsync({ id: dischargeData[0].id, ...payload });
        toast({
          title: "Success",
          description: "Discharge record updated successfully",
          variant: "success"
        });
      } else {
        await createDischarge.mutateAsync(payload);
        toast({
          title: "Success",
          description: "Discharge record saved successfully",
          variant: "success"
        });
      }
      await refetch();
      markTabAsCompleted("surgery-discharge");
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to save discharge record",
        variant: "destructive"
      });
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
    if (!appointmentData) {
      toast({
        title: "Error",
        description: "No appointment data found",
        variant: "destructive"
      });
      return;
    }
    setIsProcessing(true);
    try {
      // First save the discharge details
      await handleSubmit();

      // Update appointment status to completed
      await updateAppointmentMutation.mutateAsync({
        id: appointmentId,
        data: {
          ...appointmentData,
          status: "completed"
        }
      });
    } catch (error) {
      console.error("Error during checkout process:", error);
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="h-[calc(100vh-22.5rem)] overflow-y-auto p-6">
          <div className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Discharge Status</label>
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  disabled={isReadOnly}
                >
                  <option value="" disabled>Select Discharge Status</option>
                  {dischargeStatus.map(dischargeStatus => (
                    <option key={dischargeStatus} value={dischargeStatus}>{dischargeStatus}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Discharge Date/Time</label>
                <DatePicker
                  selected={dischargeTime ? new Date(dischargeTime) : null}
                  onChange={(date) => {
                    if (date instanceof Date && !isNaN(date.getTime())) {
                      setDischargeTime(date.toISOString());
                    } else {
                      setDischargeTime("");
                    }
                  }}
                  minDate={today}
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  dateFormat="dd/MM/yyyy h:mm aa"
                  placeholderText="dd/mm/yyyy hh:mm"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isReadOnly}
                />
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">Home Care Instructions</label>
              <Textarea
                value={homeCare}
                onChange={e => setHomeCare(e.target.value)}
                placeholder="Detailed instructions for home care"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Medications to Go Home</label>
              <Textarea
                value={medications}
                onChange={e => setMedications(e.target.value)}
                placeholder="List medications, dosages, and administration instructions"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Follow-up Date</label>
              <DatePicker
                selected={followUpDate ? new Date(followUpDate) : null}
                onChange={(date) => {
                  if (date instanceof Date && !isNaN(date.getTime())) {
                    setFollowUpDate(date.toISOString());
                    if (onExternalFollowUpDateChange) {
                      onExternalFollowUpDateChange(date.toISOString());
                    }
                  } else {
                    setFollowUpDate("");
                    if (onExternalFollowUpDateChange) {
                      onExternalFollowUpDateChange("");
                    }
                  }
                }}
                minDate={new Date()}
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                dateFormat="dd/MM/yyyy"
                placeholderText="dd/mm/yyyy"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Follow-up Instructions</label>
              <Textarea
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
                placeholder="Follow-up appointment details and instructions"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Follow-up Update</label>
              <Textarea
                value={followUpUpdate}
                onChange={e => setFollowUpUpdate(e.target.value)}
                placeholder="Follow-up appointment details and instructions"
                disabled={isReadOnly}
              />
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
                        placeholder="Ask about the surgery discharge analysis..."
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
        <div className="mt-6 flex justify-end gap-2 px-4 pb-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isProcessing || isReadOnly || !hasAnyFieldFilled}
            className="bg-[#1E3D3D] text-white px-4 py-2 rounded enabled:hover:bg-[#152B2B] disabled:opacity-50"
          >
            {isSubmitting
              ? "Saving..."
              : dischargeData && dischargeData.length > 0 ? "Update" : "Save"}
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={isSubmitting || isProcessing || isReadOnly || isAppointmentCompleted || (!areAnyVisitTabsCompleted() && !areAnySurgeryTabsCompletedInContext() && !isPrescriptionCompletedViaVisitData() && !hasPrescriptionData())}
            className="ml-2 bg-[#1E3D3D] hover:bg-[#152B2B] text-white"
          >
            Checkout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 