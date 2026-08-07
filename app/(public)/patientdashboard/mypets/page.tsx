"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"

const MyPetsPage = dynamic(() => import("@/components/patientDashboard/mypets"), {
  ssr: false,
})

export default function MyPets() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MyPetsPage />
    </Suspense>
  )
}
