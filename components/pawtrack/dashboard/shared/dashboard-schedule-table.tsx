"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, Eye, Check, X, Calendar, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useApproveClientRegistration } from "@/queries/clientRegistration/create-approve"
import { useGetClientRegistrationById } from "@/queries/clientRegistration/get-registration-by-id"
import { useGetPendingClientRegistrations } from "@/queries/clientRegistration/get-registration-pending"
import { toast } from "@/hooks/use-toast"
import ApproveAppointment from "@/components/pawtrack/appointments/approve-appointment"
import { useGetAppointments } from "@/queries/appointment/get-appointment"
import { useUpdateAppointment } from "@/queries/appointment/update-appointment"
import { notificationService } from "@/services/Notification/notificationService";
import { useRootContext } from "@/context/RootContext"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"

interface Appointment {
  startTime?: string;
  appointmentTimeFrom?: string;
  appointmentTimeTo?: string;
  roomSlot?: {
    startTime?: string;
  };
  patient?: { name?: string; species?: string } | string;
  reason?: string;
  status?: string;
}

interface DashboardScheduleTableProps {
  appointments: Appointment[];
  pendingRegistrations?: any[]; // Add prop for pending registrations
  registeredAppointments?: any[]; // Registered/pending appointments queue
  onApproveAppointment?: (appointmentId: string) => void; // Accept callback
}

