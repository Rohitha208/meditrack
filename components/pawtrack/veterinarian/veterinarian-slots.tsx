'use client'

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useGetDoctorSlots } from "@/queries/doctorSlots/get-doctorSlots";
import { useGetUserById } from "@/queries/users/get-user-by-id";
import { useUpdateUserSlots } from "@/queries/users/update-user-slots";
import { useGetClinic } from "@/queries/clinic/get-clinic";
import { Loader2 } from "lucide-react";
import { DoctorSlot } from "@/queries/doctorSlots/get-doctorSlots";
import { cn } from "@/lib/utils";
import { useGetAvailableSlotsByUserId } from "@/queries/users/get-availabelSlots-by-userId";
import { toast } from "sonner"

interface VeterinarianSlotsProps {
  doctorId: string; // Remove optional operator if this should never be undefined
  clinicId?: string;
}

interface UserDoctorSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  doctorSlots: UserDoctorSlot[];
}

const daysOfWeek = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" }
];

export default function VeterinarianSlots({ doctorId, clinicId: initialClinicId }: VeterinarianSlotsProps) {
  const [activeTab, setActiveTab] = useState("monday");
  const [slotsByDay, setSlotsByDay] = useState<Record<string, DoctorSlot[]>>({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  });
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [disabledSlotIds, setDisabledSlotIds] = useState<Set<string>>(new Set<string>());

  const { data: slots, isLoading: isSlotsLoading } = useGetDoctorSlots();
  
  const { data: userData, isLoading: isUserLoading, refetch: refetchUser } = useGetUserById(doctorId);
  const { data: availableSlots, isLoading: isAvailableSlotsLoading, refetch: refetchAvailableSlots } = useGetAvailableSlotsByUserId(doctorId, initialClinicId || '', undefined, !!doctorId && !!initialClinicId);

  useEffect(() => {
    if (availableSlots) {
      const slotIds = availableSlots.map((slot: any) => slot.id);
      setSelectedSlotIds(slotIds);
    }
  }, [availableSlots]);

  useEffect(() => {
    const loadAllAssignments = async () => {
      try {
        if (!doctorId) return;
        const res = await fetch(`/api/user/${doctorId}/available-slots`);
        if (!res.ok) {
          setDisabledSlotIds(new Set<string>());
          return;
        }
        const allAssigned = await res.json();
        const allIds = new Set<string>((allAssigned || []).map((s: any) => s.id));
        const currentIds = new Set<string>((availableSlots || []).map((s: any) => s.id));
        const otherClinicIds = new Set<string>(Array.from(allIds).filter((id) => !currentIds.has(id)));
        setDisabledSlotIds(otherClinicIds);
      } catch (e) {
        setDisabledSlotIds(new Set<string>());
      }
    };
    loadAllAssignments();
  }, [doctorId, availableSlots]);

  useEffect(() => {
    if (slots) {
      const groupedSlots = slots.reduce((acc: Record<string, DoctorSlot[]>, slot: DoctorSlot) => {
        const day = slot.day.toLowerCase();
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(slot);
        return acc;
      }, {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      });

      Object.keys(groupedSlots).forEach(day => {
        groupedSlots[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
      });

      setSlotsByDay(groupedSlots);
    }
  }, [slots]);

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  const handleSlotClick = (slot: DoctorSlot) => {
    setSelectedSlotIds(prev => {
      const isSelected = prev.includes(slot.id);
      
      if (isSelected) {
        return prev.filter(id => id !== slot.id);
      } else {
        return [...prev, slot.id];
      }
    });
  };

  const updateSlots = useUpdateUserSlots();

  const handleSave = async () => {
    setIsUpdating(true);
    
    try {
      await updateSlots.mutateAsync({
        userId: doctorId,
        clinicId: initialClinicId || '',
        slotIds: selectedSlotIds
      });
      
      toast.success("Schedule updated", {
        description: "Doctor schedule has been updated successfully",
      });
      
      await refetchUser(); // Refresh user data to get updated slots
      await refetchAvailableSlots(); // Refresh available slots after update
      
    } catch (error) {
      console.error("Error updating doctor schedule:", error);
      toast.error("Update failed", {
        description: "Failed to update doctor schedule",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const isSlotSelected = (slotId: string): boolean => {
    return selectedSlotIds.includes(slotId);
  };

  if (isSlotsLoading || isUserLoading || isAvailableSlotsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading schedule...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h1 className="text-lg font-bold">Schedule</h1>
          <p className="text-sm">Available time slots for each day of the week</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-4 grid grid-cols-7">
            {daysOfWeek.map(day => (
              <TabsTrigger key={day.id} value={day.id} className="data-[state=active]:theme-text-primary data-[state=active]:border-b-2 data-[state=active]:border-[var(--theme-primary)]">
                {day.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {daysOfWeek.map(day => (
            <TabsContent key={day.id} value={day.id} className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{day.label} Slots</h3>
              </div>
              
              {slotsByDay[day.id].length === 0 ? (
                <p className="text-sm text-muted-foreground">No time slots available for {day.label}.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
                  {slotsByDay[day.id].map((slot) => {
                    const isSelected = isSlotSelected(slot.id);
                    const isDisabled = disabledSlotIds.has(slot.id);
                    return (
                      <Button
                        key={slot.id}
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => handleSlotClick(slot)}
                        className="text-sm h-10"
                        disabled={isDisabled}
                        title={isDisabled ? "This slot is assigned in another clinic" : undefined}
                      >
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </Button>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isUpdating}
            className="min-w-[100px]"
          >
            {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {isUpdating ? "Updating..." : "Update Schedule"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
