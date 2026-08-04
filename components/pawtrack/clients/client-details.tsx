'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { useGetClientById } from "@/queries/clients/get-client";
import { useGetPatients } from "@/queries/patients/get-patients";
import { PatientsTable } from "@/components/pawtrack/patients/patients-table";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, CalendarIcon, ArrowLeft, Edit, Save, CheckCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import NewAppointment from "@/components/pawtrack/appointments/newAppointment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useRootContext } from "@/context/RootContext";
import { useRouter } from "next/navigation";
import { ClientForm } from "./client-form";
import { toast } from "@/components/ui/use-toast";
import z from "zod";

interface ClientDetailsProps {
  clientId: string;
}

export default function ClientDetails({ clientId }: ClientDetailsProps) {
  const [showNewAppointmentSheet, setShowNewAppointmentSheet] = useState(false);
  const [selectedPatientIdForAppointment, setSelectedPatientIdForAppointment] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState("list");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isEditing, setIsEditing] = useState(false);
  const { userType, clinic } = useRootContext();
  const router = useRouter();

  const { data: client, isLoading, isError, refetch } = useGetClientById(clientId);
  const { data: patientsData, isLoading: isLoadingPatients, isError: isErrorPatients } = useGetPatients(
    pageNumber, 
    pageSize, 
    '', // search term
    clientId, // clientId for filtering
    // clinic?.id || undefined 
  );

  useEffect(() => {
    if (isError) {
      console.error("Error fetching client details for ID:", clientId);
    }
    if (isErrorPatients) {
      console.error("Error fetching patients for client ID:", clientId);
    }
  }, [isError, clientId, isErrorPatients]);

  if (isLoading) {
    return <div className="p-6">Loading client details...</div>;
  }

  if (isError || !client) {
    return <div className="p-6 text-red-500">Failed to load client details.</div>;
  }

  const patients = patientsData?.items || [];
  const totalPages = patientsData?.totalPages || 1;
  const isLoadingPatientsList = isLoadingPatients;

  const handlePageChange = (page: number) => {
    setPageNumber(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNumber(1); // Reset to first page when page size changes
  };

  return (
    <div className="p-6 space-y-6 border rounded-md">
      <Button
        variant="outline"
        onClick={() => router.push("/clients")}
        className="mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Clients
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b mb-4 py-4 px-6">
          <CardTitle className="text-xl">Owner Information</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1"
          >
            {isEditing ? "Cancel" : <><Edit className="h-4 w-4 mr-1" /> Edit</>}
          </Button>
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <p><strong>Name:</strong> {client.firstName} {client.lastName}</p>
              <p><strong>Email:</strong> {client.email}</p>
              <p><strong>Primary Phone:</strong> {client.phonePrimary}</p>
              <p><strong>Secondary Phone:</strong> {client.phoneSecondary || 'N/A'}</p>
              <p><strong>Address:</strong> {client.addressLine1}, {client.city}, {client.state}, {client.postalCode}</p>
              {/* <p><strong>Clinic:</strong> {client.clinicName}</p> */}
              <p><strong>Active:</strong> {client.isActive ? 'Yes' : 'No'}</p>
            </div>
          ) : (
            <ClientForm
              defaultValues={{
                id: client.id,
                // clinicId: client.clinicId || clinic?.id || "",
                firstName: client.firstName || "",
                lastName: client.lastName || "",
                email: client.email || "",
                phonePrimary: client.phonePrimary || "",
                phoneSecondary: client.phoneSecondary || "",
                addressLine1: client.addressLine1 || "",
                addressLine2: client.addressLine2 || "",
                city: client.city || "",
                state: client.state || "",
                postalCode: client.postalCode || "",
                emergencyContactName: client.emergencyContactName || "",
                emergencyContactPhone: client.emergencyContactPhone || "",
                notes: client.notes || "",
                isActive: client.isActive ?? true,
              }}
              onSuccess={(updatedClient) => {
                setIsEditing(false);
                refetch(); // Refresh client data
              }}
              isUpdate={true} // Force update mode
              // clinicId={client.clinicId || clinic?.id || ""}
            />
          )}
        </CardContent>
      </Card>

      {/* <Separator /> */}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b mb-4 py-4 px-6">
          <CardTitle className="text-xl">Patients</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPatientsList ? (
            <div className="flex items-center justify-center h-24">
              <p className="text-muted-foreground">Loading patients...</p>
            </div>
          ) : isErrorPatients ? (
            <div className="flex items-center justify-center h-24">
              <p className="text-destructive">Error loading patients. Please try again.</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="flex items-center justify-center h-24">
              <p className="text-muted-foreground">
                No patients found for this client.
              </p>
            </div>
          ) : (
            <PatientsTable
              patients={patients}
              totalPages={totalPages}
              currentPage={pageNumber}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              onSearch={() => {}}
              showClinicColumn={false}
            />
          )}
        </CardContent>
      </Card>

      <Sheet open={showNewAppointmentSheet} onOpenChange={setShowNewAppointmentSheet}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[62%] overflow-auto">
          <SheetHeader>
            <SheetTitle>Book New Appointment</SheetTitle>
          </SheetHeader>
          <NewAppointment
            isOpen={showNewAppointmentSheet}
            onClose={() => setShowNewAppointmentSheet(false)}
            // onSuccess={() => setShowNewAppointmentSheet(false)}
            patientId={selectedPatientIdForAppointment || undefined}
            // initialClinicId={client.clinicId}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
