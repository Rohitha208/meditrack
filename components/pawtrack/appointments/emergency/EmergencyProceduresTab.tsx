import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";
import { useGetEmergencyProceduresByVisitId } from "@/queries/emergency/procedures/get-emergency-procedures-by-visit-id";
import { useCreateEmergencyProcedure } from "@/queries/emergency/procedures/create-emergency-procedure";
import { useUpdateEmergencyProcedure } from "@/queries/emergency/procedures/update-emergency-procedure";
import { EmergencyVisitProcedure } from "@/queries/emergency/procedures/get-emergency-procedures";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id";
import { useUpdateVisit } from "@/queries/visit/update-visit";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { emergencyProceduresAnalysis } from "@/app/actions/reasonformatting";

interface EmergencyProceduresTabProps {
  patientId: string;
  appointmentId: string;
  onNext?: () => void;
}

const commonProcedures = [
  "IV Catheter Placement",
  "Oxygen Therapy",
  "CPR",
  "Wound Care",
  "Bandaging",
  "Defibrillation",
  "Blood Transfusion",
  "Intubation",
  "Other"
];

export default function EmergencyProceduresTab({ patientId, appointmentId, onNext }: EmergencyProceduresTabProps) {
  const { toast } = useToast()
  const [procedure, setProcedure] = useState("");
  const [procedureTime, setProcedureTime] = useState<Date>(() => new Date());

  const [performedBy, setPerformedBy] = useState("");
  const [fluids, setFluids] = useState({ type: "", volume: "", rate: "" });
  const [response, setResponse] = useState("");
  const [notes, setNotes] = useState("");
  const [procedureChecks, setProcedureChecks] = useState<string[]>([]);
  const { data: visitData, isLoading: visitLoading } = useGetVisitByAppointmentId(appointmentId);
  const { data: proceduresData, isLoading: proceduresLoading, refetch: refetchProcedures } = useGetEmergencyProceduresByVisitId(visitData?.id || "", !!visitData?.id);
  const createProcedure = useCreateEmergencyProcedure();
  const updateProcedure = useUpdateEmergencyProcedure();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: appointmentData } = useGetAppointmentById(appointmentId);
  const updateVisit = useUpdateVisit();
  const isReadOnly = appointmentData?.status === "completed";

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const proceduresContextRef = useRef("");

  const buildProceduresContext = () => {
    const checksSummary =
      procedureChecks.length > 0 ? procedureChecks.join(", ") : "None selected";

    const procedureInfo = `
Current Emergency Procedures Data:
- Procedures Performed: ${checksSummary}
- Other Procedure Details: ${procedure || "Not specified"}
- Procedure Time: ${procedureTime ? procedureTime.toISOString() : "Not recorded"}
- Performed By: ${performedBy || "Not specified"}
- Fluids: ${fluids.type || "Not specified"}; Volume: ${fluids.volume || "Not recorded"} ml; Rate: ${fluids.rate || "Not recorded"} ml/hr
- Response to Treatment: ${response || "Not recorded"}
${notes ? `- Notes: ${notes}` : ""}
    `.trim();

    return procedureInfo;
  };

  useEffect(() => {
    proceduresContextRef.current = buildProceduresContext();
  }, [procedureChecks, procedure, procedureTime, performedBy, fluids, response, notes]);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: `emergency-procedures-${patientId}-${appointmentId}`,
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: ({ id, messages }) => {
        const proceduresContext = proceduresContextRef.current;

        return {
          body: {
            id,
            messages,
            patientId: patientId ?? null,
            proceduresContext: proceduresContext || undefined,
          },
        };
      },
    }),
  });

  // Prefill form if procedure exists
  useEffect(() => {
    if (proceduresData && proceduresData.length > 0) {
      const proc: EmergencyVisitProcedure = proceduresData[0];
      setProcedureChecks([
        proc.ivCatheterPlacement && "IV Catheter Placement",
        proc.oxygenTherapy && "Oxygen Therapy",
        proc.cpr && "CPR",
        proc.woundCare && "Wound Care",
        proc.bandaging && "Bandaging",
        proc.defibrillation && "Defibrillation",
        proc.bloodTransfusion && "Blood Transfusion",
        proc.intubation && "Intubation",
        proc.otherProcedure && "Other",
      ].filter(Boolean) as string[]);
      setProcedure(proc.otherProcedurePerformed || "");
      setProcedureTime(proc.procedureTime ? new Date(proc.procedureTime) : new Date());
      setPerformedBy(proc.performedBy || "");
      setFluids({
        type: proc.fluidsType || "",
        volume: proc.fluidsVolumeMl ? String(proc.fluidsVolumeMl) : "",
        rate: proc.fluidsRateMlHr ? String(proc.fluidsRateMlHr) : "",
      });
      setResponse(proc.responseToTreatment || "");
      setNotes(proc.notes || "");
    }
  }, [proceduresData]);

  const handleProcedureCheck = (proc: string) => {
    setProcedureChecks(prev => prev.includes(proc) ? prev.filter(p => p !== proc) : [...prev, proc]);
  };

  const formatTimeToHHmmss = (timeStr: string) => {
    if (!timeStr) return '00:00:00';
    // If time is in HH:mm format, add :00 seconds
    if (timeStr.match(/^\d{2}:\d{2}$/)) {
      return `${timeStr}:00`;
    }
    // If already in HH:mm:ss format, return as is
    if (timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) {
      return timeStr;
    }
    return '00:00:00';
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Handle file attachments if needed
    }
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
        description: "Please enter at least one procedure detail before analyzing",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await emergencyProceduresAnalysis(species, {
        proceduresPerformed: procedureChecks,
        otherProcedure: procedure,
        procedureTime: procedureTime ? procedureTime.toISOString() : "",
        performedBy,
        fluidsType: fluids.type,
        fluidsVolumeMl:
          fluids.volume.trim() !== "" ? parseFloat(fluids.volume) : undefined,
        fluidsRateMlHr:
          fluids.rate.trim() !== "" ? parseFloat(fluids.rate) : undefined,
        responseToTreatment: response,
        notes,
      });

      setAnalysisResult(analysis);
      setIsChatMode(true);

      setMessages([
        {
          id: "initial-emergency-procedures-analysis",
          role: "assistant",
          parts: [{ type: "text", text: analysis }],
        },
      ]);

      toast({
        title: "Success",
        description: "Emergency procedures analysis completed",
        variant: "success"
      });
      toast({
        title: "Error",
        description: "Patient species information is required for analysis",
        variant: "destructive"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "Failed to analyze emergency procedures",
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


  const isProcedureComplete = (): boolean => {
    const areAllCheckboxesUnchecked = procedureChecks.length === 0;
    return (
      !!procedureTime &&
      performedBy.trim() !== "" &&
      fluids.type.trim() !== "" &&
      fluids.volume.trim() !== "" &&
      fluids.rate.trim() !== "" &&
      response.trim() !== "" &&
      !areAllCheckboxesUnchecked
    );
  };

  const hasAnyInput = (): boolean => {
    return (
      !!procedureTime ||
      procedure.trim() !== "" ||
      performedBy.trim() !== "" ||
      fluids.type.trim() !== "" ||
      fluids.volume.trim() !== "" ||
      fluids.rate.trim() !== "" ||
      response.trim() !== "" ||
      notes.trim() !== "" ||
      procedureChecks.length > 0
    );
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
    setIsSubmitting(true);
    // Map procedureChecks to boolean fields
    const checks = {
      ivCatheterPlacement: procedureChecks.includes("IV Catheter Placement"),
      oxygenTherapy: procedureChecks.includes("Oxygen Therapy"),
      cpr: procedureChecks.includes("CPR"),
      woundCare: procedureChecks.includes("Wound Care"),
      bandaging: procedureChecks.includes("Bandaging"),
      defibrillation: procedureChecks.includes("Defibrillation"),
      bloodTransfusion: procedureChecks.includes("Blood Transfusion"),
      intubation: procedureChecks.includes("Intubation"),
      otherProcedure: procedureChecks.includes("Other"),
    };
    const payload = {
      visitId: visitData.id,
      procedureTime: procedureTime ? procedureTime.toISOString() : new Date().toISOString(),
      ...checks,
      otherProcedurePerformed: procedure,
      performedBy,
      fluidsType: fluids.type,
      fluidsVolumeMl: fluids.volume.trim() !== "" ? parseInt(fluids.volume) : null,
      fluidsRateMlHr: fluids.rate.trim() !== "" ? parseInt(fluids.rate) : null,
      responseToTreatment: response,
      notes,
      isCompleted: isProcedureComplete(),
    };
    try {
      if (proceduresData && proceduresData.length > 0) {
        // Update
        await updateProcedure.mutateAsync({ id: proceduresData[0].id, ...payload });
        toast({
          title: "Success",
          description: "Emergency procedure updated successfully",
          variant: "success"
        });
      } else {
        // Create
        await createProcedure.mutateAsync(payload);
        toast({
          title: "Success",
          description: "Emergency procedure saved successfully",
          variant: "success"
        });
      }
      await refetchProcedures();
      if (visitData?.id) {
        try {
          await updateVisit.mutateAsync({ id: visitData.id, isEmergencyProcedureCompleted: true });
        } catch {}
      }
      if (onNext) onNext();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to save emergency procedure",
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
          <div className="space-y-6">
          <div className="border-b pb-4">
            <Label>Common Emergency Procedures</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {commonProcedures.map(proc => (
                <div key={proc} className="flex items-center space-x-2">
                  <Checkbox id={proc} checked={procedureChecks.includes(proc)} onCheckedChange={() => handleProcedureCheck(proc)} />
                  <Label htmlFor={proc}>{proc}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="procedure">Other Procedure Performed</Label>
              <Input
                id="procedure"
                placeholder="Describe the emergency procedure"
                value={procedure}
                onChange={e => setProcedure(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="procedureTime">Procedure Time</Label>
              <DatePicker
                selected={procedureTime}
                onChange={(date) => {
                  if (date instanceof Date && !isNaN(date.getTime())) {
                    setProcedureTime(date);
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
          </div>
          <div>
            <Label htmlFor="performedBy">Performed By</Label>
            <Input
              id="performedBy"
              placeholder="Name of clinician"
              value={performedBy}
              onChange={e => setPerformedBy(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="fluidType">Fluids Administered (Type)</Label>
              <Input
                id="fluidType"
                placeholder="e.g. Saline, LRS"
                value={fluids.type}
                onChange={e => setFluids({ ...fluids, type: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fluidVolume">Volume (ml)</Label>
              <Input
                id="fluidVolume"
                placeholder="e.g. 500"
                value={fluids.volume}
                onChange={e => setFluids({ ...fluids, volume: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fluidRate">Rate (ml/hr)</Label>
              <Input
                id="fluidRate"
                placeholder="e.g. 100"
                value={fluids.rate}
                onChange={e => setFluids({ ...fluids, rate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="response">Response to Treatment</Label>
            <Textarea
              id="response"
              placeholder="Describe patient response"
              value={response}
              onChange={e => setResponse(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="procedureNotes">Notes</Label>
            <Textarea
              id="procedureNotes"
              placeholder="Additional notes on procedures"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
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
                        placeholder="Ask about the emergency procedures analysis..."
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
        </div>
        </div>
        <div className="mt-6 flex justify-end mb-4 mx-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || visitLoading || proceduresLoading || !hasAnyInput() || isReadOnly}
              className="ml-2 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
            >
              {proceduresData && proceduresData.length > 0 ? "Update & Next" : "Save & Next"}
            </Button>
          </div>
      </CardContent>
    </Card>
  );
}