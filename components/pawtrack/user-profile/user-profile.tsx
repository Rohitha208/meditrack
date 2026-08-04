"use client"

import { useRootContext } from "@/context/RootContext"
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Edit, Mail, Phone, MapPin, Calendar, Shield, Building, Clock, LogOut } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"
import { useGetUserById } from "@/queries/users/get-user-by-id"

export function UserProfile() {
  const { user, userType, clinic, handleLogout } = useRootContext()
  const { data: fetchedUser, isLoading, error } = useGetUserById(user?.id ?? "", !!user?.id)

  const successMessage = () => {
    toast({
      title: "Logout Successful",
      description: "You have been logged out successfully",
      variant: "success",
    })
  }

  const handleLogoutClick = () => {
    handleLogout()
    successMessage()
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No user data available</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading user profile...</p>
      </div>
    )
  }

  if (error || !fetchedUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Error loading user profile. Please try again.</p>
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not available"
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a")
    } catch {
      return "Invalid date"
    }
  }

  const getUserRoleBadge = () => {
    if (userType.isSuperAdmin) return { label: "Super Admin", variant: "destructive" as const }
    if (userType.isAdmin) return { label: "Admin", variant: "destructive" as const }
    if (userType.isClinicAdmin) return { label: "Clinic Admin", variant: "default" as const }
    if (userType.isReceptionist) return { label: "Receptionist", variant: "secondary" as const }
    if (userType.isVeterinarian) return { label: "Veterinarian", variant: "outline" as const }
    if (userType.isProvider) return { label: "Provider", variant: "outline" as const }
    if (userType.isPatient) return { label: "Patient", variant: "outline" as const }
    if (userType.isClient) return { label: "Client", variant: "outline" as const }
    return { label: user.roleName || "User", variant: "secondary" as const }
  }

  const roleInfo = getUserRoleBadge()

  return (
    <div className="mx-auto p-6">
      <div className="space-y-6">

        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20 ring-4 ring-[#1E3D3D] rounded-full">
              <AvatarImage src="/placeholder-user.jpg" alt="User" className="rounded-full" />
              <AvatarFallback className="text-2xl bg-[#D2EFEC] text-[#1E3D3D] flex justify-center items-center w-20 h-20 rounded-full">
                {fetchedUser.firstName?.charAt(0) || ""}
                {fetchedUser.lastName?.charAt(0) || ""}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-3xl font-bold text-[#1E3D3D]">
                {fetchedUser.firstName} {fetchedUser.lastName}
              </h1>
              <p className="text-lg text-muted-foreground">{fetchedUser.email}</p>
              <div className="mt-2">
                <Badge variant={roleInfo.variant} className="text-sm">
                  <Shield className="h-3 w-3 mr-1" />
                  {roleInfo.label}
                </Badge>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleLogoutClick}
            className="bg-[#1E3D3D] hover:bg-[#163030] text-white"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <Separator />

        {/* Content */}
        <div className="flex justify-between gap-6">

          {/* Personal Information */}
          <Card className="w-full bg-gradient-to-br from-[#D2EFEC] to-white border border-[#1E3D3D]/20">
            <CardHeader className="border-b py-2 px-4">
              <CardTitle className="flex items-center text-xl text-[#1E3D3D]">
                <Mail className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
              <CardDescription className="!mt-0">
                Basic details about your account
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-[#1E3D3D]/20 bg-white p-2 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground">First Name</label>
                  <p className="text-sm font-medium text-[#1E3D3D]">{fetchedUser.firstName || "Not provided"}</p>
                </div>

                <div className="border border-[#1E3D3D]/20 bg-white p-2 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                  <p className="text-sm font-medium text-[#1E3D3D]">{fetchedUser.lastName || "Not provided"}</p>
                </div>

                <div className="border border-[#1E3D3D]/20 bg-white p-2 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                  <p className="text-sm font-medium text-[#1E3D3D]">{fetchedUser.email}</p>
                </div>

                <div className="border border-[#1E3D3D]/20 bg-white p-2 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                  <div className="mt-1">
                    <Badge
                      variant={fetchedUser.isActive ? "default" : "secondary"}
                      className={fetchedUser.isActive ? "bg-[#1E3D3D] text-[#D2EFEC]" : ""}
                    >
                      {fetchedUser.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Information */}
          <Card className="w-full bg-gradient-to-br from-[#D2EFEC] to-white border border-[#1E3D3D]/20">
            <CardHeader className="border-b py-2 px-4">
              <CardTitle className="flex items-center text-xl text-[#1E3D3D]">
                <Building className="h-5 w-5 mr-2" />
                Work Information
              </CardTitle>
              <CardDescription className="!mt-0">
                Your role and workplace details
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-[#1E3D3D]/20 bg-white p-2 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <p className="text-sm font-medium text-[#1E3D3D]">
                    {fetchedUser.roleName || fetchedUser.role || "Not assigned"}
                  </p>
                </div>

                {!(userType.isAdmin) && (
                  <div className="border border-[#1E3D3D]/20 bg-white p-2 rounded-md">
                    <label className="text-sm font-medium text-muted-foreground">Clinic</label>
                    <p className="text-sm font-medium text-[#1E3D3D]">
                      {clinic.name || fetchedUser.clinicName || "Not assigned"}
                    </p>
                  </div>
                )}

                <div className="border border-[#1E3D3D]/20 bg-white p-2 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground">Department</label>
                  <p className="text-sm font-medium text-[#1E3D3D]">Veterinary Services</p>
                </div>

                <div className="border border-[#1E3D3D]/20 bg-white p-2 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground">Employment Status</label>
                  <p className="text-sm font-medium text-[#1E3D3D]">
                    {fetchedUser.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Activity */}
          <Card className="w-full bg-gradient-to-br from-[#D2EFEC] to-white border border-[#1E3D3D]/20">
            <CardHeader className="border-b py-2 px-4">
              <CardTitle className="flex items-center text-xl text-[#1E3D3D]">
                <Clock className="h-5 w-5 mr-2" />
                Account Activity
              </CardTitle>
              <CardDescription className="!mt-0">
                Information about your account usage
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-[#1E3D3D]/20 bg-white p-2 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                  <p className="text-sm font-medium text-[#1E3D3D]">{formatDate(fetchedUser.lastLogin)}</p>
                </div>

                <div className="border border-[#1E3D3D]/20 bg-white p-2 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                  <p className="text-sm font-medium text-[#1E3D3D]">{formatDate(fetchedUser.createdAt)}</p>
                </div>

                <div className="border border-[#1E3D3D]/20 bg-white p-2 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm font-medium text-[#1E3D3D]">{formatDate(fetchedUser.updatedAt)}</p>
                </div>

                <div className="border border-[#1E3D3D]/20 bg-white p-2 rounded-md">
                  <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                  <p className="text-sm font-medium text-[#1E3D3D]">Professional Account</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}