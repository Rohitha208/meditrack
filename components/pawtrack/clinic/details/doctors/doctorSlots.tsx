'use client'

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast"
import { useGetDoctorSlots } from "@/queries/doctorSlots/get-doctorSlots";
import { useGetUserById } from "@/queries/users/get-user-by-id";
import { User } from "@/queries/users/get-users";
import { Loader2 } from "lucide-react";
import { DoctorSlot } from "@/queries/doctorSlots/get-doctorSlots";
import { useUpdateUserSlots } from "@/queries/users/update-user-slots";
import { useGetAvailableSlotsByUserId } from "@/queries/users/get-availabelSlots-by-userId";
import { toast } from "sonner";

interface DoctorSlotsProps {
  doctorId: string;
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
  // ... other user fields
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

export default function DoctorSlotsManager({ doctorId, clinicId }: DoctorSlotsProps) {
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
  
  // Fetch all slots and user data
  const { data: slots, isLoading: isSlotsLoading } = useGetDoctorSlots();
  const { data: userData, isLoading: isUserLoading, refetch: refetchUser } = useGetUserById(doctorId);
  const { data: availableSlots, isLoading: isAvailableSlotsLoading, refetch: refetchAvailableSlots } = useGetAvailableSlotsByUserId(doctorId, clinicId || '', undefined, !!doctorId && !!clinicId);

  // Process user doctor slots when data changes
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
        const allAssigned: Array<{ id: string; clinicId?: string }> = await res.json();
        const otherClinicAssignedIds = new Set<string>(
          (allAssigned || [])
            .filter((s) => s?.clinicId && clinicId && s.clinicId !== clinicId)
            .map((s) => s.id)
        );
        setDisabledSlotIds(otherClinicAssignedIds);
      } catch (e) {
        setDisabledSlotIds(new Set<string>());
      }
    };
    loadAllAssignments();
  }, [doctorId, clinicId, availableSlots]);

  // Process slots on data load
  useEffect(() => {
    if (slots) {
      // Organize slots by day
      const sortedSlotsByDay: Record<string, DoctorSlot[]> = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      };
      
      // Organize all slots by day
      slots.forEach(slot => {
        const day = slot.day.toLowerCase();
        if (sortedSlotsByDay[day]) {
          sortedSlotsByDay[day].push(slot);
        }
      });
      
      // Sort slots for each day by start time
      Object.keys(sortedSlotsByDay).forEach(day => {
        sortedSlotsByDay[day].sort((a, b) => {
          return a.startTime.localeCompare(b.startTime);
        });
      });
      
      setSlotsByDay(sortedSlotsByDay);
    }
  }, [slots]);

  const formatTime = (time: string): string => {
    // Handle the exact format seen in the response (like "10:00:00")
    if (time && time.length === 8 && time.includes(':00:00')) {
      return time.substring(0, 5); // Return "10:00" from "10:00:00"
    } else if (time && time.length === 8 && time.includes(':30:00')) {
      return time.substring(0, 5); // Return "10:30" from "10:30:00"
    } else if (time && time.length === 8) {
      return time.substring(0, 5); // Generic case for HH:MM:SS format
    }
    return time || '';
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
      // Update user slots using the dedicated endpoint
      await updateSlots.mutateAsync({
        userId: doctorId,
        clinicId: clinicId || '',
        slotIds: selectedSlotIds
      });
      
      toast("Doctor schedule has been updated successfully");
      
      // Refresh user data to get updated slots
      await refetchUser();
      await refetchAvailableSlots();
      
    } catch (error) {
      console.error("Error updating doctor schedule:", error);
      toast("Failed to update doctor schedule");
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
          <p className="text-muted-foreground">Manage available time slots for each day of the week</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-4 grid grid-cols-7">
            {daysOfWeek.map(day => (
              <TabsTrigger key={day.id} value={day.id} className="text-xs sm:text-sm">
                {day.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {daysOfWeek.map(day => (
            <TabsContent key={day.id} value={day.id} className="pt-4">
              <div className="mb-4">
                <h3 className="text-lg font-medium">{day.label} Slots</h3>
              </div>
              
              {slotsByDay[day.id].length === 0 ? (
                <p className="text-sm text-muted-foreground">No time slots available for {day.label}.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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