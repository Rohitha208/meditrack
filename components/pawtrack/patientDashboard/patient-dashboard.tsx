"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Calendar, Clock, MapPin, Phone, Mail, Heart, PawPrint, CalendarDays, User, Building, Plus, FileText, Download, Filter, Search } from "lucide-react"
import { useContext } from "react";
import { RootContext } from "@/context/RootContext";
import { useGetPatients } from "@/queries/patients/get-patients";
import { useGetClientById } from "@/queries/clients/get-client";
import { useGetAppointments } from "@/queries/appointment/get-appointment";
import { useGetDischargeSummaryByClientId } from "@/queries/discharge-summary/get-discharge-summary-by-clientId";
import { getClientId } from "@/utils/clientCookie"
import PatientAppointmentForm from "@/components/pawtrack/patients/patient-appointment-form"
import { NewPatientForm } from "@/components/pawtrack/patients/new-patient-form"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet"
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input"
import DischargeSummarySheet from "@/components/pawtrack/appointments/discharge-summary-sheet"


interface Appointment {
  id: string;
  status: string;
  patientId: string;
  appointmentType?: {
    name: string;
  };
  roomSlot: {
    startTime: string;
    endTime: string;
  };
  appointmentDate: string;
  patient?: {
    name?: string;
  };
  veterinarian?: {
    firstName: string;
    lastName: string;
  };
  clinic?: {
    name: string;
  };
}

export default function PatientDashboard() {
  // Add a hydration safety flag
  const [isClient, setIsClient] = useState(false)
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview")
  const rootContext = useContext(RootContext);
  const handleLogout = rootContext?.handleLogout;
  const user = rootContext?.user;
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false)
  const [isNewPetFormOpen, setIsNewPetFormOpen] = useState(false)
  const [dischargeSummaryOpen, setDischargeSummaryOpen] = useState(false)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<string | null>(null)
  const [medicalRecordsSearch, setMedicalRecordsSearch] = useState("")
  const [selectedPetFilter, setSelectedPetFilter] = useState("all")
  const isMobile = useIsMobile();

  // Safely get clientId only on client side
  const [clientId, setClientId] = useState<string>("");
  
  useEffect(() => {
    // Only get clientId on client side
    if (typeof window !== 'undefined') {
      setClientId(getClientId() || "");
    }
  }, []);
  const { data, isLoading, error, refetch } = useGetPatients(1, 100, "", clientId);
  const pets = data?.items || [];

  const { data: clientData, isLoading: isClientLoading, error: clientError } = useGetClientById(clientId);

  const appointmentQuery = useGetAppointments({
    search: null,
    status: null,
    provider: null,
    dateFrom: null,
    dateTo: null,
    clinicId: null,
    patientId: null,
    clientId,
    veterinarianId: null,
    roomId: null,
    pageNumber: 1,
    pageSize: 100
  } as any);
  const appointments = appointmentQuery.data?.items || [];
  const isAppointmentsLoading = appointmentQuery.isLoading;
  const appointmentsError = appointmentQuery.error;

  const dischargeSummaryQuery = useGetDischargeSummaryByClientId(clientId);
  const dischargeSummaries = dischargeSummaryQuery.data?.items || [];
  const isDischargeSummariesLoading = dischargeSummaryQuery.isLoading;
  const dischargeSummariesError = dischargeSummaryQuery.error;

  // Set isClient to true once component mounts on client
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleNewPetSuccess = () => {
    refetch(); // Refresh the pets list
    setIsNewPetFormOpen(false); // Close the form
  };

  useEffect(() => {
    if (isClient && (!clientId || clientError) && !isClientLoading) {
      router.push("/login");
    }
  }, [clientId, isClientLoading, clientError, isClient, router]);


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Upcoming</Badge>
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Safe date formatting to prevent hydration mismatches
  const formatDate = (dateString: string) => {
    if (!isClient) return ''; // Return empty string during SSR
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return '';
    }
  }

  // Safe time formatting
  const formatTime = (dateString: string) => {
    if (!isClient) return ''; // Return empty string during SSR
    
    try {
      return new Date(dateString).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return '';
    }
  }

  // Safe age calculation
  const calculateAge = (dateOfBirth: string) => {
    if (!isClient || !dateOfBirth) return 'Unknown';
    
    try {
      return `${Math.floor(
        (new Date().getTime() - new Date(dateOfBirth).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
      )} years`;
    } catch (e) {
      return 'Unknown';
    }
  }

  // Don't render anything until we're on the client and have loaded the data
  if (!isClient || isClientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Handle case where there's no clientId or an error
  if (!clientId || clientError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Please log in to access your dashboard.</p>
        </div>
      </div>
    )
  }
  
