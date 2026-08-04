import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateDewormingCheckout } from "@/queries/deworming/checkout/create-deworming-checkout";
import { useUpdateDewormingCheckout } from "@/queries/deworming/checkout/update-deworming-checkout";
import { useGetDewormingCheckoutByVisitId } from "@/queries/deworming/checkout/get-deworming-checkout-by-visit-id";
import { Card, CardContent } from "@/components/ui/card";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button } from "@/components/ui/button";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id";
import { useUpdateAppointment } from "@/queries/appointment/update-appointment";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
// Remove these imports if not used elsewhere
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { dewormingCheckoutAnalysis } from "@/app/actions/reasonformatting";

interface CheckoutTabProps {
  patientId: string;
  appointmentId: string;
  visitId?: string;
  onClose: () => void;
  onComplete?: (completed: boolean) => void;
  allTabsCompleted: boolean;
  isCompleted?: boolean;
}

export default function CheckoutTab({
  patientId,
  appointmentId,
  visitId,
  onClose,
  onComplete,
  allTabsCompleted,
  isCompleted = false
}: CheckoutTabProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState("");
  const [nextDue, setNextDue] = useState<Date | null>(null);
  const [instructions, setInstructions] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [clientAcknowledged, setClientAcknowledged] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use visitId if available, otherwise fall back to appointmentId
  const effectiveVisitId = visitId || appointmentId;
  // Using the correct hook for checkout data, similar to the IntakeTab
  const { data: checkoutData, isLoading, isError, refetch } = useGetDewormingCheckoutByVisitId(effectiveVisitId);
  const createCheckout = useCreateDewormingCheckout();
  const updateCheckout = useUpdateDewormingCheckout();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Get appointment data for status checking
  const { data: appointmentData } = useGetAppointmentById(appointmentId);
  const updateAppointmentMutation = useUpdateAppointment({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment status updated successfully",
        variant: "success"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update appointment status: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Check if appointment is already completed
  const isAppointmentCompleted = appointmentData?.status === "completed";

  // Extract the first checkout if data is an array
  const data = Array.isArray(checkoutData) ? checkoutData[0] : checkoutData;

  // Notify parent component when data is loaded
  useEffect(() => {
    if (data && onComplete) {
      onComplete(!!data.isCompleted);
    }
  }, [data, onComplete]);

  // Load data when it becomes available
  useEffect(() => {
    if (data) {
      setSummary(data.summary || "");
      if (data.nextDewormingDueDate) {
        setNextDue(new Date(data.nextDewormingDueDate));
      }
      setInstructions(data.homeCareInstructions || "");
      setClientAcknowledged(!!data.clientAcknowledged);
    }
  }, [data]);

  const dewormingCheckoutContextRef = useRef("");

  const buildDewormingCheckoutContext = () => {
    const checkoutInfo = `
Current Deworming Checkout Data:
- Checkout Summary:
${summary || "Not provided"}

- Home Care Instructions:
${instructions || "Not provided"}

- Next Deworming Due Date:
${nextDue
        ? nextDue.toISOString()
        : "Not scheduled"
      }

- Client Acknowledged:
${clientAcknowledged === true
        ? "Yes"
        : clientAcknowledged === false
          ? "No"
          : "Not recorded"
      }
  `.trim();

    return checkoutInfo;
  };
  useEffect(() => {
    dewormingCheckoutContextRef.current = buildDewormingCheckoutContext();
  }, [
    summary,
    instructions,
    nextDue,
    clientAcknowledged,
  ]);
  const { messages, sendMessage, status, setMessages } = useChat({
    id: `deworming-checkout-${patientId}-${appointmentId}`,
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: ({ id, messages }) => {
        const dewormingCheckoutContext =
          dewormingCheckoutContextRef.current;

        return {
          body: {
            id,
            messages,
            patientId: patientId ?? null,
            dewormingCheckoutContext:
              dewormingCheckoutContext || undefined,
          },
        };
      },
    }),
  });
  const hasAnyInput = () => {
    return Boolean(
      summary?.trim() ||
      instructions?.trim() ||
      nextDue ||
      clientAcknowledged === true ||
      clientAcknowledged === false
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

    setIsAnalyzing(true);
    try {
      const analysis = await dewormingCheckoutAnalysis(species, {
        summary: summary,
        homeCareInstructions: instructions,
        nextDewormingDueDate: nextDue
          ? nextDue.toISOString()
          : undefined,
        clientAcknowledged,
      });

      setAnalysisResult(analysis);
      setIsChatMode(true);

      setMessages([
        {
          id: "initial-deworming-checkout-analysis",
          role: "assistant",
          parts: [{ type: "text", text: analysis }],
        },
      ]);

      toast({
        // severity: "success",
        title: "Success",
        description: "Deworming checkout analysis completed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "Failed to analyze deworming checkout",
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


  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        visitId: effectiveVisitId,
        summary: summary || undefined,
        nextDewormingDueDate: nextDue ? nextDue.toISOString().split('T')[0] : undefined,
        homeCareInstructions: instructions || undefined,
        clientAcknowledged,
        isCompleted: true, // Mark as completed
      };

      if (data && data.id) {
        await updateCheckout.mutateAsync({ id: data.id, ...payload });
      } else {
        await createCheckout.mutateAsync(payload);
      }

      await refetch();

      if (onComplete) {
        onComplete(true);
      }

      toast({
        title: "Success",
        description: "Checkout details saved successfully",
        variant: "success"
      });
    } catch (error) {
      console.error("Error saving checkout:", error);
      toast({
        title: "Error",
        description: "Failed to save checkout details",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckout = async () => {
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
      // First save the checkout details as completed
      const payload = {
        visitId: effectiveVisitId,
        summary: summary || undefined,
        nextDewormingDueDate: nextDue ? nextDue.toISOString().split('T')[0] : undefined,
        homeCareInstructions: instructions || undefined,
        clientAcknowledged,
        isCompleted: true, // Mark as completed
      };

      if (data && data.id) {
        await updateCheckout.mutateAsync({ id: data.id, ...payload });
      } else {
        await createCheckout.mutateAsync(payload);
      }

      // Only update appointment status if not already completed
      if (!isAppointmentCompleted) {
        await updateAppointmentMutation.mutateAsync({
          id: appointmentId,
          data: {
            ...appointmentData,
            status: "completed"
          }
        });
      }

      await refetch();

      if (onComplete) {
        onComplete(true);
      }

      toast({
        title: "Success",
        description: "Visit completed successfully",
        variant: "success"
      });

      // Close the form after successful completion
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error during checkout process:", error);
      toast({
        title: "Error",
        description: "Failed to complete checkout",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const hasExistingData = !!data?.id;
  const isReadOnly = appointmentData?.status === "completed";

  // Show loading indicator while data is being fetched
  if (isLoading) return <div>Loading...</div>;

  return (
    <Card className="relative">
      <CardContent className="p-0">
        <div className="h-[calc(100vh-23rem)] overflow-y-auto p-6">
          <div className="space-y-4">
            {isError && (
              <div className="p-2 bg-red-50 text-red-600 rounded mb-4">
                Error loading checkout data. You can still create a new checkout.
              </div>
            )}

            <div>
              <Label className="block font-medium mb-1">Summary</Label>
              <Textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="Summary of visit and treatment"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <div>
                <div>
                  <Label className="block font-medium mb-1">Next Deworming Due Date</Label>
                  <div className="date-picker-wrapper">
                    <DatePicker
                      selected={nextDue}
                      onChange={(date) => setNextDue(date)}
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
            </div>
            <div>
              <Label className="block font-medium mb-1">Home Care Instructions</Label>
              <Textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="Instructions for the client to follow at home"
                disabled={isReadOnly}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="client-acknowledgement"
                checked={clientAcknowledged}
                onChange={e => setClientAcknowledged(e.target.checked)}
                disabled={isReadOnly}
              />
              <label htmlFor="client-acknowledgement" className="text-sm">Client has received and understood instructions</label>
            </div>

            {(createCheckout.isError || updateCheckout.isError) && (
              <div className="text-red-500 text-sm">Error saving checkout.</div>
            )}
            {(createCheckout.isSuccess || updateCheckout.isSuccess) && (
              <div className="text-green-600 text-sm">Checkout saved successfully!</div>
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
                        placeholder="Ask about the deworming checkout analysis..."
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

        <div className="mt-6 flex justify-end gap-4 mb-4 mx-4">
          <Button
            onClick={handleSave}
            className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
            disabled={isSaving || createCheckout.isPending || updateCheckout.isPending || isReadOnly || !summary.trim() || !nextDue || !instructions.trim()}
            variant="outline"
          >
            {isSaving ? "Saving..." : (hasExistingData ? "Update" : "Save")}
          </Button>

          <Button
            className="bg-[#1E3D3D] hover:bg-[#1E3D3D] text-white"
            onClick={handleCheckout}
            disabled={isProcessing || isReadOnly}
          >
            {isProcessing ? 'Processing...' : 'Checkout'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 