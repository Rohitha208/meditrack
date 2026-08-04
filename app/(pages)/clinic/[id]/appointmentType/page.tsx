'use client'
import AppointmentTypeComponent from "@/components/pawtrack/clinic/details/appointmentType";
import { useParams } from "next/navigation";
 
export default function AppointmentTypePage() {
    // const params = useParams();
    // const clinicId = params.id as string;
 
    return (
        <div>
            <AppointmentTypeComponent />
        </div>
    )
}
