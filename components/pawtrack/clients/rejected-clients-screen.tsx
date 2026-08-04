"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { 
  useGetClientRegistrations 
} from "@/queries/clientRegistration/get-clientRegistration"
import { 
  useGetClientRegistrationById 
} from "@/queries/clientRegistration/get-registration-by-id"
import { ClientRegistration } from "@/queries/clientRegistration/create-registration"
import { format } from "date-fns"
import { Label } from "@/components/ui/label"

export const RejectedClientsScreen = () => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const { 
    data: rejectedRegistrations, 
    isLoading,
    isError,
  } = useGetClientRegistrations(page, pageSize, "rejected")

  const { 
    data: selectedRegistration,
    isLoading: isLoadingDetails 
  } = useGetClientRegistrationById(selectedRegistrationId || "")

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

  const handleViewDetails = (registrationId: string) => {
    setSelectedRegistrationId(registrationId)
    setIsSidebarOpen(true)
  }

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false)
    setSelectedRegistrationId(null)
  }

  const columns: ColumnDef<ClientRegistration>[] = [
    { 
      accessorKey: "firstName", 
      header: "First Name",
      cell: ({ row }) => (
        <div>
          {row.original.firstName}
        </div>
      )
    },
    { 
      accessorKey: "lastName", 
      header: "Last Name",
      cell: ({ row }) => (
        <div>
          {row.original.lastName}
        </div>
      )
    },
    { 
      accessorKey: "email", 
      header: "Email",
      cell: ({ row }) => (
        <div>
          {row.original.email}
        </div>
      )
    },
    { 
      accessorKey: "phonePrimary", 
      header: "Phone",
      cell: ({ row }) => (
        <div>
          {row.original.phonePrimary}
        </div>
      )
    },
    { 
      accessorKey: "createdAt", 
      header: "Registration Date",
      cell: ({ row }) => (
        <div>
          {format(new Date(row.original.createdAt), "MMM d, yyyy")}
        </div>
      )
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex gap-2 justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation()
              handleViewDetails(row.original.id)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
      meta: { className: "text-center" },
    },
  ]

  return (
    <div className="p-6">
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading rejected registrations...</p>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">Error loading rejected registrations. Please try again.</p>
          </div>
        ) : (
          <>
            <div className="search-container">
              <DataTable
                columns={columns}
                data={rejectedRegistrations?.items || []}
                page={page}
                pageSize={pageSize}
                totalPages={rejectedRegistrations?.totalPages || 0}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                searchColumn="firstName"
                searchPlaceholder="Search by name or email..."
              />
            </div>
          </>
        )}
      </div>

      {/* Registration Details Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[40%] overflow-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Rejected Registration Details</SheetTitle>
          </SheetHeader>
          
          {isLoadingDetails ? (
            <div className="py-6 text-center">Loading...</div>
          ) : selectedRegistration ? (
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">First Name</Label>
                  <div className="font-medium">{selectedRegistration.firstName}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Last Name</Label>
                  <div className="font-medium">{selectedRegistration.lastName}</div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <div className="font-medium">{selectedRegistration.email}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Primary Phone</Label>
                  <div className="font-medium">{selectedRegistration.phonePrimary}</div>
                </div>
                {selectedRegistration.phoneSecondary && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Secondary Phone</Label>
                    <div className="font-medium">{selectedRegistration.phoneSecondary}</div>
                  </div>
                )}
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Address</Label>
                <div className="font-medium">{selectedRegistration.addressLine1}</div>
                {selectedRegistration.addressLine2 && (
                  <div className="font-medium">{selectedRegistration.addressLine2}</div>
                )}
                <div className="font-medium">
                  {selectedRegistration.city}, {selectedRegistration.state} {selectedRegistration.postalCode}
                </div>
              </div>
              
              {(selectedRegistration.emergencyContactName || selectedRegistration.emergencyContactPhone) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Emergency Contact</Label>
                    <div className="font-medium">{selectedRegistration.emergencyContactName}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Emergency Phone</Label>
                    <div className="font-medium">{selectedRegistration.emergencyContactPhone}</div>
                  </div>
                </div>
              )}
              
              {selectedRegistration.notes && (
                <div>
                  <Label className="text-sm text-muted-foreground">Notes</Label>
                  <div className="font-medium">{selectedRegistration.notes}</div>
                </div>
              )}
              
              <div>
                <Label className="text-sm text-muted-foreground">Registration Date</Label>
                <div className="font-medium">{format(new Date(selectedRegistration.createdAt), "MMM d, yyyy")}</div>
              </div>

              {selectedRegistration.rejectionReason && (
                <div>
                  <Label className="text-sm text-muted-foreground">Rejection Reason</Label>
                  <div className="font-medium text-red-600">{selectedRegistration.rejectionReason}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-destructive">
              Failed to load registration details
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}