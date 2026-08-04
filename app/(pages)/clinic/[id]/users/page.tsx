'use client'
import React from 'react'
import UserComponent from '@/components/pawtrack/clinic/details/users'
import { useParams } from "next/navigation";

export default function UserPage() {
    const params = useParams();
    const clinicId = params.id as string;

    return (
        <div>
            <UserComponent clinicId={clinicId} />
        </div>
    )
}   