"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Eye, Trash2, Calendar } from "lucide-react"
import { Patient } from "@/queries/patients/get-patients"
import { useDeletePatient } from "@/queries/patients/delete-patients"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { formatDate } from "@/lib/utils"
import NewAppointment from "@/components/appointments/newAppointment"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { PatientEditDetails } from "./patient-edit-details"
import { useToast } from "@/hooks/use-toast"
import { getClientById } from "@/queries/clients/get-client"

interface PatientsTableProps {
  patients: Patient[]
  totalPages: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onSearch: (term: string) => void
  showClinicColumn?: boolean
}

export function PatientsTable({
  patients,
  totalPages,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSearch,
  showClinicColumn = false,
}: PatientsTableProps) {
  const router = useRouter()
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [showNewAppointment, setShowNewAppointment] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [patientToEdit, setPatientToEdit] = useState<string | null>(null)
  const { toast } = useToast()
  
  const deletePatientMutation = useDeletePatient()

  const handleDeleteClick = (patient: Patient) => {
    setPatientToDelete(patient)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!patientToDelete) return

    try {
      await deletePatientMutation.mutateAsync(patientToDelete.id)
      toast({
        title: "Patient deleted",
        description: `${patientToDelete.name} has been deleted successfully.`,
        variant: "success",
      })
      setIsDeleteDialogOpen(false)
      setPatientToDelete(null)      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete the patient. Please try again.",
        variant: "error",
      })
    }
  }

  const handleViewPatient = (patientId: string) => {
    router.push(`/patients/${patientId}`)
  }

  const handleEditPatient = (patientId: string) => {
    setPatientToEdit(patientId)
    setShowEditSheet(true)
  }

  const handleBookAppointment = async (patient: Patient) => {
    if (!patient.isActive) {
      toast({
        title: "Cannot Book Appointment",
        description: "This patient is inactive. Please activate the patient before creating an appointment.",
        variant: "destructive",
      })
      return
    }

    // Check if the patient's client (owner) is inactive
    if (patient.clientId) {
      try {
        const clientData = await getClientById(patient.clientId)
        if (clientData && clientData.isActive === false) {
          toast({
            title: "Cannot Book Appointment",
            description: "The owner (client) of this patient is inactive. Please activate the client before creating an appointment.",
            variant: "destructive",
          })
          return
        }
      } catch (error) {
        // If client fetch fails, allow proceeding — the form-level check will catch it
      }
    }

    setSelectedPatientId(patient.id)
    setShowNewAppointment(true)
  }

  const columns: ColumnDef<Patient>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "species", header: "Species" },
    { accessorKey: "breed", header: "Primary Breed" },
    { 
      accessorKey: "gender", 
      header: "Gender",
      cell: ({ row }) => {
        const gender = row.original.gender;
        const formattedGender = gender ? gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase() : '';
        return (
          <div>
            {formattedGender}
            {row.original.isNeutered && " (Neutered)"}
          </div>
        );
      }
    },
    { 
      accessorKey: "microchipNumber", 
      header: "Microchip Number",
      cell: ({ getValue }) => getValue() || '-'
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ getValue }) => getValue() ?
        <Badge className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D]/80">Active</Badge> :
        <Badge variant="destructive">Inactive</Badge>
    },
    ...(showClinicColumn ? [
     
    ] : []),
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex gap-2 justify-center">
          {/* <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleViewPatient(row.original.id);
            }}
            title="View Patient"
          >
            <Eye className="h-4 w-4" />
          </Button> */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEditPatient(row.original.id);
            }}
            title="Edit Patient"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleBookAppointment(row.original);
            }}
            title="Book Appointment"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-100"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(row.original);
            }}
            title="Delete Patient"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      meta: { className: "text-center" },
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={patients || []}
        searchColumn="name"
        searchPlaceholder="Search patients..."
        onSearch={onSearch}
        page={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onRowClick={(row) => handleViewPatient(row.id)}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Patient"
        description={`Are you sure you want to delete ${patientToDelete?.name}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        isDeleting={deletePatientMutation.isPending}
      />

      <NewAppointment 
        isOpen={showNewAppointment} 
        onClose={() => {
          setShowNewAppointment(false)
          setSelectedPatientId(null)
        }}
        patientId={selectedPatientId || undefined}
      />

      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[62%]">
          <SheetHeader className="relative top-[-14px]">
            <SheetTitle>Edit Patient</SheetTitle>
          </SheetHeader>
          {patientToEdit && (
            <PatientEditDetails 
              patientId={patientToEdit} 
              onSuccess={() => {
                setShowEditSheet(false)
                setPatientToEdit(null)
              }} 
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
} 