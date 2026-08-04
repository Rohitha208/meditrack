'use client';

import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { useCreateUser } from "@/queries/users/create-user";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { User } from ".";
import { Role, useGetRole } from "@/queries/roles/get-role";
import { useGetClinic } from "@/queries/clinic/get-clinic";
import { useGetCompanies } from "@/queries/companies/get-company";
import React, { useEffect, useState } from "react";
import { Combobox } from "../../ui/combobox";
import { MultiSelect } from "../../ui/mulitselect";
import { useRootContext } from "@/context/RootContext";
import { Eye, EyeOff } from "lucide-react";
import { getCompanyId, getClinicId } from "@/utils/clientCookie";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

type UserFormValues = Omit<User, "id" | "lastLogin" | "createdAt" | "updatedAt"> & {
  clinicId?: string;
  clinicIds?: string[];
  companyId?: string;
  role?: string;
};

interface NewUserProps {
  onSuccess?: () => void;
}

export default function NewUser({ onSuccess }: NewUserProps) {
  const router = useRouter();
  const { user: currentUser, userType, clinic, loading } = useRootContext();
  const [showPassword, setShowPassword] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showClinicField, setShowClinicField] = useState(false); // Only show for Veterinarian role
  const showCompanyField = userType?.isSuperAdmin;
  const showRoleField = !userType?.isSuperAdmin; // Hide role field for superadmin
  const isClinicAdmin = userType?.isClinicAdmin || currentUser?.roleName === 'Clinic Admin';
  const [selectedRoleName, setSelectedRoleName] = useState<string | undefined>(undefined);

 const userSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required"),
  lastName: z
    .string()
    .min(1, "Last name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  passwordHash: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  role: showRoleField
  ? z.string().min(1, "Role is required")
  : z.string().optional(),
  companyId: showCompanyField
  ? z.string().min(1, "Company is required")
  : z.string().optional(),
  clinicIds: z.array(z.string()).optional(),
  clinicId: z.string().optional(),
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
    const selectedRole = rolesData?.data?.find((role: Role) => role.value === data.role);
    const roleName = selectedRole?.name;
    const requiresClinicSelection = (roleName === 'Veterinarian' || roleName === 'Clinic Admin' || roleName === 'Receptionist');

    if (requiresClinicSelection) {
      if ((!data.clinicId || data.clinicId.length === 0) &&
          (!data.clinicIds || data.clinicIds.length === 0)) {
        ctx.addIssue({
          path: ["clinicIds"], 
          code: z.ZodIssueCode.custom,
          message: "At least one clinic must be selected",
        });
      }
    }
  });


  
  const createUser = useCreateUser({
    onSuccess: () => {
      toast({
        title: "User Added",
        description: "User has been added successfully",
        variant: "success",
      });
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/users");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    },
  });
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      passwordHash: "",
      firstName: "",
      lastName: "",
      role: userType?.isSuperAdmin ? "Administrator" : "",
      isActive: true,
      clinicId: "",
      clinicIds: [],
      companyId: "",
    },
  });
  
  const { data: rolesData } = useGetRole();
  const { data: clinicData } = useGetClinic(1, 100, companyId, true);
  const { data: companiesData } = useGetCompanies(userType?.isSuperAdmin);
  
 



  // Show loading if user data is not yet loaded
  if (loading || !currentUser) {
    return <div>Loading...</div>;
  }

  // Set company ID from root context or local storage
  useEffect(() => {
    if (clinic.companyId) {
      setCompanyId(clinic.companyId);
    } else if (currentUser?.companyId) {
      setCompanyId(currentUser.companyId);
    } else {
      const storedCompanyId = getCompanyId();
      if (storedCompanyId) {
        setCompanyId(storedCompanyId);
      }
    }
  }, [clinic.companyId, currentUser?.companyId]);

  // Set clinic ID for clinicAdmin users - automatically assign their clinic
  useEffect(() => {
    const clinicIdFromCookie = getClinicId();
    // Try both 'id' and 'clinicId' properties as the API might use either
    const clinicIdFromUser = currentUser?.clinics?.[0]?.id || currentUser?.clinics?.[0]?.clinicId;
    const clinicIdToUse = clinicIdFromCookie || clinicIdFromUser;

    if (isClinicAdmin && clinicIdToUse) {
      form.setValue("clinicId", clinicIdToUse);
      form.setValue("clinicIds", [clinicIdToUse]);
    }
  }, [isClinicAdmin, currentUser?.clinics, form]);

  const roleOptions = React.useMemo(() => {
    // Get the current user's role priority
    const currentRolePriority = rolesData?.data?.find((role: Role) => 
      role.id === currentUser?.roleId
    )?.priority || 0;

    // Filter roles to only show those with higher priority numbers (lower privilege)
    const filteredRoles = rolesData?.data?.filter((role: Role) => 
      role.priority > currentRolePriority
    ) || [];

    return filteredRoles.map((role: Role) => ({
      value: role.value,
      label: role.name
    }));
  }, [rolesData?.data, currentUser]);

  const clinicOptions = React.useMemo(() => {
    const options = clinicData?.items?.map((clinic) => ({
      value: clinic.id,
      label: clinic.name
    })) || [];
    return options;
  }, [clinicData?.items]);

  const handleSubmit = async (values: UserFormValues) => {
    try {
      // For superadmin, find Administrator role, otherwise use selected role
      let roleToSend;
      if (userType?.isSuperAdmin) {
        roleToSend = rolesData?.data?.find((role: Role) => role.name === 'Administrator');
      } else {
        roleToSend = rolesData?.data?.find((role: Role) => role.value === values.role);
      }

      // Extract lastName for separate handling
      const { lastName } = values;

      // Determine clinicIds values based on user role
      let clinicIds: string[] = [];

      const clinicIdFromCookie = getClinicId();
      // Try both 'id' and 'clinicId' properties as the API might use either
      const clinicIdFromUser = currentUser?.clinics?.[0]?.id || currentUser?.clinics?.[0]?.clinicId;
      const clinicIdToUse = clinicIdFromCookie || clinicIdFromUser;

      if (isClinicAdmin && clinicIdToUse) {
        // For Clinic Admin, always use their clinic ID (from cookies or user object)
        clinicIds = [clinicIdToUse];
      } else {
        // For other users (including veterinarians), use the selected clinics
        if (values.clinicIds && values.clinicIds.length > 0) {
          clinicIds = values.clinicIds;
        }
      }

      // Use consistent API structure for all user types
      const payload = {
        email: values.email,
        passwordHash: values.passwordHash,
        firstName: values.firstName,
        lastName: lastName ? lastName : null,
        roleId: roleToSend?.id,
        companyId: userType?.isSuperAdmin ? values.companyId : (currentUser?.companyId || companyId),
        clinicIds: clinicIds, // Array of clinic IDs
        slots: [] // Empty slots array as per API
      };

      await createUser.mutateAsync(payload as any);

    } catch (error) {
      // Error is handled in onError callback
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
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="lastName" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name*</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="email" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Email*</FormLabel>
              <FormControl><Input {...field} type="email" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField name="passwordHash" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Password*</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    {...field} 
                    type={showPassword ? "text" : "password"} 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {showRoleField && (
            <FormField name="role" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Role*</FormLabel>
                <FormControl>
                  <Combobox
                    options={roleOptions}
                    value={field.value || ""}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const selectedRole = rolesData?.data?.find((role: Role) => role.value === value);
                      const roleName = selectedRole?.name;
                      setSelectedRoleName(roleName);

                      // Determine if clinic field should be shown
                      if (roleName === 'Veterinarian' || roleName === 'Clinic Admin' || roleName === 'Receptionist') {
                        setShowClinicField(true);
                      } else {
                        setShowClinicField(false);
                        // Hide clinic field and clear values for other roles
                        form.setValue("clinicIds", []);
                        form.setValue("clinicId", "");
                      }
                      
                      // If the selected role is not veterinarian, clear clinicIds to ensure single select behaviour
                      if (roleName !== 'Veterinarian') {
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

          {showCompanyField && (
            <FormField name="companyId" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Company*</FormLabel>
                <FormControl>
                  <Combobox
                    options={companiesData?.items?.map((company: any) => ({
                      value: company.id,
                      label: company.name
                    })) || []}
                    value={field.value || ""}
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

          {showClinicField && (selectedRoleName === 'Veterinarian' || selectedRoleName === 'Clinic Admin' || selectedRoleName === 'Receptionist') && (
            <FormField 
              key={selectedRoleName}
              name="clinicIds" 
              control={form.control} 
              render={({ field }) => {
              const isVeterinarian = selectedRoleName === 'Veterinarian';

              return (
                <FormItem>
                    <FormLabel>Clinics*</FormLabel>
                  <FormControl>
                    {isVeterinarian ? (
                      <MultiSelect
                        key="multi-select-clinics"
                        options={clinicOptions}
                        defaultValue={field.value || []}
                        onValueChange={(values) => {
                          field.onChange(values);
                          // Update clinicId with the first selected clinic
                          form.setValue("clinicId", values[0] || "");
                        }}
                        placeholder="Select clinics"
                        maxCount={3}
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
            Create User
          </Button>
        </div>
      </form>
    </Form>
  );
}
