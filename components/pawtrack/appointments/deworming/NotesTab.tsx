import React, { useState, useEffect,useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useGetDewormingNoteByVisitId } from "@/queries/deworming/note/get-deworming-note-by-visit-id";
import { useCreateDewormingNote } from "@/queries/deworming/note/create-deworming-note";
import { useUpdateDewormingNote } from "@/queries/deworming/note/update-deworming-note";
import { Card, CardContent } from "@/components/ui/card";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id"
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { dewormingNotesAnalysis } from "@/app/actions/reasonformatting";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";


interface NotesTabProps {
  patientId: string;
  appointmentId: string;
  visitId?: string;
  onComplete?: (completed: boolean) => void;
  onNext?: () => void;
  isCompleted?: boolean;
}

export default function NotesTab({ patientId, appointmentId, visitId, onComplete, onNext, isCompleted = false }: NotesTabProps) {
  const { toast } = useToast()
  const [reactions, setReactions] = useState("");
  const [notes, setNotes] = useState("");
  const [ownerQuestions, setOwnerQuestions] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState("Resolved");
  const [isSaving, setIsSaving] = useState(false);

  // Use visitId if available, otherwise fall back to appointmentId
  const effectiveVisitId = visitId || appointmentId;
  // Use the correct hook for fetching note by visitId (appointmentId)
  const { data: noteData, isLoading, isError, refetch } = useGetDewormingNoteByVisitId(effectiveVisitId);
  const createMutation = useCreateDewormingNote();
  const updateMutation = useUpdateDewormingNote();

  const { data: appointmentData } = useGetAppointmentById(appointmentId);
  const isReadOnly = appointmentData?.status === "completed";

  // Extract the first note if data is an array
  const data = Array.isArray(noteData) ? noteData[0] : noteData;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
const [isChatMode, setIsChatMode] = useState(false);
const [analysisResult, setAnalysisResult] = useState("");
const [chatInput, setChatInput] = useState("");
const messagesEndRef = useRef<HTMLDivElement | null>(null);
const dewormingContextRef = useRef("");

const buildDewormingContext = () => {
  const dewormingInfo = `
Current Deworming Notes Data:
- Owner Concerns: ${ownerQuestions || "Not provided"}
- Adverse Reactions: ${reactions || "None reported"}
- Resolution Status: ${resolutionStatus || "Not specified"}
${notes ? `- Additional Notes: ${notes}` : ""}
  `.trim();

  return dewormingInfo;
};
useEffect(() => {
  dewormingContextRef.current = buildDewormingContext();
}, [ownerQuestions, reactions, resolutionStatus, notes]);

const { messages, sendMessage, status, setMessages } = useChat({
  id: `deworming-notes-${patientId}-${appointmentId}`,
  transport: new DefaultChatTransport({
    prepareSendMessagesRequest: ({ id, messages }) => {
      const dewormingContext = dewormingContextRef.current;

      return {
        body: {
          id,
          messages,
          patientId: patientId ?? null,
          dewormingContext: dewormingContext || undefined,
        },
      };
    },
  }),
});
const hasAnyInput = () => {
  return Boolean(
    ownerQuestions?.trim() ||
    reactions?.trim() ||
    notes?.trim() ||
    resolutionStatus?.trim()
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
      description: "Please enter at least one deworming note before analyzing",
      variant: "destructive"
    });
    return;
  }

  setIsAnalyzing(true);
  try {
    const analysis = await dewormingNotesAnalysis(species, {
      ownerConcerns: ownerQuestions,
      adverseReactions: reactions,
      resolutionStatus,
      additionalNotes: notes,
    });

    setAnalysisResult(analysis);
    setIsChatMode(true);

    setMessages([
      {
        id: "initial-deworming-notes-analysis",
        role: "assistant",
        parts: [{ type: "text", text: analysis }],
      },
    ]);

    toast({
      title: "Success",
      description: "Deworming notes analysis completed",
      variant: "success"
    });
  } catch (error) {
    toast({
      title: "Error",
      description: error instanceof Error
        ? error.message
        : "Failed to analyze deworming notes",
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


  // Notify parent component when data is loaded
  useEffect(() => {
    if (data && onComplete) {
      onComplete(!!data.isCompleted);
    }
  }, [data, onComplete]);

  useEffect(() => {
    if (data) {
      setReactions(data.adverseReactions || "");
      setNotes(data.additionalNotes || "");
      setOwnerQuestions(data.ownerConcerns || "");
      setFollowUpRequired(!!data.followUpRequired);
      setResolutionStatus(data.resolutionStatus || "Resolved");
    }
  }, [data]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        visitId: effectiveVisitId,
        adverseReactions: reactions || undefined,
        additionalNotes: notes || undefined,
        ownerConcerns: ownerQuestions || undefined,
        followUpRequired,
        resolutionStatus: resolutionStatus || undefined,
        isCompleted: true, // Mark as completed
      };

      if (data && data.id) {
        await updateMutation.mutateAsync({ id: data.id, ...payload });
        toast({
          title: "Success",
          description: "Deworming notes updated successfully",
          variant: "success"
        });
      } else {
        await createMutation.mutateAsync(payload);
        toast({
          title: "Success", 
          description: "Deworming notes saved successfully",
          variant: "success"
        });
      }

      await refetch();

      if (onComplete) {
        onComplete(true);
      }

      if (onNext) {
        onNext();
      }
    } catch (error: any) {
      console.error("Error saving notes:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save deworming notes",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasExistingData = !!data?.id;

  // Show loading indicator while data is being fetched
  if (isLoading) return <div>Loading...</div>;

  // Always render the form, even if there's no data yet
  return (
    <Card className="relative">
      <CardContent className="p-0">
      <div className="h-[calc(100vh-23rem)] overflow-y-auto p-6">
        <div className="space-y-4">
          {isError && (
            <div className="p-2 bg-red-50 text-red-600 rounded mb-4">
              Error loading notes data. You can still create a new note.
            </div>
          )}

          <div>
            <Label className="block font-medium mb-1">Adverse Reactions (if any)</Label>
            <Textarea
              value={reactions}
              onChange={e => setReactions(e.target.value)}
              placeholder="Describe any adverse reactions observed"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label className="block font-medium mb-1">Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any other notes or comments"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label className="block font-medium mb-1">Owner Questions/Concerns</Label>
            <Textarea
              value={ownerQuestions}
              onChange={e => setOwnerQuestions(e.target.value)}
              placeholder="Any questions or concerns from the owner"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label className="block font-medium mb-1">Resolution Status</Label>
            <Select
              value={resolutionStatus}
              onValueChange={setResolutionStatus}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Se  lect status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Ongoing">Ongoing</SelectItem>
                <SelectItem value="Needs Further Investigation">Needs Further Investigation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(createMutation.isError || updateMutation.isError) && (
            <div className="text-red-500 text-sm">Error saving data.</div>
          )}
          {(createMutation.isSuccess || updateMutation.isSuccess) && (
            <div className="text-green-600 text-sm">Saved successfully!</div>
          )}
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
                                placeholder="Ask about the deworming notes analysis..."
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
        <div className="mt-6 flex justify-end mb-4 mx-4">
            <Button
              onClick={handleSave}
              className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
              disabled={isSaving || createMutation.isPending || updateMutation.isPending || isReadOnly || !resolutionStatus}
            >
              {hasExistingData ? "Update & Next" : "Save & Next"}
            </Button>
          </div>
      </CardContent>
    </Card>
  );
} 