export const DashboardScheduleTable = ({
  appointments,
  pendingRegistrations = [],
  onApproveAppointment,
}: DashboardScheduleTableProps) => {
  // State for handling registration details
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  // State for ApproveAppointment drawer
  const [approveDrawerOpen, setApproveDrawerOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  // Mutations and queries
  const approveMutation = useApproveClientRegistration();
  const updateAppointmentMutation = useUpdateAppointment({
    onSuccess: () => {
      toast({
        title: "Appointment Rejected",
        description: "The appointment has been rejected successfully",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to reject appointment",
        variant: "error",
      });
    },
  });
  const { data: drawerData, isLoading: isDrawerLoading } = useGetClientRegistrationById(drawerId || "");
  const { data: pendingRegsHook, refetch, isLoading: isPendingRegsLoading } = useGetPendingClientRegistrations();

  // Helper to format time from 'HH:mm:ss' to 'h:mm A'
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';

    try {
      // Handle different time formats
      let hour, minute;

      if (timeStr.includes(':')) {
        [hour, minute] = timeStr.split(":");
      } else {
        // If it's not in expected format, return as is
        return timeStr;
      }

      const date = new Date();
      date.setHours(Number(hour), Number(minute));
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error("Error formatting time:", error);
      return timeStr; // Return original string if there's an error
    }
  };

  // Calculate appointment statistics
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(a => a.status === "completed").length;
  const inProgressAppointments = appointments.filter(a => a.status === "in_progress").length;
  const { user, clinic, userType } = useRootContext();
  const [currentPage] = useState(1);
  const [pageSize] = useState(10);

  const formatDateOnly = (date: Date) => date.toISOString().split("T")[0];
  const today = new Date();
  const startOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfDayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const startIso = formatDateOnly(startOfDayLocal);
  const endIso = formatDateOnly(endOfDayLocal);
  const [rejectionReason, setRejectionReason] = useState("")
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

  const { data: appointmentsData } = useGetAppointments(
    {
      search: null,
      status: null,
      provider: null,
      dateFrom: startIso,
      dateTo: endIso,
      clinicId: (userType?.isClinicAdmin && user?.clinicId)
        ? user.clinicId
        : (clinic?.id && clinic.id !== 'undefined' ? clinic.id : null),
      companyId: null,
      patientId: null,
      clientId: null,
      veterinarianId: null,
      roomId: null,
      pageNumber: currentPage,
      pageSize: pageSize,
      isRegistered: true,
      tab: "dashboard",
      appointmentId: null
    },
    { enabled: !!(userType?.isClinicAdmin && user?.clinicId) || !!(clinic?.id && clinic.id !== 'undefined') }
  );

  const registeredItems = useMemo(() => {
    if (!appointmentsData || typeof appointmentsData !== 'object') return [] as any[];
    const items = (appointmentsData as any).items || [];
    return items.filter((appointment: any) =>
      !appointment.veterinarianId ||
      appointment.isRegistered === true ||
      appointment.status === "pending" ||
      appointment.status === "registered" ||
      (appointment.status === "scheduled" && !appointment.roomId)
    );
  }, [appointmentsData]);

  const todaysRegistrationsCount = registeredItems.length;
  const pendingRegs = Array.isArray(pendingRegsHook) ? pendingRegsHook : pendingRegistrations;
  const handleApprove = async (registrationId: string) => {
    try {
      await approveMutation.mutateAsync({
        registrationId,
        isApproved: true
      })
      if (isSidebarOpen) {
        setIsSidebarOpen(false)
      }
      toast({
        title: "Registration Approved",
        description: "Client registration has been approved successfully",
        variant: "success",
      })
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve registration",
        variant: "error",
      })
    }
  }

  const handleOpenRejectDialog = (registrationId: string) => {
    setSelectedRegistrationId(registrationId)
    setIsRejectDialogOpen(true)
  }

  const handleReject = async () => {
  if (!selectedRegistrationId) return;
  const isAppointment = registeredItems.some((item: any) => item.id === selectedRegistrationId);
  if (isAppointment) {
    try {
      const appointment = registeredItems.find((item: any) => item.id === selectedRegistrationId);
      
      await updateAppointmentMutation.mutateAsync({
        id: selectedRegistrationId,
        data: {
          id: selectedRegistrationId,
          clinicId: appointment?.clinicId,
          patientId: appointment?.patientId,
          clientId: appointment?.clientId,
          veterinarianId: appointment?.veterinarianId,
          roomId: appointment?.roomId,
          appointmentDate: appointment?.appointmentDate,
          appointmentTimeFrom: appointment?.appointmentTimeFrom,
          appointmentTimeTo: appointment?.appointmentTimeTo,
          appointmentTypeId: appointment?.appointmentTypeId,
          reason: appointment?.reason,
          status: 'cancelled',
          notes: rejectionReason || 'Rejected by provider',
          isRegistered: false,
          createdBy: appointment?.createdBy,
          sendEmail: true
        }
      });
      // Send notification
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: appointment?.clientId, // The client who made the appointment
            title: 'Appointment cancelled',
            message: `Your appointment for ${appointment?.appointmentDate} has been cancelled.`,
            type: 'appointment_cancelled',
            data: {
              appointmentId: appointment?.id,
              reason: rejectionReason || 'No reason provided'
            }
          })
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the whole operation if notification fails
      }
      setIsRejectDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      // Error toast is handled by the mutation's onError
    }
    } else {
      // Handle client registration rejection
      try {
        await approveMutation.mutateAsync({
          registrationId: selectedRegistrationId,
          isApproved: false,
          rejectionReason
        });
        setIsRejectDialogOpen(false);
        setRejectionReason('');
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
        }
        toast({
          title: "Registration Rejected",
          description: "Client registration has been rejected successfully",
          variant: "success",
        });
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to reject registration",
          variant: "error",
        });
      }
    }
  }
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className={`grid ${pendingRegs.length > 0 ? 'md:grid-cols-3' : 'md:grid-cols-3'} grid-cols-1 gap-6 flex-1 lg:w-1/2`}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-[#D2EFEC] to-[#D2EFEC] dark:from-[#1E3D3D]/50 dark:to-[#1E3D3D]/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-[#D2EFEC] dark:bg-[#1E3D3D]/50">
                  <Calendar className="h-6 w-6 text-[#1E3D3D] dark:text-[#D2EFEC]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Appointments</p>
                  <p className="text-2xl font-bold text-[#1E3D3D] dark:text-[#D2EFEC]">{totalAppointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedAppointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{inProgressAppointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Pending sections */}

      </div>

      {(pendingRegs.length > 0 || registeredItems.length > 0) && (
        <div className="flex gap-6">
          {/* Pending User Registrations Card */}
          {pendingRegs.length > 0 && (
            <Card className="col-span-1 border-0 shadow-lg bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/50 dark:to-pink-900/50 flex flex-col w-full">
              <CardHeader>
                <CardTitle className="text-2xl">Pending User Registrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: '112px' }}>
                  {pendingRegs.map((reg: any) => (
                    <div key={reg.id} className="flex items-center justify-between p-2">
                      <span className="font-semibold text-lg text-primary">{reg.firstName}</span>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" className="bg-[#1E3D3D] hover:bg-[#1E3D3D] text-white" onClick={() => { setDrawerId(reg.id); setIsSidebarOpen(true); }} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(reg.id)}
                          title="Approve"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-red-400 hover:bg-red-500"
                          onClick={() => handleOpenRejectDialog(reg.id)}
                          title="Reject"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Registered Appointments (Dashboard Quick Actions) */}
          {registeredItems.length > 0 && (
            <Card className="col-span-1 border-0 shadow-lg bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/50 flex flex-col w-full">
              <CardHeader>
                <CardTitle className="text-2xl">Registered Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Registrations</p>
                    <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{todaysRegistrationsCount}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 max-h-[140px] overflow-y-auto">
                  {registeredItems.slice(0, 4).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <div className="truncate mr-2">
                        <span className="font-medium">{a.patientName || a.patient?.name || '-'}</span>
                        <span className="ml-2 text-muted-foreground">{a.reason || '-'}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRejectDialog(a.id);
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => {
                            setSelectedAppointmentId(a.id);
                            setApproveDrawerOpen(true);
                            onApproveAppointment?.(a.id);
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Appointments Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Today's Schedule</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Time
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Patient
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Reason
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {appointments.map((appointment, index) => (
                <tr key={index} className="dark:hover:bg-slate-750">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    {formatTime(
                      appointment.appointmentTimeFrom ||
                      appointment.startTime ||
                      (appointment.roomSlot && appointment.roomSlot.startTime)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {typeof appointment.patient === 'string'
                      ? appointment.patient
                      : `${appointment.patient?.name || ''}${appointment.patient?.species ? ` (${appointment.patient.species})` : ''}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {appointment.reason || ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      className={
                        appointment.status === "in_progress"
                          ? "theme-badge-info"
                          : appointment.status === "completed"
                            ? "theme-badge-success"
                            : appointment.status === "in_room"
                              ? "theme-badge-warning"
                              : appointment.status === "scheduled"
                                ? "theme-badge-neutral"
                                : appointment.status === "cancelled"
                                  ? "theme-badge-destructive"
                                  : "theme-badge-neutral"
                      }
                    >
                      {appointment.status ? appointment.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Details Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[40%] overflow-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Registration Details</SheetTitle>
          </SheetHeader>

          {isDrawerLoading ? (
            <div className="py-6 text-center">Loading...</div>
          ) : drawerData ? (
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">First Name</Label>
                  <div className="font-medium">{drawerData.firstName}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Last Name</Label>
                  <div className="font-medium">{drawerData.lastName}</div>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <div className="font-medium">{drawerData.email}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Primary Phone</Label>
                  <div className="font-medium">{drawerData.phonePrimary}</div>
                </div>
                {drawerData.phoneSecondary && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Secondary Phone</Label>
                    <div className="font-medium">{drawerData.phoneSecondary}</div>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Address</Label>
                <div className="font-medium">{drawerData.addressLine1}</div>
                {drawerData.addressLine2 && (
                  <div className="font-medium">{drawerData.addressLine2}</div>
                )}
                <div className="font-medium">
                  {drawerData.city}, {drawerData.state} {drawerData.postalCode}
                </div>
              </div>

              {(drawerData.emergencyContactName || drawerData.emergencyContactPhone) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Emergency Contact</Label>
                    <div className="font-medium">{drawerData.emergencyContactName}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Emergency Phone</Label>
                    <div className="font-medium">{drawerData.emergencyContactPhone}</div>
                  </div>
                </div>
              )}

              {drawerData.notes && (
                <div>
                  <Label className="text-sm text-muted-foreground">Notes</Label>
                  <div className="font-medium">{drawerData.notes}</div>
                </div>
              )}

              <div>
                <Label className="text-sm text-muted-foreground">Registration Date</Label>
                <div className="font-medium">{drawerData.createdAt ? format(new Date(drawerData.createdAt), "MMM d, yyyy") : "-"}</div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-destructive">Failed to load registration details</div>
          )}


          <SheetFooter className="flex justify-between items-center pt-6 mt-6 border-t">
            {drawerData && (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setIsSidebarOpen(false)
                    handleOpenRejectDialog(drawerData.id)
                  }}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  className="theme-button text-white"
                  onClick={() => handleApprove(drawerData.id)}
                >
                  Approve
                </Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="rejection-reason">Reason for rejection</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this registration..."
                className="mt-2"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false)
                setRejectionReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Rejecting..." : "Reject Registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Appointment Drawer */}
      <Sheet open={approveDrawerOpen} onOpenChange={setApproveDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Approve Appointment</SheetTitle>
          </SheetHeader>
          {selectedAppointmentId && (
            <ApproveAppointment
              appointmentId={selectedAppointmentId as string}
              onClose={() => setApproveDrawerOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>

    </div>
  )
}