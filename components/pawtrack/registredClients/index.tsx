"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye, Check, X } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet"
import { 
  useGetPendingClientRegistrations 
} from "@/queries/clientRegistration/get-registration-pending"
import { 
  useApproveClientRegistration 
} from "@/queries/clientRegistration/create-approve"
import { 
  useGetClientRegistrationById 
} from "@/queries/clientRegistration/get-registration-by-id"
import { ClientRegistration } from "@/queries/clientRegistration/create-registration"
import { format } from "date-fns"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

export const RegisteredClientsScreen = () => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const { 
    data: pendingRegistrations, 
    isLoading,
    isError,
    refetch 
  } = useGetPendingClientRegistrations()

  const { 
    data: selectedRegistration,
    isLoading: isLoadingDetails 
  } = useGetClientRegistrationById(selectedRegistrationId || "")

  const approveMutation = useApproveClientRegistration()

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
    if (!selectedRegistrationId) return
    
    try {
      await approveMutation.mutateAsync({
        registrationId: selectedRegistrationId,
        isApproved: false,
        rejectionReason
      })
      setIsRejectDialogOpen(false)
      setRejectionReason("")
      if (isSidebarOpen) {
        setIsSidebarOpen(false)
      }
      toast({
        title: "Registration Rejected",
        description: "Client registration has been rejected successfully",
        variant: "success",
      })

      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject registration",
        variant: "error",
      })
    }
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
          <Button 
            variant="ghost" 
            size="icon"
            className="text-green-500 hover:text-green-700 hover:bg-green-100"
            onClick={(e) => {
              e.stopPropagation()
              handleApprove(row.original.id)
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-100"
            onClick={(e) => {
              e.stopPropagation()
              handleOpenRejectDialog(row.original.id)
            }}
          >
            <X className="h-4 w-4" />
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
            <p className="text-muted-foreground">Loading registrations...</p>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">Error loading registrations. Please try again.</p>
          </div>
        ) : (
          <>
            <div className="search-container">
              <DataTable
                columns={columns}
                data={pendingRegistrations || []}
                page={page}
                pageSize={pageSize}
                totalPages={Math.ceil((pendingRegistrations?.length || 0) / pageSize)}
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
            <SheetTitle>Registration Details</SheetTitle>
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
            </div>
          ) : (
            <div className="py-6 text-center text-destructive">
              Failed to load registration details
            </div>
          )}
          
          <SheetFooter className="flex justify-between items-center pt-6 mt-6 border-t">
            {selectedRegistration && (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setIsSidebarOpen(false)
                    handleOpenRejectDialog(selectedRegistration.id)
                  }}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  className="theme-button text-white"
                  onClick={() => handleApprove(selectedRegistration.id)}
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
    </div>
  )
} 