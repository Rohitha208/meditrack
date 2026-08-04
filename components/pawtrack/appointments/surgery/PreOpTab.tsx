import React, { useState, useEffect, useMemo , useRef} from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";
import { useGetSurgeryPreOpByVisitId } from "@/queries/surgery/preop/get-surgery-preop-by-visit-id";
import { useCreateSurgeryPreOp } from "@/queries/surgery/preop/create-surgery-preop";
import { useUpdateSurgeryPreOp } from "@/queries/surgery/preop/update-surgery-preop";
import { Card, CardContent } from "@/components/ui/card";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id";
import { useTabCompletion } from "@/context/TabCompletionContext";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { surgeryPreOpAnalysis } from "@/app/actions/reasonformatting";
import { toast } from "@/hooks/use-toast";

interface PreOpTabProps {
  patientId: string;
  appointmentId: string;
  onNext?: () => void;
  setWeightGraphOpen?: (open: boolean) => void;
}

const riskLevels = ["Low", "High", "Medium"];
const fastingStatus = ["Fasted 8+ hours", "Fasted 4-8 hours", "Not fasted", "Unknown"];

export default function PreOpTab({ patientId, appointmentId, onNext, setWeightGraphOpen }: PreOpTabProps) {

  const [weight, setWeight] = useState("");
  const [bloodwork, setBloodwork] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [fasting, setFasting] = useState("");
  const [medications, setMedications] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: visitData } = useGetVisitByAppointmentId(appointmentId);
  const { data: preOpData, refetch } = useGetSurgeryPreOpByVisitId(visitData?.id || "", !!visitData?.id);
  const createPreOp = useCreateSurgeryPreOp();
  const updatePreOp = useUpdateSurgeryPreOp();
  const { markTabAsCompleted } = useTabCompletion();
  const { data: appointmentData } = useGetAppointmentById(appointmentId);
  const isReadOnly = appointmentData?.status === "completed";
  const [isAnalyzing, setIsAnalyzing] = useState(false);
const [isChatMode, setIsChatMode] = useState(false);
const [analysisResult, setAnalysisResult] = useState("");
const [chatInput, setChatInput] = useState("");

const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const hasAnyFieldFilled = useMemo(() => {
    const hasWeight = String(weight).trim() !== "";
    const hasTexts =
      bloodwork.trim() !== "" ||
      medications.trim() !== "" ||
      notes.trim() !== "";
    const nonDefaultSelects =
      riskLevel !== "" ||
      fasting !== "";
    return hasWeight || hasTexts || nonDefaultSelects;
  }, [weight, bloodwork, riskLevel, fasting, medications, notes]);

  useEffect(() => {
    if (preOpData && preOpData.length > 0) {
      const data = preOpData[0];
      setWeight(data.weightKg !== undefined && data.weightKg !== null ? String(data.weightKg) : "");
      setBloodwork(data.preOpBloodworkResults || "");
      // Only set selects from API if record is completed; otherwise keep placeholder
      setRiskLevel(data.isCompleted ? (data.anesthesiaRiskAssessment || "") : "");
      setFasting(data.isCompleted ? (data.fastingStatus || "") : "");
      setMedications(data.preOpMedications || "");
      setNotes(data.notes || "");
    }
  }, [preOpData]);

  const preOpContextRef = useRef("");

const buildPreOpContext = () => {
  const preOpInfo = `
Current Surgery Pre-Op Data:
- Weight (kg): ${
    weight !== undefined && weight !== null ? weight : "Not recorded"
  }
- Pre-Op Bloodwork Results: ${bloodwork || "Not provided"}
- Anesthesia Risk Assessment: ${riskLevel || "Not provided"}
- Fasting Status: ${fasting || "Not recorded"}
- Pre-Op Medications: ${medications || "Not provided"}
${notes ? `- Notes: ${notes}` : ""}
  `.trim();

  return preOpInfo;
};


useEffect(() => {
  preOpContextRef.current = buildPreOpContext();
}, [
  weight,
  bloodwork,
  riskLevel,
  fasting,
  medications,
  notes,
]);


