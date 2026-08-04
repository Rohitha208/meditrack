import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TrendingUp, Bot, User, Send, Loader2, Sparkles } from "lucide-react";
import WeightGraph from "@/components/pawtrack/appointments/WeightGraph";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { emergencyVitalsAnalysis } from "@/app/actions/reasonformatting";
import { useUpdateVisit } from "@/queries/visit/update-visit";
import { useGetEmergencyVitalByVisitId } from "@/queries/emergency/vitals/get-emergency-vital-by-visit-id";
import { useCreateEmergencyVital } from "@/queries/emergency/vitals/create-emergency-vital";
import { useUpdateEmergencyVital } from "@/queries/emergency/vitals/update-emergency-vital";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id";
import { useToast } from "@/hooks/use-toast";
import { validateVitals as validateVitalsFn, isVitalsComplete as isVitalsCompleteFn, VitalsValidationErrors } from "../../schema/emergencyVitalsValidation";

interface EmergencyVitalsTabProps {
  patientId: string;
  appointmentId: string;
  onNext?: () => void;
}

const mucousColors = [
  { value: "pink", label: "Pink" },
  { value: "pale", label: "Pale" },
  {value:  "white", label: "White"},
  { value: "cyanotic", label: "Cyanotic" },
  { value: "icteric", label: "Icteric" },
  { value: "injected", label: "Injected" },
];
const heartRhythms = [
  { value: "normal", label: "Normal" },
  { value: "arrhythmia", label: "Arrhythmia" },
  { value: "tachycardia", label: "Tachycardia" },
  { value: "bradycardia", label: "Bradycardia" },
];

