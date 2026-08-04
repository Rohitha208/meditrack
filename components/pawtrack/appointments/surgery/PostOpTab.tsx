import React, { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";
import { useGetSurgeryPostOpByVisitId } from "@/queries/surgery/postop/get-surgery-postop-by-visit-id";
import { useCreateSurgeryPostOp } from "@/queries/surgery/postop/create-surgery-postop";
import { useUpdateSurgeryPostOp } from "@/queries/surgery/postop/update-surgery-postop";
import { Card, CardContent } from "@/components/ui/card";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id";
import { useTabCompletion } from "@/context/TabCompletionContext";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { surgeryPostOpAnalysis } from "@/app/actions/reasonformatting";
import { toast } from "@/hooks/use-toast";

interface PostOpTabProps {
  patientId: string;
  appointmentId: string;
  onNext?: () => void;
}

const recoveryStatus = ["Excellent", "Good", "Fair", "Poor", "Critical"];
const painLevels = ["None", "Mild", "Moderate", "Severe"];

export default function PostOpTab({ patientId, appointmentId, onNext }: PostOpTabProps) {

  const [recovery, setRecovery] = useState("");
  const [painLevel, setPainLevel] = useState("");
  const [vitalSigns, setVitalSigns] = useState("");
  const [medications, setMedications] = useState("");
  const [woundCare, setWoundCare] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: visitData } = useGetVisitByAppointmentId(appointmentId);
  const { data: postOpData, refetch } = useGetSurgeryPostOpByVisitId(visitData?.id || "", !!visitData?.id);
  const createPostOp = useCreateSurgeryPostOp();
  const updatePostOp = useUpdateSurgeryPostOp();
  const { markTabAsCompleted } = useTabCompletion();
  const { data: appointmentData } = useGetAppointmentById(appointmentId);
  const isReadOnly = appointmentData?.status === "completed";
  const [isAnalyzing, setIsAnalyzing] = useState(false);
const [isChatMode, setIsChatMode] = useState(false);
const [analysisResult, setAnalysisResult] = useState("");
const [chatInput, setChatInput] = useState("");
const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const hasAnyFieldFilled = useMemo(() => {
    const nonDefaultSelects = recovery !== "" || painLevel !== "";
    const hasTexts =
      vitalSigns.trim() !== "" ||
      medications.trim() !== "" ||
      woundCare.trim() !== "" ||
      notes.trim() !== "";
    return nonDefaultSelects || hasTexts;
  }, [recovery, painLevel, vitalSigns, medications, woundCare, notes]);

  useEffect(() => {
    if (postOpData && postOpData.length > 0) {
      const data = postOpData[0];
      // Only set selects from API if record is completed; otherwise keep placeholder
      setRecovery(data.isCompleted ? (data.recoveryStatus || "") : "");
      setPainLevel(data.isCompleted ? (data.painAssessment || "") : "");
      setVitalSigns(data.vitalSigns || "");
      setMedications(data.postOpMedications || "");
      setWoundCare(data.woundCare || "");
      setNotes(data.notes || "");
    }
  }, [postOpData]);

  const postOpContextRef = useRef("");

const buildPostOpContext = () => {
  const postOpInfo = `
Current Post-Op Surgery Data:
- Recovery Status: ${recovery || "Not provided"}
- Pain Assessment: ${painLevel || "Not recorded"}
- Vital Signs: ${vitalSigns || "Not recorded"}
- Post-Op Medications: ${medications || "Not provided"}
- Wound Care: ${woundCare || "Not provided"}
${notes ? `- Additional Notes: ${notes}` : ""}
  `.trim();

  return postOpInfo;
};

// Update context whenever any post-op field changes
useEffect(() => {
  postOpContextRef.current = buildPostOpContext();
}, [recovery, painLevel, vitalSigns, medications, woundCare, notes]);

// Setup chat with AI
const { messages, sendMessage, status: chatStatus, setMessages } = useChat({
  id: `surgery-post-op-${patientId}-${appointmentId}`,
  transport: new DefaultChatTransport({
    prepareSendMessagesRequest: ({ id, messages }) => {
      const postOpContext = postOpContextRef.current;

      return {
        body: {
          id,
          messages,
          patientId: patientId ?? null,
          postOpContext: postOpContext || undefined,
        },
      };
    },
  }),
});

const hasAnyInput = () => {
  return (
    (recovery && recovery.trim() !== "") ||
    (painLevel && painLevel.trim() !== "") ||
    (vitalSigns && vitalSigns.trim() !== "") ||
    (medications && medications.trim() !== "") ||
    (woundCare && woundCare.trim() !== "") ||
    (notes && notes.trim() !== "")
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
      description: "Please fill in at least one post-op field for analysis",
      variant: "destructive"
    });
    return;
  }
  setIsAnalyzing(true);

  try {
    const analysis = await surgeryPostOpAnalysis(species, {
      recoveryStatus: recovery,
      painAssessment: painLevel,
      vitalSigns,
      postOpMedications: medications,
      woundCare,
      notes,
    });

    setAnalysisResult(analysis);
    setIsChatMode(true);

    setMessages([
      {
        id: "initial-surgery-post-op-analysis",
        role: "assistant",
        parts: [{ type: "text", text: analysis }],
      },
    ]);

    toast({
      title: "Success",
      description: "Surgery post-op analysis completed",
      variant: "success"
    });
  } catch (error) {
    toast({
      title: "Error",
      description:
        error instanceof Error
          ? error.message
          : "Failed to analyze surgery post-op notes",
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
      recoveryStatus: recovery,
      painAssessment: painLevel,
      vitalSigns,
      postOpMedications: medications,
      woundCare,
      notes,
      isCompleted: true,
    };
    try {
      if (postOpData && postOpData.length > 0) {
        await updatePostOp.mutateAsync({ id: postOpData[0].id, ...payload });
        toast({
          title: "Success",
          description: "Post-op record updated successfully",
          variant: "success"
        });
      } else {
        await createPostOp.mutateAsync(payload);
        toast({
          title: "Success",
          description: "Post-op record saved successfully",
          variant: "success"
        });
      }
      await refetch();
      markTabAsCompleted("surgery-post-op");
      if (onNext) onNext();

    } catch (e: any) {
      toast ({
        title: "Error",
        description: e.message || "Failed to save post-op record",
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
            <label className="block font-medium mb-1">Recovery Status</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={recovery}
              onChange={e => setRecovery(e.target.value)}
              disabled={isReadOnly}
            >
              <option value="" disabled>Select Recovery Status</option>
              {recoveryStatus.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Pain Assessment</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={painLevel}
              onChange={e => setPainLevel(e.target.value)}
              disabled={isReadOnly}
            >
              <option value="" disabled>Select Pain Assessment</option>
              {painLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Vital Signs</label>
            <Textarea
              value={vitalSigns}
              onChange={e => setVitalSigns(e.target.value)}
              placeholder="Heart rate, respiratory rate, temperature, etc."
              disabled={isReadOnly}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Post-op Medications</label>
            <Textarea
              value={medications}
              onChange={e => setMedications(e.target.value)}
              placeholder="List medications given post-operatively"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Wound Care</label>
            <Textarea
              value={woundCare}
              onChange={e => setWoundCare(e.target.value)}
              placeholder="Describe wound care instructions and status"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Notes</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional post-operative notes"
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
                                placeholder="Ask about the surgery Post-Op analysis..."
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
              disabled={isSubmitting || isReadOnly || !hasAnyFieldFilled}
              className="ml-2 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D]"
            >
              {isSubmitting
                ? "Saving..."
                : postOpData && postOpData.length > 0
                ? "Update & Next"
                : "Save & Next"}
            </Button>
          </div>
      </CardContent>
    </Card>
  );
}