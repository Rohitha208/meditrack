// "use client"

// import { useState, useEffect } from "react"
// import { Search, Plus, Edit } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Badge } from "@/components/ui/badge"
// import { Avatar, AvatarFallback } from "@/components/ui/avatar"
// import PatientOverview from "./patient-overview"
// import PatientMedical from "./patient-medical"
// import PatientVisits from "./patient-visits"
// import PatientLabResults from "./patient-lab-results"
// import PatientPrescriptions from "./patient-prescriptions"
// import PatientBilling from "./patient-billing"
// import PatientFiles from "./patient-files"
// import { PatientsScreen } from "./patients-screen"
// import { PatientDetailScreen } from "./patient-detail-screen"
// import { useGetPatientById } from "@/queries/patients/get-patient-by-id"

// export { PatientsScreen, PatientDetailScreen }

// export default function PatientsMain() {
//   const [mounted, setMounted] = useState(false)
//   const [activeTab, setActiveTab] = useState("overview")

//   // Ensure we only access localStorage on the client side
//   useEffect(() => {
//     setMounted(true)
//   }, [])

//   // If not mounted yet, don't render to avoid hydration mismatch
//   if (!mounted) return null

//   const { data: patient, isLoading, isError } = useGetPatientById(patientId)

//   return (
//     <>
//       <div className="p-6">
//         {/* Search and Add Patient */}
//         <div className="flex items-center justify-between mb-6">
//           <div className="relative flex-1 max-w-3xl">
//             <Input
//               type="text"
//               placeholder="Search Patients..."
//               className="pl-4 pr-10 py-2 h-12 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg"
//             />
//             <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 transform -translate-y-1/2">
//               <Search className="h-5 w-5 text-gray-400" />
//             </Button>
//           </div>
//           <Button className="theme-button text-white h-12 ml-4">
//             <Plus className="mr-2 h-5 w-5" /> New Patient
//           </Button>
//         </div>

//         {/* Patient Profile */}
//         <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm mb-6 p-6">
//           <div className="flex flex-col md:flex-row items-start md:items-center">
//             <div className="flex items-center mb-4 md:mb-0">
//               <div className="relative mr-6">
//                 <Avatar className="h-24 w-24 bg-gray-200 dark:bg-slate-700">
//                   <AvatarFallback className="text-gray-400 dark:text-gray-500 text-lg">Pet Photo</AvatarFallback>
//                 </Avatar>
//               </div>
//               <div>
//                 <div className="flex items-center">
//                   <h1 className="text-2xl font-bold text-gray-900 dark:text-white mr-2">Max</h1>
//                   <span className="text-gray-500 dark:text-gray-400">#PAT-1234</span>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
//                   <div className="text-sm">
//                     <span className="text-gray-500 dark:text-gray-400">Species: </span>
//                     <span className="text-gray-900 dark:text-white">Dog</span>
//                   </div>
//                   <div className="text-sm">
//                     <span className="text-gray-500 dark:text-gray-400">Age: </span>
//                     <span className="text-gray-900 dark:text-white">5 years</span>
//                   </div>
//                   <div className="text-sm">
//                     <span className="text-gray-500 dark:text-gray-400">Weight: </span>
//                     <span className="text-gray-900 dark:text-white">30kg</span>
//                   </div>
//                   <div className="text-sm">
//                     <span className="text-gray-500 dark:text-gray-400">Breed: </span>
//                     <span className="text-gray-900 dark:text-white">Golden Retriever</span>
//                   </div>
//                   <div className="text-sm">
//                     <span className="text-gray-500 dark:text-gray-400">Sex: </span>
//                     <span className="text-gray-900 dark:text-white">Male (Neutered)</span>
//                   </div>
//                   <div className="text-sm">
//                     <span className="text-gray-500 dark:text-gray-400">Microchip: </span>
//                     <span className="text-gray-900 dark:text-white">985121054367893</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//             <div className="flex items-center ml-auto space-x-4">
//               <Badge className="bg-green-500 hover:bg-green-600 px-4 py-1.5 text-white">Active</Badge>
//               <Button className="theme-button text-white">
//                 <Edit className="mr-2 h-4 w-4" /> Edit Profile
//               </Button>
//             </div>
//           </div>
//         </div>

//         {/* Tabs */}
//         <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
//           <TabsList className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-0 h-auto w-full justify-start rounded-none mb-6">
//             <TabsTrigger
//               value="overview"
//               className={`px-6 py-3 rounded-none border-b-2 ${
//                 activeTab === "overview"
//                   ? "border-theme-primary text-theme-primary dark:text-white"
//                   : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
//               }`}
//             >
//               Overview
//             </TabsTrigger>
//             <TabsTrigger
//               value="medical"
//               className={`px-6 py-3 rounded-none border-b-2 ${
//                 activeTab === "medical"
//                   ? "border-theme-primary text-theme-primary dark:text-white"
//                   : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
//               }`}
//             >
//               Medical
//             </TabsTrigger>
//             <TabsTrigger
//               value="visits"
//               className={`px-6 py-3 rounded-none border-b-2 ${
//                 activeTab === "visits"
//                   ? "border-theme-primary text-theme-primary dark:text-white"
//                   : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
//               }`}
//             >
//               Visits
//             </TabsTrigger>
//             <TabsTrigger
//               value="lab-results"
//               className={`px-6 py-3 rounded-none border-b-2 ${
//                 activeTab === "lab-results"
//                   ? "border-theme-primary text-theme-primary dark:text-white"
//                   : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
//               }`}
//             >
//               Lab Results
//             </TabsTrigger>
//             <TabsTrigger
//               value="prescriptions"
//               className={`px-6 py-3 rounded-none border-b-2 ${
//                 activeTab === "prescriptions"
//                   ? "border-theme-primary text-theme-primary dark:text-white"
//                   : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
//               }`}
//             >
//               Prescriptions
//             </TabsTrigger>
//             <TabsTrigger
//               value="billing"
//               className={`px-6 py-3 rounded-none border-b-2 ${
//                 activeTab === "billing"
//                   ? "border-theme-primary text-theme-primary dark:text-white"
//                   : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
//               }`}
//             >
//               Billing
//             </TabsTrigger>
//             <TabsTrigger
//               value="files"
//               className={`px-6 py-3 rounded-none border-b-2 ${
//                 activeTab === "files"
//                   ? "border-theme-primary text-theme-primary dark:text-white"
//                   : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
//               }`}
//             >
//               Files
//             </TabsTrigger>
//           </TabsList>

//           <TabsContent value="overview">
//             <PatientOverview patient={Patient}/>
//           </TabsContent>
//           <TabsContent value="medical">
//             <PatientMedical />
//           </TabsContent>
//           <TabsContent value="visits">
//             <PatientVisits />
//           </TabsContent>
//           <TabsContent value="lab-results">
//             <PatientLabResults />
//           </TabsContent>
//           <TabsContent value="prescriptions">
//             <PatientPrescriptions />
//           </TabsContent>
//           <TabsContent value="billing">
//             <PatientBilling />
//           </TabsContent>
//           <TabsContent value="files">
//             <PatientFiles />
//           </TabsContent>
//         </Tabs>
//       </div>
//     </>
//   )
// } 

export { default as NearestClinicMap } from './nearest-clinic-map'; 