export default function EmergencyVitalsTab({ patientId, appointmentId, onNext }: EmergencyVitalsTabProps) {
  const { toast } = useToast()
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [tempUnit, setTempUnit] = useState("C");
  const [bloodPressure, setBloodPressure] = useState("");
  const [weight, setWeight] = useState("");
  const [capillaryRefill, setCapillaryRefill] = useState("");
  const [mucousMembrane, setMucousMembrane] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [bloodGlucose, setBloodGlucose] = useState("");
  const [heartRhythm, setHeartRhythm] = useState("");
  const [suppOxygen, setSuppOxygen] = useState(false);
  const [notes, setNotes] = useState("");

  // Placeholder for repeat vitals table
  const [repeatVitals, setRepeatVitals] = useState<any[]>([]);

  const { data: visitData, isLoading: visitLoading } = useGetVisitByAppointmentId(appointmentId);
  const { data: vitalsData, isLoading: vitalsLoading, refetch: refetchVitals } = useGetEmergencyVitalByVisitId(visitData?.id || "", !!visitData?.id);
  const createVitals = useCreateEmergencyVital({});
  const updateVitals = useUpdateEmergencyVital({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [weightGraphOpen, setWeightGraphOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [chatInput, setChatInput] = useState("");

  const { data: appointmentData } = useGetAppointmentById(appointmentId)
  const updateVisit = useUpdateVisit();
  const isReadOnly = appointmentData?.status === "completed"

  const { messages, sendMessage, status, setMessages } = useChat({
    id: `emergency-vitals-${patientId}-${appointmentId}`,
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: ({ id, messages }) => {
        const vitalsContext = JSON.stringify({
          heartRate,
          respiratoryRate,
          temperature: tempUnit === 'F' ? ((parseFloat(temperature) - 32) * 5 / 9).toFixed(2) : temperature,
          tempUnit,
          bloodPressure,
          weight,
          capillaryRefill,
          mucousMembrane,
          oxygenSaturation,
          bloodGlucose,
          heartRhythm,
          suppOxygen,
          notes
        }, null, 2);

        return {
          body: {
            id,
            messages,
            patientId: patientId ?? null,
            vitalsContext: vitalsContext || undefined,
          },
        };
      },
    }),
  });

  const validateVitals = (showAllErrors = false) => {
    if (!isSubmitted && !showAllErrors) {
      return {};
    }

    const raw = validateVitalsFn({
      temperature,
      heartRate,
      bloodPressure,
      bloodGlucose,
      respiratoryRate,
      capillaryRefill,
      mucousMembrane,
      heartRhythm,
      weight,
      oxygenSaturation
    }) as Record<string, string | undefined>;

    // Make all fields optional: only surface errors for fields that have a value
    const filtered: Record<string, string> = {};
    const hasVal = (v?: string) => v !== undefined && v !== null && String(v).trim() !== "";
    if (hasVal(capillaryRefill) && raw.capillaryRefill) filtered.capillaryRefill = raw.capillaryRefill as string;
    if (hasVal(mucousMembrane) && raw.mucousMembrane) filtered.mucousMembrane = raw.mucousMembrane as string;
    if (hasVal(heartRhythm) && raw.heartRhythm) filtered.heartRhythm = raw.heartRhythm as string;
    if (hasVal(respiratoryRate) && raw.respiratoryRate) filtered.respiratoryRate = raw.respiratoryRate as string;
    if (hasVal(weight) && raw.weight) filtered.weight = raw.weight as string;
    if (hasVal(oxygenSaturation) && raw.oxygenSaturation) filtered.oxygenSaturation = raw.oxygenSaturation as string;
    if (hasVal(bloodGlucose) && raw.bloodGlucose) filtered.bloodGlucose = raw.bloodGlucose as string;
    if (hasVal(temperature) && raw.temperature) filtered.temperature = raw.temperature as string;
    if (hasVal(heartRate) && raw.heartRate) filtered.heartRate = raw.heartRate as string;
    if (hasVal(bloodPressure) && raw.bloodPressure) filtered.bloodPressure = raw.bloodPressure as string;

    return filtered;
  };

  useEffect(() => {
    if (vitalsData) {
      setWeight(vitalsData.weightKg?.toString() || "");
      setCapillaryRefill(vitalsData.capillaryRefillTimeSec?.toString() || "");
      setMucousMembrane(vitalsData.mucousMembraneColor || "");
      setOxygenSaturation(vitalsData.oxygenSaturationSpo2?.toString() || "");
      setBloodGlucose(vitalsData.bloodGlucoseMgDl?.toString() || "");
      setTemperature(
        vitalsData.temperatureC !== undefined && vitalsData.temperatureC !== null
          ? vitalsData.temperatureC.toString()
          : ""
      );
      setHeartRhythm(vitalsData.heartRhythm || "");
      setHeartRate(vitalsData.heartRateBpm?.toString() || "");
      setRespiratoryRate(vitalsData.respiratoryRateBpm?.toString() || "");
      setBloodPressure(vitalsData.bloodPressure || "");
      setSuppOxygen(!!vitalsData.supplementalOxygenGiven);
      setNotes(vitalsData.notes || "");
      // If you want to handle tempUnit (C/F), you may need to add logic here
    }
  }, [vitalsData]);

  const isVitalsComplete = (): boolean => {
    return isVitalsCompleteFn({
      temperature,
      heartRate,
      bloodPressure,
      bloodGlucose,
      respiratoryRate,
      capillaryRefill,
      mucousMembrane,
      heartRhythm,
      weight,
      oxygenSaturation
    });
  };

  const hasAnyInput = (): boolean => {
    return !!(
      weight ||
      capillaryRefill ||
      mucousMembrane ||
      oxygenSaturation ||
      bloodGlucose ||
      temperature ||
      heartRhythm ||
      heartRate ||
      respiratoryRate ||
      bloodPressure ||
      notes
    );
  };

  const handleAnalyze = async () => {
    if (!appointmentData?.patient?.species) {
      toast({
        title: "Error",
        description: "Patient species information is required for analysis",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      if (!visitData) {
        throw new Error('Visit data not available');
      }
      
      const analysis = await emergencyVitalsAnalysis(
        appointmentData.patient?.species,
        {
          temperatureC: tempUnit === 'F' ? parseFloat(((parseFloat(temperature) - 32) * 5 / 9).toFixed(2)) : parseFloat(temperature),
          heartRateBpm: heartRate ? parseInt(heartRate) : undefined,
          respiratoryRateBpm: respiratoryRate ? parseInt(respiratoryRate) : undefined,
          mucousMembraneColor: mucousMembrane,
          capillaryRefillTimeSec: capillaryRefill ? parseFloat(capillaryRefill) : undefined,
          heartRhythm: heartRhythm,
          weightKg: weight ? parseFloat(weight) : undefined,
          painScore: 0, // Add if you have pain score in your form
          mentation: "", // Add if you have mentation in your form
          pulseQuality: "", // Add if you have pulse quality in your form
          respiratoryEffort: "", // Add if you have respiratory effort in your form
          lungSounds: "", // Add if you have lung sounds in your form
          skinTentSec: 0, // Add if you have skin tenting in your form
          mmColor: mucousMembrane,
          crtSec: capillaryRefill ? parseFloat(capillaryRefill) : undefined,
          hydrationPercent: 0, // Add if you have hydration percentage in your form
          notes: notes
        }
      );

      setAnalysisResult(analysis);
      setIsChatMode(true);

      setMessages([
        {
          id: "initial-vitals-analysis",
          role: "assistant",
          parts: [{ type: "text", text: analysis }],
        },
      ]);

      toast({
        title: "Success",
        description: "Vitals analysis completed",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze vitals data",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    await sendMessage({ text: chatInput });
    setChatInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    const errors = validateVitals(true);

    if (Object.keys(errors).length > 0) {
      // Don't show toast for validation errors, they're already displayed in the form
      return;
    }

    setIsSubmitting(true);
    try {
      if (!visitData || !visitData.id) {
        throw new Error('Visit data is not available');
      }
      
      const payload = {
        visitId: visitData.id,
        weightKg: weight ? parseFloat(weight) : undefined,
        capillaryRefillTimeSec: capillaryRefill ? parseFloat(capillaryRefill) : undefined,
        mucousMembraneColor: mucousMembrane || undefined,
        oxygenSaturationSpo2: oxygenSaturation ? parseFloat(oxygenSaturation) : undefined,
        bloodGlucoseMgDl: bloodGlucose ? parseFloat(bloodGlucose) : undefined,
        temperatureC: tempUnit === "C" ? (temperature ? parseFloat(temperature) : undefined) : undefined,
        heartRhythm: heartRhythm || undefined,
        heartRateBpm: heartRate ? parseInt(heartRate) : undefined,
        respiratoryRateBpm: respiratoryRate ? parseInt(respiratoryRate) : undefined,
        bloodPressure: bloodPressure || undefined,
        supplementalOxygenGiven: suppOxygen,
        notes: notes || undefined,
        isCompleted: isVitalsComplete(),
      };
      if (vitalsData && vitalsData.id) {
        await updateVitals.mutateAsync({ id: vitalsData.id, ...payload });
        toast({
          title: "Success",
          description: "Vitals updated successfully",
          variant: "success"
        });
      } else {
        await createVitals.mutateAsync(payload);
        toast({
          title: "Success",
          description: "Vitals saved successfully",
          variant: "success"
        });
      }
      await refetchVitals();
      if (visitData?.id) {
        try {
          await updateVisit.mutateAsync({ id: visitData.id, isEmergencyVitalCompleted: true });
        } catch { }
      }
      if (onNext) onNext();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to save vitals",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="h-[calc(100vh-20.5rem)] overflow-y-auto p-6">
          <div className={isReadOnly ? "pointer-events-none opacity-60" : ""}>
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-4">Emergency Vitals Entry</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weight */}
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="weight"
                          placeholder="e.g. 12.5"
                          value={weight}
                          onChange={e => setWeight(e.target.value)}
                          type="number"
                          min="0.1"
                          step="0.1"
                          className={`${isSubmitted && validateVitals(true).weight ? 'border-red-500' : ''}`}
                        />
                      </div>
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
                    {isSubmitted && validateVitals(true).weight && (
                      <p className="text-sm text-red-500 mt-1">{validateVitals(true).weight}</p>
                    )}
                  </div>
                  {/* Capillary Refill */}
                  <div>
                    <Label htmlFor="capillaryRefill">Capillary Refill (sec)</Label>
                    <Input
                      id="capillaryRefill"
                      placeholder="e.g. 2"
                      value={capillaryRefill}
                      onChange={e => setCapillaryRefill(e.target.value)}
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      className={`${isSubmitted && validateVitals(true).capillaryRefill ? 'border-red-500' : ''}`}
                    />
                    {isSubmitted && validateVitals(true).capillaryRefill && (
                      <p className="text-sm text-red-500 mt-1">{validateVitals(true).capillaryRefill}</p>
                    )}
                  </div>
                  {/* Mucous Membrane Color */}
                  <div>
                    <Label htmlFor="mucousMembrane">Mucous Membrane Color</Label>
                    <Select
                      value={mucousMembrane}
                      onValueChange={setMucousMembrane}
                    >
                      <SelectTrigger
                        id="mucousMembrane"
                        className={isSubmitted && validateVitals(true).mucousMembrane ? 'border-red-500' : ''}
                      >
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      {isSubmitted && validateVitals(true).mucousMembrane && (
                        <p className="text-sm text-red-500 mt-1">{validateVitals(true).mucousMembrane}</p>
                      )}
                      <SelectContent>
                        {mucousColors.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Oxygen Saturation */}
                  <div>
                    <Label htmlFor="oxygenSaturation">Oxygen Saturation (SpO2 %)</Label>
                    <Input
                      id="oxygenSaturation"
                      placeholder="e.g. 98"
                      value={oxygenSaturation}
                      onChange={e => setOxygenSaturation(e.target.value)}
                      type="number"
                      min="70"
                      max="100"
                      step="1"
                      className={isSubmitted && validateVitals(true).oxygenSaturation ? 'border-red-500' : ''}
                    />
                    {isSubmitted && validateVitals(true).oxygenSaturation && (
                      <p className="text-sm text-red-500 mt-1">{validateVitals(true).oxygenSaturation}</p>
                    )}
                  </div>
                  {/* Blood Glucose */}
                  <div>
                    <Label htmlFor="bloodGlucose">Blood Glucose (mg/dL)</Label>
                    <Input
                      id="bloodGlucose"
                      placeholder="e.g. 110"
                      value={bloodGlucose}
                      onChange={e => setBloodGlucose(e.target.value)}
                      type="number"
                      min="20"
                      max="800"
                      step="1"
                      className={isSubmitted && validateVitals(true).bloodGlucose ? 'border-red-500' : ''}
                    />
                    {isSubmitted && validateVitals(true).bloodGlucose && (
                      <p className="text-sm text-red-500 mt-1">{validateVitals(true).bloodGlucose}</p>
                    )}
                  </div>

                  {/* Temperature */}
                  <div>
                    <Label htmlFor="temperature">Temperature ({tempUnit === "C" ? "°C" : "°F"})</Label>
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-2 items-center">
                        <Input
                          id="temperature"
                          placeholder={tempUnit === "C" ? "e.g. 38.5" : "e.g. 101.3"}
                          value={temperature}
                          onChange={e => setTemperature(e.target.value)}
                          type="number"
                          min={tempUnit === "C" ? "32" : "89.6"}
                          max={tempUnit === "C" ? "43" : "109.4"}
                          step="0.1"
                          className={isSubmitted && validateVitals(true).temperature ? 'border-red-500' : ''}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')}
                          className="w-16"
                        >
                          {tempUnit === 'C' ? '°C' : '°F'}
                        </Button>
                      </div>
                      {isSubmitted && validateVitals(true).temperature && (
                        <p className="text-sm text-red-500 mt-1">{validateVitals(true).temperature}</p>
                      )}
                    </div>
                  </div>
                  {/* Heart Rhythm */}
                  <div>
                    <Label htmlFor="heartRhythm">Heart Rhythm</Label>
                    <Select
                      value={heartRhythm}
                      onValueChange={setHeartRhythm}
                    >
                      <SelectTrigger
                        id="heartRhythm"
                        className={isSubmitted && validateVitals(true).heartRhythm ? 'border-red-500' : ''}
                      >
                        <SelectValue placeholder="Select rhythm" />
                      </SelectTrigger>
                      <SelectContent>
                        {heartRhythms.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isSubmitted && validateVitals(true).heartRhythm && (
                      <p className="text-sm text-red-500 mt-1">{validateVitals(true).heartRhythm}</p>
                    )}
                  </div>
                  {/* Heart Rate */}
                  <div>
                    <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                    <Input
                      id="heartRate"
                      placeholder="e.g. 120"
                      value={heartRate}
                      onChange={e => setHeartRate(e.target.value)}
                      type="number"
                      min="30"
                      max="300"
                      step="1"
                      className={isSubmitted && validateVitals(true).heartRate ? 'border-red-500' : ''}
                    />
                    {isSubmitted && validateVitals(true).heartRate && (
                      <p className="text-sm text-red-500 mt-1">{validateVitals(true).heartRate}</p>
                    )}
                  </div>
                  {/* Respiratory Rate */}
                  <div>
                    <Label htmlFor="respiratoryRate">Respiratory Rate (bpm)</Label>
                    <Input
                      id="respiratoryRate"
                      placeholder="e.g. 20"
                      value={respiratoryRate}
                      onChange={e => setRespiratoryRate(e.target.value)}
                      type="number"
                      min="5"
                      max="60"
                      step="1"
                      className={isSubmitted && validateVitals(true).respiratoryRate ? 'border-red-500' : ''}
                    />
                    {isSubmitted && validateVitals(true).respiratoryRate && (
                      <p className="text-sm text-red-500 mt-1">{validateVitals(true).respiratoryRate}</p>
                    )}
                  </div>
                  {/* Blood Pressure */}
                  <div>
                    <Label htmlFor="bloodPressure">Blood Pressure (mmHg)</Label>
                    <Input
                      id="bloodPressure"
                      placeholder="e.g. 120/80"
                      value={bloodPressure}
                      onChange={e => setBloodPressure(e.target.value)}
                      className={isSubmitted && validateVitals(true).bloodPressure ? 'border-red-500' : ''}
                    />
                    {isSubmitted && validateVitals(true).bloodPressure && (
                      <p className="text-sm text-red-500 mt-1">{validateVitals(true).bloodPressure}</p>
                    )}
                  </div>
                  {/* Supplemental Oxygen Checkbox */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="suppOxygen"
                      checked={suppOxygen}
                      onCheckedChange={checked => setSuppOxygen(checked === true)}
                    />
                    <Label htmlFor="suppOxygen">Supplemental oxygen given</Label>
                  </div>
                  {/* Notes - Always span full width */}
                  <div className="md:col-span-2">
                    <Label htmlFor="vitalsNotes">Notes</Label>
                    <Textarea
                      id="vitalsNotes"
                      placeholder="Additional notes on vitals"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
        {/* AI Vitals Analysis Section */}
      <div className="mt-8 border-t pt-6 px-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-semibold">AI Vitals Analysis</h3>
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
                "Analyze Vitals"
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
                <h4 className="text-sm text-purple-700 dark:text-purple-300 font-semibold">AI Vitals Assistant</h4>
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
                    placeholder="Ask about the vitals analysis..."
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
                {!hasAnyInput()
                  ? "Enter vitals data to enable AI analysis"
                  : "Click 'Analyze Vitals' to get AI-powered insights"}
              </div>
            )}
          </>
        )}
      </div>
        <div className="mt-6 flex justify-end mb-4 mx-4">
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || visitLoading || vitalsLoading || !hasAnyInput() || isReadOnly}
        className="ml-2 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] "
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {vitalsData && vitalsData.id ? 'Updating...' : 'Saving...'}
          </>
        ) : (
          <>{vitalsData && vitalsData.id ? 'Update & Next' : 'Save & Next'}</>
        )}
      </Button>
      </div>
      </div>
    </div>
  </CardContent>

      {/* Weight Graph Modal */}
      <Dialog open={weightGraphOpen} onOpenChange={setWeightGraphOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Weight History</DialogTitle>
            <DialogDescription>
              View the patient's weight history over time
            </DialogDescription>
          </DialogHeader>
          <WeightGraph
            patientId={patientId}
            isOpen={weightGraphOpen}
            onClose={() => setWeightGraphOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