const { messages, sendMessage, status, setMessages } = useChat({
  id: `surgery-preop-${patientId}-${appointmentId}`,
  transport: new DefaultChatTransport({
    prepareSendMessagesRequest: ({ id, messages }) => {
      const preOpContext = preOpContextRef.current;

      return {
        body: {
          id,
          messages,
          patientId: patientId ?? null,
          preOpContext: preOpContext || undefined,
        },
      };
    },
  }),
});
const hasAnyInput = () => {
  return Boolean(
    weight ||
      bloodwork ||
      riskLevel ||
      fasting ||
      medications ||
      notes
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
      description: "Please enter at least one pre-op detail before analyzing",
      variant: "destructive"
    });
    return;
  }

  setIsAnalyzing(true);

  try {
    const analysis = await surgeryPreOpAnalysis(species, {
      weightKg:
        weight !== undefined && weight !== null
          ? Number(weight)
          : undefined,
      preOpBloodworkResults: bloodwork,
      anesthesiaRiskAssessment: riskLevel,
      fastingStatus: fasting,
      preOpMedications: medications,
      notes,
    });

    setAnalysisResult(analysis);
    setIsChatMode(true);

    setMessages([
      {
        id: "initial-surgery-preop-analysis",
        role: "assistant",
        parts: [{ type: "text", text: analysis }],
      },
    ]);

    toast({
      title: "Success",
      description: "Surgery pre-op analysis completed",
      variant: "success"
    });
  } catch (error) {
    toast({
      title: "Error",
      description:
        error instanceof Error
          ? error.message
          : "Failed to analyze surgery pre-op",
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
      weightKg: weight ? parseFloat(weight) : undefined,
      preOpBloodworkResults: bloodwork,
      anesthesiaRiskAssessment: riskLevel,
      fastingStatus: fasting,
      preOpMedications: medications,
      notes,
      isCompleted: true,
    };
    try {
      if (preOpData && preOpData.length > 0) {
        await updatePreOp.mutateAsync({ id: preOpData[0].id, ...payload });
        toast({
          title: "Success",
          description: "Pre-op record updated successfully",
          variant: "success"
        });
      } else {
        await createPreOp.mutateAsync(payload);
        toast({
          title: "Success",
          description: "Pre-op record saved successfully",
          variant: "success"
        });
      }
      await refetch();
      markTabAsCompleted("surgery-pre-op");
      if (onNext) onNext();

    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to save pre-op record",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
      <div className="h-[calc(100vh-22.5rem)] overflow-y-auto p-6">
        <div className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Weight (kg)</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="Enter weight in kg"
                disabled={isReadOnly}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setWeightGraphOpen?.(true)}
                title="View weight history"
                disabled={isReadOnly}
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1">Pre-op Bloodwork Results</label>
            <Textarea
              value={bloodwork}
              onChange={e => setBloodwork(e.target.value)}
              placeholder="Enter bloodwork results and any abnormalities"
              disabled={isReadOnly}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Anesthesia Risk Assessment</label>
              <select
                className="border rounded px-2 py-1 w-full"
                value={riskLevel}
                onChange={e => setRiskLevel(e.target.value)}
                disabled={isReadOnly}
              >
                <option value="" disabled>Select Risk Assessment</option>
                {riskLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Fasting Status</label>
              <select
                className="border rounded px-2 py-1 w-full"
                value={fasting}
                onChange={e => setFasting(e.target.value)}
                disabled={isReadOnly}
              >
                <option value="" disabled>Select Fasting Status</option>
                {fastingStatus.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1">Pre-op Medications</label>
            <Textarea
              value={medications}
              onChange={e => setMedications(e.target.value)}
              placeholder="List any pre-operative medications given"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Notes</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional pre-operative notes"
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
                        placeholder="Ask about the surgery pre-op analysis..."
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
        <div className="mt-6 flex justify-end my-4 mx-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isReadOnly || !hasAnyFieldFilled}
              className="ml-2 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D]"
            >
              {isSubmitting
                ? "Saving..."
                : preOpData && preOpData.length > 0
                  ? "Update & Next"
                  : "Save & Next"}
            </Button>
          </div>
      </CardContent>
    </Card>
  );
}