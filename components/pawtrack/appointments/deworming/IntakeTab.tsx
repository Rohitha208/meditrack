import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCreateDewormingVisit } from "@/queries/deworming/intake/create-deworming-visit";
import { useUpdateDewormingVisit } from "@/queries/deworming/intake/update-deworming-visit";
import { useGetAppointmentById } from "@/queries/appointment/get-appointment-by-id";
import { useGetDewormingVisitByVisitId } from "@/queries/deworming/intake/get-deworming-visit-by-visit-id";
import { DatePicker } from "@/components/ui/datePicker";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label"
import { TrendingUp } from "lucide-react";
import { useGetVisitByAppointmentId } from "@/queries/visit/get-visit-by-appointmentId";


interface IntakeTabProps {
  patientId: string;
  appointmentId: string;
  visitId?: string;
  onComplete?: (completed: boolean) => void;
  onNext?: () => void;
  isCompleted?: boolean;
  setWeightGraphOpen?: (open: boolean) => void;
}

export default function IntakeTab({
  patientId,
  appointmentId,
  visitId,
  onComplete,
  onNext,
  isCompleted = false,
  setWeightGraphOpen = () => { }
}: IntakeTabProps) {
  const { toast } = useToast()
  const [weight, setWeight] = useState("");
  const [lastDeworming, setLastDeworming] = useState<Date | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [temperature, setTemperature] = useState("");
  const [appetite, setAppetite] = useState("");
  const [currentMeds, setCurrentMeds] = useState("");
  const [sampleCollected, setSampleCollected] = useState(false);
  const [sampleImage, setSampleImage] = useState<File | null>(null);
  const [sampleImageUrl, setSampleImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: visitData, isLoading: visitLoading } = useGetVisitByAppointmentId(appointmentId);
  const { data: appointmentData } = useGetAppointmentById(appointmentId);
  const isReadOnly = appointmentData?.status === "completed"

  const { data, isLoading, isError, refetch } = useGetDewormingVisitByVisitId(visitData?.id || "", !!visitData?.id);
  const createMutation = useCreateDewormingVisit();
  const updateMutation = useUpdateDewormingVisit();

  const isIntakeCompleted = () => {
    return (
      weight.trim() !== "" &&
      lastDeworming !== null &&
      symptoms.trim() !== "" &&
      temperature.trim() !== "" &&
      appetite.trim() !== "" &&
      currentMeds.trim() !== ""
    );
  };


  // Notify parent component when data is loaded
  useEffect(() => {
    if (data && onComplete) {
      onComplete(!!data.isCompleted);
    }
  }, [data, onComplete]);

  useEffect(() => {
    if (data) {
      setWeight(data.weightKg?.toString() || "");
      if (data.lastDewormingDate) {
        setLastDeworming(new Date(data.lastDewormingDate));
      }
      setSymptoms(data.symptomsNotes || "");
      setTemperature(data.temperatureC?.toString() || "");
      setAppetite(data.appetiteFeedingNotes || "");
      setCurrentMeds(data.currentMedications || "");
      setSampleCollected(!!data.isStoolSampleCollected);
    }
  }, [data]);

  const handleDateChange = (date: Date | null) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part for accurate date comparison

    if (date && date > today) {
      toast({
        title: "Error",
        description: 'Last deworming date cannot be in the future',
        variant: "destructive"
      });
      setLastDeworming(null);
      return;
    }
    setLastDeworming(date);
  };

  const handleSave = async () => {
    if (!visitData?.id) {
      toast({
        title: "Error",
        description: "No visit data found for this appointment",
        variant: "destructive"
      });
      return;
    }

    // Validate last deworming date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (lastDeworming && lastDeworming > today) {
      toast({
        title: "Error",
        description: 'Last deworming date cannot be in the future',
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        visitId: visitData.id,
        weightKg: weight ? parseFloat(weight) : undefined,
        lastDewormingDate: lastDeworming ? lastDeworming.toISOString().split('T')[0] : undefined,
        symptomsNotes: symptoms || undefined,
        temperatureC: temperature ? parseFloat(temperature) : undefined,
        appetiteFeedingNotes: appetite || undefined,
        currentMedications: currentMeds || undefined,
        isStoolSampleCollected: sampleCollected,
        isCompleted: isIntakeCompleted(),
      };

      if (data?.id) {
        await updateMutation.mutateAsync({ 
          id: data.id, 
          ...payload 
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      
      await refetch();
      
      if (onComplete) {
        onComplete(isIntakeCompleted());
      }
      const operation = data?.id ? 'updated' : 'created';
      
      toast({
        title: "Success",
        description: `Intake information ${operation} successfully`,
        variant: "success"
      });
      
      if (onNext && isIntakeCompleted()) {
        onNext();
      }
    } catch (error: any) {
      console.error(error);
      const currentTime = new Date().toLocaleTimeString();
      toast({
        title: "Error",
        description: `Failed to save intake information at ${currentTime}: ${error.message || "Unknown error"}`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSampleImage(file);
    if (file) {
      setSampleImageUrl(URL.createObjectURL(file));
    } else {
      setSampleImageUrl(null);
    }
  };

  const hasExistingData = !!data?.id;

  return (
    <Card className="relative">
      <CardContent className="p-0">
      <div className="h-[calc(100vh-23rem)] overflow-y-auto p-6">
        <div className="space-y-4">
          {isError && (
            <div className="p-2 bg-red-50 text-red-600 rounded mb-4">
              Error loading intake data. You can still create a new record.
            </div>
          )}

          <div>
            <Label id="weight">Weight (kg)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="weight"
                type="number"
                step="0.01"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="Enter weight in kg"
                disabled={isReadOnly}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeightGraphOpen?.(true)}
                className="flex items-center gap-1"
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label id="lastDeworming">Last Deworming Date</Label>
            <DatePicker
              value={lastDeworming}
              onChange={handleDateChange}
              placeholder="Select last deworming date"
              className="w-full"
              disabled={isReadOnly}
              maxDate={new Date()}
            />
          </div>
          <div>
            <Label id="symptoms">Symptoms / Notes</Label>
            <Textarea
              id="symptoms"
              value={symptoms}
              onChange={e => setSymptoms(e.target.value)}
              placeholder="Describe any symptoms or relevant notes"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label id="temperature">Temperature (°C)</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              value={temperature}
              onChange={e => setTemperature(e.target.value)}
              placeholder="Enter temperature in °C"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label id="appetite">Appetite / Feeding Notes</Label>
            <Textarea
              id="appetite"
              value={appetite}
              onChange={e => setAppetite(e.target.value)}
              placeholder="Describe appetite or feeding changes"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label id="currentMeds">Current Medications</Label>
            <Textarea
              id="currentMeds"
              value={currentMeds}
              onChange={e => setCurrentMeds(e.target.value)}
              placeholder="List any current medications"
              disabled={isReadOnly}
            />
          </div>
          

          {(createMutation.isError || updateMutation.isError) && (
            <div className="text-red-500 text-sm mt-2">Error saving data.</div>
          )}

          {(createMutation.isSuccess || updateMutation.isSuccess) && (
            <div className="text-green-600 text-sm mt-2">Saved successfully!</div>
          )}
        </div>
        </div>
        <div className="mt-6 flex justify-end mb-4 mx-4">
            <Button
              onClick={handleSave}
              disabled={isSubmitting || isReadOnly || !isIntakeCompleted()}
              className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
            >
              {hasExistingData ? "Update & Next" : "Save & Next"}
            </Button>
          </div>
      </CardContent>

    </Card>
  );
}
