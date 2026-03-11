"use client"
import { useContext, useState } from "react";
import { PatientDashboardContext } from "@/components/patientDashboard/PatientDashboardProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, MapPin, Plus, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import PatientAppointmentForm from "@/components/patients/patient-appointment-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import RatingForm from "@/components/appointments/rating-form";
import { useGetRatings } from "@/queries/rating/get-ratings";

export default function AppointmentsPage() {
  const { appointments, isAppointmentsLoading, appointmentsError, pets, isClient, clientId, refetchAppointments } = useContext(PatientDashboardContext);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [shouldRefetch, setShouldRefetch] = useState(false);

  // Helper functions
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

  // Helper function to format time from HH:MM:SS to HH:MM format
  const formatTimeString = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [ratingAppointmentId, setRatingAppointmentId] = useState<string | null>(null);
  const { data: ratings = [], refetch: refetchRatings } = useGetRatings(true);
  const ratingsByAppointment = new Map(ratings.map(r => [r.appointmentId, r]));

  // Called when the modal closes
  const handleClose = (wasSuccess?: boolean) => {
    setIsAppointmentFormOpen(false);
    if (wasSuccess) {
      refetchAppointments();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center md:mb-4">
        <h2 className="text-xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">My Appointments</h2>
        <div className="flex flex-col items-center gap-2">
          <Button className="theme-button text-white" disabled={pets.length === 0} onClick={() => setIsAppointmentFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden md:flex">New Appointment</span>
          </Button>
          {pets.length === 0 && <span className="text-red-500 dark:text-red-400 text-xs"> (No pets registered)</span>}
        </div>
      </div>
      <Card className="bg-white dark:bg-slate-900 shadow-lg border border-[#1E3D3D]/20 dark:border-[#1E3D3D]/20">
        <CardHeader>
          <CardTitle className="text-[#1E3D3D] dark:text-[#D2EFEC]">All Appointments</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">View and manage your pet appointments</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-y-auto">
          <div className="space-y-4">
            {isAppointmentsLoading ? (
              <div className="text-gray-600 dark:text-gray-400">Loading appointments...</div>
            ) : appointmentsError ? (
              <div className="text-red-600 dark:text-red-400">Error loading appointments.</div>
            ) : appointments.length === 0 ? (
              <div className="text-gray-600 dark:text-gray-400">No appointments found.</div>
            ) : (
              appointments.map((appointment: any) => (
                <div key={appointment.id} className="border border-[#1E3D3D]/20 dark:border-[#1E3D3D]/20 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-slate-800">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-[#D2EFEC] dark:bg-[#1E3D3D] text-[#1E3D3D] dark:text-[#D2EFEC]">
                          {appointment.patient?.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-[#1E3D3D] dark:text-[#D2EFEC]">{appointment.patient?.name}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            appointment.status === 'confirmed' || 
                            appointment.status === 'completed' ||
                            appointment.status === 'scheduled' ?
                            'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                            appointment.status === 'in_progress' || appointment.status === 'In_progress' ?
                            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                            'bg-[#D2EFEC] dark:bg-[#1E3D3D]/30 text-[#1E3D3D] dark:text-[#D2EFEC]'
                            }`}>
                            {appointment.status?.charAt(0).toUpperCase() + appointment.status?.slice(1).replace('_', ' ') || "Requested"}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 font-medium">{appointment.appointmentType?.name}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-[#1E3D3D] dark:text-[#D2EFEC]" />
                            {isClient && appointment.appointmentDate ? formatDate(appointment.appointmentDate) : ""}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-[#1E3D3D] dark:text-[#D2EFEC]" />
                            {isClient && appointment.appointmentTimeFrom && appointment.appointmentTimeTo ?
                              `${formatTimeString(appointment.appointmentTimeFrom)} - ${formatTimeString(appointment.appointmentTimeTo)}` :
                              appointment?.roomSlot?.startTime && appointment?.roomSlot?.endTime ?
                                `${formatTimeString(appointment.roomSlot.startTime)} - ${formatTimeString(appointment.roomSlot.endTime)}` :
                                "Time not set"
                            }
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4 text-[#1E3D3D] dark:text-[#D2EFEC]" />
                            {appointment?.veterinarian ? `${appointment?.veterinarian?.firstName} ${appointment?.veterinarian?.lastName}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="h-4 w-4 text-[#1E3D3D] dark:text-[#D2EFEC]" />
                          {appointment.clinic?.name}
                        </div>
                        {/* Rating stars under clinic name (if rated) */}
                        {(() => {
                          const existing = ratingsByAppointment.get(appointment.id);
                          if (!existing || !existing.rating) return null;
                          return (
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(Math.max(1, Math.min(5, existing.rating)))].map((_, i) => (
                                <Star key={i} className="h-4 w-4 text-yellow-500 dark:text-yellow-400" fill="currentColor" />
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    {/* Rate button for completed and not-yet-rated */}
                    {isClient && appointment.status === 'completed' && !ratingsByAppointment.get(appointment.id) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRatingAppointmentId(appointment.id);
                          setIsRatingOpen(true);
                        }}
                        className="border-[#1E3D3D] dark:border-[#D2EFEC] text-[#1E3D3D] dark:text-[#D2EFEC] hover:bg-[#1E3D3D] hover:text-white dark:hover:bg-[#D2EFEC] dark:hover:text-[#1E3D3D]"
                      >
                        Rate
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      {/* Modal for new appointment */}
      <PatientAppointmentForm
        isOpen={isAppointmentFormOpen}
        onClose={handleClose}
        clientId={clientId}
        patients={pets}
      />
      {/* Rating sheet */}
      {ratingAppointmentId && (
        <RatingForm
          appointmentId={ratingAppointmentId}
          open={isRatingOpen}
          onClose={() => setIsRatingOpen(false)}
          onSubmitted={() => {
            refetchRatings()
            refetchAppointments()
          }}
        />
      )}
    </div>
  );
}
