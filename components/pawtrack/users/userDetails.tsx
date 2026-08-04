'use client';

import { useState, useEffect } from "react";
import React from "react";
import { useGetUserById } from "@/queries/users/get-user-by-id";
import { useUpdateUser } from "@/queries/users/update-user";
import { Button } from "../../ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { useForm } from "react-hook-form";
import { Switch } from "../../ui/switch";
import { User } from ".";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { getToastErrorMessage } from "@/utils/apiErrorHandler";
import { useGetRole } from "@/queries/roles/get-role";
import { useGetClinic } from "@/queries/clinic/get-clinic";
import { useGetCompanies } from "@/queries/companies/get-company";
import clinic from "../clinic";
import { Combobox } from "../../ui/combobox";
import { MultiSelect } from "../../ui/mulitselect";
import { useRootContext } from "@/context/RootContext";
import { getCompanyId, getClinicId } from "@/utils/clientCookie";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Role } from "@/queries/roles/get-role";


interface UserDetailsProps {
  userId: string;
  onSuccess?: () => void;
}

export default function UserDetails({ userId, onSuccess }: UserDetailsProps) {
  const router = useRouter();
  const { user: currentUser, userType, clinic: userClinic, loading } = useRootContext();
  const [companyId, setCompanyId] = useState<string | null>(null);

  const { data: user, isLoading } = useGetUserById(userId);
  const { data: rolesData } = useGetRole();
  const { data: clinicData } = useGetClinic(1, 100, companyId, !!companyId);
  const { data: companiesData } = useGetCompanies(userType?.isSuperAdmin);
  const updateUser = useUpdateUser();
  // For Administrator role, hide clinic selection in details
  const showClinicField = !(userType?.isAdmin || currentUser?.roleName === 'Administrator');
  const showCompanyField = userType?.isSuperAdmin;
  const showRoleField = !userType?.isSuperAdmin; // Hide role field for superadmin
  const [selectedRoleName, setSelectedRoleName] = useState<string | undefined>(undefined);

  const isVeterinarian = selectedRoleName === 'Veterinarian';
  const isClinicRelatedRole = selectedRoleName === 'Clinic Admin' || selectedRoleName === 'Receptionist';


  const userDetailsSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  passwordHash: z.string().min(1, "Password is required").min(6, "Password must be at least 6 characters"),
  roleId: showRoleField
  ? z.string().min(1, "Role is required")
  : z.string().optional(),
  companyId: showCompanyField
  ? z.string().min(1, "Company is required")
  : z.string().optional(),
 clinicIds: z.array(z.string()).optional(),
  clinicId: z.string().optional(),
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
    const selectedRole = rolesData?.data?.find((role: Role) => role.id === data.roleId);
    const roleName = selectedRole?.name;
    const requiresClinicSelection = (roleName === 'Veterinarian' || roleName === 'Clinic Admin' || roleName === 'Receptionist');

    if (requiresClinicSelection) {
      if ((!data.clinicId || data.clinicId === "") &&
          (!data.clinicIds || data.clinicIds.length === 0)) {
        ctx.addIssue({
          path: ["clinicIds"], 
          code: z.ZodIssueCode.custom,
          message: "At least one clinic must be selected",
        });
      }
    }
  });

  
  // Initialize form with empty values that will be updated when data is loaded
  const form = useForm<User & { clinicIds?: string[] }>({
    resolver: zodResolver(userDetailsSchema),
    defaultValues: {
      id: userId,
      email: "",
      passwordHash: "",
      firstName: "",
      lastName: "",
      role: "",
      roleId: "",
      clinicId: "",
      clinicIds: [],
      companyId: "",
      isActive: false
    }
  });
  
  // Set company ID from root context or local storage
  useEffect(() => {
    if (userClinic.companyId) {
      setCompanyId(userClinic.companyId);
    } else if (currentUser?.companyId) {
      setCompanyId(currentUser.companyId);
    } else {
      const storedCompanyId = getCompanyId();
      if (storedCompanyId) {
        setCompanyId(storedCompanyId);
      }
    }
  }, [userClinic.companyId, currentUser?.companyId]);

  // Update form values when user data is loaded
  useEffect(() => {
    if (user) {
      // Extract clinic IDs from either clinicIds array or clinics array
      let clinicIds: string[] = [];
      if (user.clinicIds && user.clinicIds.length > 0) {
        clinicIds = user.clinicIds;
      } else if (user.clinics && user.clinics.length > 0) {
        clinicIds = user.clinics.map((clinic: any) => clinic.clinicId || clinic.id);
      }
      
      // Make sure all fields have defined values
      const defaultValues = {
        ...user,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        role: user.role || "",
        roleId: user.roleId || "",
        clinicId: "", // Initialize clinicId
        clinicIds: clinicIds, // Use extracted clinicIds
        companyId: user.companyId || "",
        isActive: typeof user.isActive === 'boolean' ? user.isActive : false
      };
      form.reset(defaultValues);
      const initialRole = rolesData?.data?.find((r: Role) => r.id === user.roleId);
      setSelectedRoleName(initialRole?.name);
    }
  }, [user, form, rolesData?.data]);

  // Determine if current user is clinic admin
  const isClinicAdmin = userType?.isClinicAdmin || currentUser?.roleName === 'Clinic Admin';

  // Set clinic ID for clinicAdmin users - automatically assign their clinic
  useEffect(() => {
    const clinicIdFromCookie = getClinicId();
    // Try both 'id' and 'clinicId' properties as the API might use either
    const clinicIdFromUser = currentUser?.clinics?.[0]?.clinicId || currentUser?.clinics?.[0]?.id;
    const clinicIdToUse = clinicIdFromCookie || clinicIdFromUser || userClinic.id;

    if (isClinicAdmin && clinicIdToUse) {
      form.setValue("clinicId", clinicIdToUse);
      form.setValue("clinicIds", [clinicIdToUse]);
    }
  }, [isClinicAdmin, currentUser?.clinics, userClinic.id, form]);

 

  // Filter roles based on current user's role priority
  const roleOptions = React.useMemo(() => {
    if (!rolesData?.data || !currentUser) return [];

    // Get the current user's role priority
    const currentRolePriority = rolesData.data.find((role:any) => 
      role.id === currentUser.roleId
    )?.priority || 0;

    // Filter roles to only show those with higher priority numbers (lower privilege)
    const filteredRoles = rolesData.data.filter((role:any) => 
      role.priority > currentRolePriority
    );

    // If the user being edited already has a role with equal or lower priority number,
    // we should still include that role in the options to avoid removing their current role
    if (user?.roleId) {
      const userCurrentRole = rolesData.data.find((role:any) => role.id === user.roleId);
      if (userCurrentRole && userCurrentRole.priority <= currentRolePriority) {
        filteredRoles.push(userCurrentRole);
      }
    }

    return filteredRoles.map((role:any) => ({
      value: role.id,
      label: role.name
    }));
  }, [rolesData?.data, currentUser, user]);

  const clinicOptions = React.useMemo(() => {
    const options = clinicData?.items?.map((clinic) => ({
      value: clinic.id,
      label: clinic.name
    })) || [];
    return options;
  }, [clinicData?.items]);

  if (isLoading || loading || !currentUser) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <div>User not found</div>;
  }
  
  const handleSubmit = async (values: User & { clinicIds?: string[] }) => {
    try {
      // Find the selected role to ensure we have the correct data
      const roleToSend = rolesData?.data?.find((role : any) => role.id === values.roleId);

      // Determine clinicIds values based on user role
      let clinicIds: string[] = [];

      const clinicIdFromCookie = getClinicId();
      // Try both 'id' and 'clinicId' properties as the API might use either
      const clinicIdFromUser = currentUser?.clinics?.[0]?.clinicId || currentUser?.clinics?.[0]?.id;
      const clinicIdToUse = clinicIdFromCookie || clinicIdFromUser || userClinic.id;

      if (isClinicAdmin && clinicIdToUse) {
        // For Clinic Admin, always use their clinic ID (from cookies or user object)
        clinicIds = [clinicIdToUse];
      } else if ((userType?.isAdmin || currentUser?.roleName === 'Administrator')) {
        // For Administrator users, use the selected clinic values from the form
        if (values.clinicIds && values.clinicIds.length > 0) {
          clinicIds = values.clinicIds;
        }
      }

      // Extract lastName to handle separately
      const { lastName } = values;

      // Create the payload matching the PUT API structure
      const payload = {
        id: values.id,
        email: values.email,
        passwordHash: values.passwordHash,
        firstName: values.firstName,
        lastName: lastName ? lastName : null,
        roleId: roleToSend?.id,
        companyId: values.companyId,
        clinicIds, // Array of clinic IDs
        isActive: true,
        slots: [] // Empty slots array as per API
      };

      await updateUser.mutateAsync(payload);
      toast({
        title: "User Updated",
        description: "User details have been updated",
        variant: "success",
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to update user"),
        variant: "destructive",
      });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full max-w-md mx-auto">
      <div className="h-[calc(100vh-10rem)] overflow-y-auto p-4 border rounded-md">
        <div className="grid grid-cols-1 gap-4">
          <FormField name="firstName" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>First Name*</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="lastName" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name*</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="email" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Email*</FormLabel>
              <FormControl>
                <Input {...field} type="email" value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {!userType?.isSuperAdmin && (
            <FormField name="roleId" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Role*</FormLabel>
                <FormControl>
                  <Combobox
                    options={roleOptions}
                    value={field.value?.toString()}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const selectedRole = rolesData?.data?.find((role: Role) => role.id === value);
                      setSelectedRoleName(selectedRole?.name);

                      // Reset clinic fields if the new role doesn't require multi-select
                      if (selectedRole?.name !== 'Veterinarian' && selectedRole?.name !== 'Clinic Admin' && selectedRole?.name !== 'Receptionist') {
                        form.setValue("clinicIds", []);
                        form.setValue("clinicId", "");
                      } else if (selectedRole?.name !== 'Veterinarian') {
                        // If the selected role is not veterinarian (but still requires clinic), clear clinicIds
                        // to ensure single select behavior (only one clinicId is valid).
                        form.setValue("clinicIds", []);
                      }
                    }}
                    placeholder="Select role"
                    searchPlaceholder="Search roles..."
                    emptyText="No roles found"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {userType?.isSuperAdmin && (
            <FormField name="companyId" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Company*</FormLabel>
                <FormControl>
                  <Combobox
                    options={(companiesData?.items || []).map((company: any) => ({
                      value: company.id,
                      label: company.name
                    }))}
                    value={field.value?.toString()}
                    onValueChange={field.onChange}
                    placeholder="Select company"
                    searchPlaceholder="Search companies..."
                    emptyText="No companies found"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}

          {(isVeterinarian || isClinicRelatedRole) && (
            <FormField 
              key={selectedRoleName}
              name="clinicIds" 
              control={form.control} 
              render={({ field }) => {
             
             return (
                <FormItem>
                  <FormLabel>Clinics*</FormLabel>
                  <FormControl>
                    {isVeterinarian ? (
                      <MultiSelect
                        key="multi-select-clinics"
                        options={clinicOptions}
                        value={field.value || []}
                        onValueChange={(values) => {
                          field.onChange(values);
                          // Update clinicId with the first selected clinic
                          form.setValue("clinicId", values[0] || "");
                        }}
                        placeholder="Select clinics"
                        maxCount={5}
                      />
                    ) : (
                      <Combobox
                        key="single-select-clinics"
                        options={clinicOptions}
                        value={field.value?.[0] || ""}
                        onValueChange={(value) => {
                          field.onChange([value]); // Wrap single value in array for clinicIds
                          form.setValue("clinicId", value);
                        }}
                        placeholder="Select clinic"
                        searchPlaceholder="Search clinics..."
                        emptyText="No clinics found"
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }} />
          )}
        </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" className="theme-button text-white">
            Update User
          </Button>
        </div>
      </form>
    </Form>
  );
}