'use client'
import React from 'react'
import DoctorComponent from '@/components/pawtrack/clinic/details/doctors'
import { useParams } from "next/navigation";

export default function DoctorPage() {
    const params = useParams();
    const clinicId = params.id as string;

    return (
        <div>
            <DoctorComponent clinicId={clinicId} />
        </div>
    )
}   