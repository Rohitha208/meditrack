import React, { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";
import { useGetSurgeryDetailByVisitId } from "@/queries/surgery/detail/get-surgery-detail-by-visit-id";
import { useCreateSurgeryDetail } from "@/queries/surgery/detail/create-surgery-detail";
import { useUpdateSurgeryDetail } from "@/queries/surgery/detail/update-surgery-detail";
import { Card, CardContent } from "@/components/ui/card";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id";
import { useTabCompletion } from "@/context/TabCompletionContext";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { surgeryDetailsAnalysis } from "@/app/actions/reasonformatting";
import { toast } from "@/hooks/use-toast";

interface SurgeryTabProps {
  patientId: string;
  appointmentId: string;
  onNext?: () => void;
}

export default function SurgeryTab({ patientId, appointmentId, onNext }: SurgeryTabProps) {

  const [surgeryType, setSurgeryType] = useState("")
  const [surgeon, setSurgeon] = useState("")
  const [anesthesiologist, setAnesthesiologist] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [anesthesiaProtocol, setAnesthesiaProtocol] = useState("")
  const [findings, setFindings] = useState("")
  const [complications, setComplications] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: visitData } = useGetVisitByAppointmentId(appointmentId)
  const { data: detailData, refetch } = useGetSurgeryDetailByVisitId(visitData?.id || "", !!visitData?.id)
  const createDetail = useCreateSurgeryDetail()
  const updateDetail = useUpdateSurgeryDetail()
  const { markTabAsCompleted } = useTabCompletion()
  const { data: appointmentData } = useGetAppointmentById(appointmentId)
  const isReadOnly = appointmentData?.status === "completed"
  const [timeError, setTimeError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
const [isChatMode, setIsChatMode] = useState(false);
const [analysisResult, setAnalysisResult] = useState("");
const [chatInput, setChatInput] = useState("");
const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Track original values (for detecting changes on Update)
  const [originalValues, setOriginalValues] = useState<any>(null)

  useEffect(() => {
    if (detailData && detailData.length > 0) {
      const data = detailData[0]
      setSurgeryType(data.surgeryType || "")
      setSurgeon(data.surgeon || "")
      setAnesthesiologist(data.anesthesiologist || "")
      setStartTime(data.surgeryStartTime ? data.surgeryStartTime.slice(0, 16) : "")
      setEndTime(data.surgeryEndTime ? data.surgeryEndTime.slice(0, 16) : "")
      setAnesthesiaProtocol(data.anesthesiaProtocol || "")
      setFindings(data.surgicalFindings || "")
      setComplications(data.complications || "")
      setNotes(data.notes || "")

      setOriginalValues({
        surgeryType: data.surgeryType || "",
        surgeon: data.surgeon || "",
        anesthesiologist: data.anesthesiologist || "",
        startTime: data.surgeryStartTime ? data.surgeryStartTime.slice(0, 16) : "",
        endTime: data.surgeryEndTime ? data.surgeryEndTime.slice(0, 16) : "",
        anesthesiaProtocol: data.anesthesiaProtocol || "",
        findings: data.surgicalFindings || "",
        complications: data.complications || "",
        notes: data.notes || "",
      })
    }
  }, [detailData])

  const hasAnyFieldFilled = useMemo(() => {
    return (
      surgeryType.trim() ||
      surgeon.trim() ||
      anesthesiologist.trim() ||
      startTime.trim() ||
      endTime.trim() ||
      anesthesiaProtocol.trim() ||
      findings.trim() ||
      complications.trim() ||
      notes.trim()
    )
  }, [surgeryType, surgeon, anesthesiologist, startTime, endTime, anesthesiaProtocol, findings, complications, notes])

  const hasChanges = useMemo(() => {
    if (!detailData || detailData.length === 0 || !originalValues) return true
    return (
      surgeryType !== originalValues.surgeryType ||
      surgeon !== originalValues.surgeon ||
      anesthesiologist !== originalValues.anesthesiologist ||
      startTime !== originalValues.startTime ||
      endTime !== originalValues.endTime ||
      anesthesiaProtocol !== originalValues.anesthesiaProtocol ||
      findings !== originalValues.findings ||
      complications !== originalValues.complications ||
      notes !== originalValues.notes
    )
  }, [
    detailData,
    originalValues,
    surgeryType,
    surgeon,
    anesthesiologist,
    startTime,
    endTime,
    anesthesiaProtocol,
    findings,
    complications,
    notes,
  ])

  const surgeryContextRef = useRef("");

const buildSurgeryContext = () => {
  const surgeryInfo = `
Current Surgery Details:
- Surgery Type: ${surgeryType || "Not specified"}
- Surgeon: ${surgeon || "Not specified"}
- Anesthesiologist: ${anesthesiologist || "Not specified"}
- Surgery Start Time: ${
    startTime ? new Date(startTime).toISOString() : "Not recorded"
  }
- Surgery End Time: ${
    endTime ? new Date(endTime).toISOString() : "Not recorded"
  }
- Anesthesia Protocol: ${anesthesiaProtocol || "Not documented"}
- Surgical Findings: ${findings || "Not documented"}
- Complications: ${complications || "None reported"}
${notes ? `- Notes: ${notes}` : ""}
  `.trim();

  return surgeryInfo;
};

useEffect(() => {
  surgeryContextRef.current = buildSurgeryContext();
}, [
  surgeryType,
  surgeon,
  anesthesiologist,
  startTime,
  endTime,
  anesthesiaProtocol,
  findings,
  complications,
  notes,
]);

const { messages, sendMessage, status, setMessages } = useChat({
  id: `surgery-details-${patientId}-${appointmentId}`,
  transport: new DefaultChatTransport({
    prepareSendMessagesRequest: ({ id, messages }) => {
      const surgeryContext = surgeryContextRef.current;

      return {
        body: {
          id,
          messages,
          patientId: patientId ?? null,
          surgeryContext: surgeryContext || undefined,
        },
      };
    },
  }),
});
const hasAnyInput = () =>
  !!(
    surgeryType ||
    surgeon ||
    anesthesiologist ||
    startTime ||
    endTime ||
    anesthesiaProtocol ||
    findings ||
    complications ||
    notes
  );


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
      description: "Please enter at least one surgery detail before analyzing",
      variant: "destructive"
    });
    return;
  }

  setIsAnalyzing(true);
  try {
    const analysis = await surgeryDetailsAnalysis(species, {
      surgeryType,
      surgeon,
      anesthesiologist,
      surgeryStartTime: startTime
        ? new Date(startTime).toISOString()
        : "",
      surgeryEndTime: endTime
        ? new Date(endTime).toISOString()
        : "",
      anesthesiaProtocol,
      surgicalFindings: findings,
      complications,
      notes,
    });

    setAnalysisResult(analysis);
    setIsChatMode(true);

    setMessages([
      {
        id: "initial-surgery-details-analysis",
        role: "assistant",
        parts: [{ type: "text", text: analysis }],
      },
    ]);

    toast({
      title: "Success",
      description: "Surgery details analysis completed",
      variant: "success"
    });
  } catch (error) {
    toast({
      title: "Error",
      description:
        error instanceof Error
          ? error.message
          : "Failed to analyze surgery details",
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
      })
      return
    }

    // Validate time order only if both provided
    if (startTime && endTime) {
      const start = new Date(startTime)
      const end = new Date(endTime)
      if (end <= start) {
        setTimeError("End Time must be greater than Start Time.");
        return;
      }
    }
    setTimeError("");

    setIsSubmitting(true)
    const payload = {
      visitId: visitData.id,
      surgeryType,
      surgeon,
      anesthesiologist,
      surgeryStartTime: startTime ? new Date(startTime).toISOString() : undefined,
      surgeryEndTime: endTime ? new Date(endTime).toISOString() : undefined,
      anesthesiaProtocol,
      surgicalFindings: findings,
      complications,
      notes,
      isCompleted: true,
    }

    try {
      if (detailData && detailData.length > 0) {
        await updateDetail.mutateAsync({ id: detailData[0].id, ...payload })
        toast({
          title: "Success",
          description: "Surgery detail updated successfully",
          variant: "success"
        })
      } else {
        await createDetail.mutateAsync(payload)
        toast({
          title: "Success",
          description: "Surgery detail saved successfully",
          variant: "success"
        })
      }
      await refetch()
      markTabAsCompleted("surgery-details")
      if (onNext) onNext()

    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to save surgery detail",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-0">
      <div className="h-[calc(100vh-22.5rem)] overflow-y-auto p-6">
        <div className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Surgery Type</label>
            <Input
              value={surgeryType}
              onChange={e => setSurgeryType(e.target.value)}
              placeholder="e.g., Spay, Neuter, Mass Removal, etc."
              disabled={isReadOnly}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Surgeon</label>
              <Input
                value={surgeon}
                onChange={e => setSurgeon(e.target.value)}
                placeholder="Enter surgeon name"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Anesthesiologist</label>
              <Input
                value={anesthesiologist}
                onChange={e => setAnesthesiologist(e.target.value)}
                placeholder="Enter anesthesiologist name"
                disabled={isReadOnly}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Surgery Start Time</label>
              <DatePicker
                selected={startTime ? new Date(startTime) : null}
                onChange={(date) => {
                  if (date instanceof Date && !isNaN(date.getTime())) {
                    setStartTime(date.toISOString());
                  } else {
                    setStartTime("");
                  }
                }}
                showTimeSelect
                timeIntervals={5}
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                dateFormat="dd/MM/yyyy h:mm aa"
                placeholderText="dd/mm/yyyy hh:mm"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Surgery End Time</label>
              <DatePicker
                selected={endTime ? new Date(endTime) : null}
                onChange={(date) => {
                  if (date instanceof Date && !isNaN(date.getTime())) {
                    setEndTime(date.toISOString());
                  } else {
                    setEndTime("");
                  }
                }}
                showTimeSelect
                timeIntervals={5}
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                dateFormat="dd/MM/yyyy h:mm aa"
                placeholderText="dd/mm/yyyy hh:mm"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isReadOnly}
              />
              {timeError && <p className="text-red-500 text-sm">{timeError}</p>}
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1">Anesthesia Protocol</label>
            <Textarea
              value={anesthesiaProtocol}
              onChange={e => setAnesthesiaProtocol(e.target.value)}
              placeholder="Describe the anesthesia protocol used"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Surgical Findings</label>
            <Textarea
              value={findings}
              onChange={e => setFindings(e.target.value)}
              placeholder="Describe what was found during surgery"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Complications</label>
            <Textarea
              value={complications}
              onChange={e => setComplications(e.target.value)}
              placeholder="Note any complications during surgery"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Notes</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional surgical notes"
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
                                placeholder="Ask about the surgery detail analysis..."
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
        <div className="mt-6 flex justify-end px-4 pb-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isReadOnly || !hasAnyFieldFilled || (detailData && !hasChanges)}
              className="ml-2 theme-button text-white"
            >
              {isSubmitting
                ? "Saving..."
                : detailData && detailData.length > 0
                ? "Update & Next"
                : "Save & Next"}
            </Button>
          </div>
      </CardContent>
    </Card>
  );
}