const getLastVisit = (petId: string, appointments: Appointment[]): string | null => {
  const now = new Date();

  const completedPastAppointments = appointments
    .filter(apt =>
      apt.patientId === petId &&
      apt.status === "completed" &&
      apt.appointmentDate &&
      new Date(apt.appointmentDate) <= now
    );

  if (completedPastAppointments.length === 0) return null;

  const lastVisit = completedPastAppointments.reduce((latest, current) => {
    const currentDate = new Date(current.appointmentDate!);
    const latestDate = new Date(latest.appointmentDate!);
    return currentDate > latestDate ? current : latest;
  });

  return lastVisit.appointmentDate!;
};

const getNextAppointment = (petId: string, appointments: Appointment[]): string | null => {
  const now = new Date();
now.setHours(0, 0, 0, 0); 

const futureScheduledAppointments = appointments.filter(apt => {
  if (apt.patientId !== petId || apt.status !== "scheduled" || !apt.appointmentDate) return false;

  const aptDate = new Date(apt.appointmentDate);
  aptDate.setHours(0, 0, 0, 0); 

  return aptDate >= now;
  });

  if (futureScheduledAppointments.length === 0) return null;
  const nextAppointment = futureScheduledAppointments.reduce((earliest, current) => {
    const currentDate = new Date(current.appointmentDate!);
    const earliestDate = new Date(earliest.appointmentDate!);
    return currentDate < earliestDate ? current : earliest;
  });
  return nextAppointment.appointmentDate!;
};

// Filter discharge summaries based on search and pet filter
const filteredDischargeSummaries = dischargeSummaries.filter((summary: any) => {
  const matchesSearch = medicalRecordsSearch === "" || 
    summary.patientName?.toLowerCase().includes(medicalRecordsSearch.toLowerCase()) ||
    summary.appointmentType?.toLowerCase().includes(medicalRecordsSearch.toLowerCase()) ||
    summary.reason?.toLowerCase().includes(medicalRecordsSearch.toLowerCase());
  
  const matchesPet = selectedPetFilter === "all" || summary.patientId === selectedPetFilter;
  
  return matchesSearch && matchesPet;
});

