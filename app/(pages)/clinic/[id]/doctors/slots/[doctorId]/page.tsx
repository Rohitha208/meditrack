'use client'

import DoctorSlotsManager from "@/components/pawtrack/clinic/details/doctors/doctorSlots";
import { useGetUserById } from "@/queries/users/get-user-by-id";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function DoctorSlotsPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params?.doctorId as string;
  const clinicId = params?.id as string;
  const { data: doctor, isLoading } = useGetUserById(doctorId);

  const handleBack = () => {
    router.back();
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          className="mr-4 h-8 w-8" 
          onClick={handleBack}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {isLoading ? (
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Loading doctor information...</span>
            </div>
          </div>
        ) : (
          <h1 className="text-2xl font-bold">
            {doctor ? `${doctor.firstName} ${doctor.lastName}'s Schedule` : "Doctor Schedule"}
          </h1>
        )}
      </div>

      <DoctorSlotsManager doctorId={doctorId} clinicId={clinicId} />
    </div>
  );
} 