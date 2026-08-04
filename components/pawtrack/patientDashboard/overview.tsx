"use client"
import { useContext } from "react";
import { PatientDashboardContext } from "@/components/pawtrack/patientDashboard/PatientDashboardProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays, PawPrint, Heart, Building, Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function OverviewPage() {
  const { pets, petsLoading, petsError, appointments, isAppointmentsLoading, appointmentsError, isClient } = useContext(PatientDashboardContext);

  // Helper functions for formatting
  const formatDate = (dateString: string) => {
    if (!isClient) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return '';
    }
  };
  const calculateAge = (dateOfBirth: string) => {
    if (!isClient || !dateOfBirth) return 'Unknown';
    try {
      return `${Math.floor((new Date().getTime() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years`;
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white dark:bg-slate-900 shadow-lg border border-[#1E3D3D]/20 dark:border-[#1E3D3D]/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#D2EFEC] dark:bg-[#1E3D3D] rounded-full">
                <CalendarDays className="h-6 w-6 text-[#1E3D3D] dark:text-[#D2EFEC]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Upcoming Appointments</p>
                <p className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">
                  {appointments.filter((apt: any) => apt.status === "upcoming").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 shadow-lg border border-[#1E3D3D]/20 dark:border-[#1E3D3D]/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <PawPrint className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Pets</p>
                <p className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{pets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 shadow-lg border border-[#1E3D3D]/20 dark:border-[#1E3D3D]/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#D2EFEC] dark:bg-[#1E3D3D] rounded-full">
                <Heart className="h-6 w-6 text-[#1E3D3D] dark:text-[#D2EFEC]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Visits</p>
                <p className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">
                  {appointments.filter((apt: any) => apt.status === "completed").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 shadow-lg border border-[#1E3D3D]/20 dark:border-[#1E3D3D]/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Building className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Preferred Clinic</p>
                <p className="text-sm font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">PawTrack Veterinary</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ">
        <Card className="bg-white dark:bg-slate-900 shadow-lg border border-[#1E3D3D]/20 dark:border-[#1E3D3D]/20 flex flex-col min-h-[calc(100vh-14rem)] overflow-y-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1E3D3D] dark:text-[#D2EFEC]">
              <Calendar className="h-5 w-5" />
              Recent Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4">
            {isAppointmentsLoading ? (
              <div className="text-gray-600 dark:text-gray-400">Loading appointments...</div>
            ) : appointmentsError ? (
              <div className="text-red-600 dark:text-red-400">Error loading appointments.</div>
            ) : appointments.length === 0 ? (
              <div className="text-gray-600 dark:text-gray-400">No appointments found.</div>
            ) : (
              appointments.slice(0, 3).map((appointment: any) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-[#1E3D3D]/10 dark:border-[#1E3D3D]/10">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[#D2EFEC] dark:bg-[#1E3D3D] text-[#1E3D3D] dark:text-[#D2EFEC]">
                        {appointment.patient?.name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-[#1E3D3D] dark:text-[#D2EFEC]">{appointment.patient?.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.appointmentType?.name || "Unknown"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#1E3D3D] dark:text-[#D2EFEC]">
                      {isClient && appointment.appointmentDate ? formatDate(appointment.appointmentDate) : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 shadow-lg border border-[#1E3D3D]/20 dark:border-[#1E3D3D]/20 flex flex-col min-h-[calc(100vh-14rem)] overflow-y-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1E3D3D] dark:text-[#D2EFEC]">
              <PawPrint className="h-5 w-5" />
              My Pets
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4">
            {petsLoading ? (
              <div className="text-gray-600 dark:text-gray-400">Loading pets...</div>
            ) : petsError ? (
              <div className="text-red-600 dark:text-red-400">Error loading pets.</div>
            ) : pets.length === 0 ? (
              <div className="text-gray-600 dark:text-gray-400">No pets found.</div>
            ) : (
              pets.map((pet: any) => (
                <div key={pet.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-[#1E3D3D]/10 dark:border-[#1E3D3D]/10">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-[#D2EFEC] dark:bg-[#1E3D3D] text-[#1E3D3D] dark:text-[#D2EFEC]">
                      {pet.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-[#1E3D3D] dark:text-[#D2EFEC]">{pet.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {pet.breed} • {isClient && pet.dateOfBirth ? calculateAge(pet.dateOfBirth) : "Unknown age"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{pet.weightKg} kg</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