// Get appointment type badge color
const getAppointmentTypeBadge = (appointmentType: string) => {
  const type = appointmentType?.toLowerCase() || '';
  if (type.includes('consultation')) {
    return <Badge className="bg-blue-100 text-blue-800">Consultation</Badge>;
  } else if (type.includes('surgery')) {
    return <Badge className="bg-red-100 text-red-800">Surgery</Badge>;
  } else if (type.includes('emergency')) {
    return <Badge className="bg-orange-100 text-orange-800">Emergency</Badge>;
  } else if (type.includes('deworming')) {
    return <Badge className="bg-green-100 text-green-800">Deworming</Badge>;
  } else if (type.includes('vaccination')) {
    return <Badge className="bg-purple-100 text-purple-800">Vaccination</Badge>;
  } else {
    return <Badge className="bg-gray-100 text-gray-800">{appointmentType}</Badge>;
  }
};

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          {isClientLoading ? (
            <div>Loading client info...</div>
          ) : clientError ? (
            <div>Error loading client info.</div>
          ) : clientData && (
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <div className="flex items-center gap-4 flex-1">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="/images/logo.png" alt={`${clientData.firstName} ${clientData.lastName}`} />
                  <AvatarFallback className="text-lg font-semibold">
                    {clientData.firstName?.[0]}{clientData.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-sm md:text-3xl font-bold text-gray-900">
                    Welcome back, {clientData.firstName} {clientData.lastName}!
                  </h1>
                  <p className="text-gray-600 text-xs md:text-base">Manage your pets and appointments</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{clientData.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{clientData.phonePrimary}</span>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="secondary" onClick={handleLogout} className="w-full md:w-auto">Logout</Button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        {isMobile ? (
          // Mobile Accordion Layout
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="overview" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 text-left font-semibold">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Overview
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-white shadow-lg border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <CalendarDays className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600">Upcoming</p>
                            <p className="text-lg font-bold text-gray-900">
                              {appointments.filter((apt: Appointment) => apt.status === "upcoming").length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white shadow-lg border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-full">
                            <PawPrint className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600">Total Pets</p>
                            <p className="text-lg font-bold text-gray-900">{pets.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white shadow-lg border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-full">
                            <Heart className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600">Completed</p>
                            <p className="text-lg font-bold text-gray-900">
                              {appointments.filter((apt: Appointment) => apt.status === "completed").length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white shadow-lg border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 rounded-full">
                            <Building className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600">Clinic</p>
                            <p className="text-xs font-bold text-gray-900">PawTrack</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Activity Mobile */}
                  <div className="space-y-4">
                    <Card className="bg-white shadow-lg border-0">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Calendar className="h-5 w-5" />
                          Recent Appointments
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {isAppointmentsLoading ? (
                          <div>Loading appointments...</div>
                        ) : appointmentsError ? (
                          <div>Error loading appointments.</div>
                        ) : appointments.length === 0 ? (
                          <div>No appointments found.</div>
                        ) : (
                          appointments.slice(0, 3).map((appointment: Appointment) => (
                            <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                                    {appointment.patient?.name?.[0] || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm text-gray-900">{appointment.patient?.name}</p>
                                  <p className="text-xs text-gray-600">{appointment.appointmentType?.name || "Unknown"}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-medium text-gray-900">
                                  {isClient && appointment.appointmentDate ? formatDate(appointment.appointmentDate) : ""}
                                </p>
                                {getStatusBadge(appointment.status)}
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-white shadow-lg border-0">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <PawPrint className="h-5 w-5" />
                          My Pets
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {isLoading ? (
                          <div>Loading pets...</div>
                        ) : error ? (
                          <div>Error loading pets.</div>
                        ) : pets.length === 0 ? (
                          <div>No pets found.</div>
                        ) : (
                          pets.map((pet) => (
                            <div key={pet.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-purple-100 text-purple-600">
                                  {pet.name?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium text-sm text-gray-900">{pet.name}</p>
                                <p className="text-xs text-gray-600">
                                  {pet.breed} • {isClient && pet.dateOfBirth ? calculateAge(pet.dateOfBirth) : "Unknown age"}
                                </p>
                                <p className="text-xs text-gray-600">{pet.weightKg} kg</p>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="appointments" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 text-left font-semibold">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Appointments
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">My Appointments</h2>
                    <div className="flex flex-col items-center gap-1">
                      <Button 
                        onClick={() => setIsAppointmentFormOpen(true)} 
                        className="theme-button text-white text-sm px-3 py-1"
                        disabled={pets.length === 0}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        New
                      </Button>
                      {pets.length === 0 && <span className="text-red-500 text-xs">No pets</span>}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {isAppointmentsLoading ? (
                      <div>Loading appointments...</div>
                    ) : appointmentsError ? (
                      <div>Error loading appointments.</div>
                    ) : appointments.length === 0 ? (
                      <div>No appointments found.</div>
                    ) : (
                      appointments.map((appointment: Appointment) => (
                        <Card key={appointment.id} className="bg-white shadow-lg border-0">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-blue-100 text-blue-600">
                                      {appointment.patient?.name?.[0] || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="font-semibold text-sm">{appointment.patient?.name}</h3>
                                    <p className="text-xs text-gray-600">{appointment.appointmentType?.name}</p>
                                  </div>
                                </div>
                                {getStatusBadge(appointment.status)}
                              </div>
                              <div className="space-y-2 text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  {isClient && appointment.appointmentDate ? formatDate(appointment.appointmentDate) : ""}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  {isClient && appointment.appointmentDate ? formatTime(appointment.appointmentDate) : ""}
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3" />
                                  {appointment.veterinarian ? `${appointment.veterinarian.firstName} ${appointment.veterinarian.lastName}` : ""}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  {appointment.clinic?.name}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pets" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 text-left font-semibold">
                <div className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5" />
                  My Pets
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">My Pets</h2>
                    <Button 
                      onClick={() => setIsNewPetFormOpen(true)} 
                      className="theme-button text-white text-sm px-3 py-1"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Pet
                    </Button>
                  </div>

                  {isLoading ? (
                    <div>Loading pets...</div>
                  ) : error ? (
                    <div>Error loading pets.</div>
                  ) : (
                    <div className="space-y-4">
                      {pets.length === 0 ? (
                        <div className="text-center py-8">
                          <PawPrint className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                          <h3 className="text-lg font-medium text-gray-900">No pets registered yet</h3>
                          <p className="text-gray-500 mt-1 mb-4 text-sm">Register your pet to book appointments</p>
                          <Button 
                            onClick={() => setIsNewPetFormOpen(true)}
                            className="theme-button text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Register Your First Pet
                          </Button>
                        </div>
                      ) : (
                        pets.map((pet) => (
                          <Card key={pet.id} className="bg-white shadow-lg border-0 overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12 border-2 border-white">
                                  <AvatarFallback className="bg-white text-blue-600 font-bold">
                                    {pet.name?.[0] || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <CardTitle className="text-white text-lg">{pet.name}</CardTitle>
                                  <CardDescription className="text-blue-100 text-sm">{pet.breed}</CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs font-medium text-gray-600">Age</p>
                                  <p className="text-sm font-semibold">
                                    {isClient && pet.dateOfBirth ? calculateAge(pet.dateOfBirth) : "Unknown"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-600">Weight</p>
                                  <p className="text-sm font-semibold">
                                    {pet.weightKg ? `${pet.weightKg} kg` : "Unknown"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-600">Last Visit</p>
                                  {(() => {
                                    const lastVisit = getLastVisit(pet.id, appointments);
                                    return (
                                      <p className="text-lg font-semibold">
                                        {lastVisit ? formatDate(lastVisit) : "—"}
                                      </p>
                                    );
                                  })()}
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-600">Next Appointment</p>
                                  {(() => {
                                    const nextAppointment = getNextAppointment(pet.id, appointments);
                                    return (
                                      <p className="text-lg font-semibold">
                                        {nextAppointment ? formatDate(nextAppointment) : "—"}
                                      </p>
                                    );
                                  })()}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="records" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 text-left font-semibold">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Medical Records
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">Medical Records</h2>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search records..."
                          value={medicalRecordsSearch}
                          onChange={(e) => setMedicalRecordsSearch(e.target.value)}
                          className="pl-10 w-40 text-sm"
                        />
                      </div>
                      <select
                        value={selectedPetFilter}
                        onChange={(e) => setSelectedPetFilter(e.target.value)}
                        className="text-sm border rounded-md px-2 py-1"
                      >
                        <option value="all">All Pets</option>
                        {pets.map((pet) => (
                          <option key={pet.id} value={pet.id}>
                            {pet.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {isDischargeSummariesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading medical records...</p>
                    </div>
                  ) : dischargeSummariesError ? (
                    <div className="text-center py-8">
                      <div className="text-red-500 mb-2">⚠️</div>
                      <p className="text-gray-600">Error loading medical records</p>
                    </div>
                  ) : filteredDischargeSummaries.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <h3 className="text-lg font-medium text-gray-900">No medical records found</h3>
                      <p className="text-gray-500 mt-1 text-sm">Your pet's medical records will appear here after completed appointments</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredDischargeSummaries.map((summary: any) => (
                        <Card key={summary.appointmentId} className="bg-white shadow-lg border-0">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-purple-100 text-purple-600">
                                      {summary.patientName?.[0] || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="font-semibold text-sm">{summary.patientName}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      {getAppointmentTypeBadge(summary.appointmentType)}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="theme-button-outline"
                                  onClick={() => {
                                    setSelectedAppointmentId(summary.appointmentId)
                                    setSelectedAppointmentType(summary.appointmentType)
                                    setDischargeSummaryOpen(true)
                                  }}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </div>
                              <div className="space-y-2 text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  {isClient && summary.appointmentDate ? formatDate(summary.appointmentDate) : ""}
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3" />
                                  {summary.veterinarianName || "Unknown"}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  {summary.clinicName || "Unknown"}
                                </div>
                                {summary.reason && (
                                  <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                                    <strong>Reason:</strong> {summary.reason}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          // Desktop Tabs Layout
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="pets">My Pets</TabsTrigger>
              <TabsTrigger value="records">Medical Records</TabsTrigger>
            </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white shadow-lg border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <CalendarDays className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Upcoming Appointments</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {appointments.filter((apt: Appointment) => apt.status === "upcoming").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-full">
                      <PawPrint className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Pets</p>
                      <p className="text-2xl font-bold text-gray-900">{pets.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Heart className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed Visits</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {appointments.filter((apt: Appointment) => apt.status === "completed").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <Building className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Preferred Clinic</p>
                      <p className="text-sm font-bold text-gray-900">PawTrack Veterinary</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Recent Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isAppointmentsLoading ? (
                    <div>Loading appointments...</div>
                  ) : appointmentsError ? (
                    <div>Error loading appointments.</div>
                  ) : appointments.length === 0 ? (
                    <div>No appointments found.</div>
                  ) : (
                    appointments.slice(0, 3).map((appointment: Appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              {appointment.patient?.name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{appointment.patient?.name}</p>
                            <p className="text-sm text-gray-600">{appointment.appointmentType?.name || "Unknown"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {isClient && appointment.appointmentDate ? formatDate(appointment.appointmentDate) : ""}
                          </p>
                          {getStatusBadge(appointment.status)}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PawPrint className="h-5 w-5" />
                    My Pets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div>Loading pets...</div>
                  ) : error ? (
                    <div>Error loading pets.</div>
                  ) : pets.length === 0 ? (
                    <div>No pets found.</div>
                  ) : (
                    pets.map((pet) => (
                      <div key={pet.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-purple-100 text-purple-600">
                            {pet.name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{pet.name}</p>
                          <p className="text-sm text-gray-600">
                            {pet.breed} • {isClient && pet.dateOfBirth ? calculateAge(pet.dateOfBirth) : "Unknown age"}
                          </p>
                          <p className="text-sm text-gray-600">{pet.weightKg} kg</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6 overflow-y-auto max-h-[calc(100vh-250px)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">My Appointments</h2>
              <div className="flex flex-col items-center gap-2">
              <Button 
                onClick={() => setIsAppointmentFormOpen(true)} 
                className="theme-button text-white"
                disabled={pets.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
           
              </Button>
              {pets.length === 0 && <span className="text-red-500 text-xs"> (No pets registered)</span>}
              </div>
            </div>
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle>All Appointments</CardTitle>
                <CardDescription>View and manage your pet appointments</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                <div className="space-y-4">
                  {isAppointmentsLoading ? (
                    <div>Loading appointments...</div>
                  ) : appointmentsError ? (
                    <div>Error loading appointments.</div>
                  ) : appointments.length === 0 ? (
                    <div>No appointments found.</div>
                  ) : (
                    appointments.map((appointment: Appointment) => (
                      <div key={appointment.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-blue-100 text-blue-600">
                                {appointment.patient?.name?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{appointment.patient?.name}</h3>
                                {getStatusBadge(appointment.status)}
                              </div>
                              <p className="text-gray-600 font-medium">{appointment.appointmentType?.name}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {isClient && appointment.appointmentDate ? formatDate(appointment.appointmentDate) : ""}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {isClient && appointment?.roomSlot?.startTime?.slice(0, 5) + " - " + appointment?.roomSlot?.endTime?.slice(0, 5)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  {appointment?.veterinarian ? `${appointment?.veterinarian?.firstName} ${appointment?.veterinarian?.lastName}` : ""}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <MapPin className="h-4 w-4" />
                                {appointment.clinic?.name}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pets Tab */}
          <TabsContent value="pets" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">My Pets</h2>
              <Button 
                onClick={() => setIsNewPetFormOpen(true)} 
                className="theme-button text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Register New Pet
              </Button>
            </div>

            {isLoading ? (
              <div>Loading pets...</div>
            ) : error ? (
              <div>Error loading pets.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pets.length === 0 ? (
                  <div className="col-span-full text-center py-10">
                    <PawPrint className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">No pets registered yet</h3>
                    <p className="text-gray-500 mt-1 mb-4">Register your pet to book appointments and access medical records</p>
                    <Button 
                      onClick={() => setIsNewPetFormOpen(true)}
                      className="theme-button text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Register Your First Pet
                    </Button>
                  </div>
                ) : (
                  pets.map((pet) => (
                  <Card key={pet.id} className="bg-white shadow-lg border-0 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-white">
                          <AvatarFallback className="bg-white text-blue-600 text-lg font-bold">
                            {pet.name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-white">{pet.name}</CardTitle>
                          <CardDescription className="text-blue-100">{pet.breed}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Age</p>
                          <p className="text-lg font-semibold">
                            {isClient && pet.dateOfBirth ? calculateAge(pet.dateOfBirth) : "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Weight</p>
                          <p className="text-lg font-semibold">
                            {pet.weightKg ? `${pet.weightKg} kg` : "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Last Visit</p>
                          {(() => {
                            const lastVisit = getLastVisit(pet.id, appointments);
                            return (
                              <p className="text-lg font-semibold">
                                {lastVisit ? formatDate(lastVisit) : "—"}
                              </p>
                            );
                          })()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Next Appointment</p>
                          {(() => {
                            const nextAppointment = getNextAppointment(pet.id, appointments);
                           return (
                             <p className="text-lg font-semibold">
                               {nextAppointment ? formatDate(nextAppointment) : "—"}
                             </p>
                           );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {/* Medical Records Tab */}
          <TabsContent value="records" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Medical Records</h2>
                <p className="text-gray-600 mt-1">View your pets' medical history and discharge summaries</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search medical records..."
                    value={medicalRecordsSearch}
                    onChange={(e) => setMedicalRecordsSearch(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <select
                  value={selectedPetFilter}
                  onChange={(e) => setSelectedPetFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Pets</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isDischargeSummariesLoading ? (
              <Card className="bg-white shadow-lg border-0">
                <CardContent className="p-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Medical Records</h3>
                    <p className="text-gray-600">Please wait while we fetch your pet's medical history...</p>
                  </div>
                </CardContent>
              </Card>
            ) : dischargeSummariesError ? (
              <Card className="bg-white shadow-lg border-0">
                <CardContent className="p-12">
                  <div className="text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Records</h3>
                    <p className="text-gray-600">Unable to load medical records. Please try again later.</p>
                  </div>
                </CardContent>
              </Card>
            ) : filteredDischargeSummaries.length === 0 ? (
              <Card className="bg-white shadow-lg border-0">
                <CardContent className="p-12">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Medical Records Found</h3>
                    <p className="text-gray-600 mb-6">Your pet's medical records will appear here after completed appointments</p>
                    <div className="flex justify-center">
                      <Button 
                        onClick={() => setIsAppointmentFormOpen(true)}
                        className="theme-button text-white"
                        disabled={pets.length === 0}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Book an Appointment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredDischargeSummaries.map((summary: any) => (
                  <Card key={summary.appointmentId} className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white font-bold">
                              {summary.patientName?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{summary.patientName}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              {getAppointmentTypeBadge(summary.appointmentType)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="theme-button-outline"
                          onClick={() => {
                            setSelectedAppointmentId(summary.appointmentId)
                            setSelectedAppointmentType(summary.appointmentType)
                            setDischargeSummaryOpen(true)
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Summary
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-600">Date</p>
                          <p className="text-gray-900">
                            {isClient && summary.appointmentDate ? formatDate(summary.appointmentDate) : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Veterinarian</p>
                          <p className="text-gray-900">{summary.veterinarianName || "N/A"}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Clinic</p>
                          <p className="text-gray-900">{summary.clinicName || "N/A"}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Room</p>
                          <p className="text-gray-900">{summary.roomName || "N/A"}</p>
                        </div>
                      </div>
                      
                      {summary.reason && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="font-medium text-gray-700 mb-1">Visit Reason</p>
                          <p className="text-gray-600 text-sm">{summary.reason}</p>
                        </div>
                      )}
                      
                      {summary.notes && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="font-medium text-blue-700 mb-1">Notes</p>
                          <p className="text-blue-600 text-sm">{summary.notes}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-xs text-gray-500">
                          Visit ID: {summary.visitId?.slice(0, 8)}...
                        </div>
                        <div className="text-xs text-gray-500">
                          {isClient && summary.visitCreatedAt ? formatDate(summary.visitCreatedAt) : ""}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        )}
      </div>

      {/* Only show forms on client-side */}
      {isClient && (
        <>
          <PatientAppointmentForm
            isOpen={isAppointmentFormOpen}
            onClose={() => setIsAppointmentFormOpen(false)}
            clientId={clientId}
            patients={pets}
          />

          <Sheet open={isNewPetFormOpen} onOpenChange={setIsNewPetFormOpen}>
            <SheetContent side="right" className="w-full sm:w-full md:!max-w-[70%] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Register New Pet</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <NewPatientForm 
                  onSuccess={handleNewPetSuccess} 
                  defaultClientId={clientId}
                  hideOwnerSection={true}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Discharge Summary Sheet */}
          {selectedAppointmentId && (
            <DischargeSummarySheet
              isOpen={dischargeSummaryOpen}
              onClose={() => {
                setDischargeSummaryOpen(false)
                setSelectedAppointmentId(null)
                setSelectedAppointmentType(null)
              }}
              appointmentId={selectedAppointmentId}
              appointmentType={selectedAppointmentType || undefined}
            />
          )}
        </>
      )}
    </div>
  )
}
