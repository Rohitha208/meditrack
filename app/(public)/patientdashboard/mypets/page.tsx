//  import MyPetsPage from "@/components/pawtrack/patientDashboard/mypets";
import dynamic from "next/dynamic";
import { Suspense } from "react";
 
const MyPetsPage = dynamic(() => import("@/components/pawtrack/patientDashboard/mypets"))
 
 
export default function MyPets() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MyPetsPage />
    </Suspense>
  )
}