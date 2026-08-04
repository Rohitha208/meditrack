"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Package } from "lucide-react"
import { useGetAppointmentByPatientId } from "@/queries/appointment/get-appointment-by-patient-id"
import PatientInformation from "@/components/pawtrack/appointments/Patient-Information"

export default function PatientOverview({ patient, patientId }: { patient: any , patientId: string }) {
  const { data: allAppointments, isLoading } = useGetAppointmentByPatientId(patientId);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  // Filter only completed appointments
  const appointments = allAppointments?.filter((appointment: any) => 
    appointment.status?.toLowerCase() === "completed"
  );

  const handleViewAppointment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
  };

  const handleClosePatientInfo = () => {
    setSelectedAppointmentId(null);
  };

  // Helper function to get appointment type display name
  const getAppointmentTypeDisplay = (appointmentType: any): string => {
    if (!appointmentType) return 'Unknown';
    
    // If appointmentType is an object with a name property, use that
    if (typeof appointmentType === 'object' && appointmentType.name) {
      return appointmentType.name;
    }
    
    // Otherwise if it's a string, use it directly
    if (typeof appointmentType === 'string') {
      return appointmentType;
    }
    
    // Fallback
    return 'Unknown';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="bg-white dark:bg-slate-800 shadow-sm md:col-span-2 lg:col-span-3">
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Visits</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Loading appointments...</td>
                  </tr>
                ) : appointments?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No completed visits found</td>
                  </tr>
                ) : (
                  appointments?.map((appointment: any) => (
                    <tr key={appointment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {new Date(appointment.appointmentDate).toLocaleDateString()} {appointment.startTime}  
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {getAppointmentTypeDisplay(appointment.appointmentType)} - {appointment.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {`${appointment?.veterinarian?.firstName} ${appointment?.veterinarian?.lastName}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleViewAppointment(appointment.id)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {/* Owner Information */}
      <Card className="bg-white dark:bg-slate-800 shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Owner Information</h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Name:</p>
              <p className="text-gray-900 dark:text-white">{`${patient?.clientFirstName} ${patient?.clientLastName}`}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Phone:</p>
              <p className="text-gray-900 dark:text-white">{patient?.clientPhonePrimary}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email:</p>
              <p className="text-gray-900 dark:text-white">{patient?.clientEmail}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Address:</p>
              <p className="text-gray-900 dark:text-white">{patient?.clientAddressLine1} {patient?.clientAddressLine2}</p>
              <p className="text-gray-900 dark:text-white">{patient?.clientCity} {patient?.clientState}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts & Warnings */}
      {/* <Card className="bg-white dark:bg-slate-800 shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alerts & Warnings</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-red-800 dark:text-red-300">
              <p className="font-semibold">ALLERGIC TO PENICILLIN</p>
            </div>
            <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-amber-800 dark:text-amber-300">
              <p>Rabies vaccination due in 30 days</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-blue-800 dark:text-blue-300">
              <p>Annual check-up due next month</p>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Active Care Plans */}
      {/* <Card className="bg-white dark:bg-slate-800 shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Care Plans</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <p className="font-medium text-gray-900 dark:text-white">Annual Wellness Plan</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">2/4 services completed</p>
              </div>
              <Progress value={50} className="h-2 theme-accent" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Next: Dental Cleaning (June 15)</p>
            </div>
            <Button
              variant="outline"
              className="w-full mb-2 flex items-center justify-center"
              onClick={() => (window.location.href = "/inventory")}
            >
              <Package className="mr-2 h-4 w-4" /> Check Medication Inventory
            </Button>
            <Button className="w-full theme-button text-white">View Plan Details</Button>
          </div>
        </CardContent>
      </Card> */}

      {selectedAppointmentId && (
        <PatientInformation
          patientId={patientId}
          appointmentId={selectedAppointmentId}
          onClose={handleClosePatientInfo}
        />
      )}
    </div>
  )
} 