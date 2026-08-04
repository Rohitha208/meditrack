'use client'
import Room from "@/components/pawtrack/clinic/details/rooms";
import { useParams } from "next/navigation";
 
export default function RoomPage() {
    const params = useParams();
    const clinicId = params.id as string;
 
    return (
        <div>
            <Room clinicId={clinicId} />
        </div>
    )
}  