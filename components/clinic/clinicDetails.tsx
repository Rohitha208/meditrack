'use client';

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useGetClinic } from "@/queries/clinic/get-clinic";
import { useUpdateClinic } from "@/queries/clinic/update-clinic";
import { toast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { Switch } from "../ui/switch";
import { Clinic } from ".";
import { useGetClinicById } from "@/queries/clinic/get-clinic-by-id";
import { DatePicker } from "../ui/datePicker";
import AdvancedMap from "../map/advanced-map";
import { LocationData } from "../map/hooks/useMapAdvanced";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useGetCompanies } from "@/queries/companies/get-company";
import { Textarea } from "../ui/textarea";
import { useRootContext } from "@/context/RootContext";
import { getCompanyId } from "@/utils/clientCookie";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

type ClinicDetailsProps = {
  clinicId: string;
  onSuccess?: () => void;
};

export default function ClinicDetails({ clinicId, onSuccess }: ClinicDetailsProps) {
  const router = useRouter();
  const [isFormReady, setIsFormReady] = useState(false);
  const { user } = useRootContext();

  const { data: clinic, isLoading } = useGetClinicById(clinicId);
  const { data: companies, isLoading: companiesLoading } = useGetCompanies();
  const updateClinic = useUpdateClinic();

  const clinicSchema = z.object({
    id: z.string(),
    companyId: z.string().min(1, "Company is required"),
    name: z.string().min(1, "Clinic name is required"),
    addressLine1: z.string().max(100, "Address Line 1 must be 100 characters or less").optional(),
    addressLine2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().optional(),
    postalCode: z.string().min(1, "Postal Code is required"),
    country: z.string().min(1, "Country is required"),
    phone: z
      .string()
      .min(10, "Phone number must be 10 digits")
      .max(10, "Phone number must be 10 digits")
      .regex(/^\d{10}$/, "Phone number must be 10 digits"),
    email: z.string().email("Invalid email"),
    website: z
      .string()
      .url("Please enter a valid URL")
      .optional()
      .or(z.literal(""))
      .or(z.null())
      .transform((val) => {
        if (!val || val === "") return null;
        const value = val.trim();
        return /^https?:\/\//i.test(value) ? value : `https://${value}`;
      }),


    taxId: z.string().optional(),
    licenseNumber: z.string().optional(),
    location: z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string(),
    }),
  });

  const form = useForm<Clinic>({
    resolver: zodResolver(clinicSchema as any),
    defaultValues: {
      id: "",
      companyId: "",
      name: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      phone: "",
      email: "",
      website: "",
      taxId: "",
      licenseNumber: "",
      // subscriptionStatus: "",
      // subscriptionExpiresAt: "",
      location: {
        lat: 0,
        lng: 0,
        address: "",
      }
      // Add any other default fields here
    }
  });

  // Update form values when clinic data is loaded
  useEffect(() => {
    if (clinic) {
      // If location fields are null, initialize with default values for the form
      const clinicWithDefaultLocation = {
        ...clinic,
        location: clinic.location ? {
          lat: clinic.location.lat || 0,
          lng: clinic.location.lng || 0,
          address: clinic.location.address || "",
        } : {
          lat: 0,
          lng: 0,
          address: "",
        }
      };

      form.reset(clinicWithDefaultLocation);
      setIsFormReady(true);
    }
  }, [clinic, form]);

  // Set company ID from local storage if not already set (for new clinics or when company is not set)
  useEffect(() => {
    const companyId = getCompanyId();
    if (companyId && !form.getValues('companyId')) {
      form.setValue('companyId', companyId);
    }
  }, [form]);

  // Alternative: Set company ID from user context if not already set
  useEffect(() => {
    if (user?.companyId && !form.getValues('companyId')) {
      form.setValue('companyId', user.companyId);
    }
  }, [user, form]);

  const locationLat = form.watch("location.lat");
  const locationLng = form.watch("location.lng");
  const locationAddress = form.watch("location.address");
  const addressLine1 = form.watch("addressLine1");

  const mapInitialLocation = useMemo(() => {
    if (!locationLat || !locationLng) return undefined;
    return {
      lat: locationLat,
      lng: locationLng,
      address: locationAddress || addressLine1 || "",
    };
  }, [locationLat, locationLng, locationAddress, addressLine1]);

  // Handle location selection from map
  const handleLocationSelect = (location: LocationData) => {
    const fullAddress = location.address.trim();

    form.setValue("location", {
      lat: location.lat,
      lng: location.lng,
      address: fullAddress,
    });

    // --- NEW LOGIC: Auto-split address ---
    if (fullAddress.length > 100) {
      form.setValue("addressLine1", fullAddress.slice(0, 100));
      form.setValue("addressLine2", fullAddress.slice(100));
    } else {
      form.setValue("addressLine1", fullAddress);
      form.setValue("addressLine2", "");
    }


    // Parse the address with a more flexible approach for international formats
    const addressParts = location.address.split(', ');

    if (addressParts.length >= 4) {
      // For Indian addresses like: "Sindagi, Kalaburagi taluku, Kalaburagi, Karnataka, 585103, India"
      // We need to identify the city, state, postal code correctly

      // Usually format is: [locality], [subdivision], [city], [state], [postal code], [country]
      const city = addressParts[addressParts.length - 4] || ''; // City is typically 4th from last
      const state = addressParts[addressParts.length - 3] || ''; // State is typically 3rd from last
      const postalCode = addressParts[addressParts.length - 2] || ''; // Postal code is typically 2nd from last
      const country = addressParts[addressParts.length - 1] || ''; // Country is last

      // Try to detect if postal code is numeric
      const isPostalNumeric = /^\d+$/.test(postalCode);

      if (city) {
        form.setValue('city', city);
      }

      if (state) {
        form.setValue('state', state);
      }

      if (isPostalNumeric) {
        form.setValue('postalCode', postalCode);
      } else if (addressParts.some(part => /^\d+$/.test(part))) {
        // If postal code isn't numeric but there is a numeric part somewhere, use that as postal code
        const numericPart = addressParts.find(part => /^\d+$/.test(part));
        if (numericPart) {
          form.setValue('postalCode', numericPart);
        }
      }

      if (country) {
        form.setValue('country', country);
      }
    }

    toast({
      title: "Location Updated",
      description: "Clinic location has been updated successfully",
      duration: 800,
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!clinic) {
    return <div>Clinic not found</div>;
  }

  const handleSubmit = async (values: Clinic) => {
    try {
      // Create a new object without the id property
      const { id, ...updateData } = values;
      await updateClinic.mutateAsync({ ...updateData, id: clinicId });
      toast({
        title: "Clinic Updated",
        description: "Clinic has been updated successfully",
        variant: "success",
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update clinic",
        variant: "destructive",
      });
    }
  };

  if (!isFormReady) {
    return <div>Preparing form...</div>;
  }

  return (
    <div className="">

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full pb-20">
          <div className="h-[calc(100vh-10rem)] overflow-y-auto p-4 border rounded-md">
            <div className="grid grid-cols-2 gap-8">
              <FormField name="name" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="addressLine1" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 1</FormLabel>
                  <FormControl>
                    <Input {...field}
                      disabled
                      placeholder={!field.value ? 'Select address from map' : undefined}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 100) {
                          field.onChange(value);
                          form.setValue('addressLine2', '');
                        } else {
                          // Auto-split: first 100 chars to addressLine1, rest to addressLine2
                          const line1 = value.substring(0, 100);
                          const line2 = value.substring(100);
                          field.onChange(line1);
                          form.setValue('addressLine2', line2);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-gray-500 mt-1">
                    {field.value?.length || 0}/100 characters
                  </div>
                </FormItem>
              )} />

              {form.watch('addressLine2') && (
                <FormField name="addressLine2" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input {...field}
                        disabled
                        placeholder={!field.value ? 'Overflow from Address Line 1' : undefined} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField name="city" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field}
                      disabled
                      placeholder={!field.value ? 'Select address from map' : undefined} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="state" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input {...field}
                      disabled
                      placeholder={!field.value ? 'Select address from map' : undefined} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="postalCode" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code</FormLabel>
                  <FormControl>
                    <Input {...field}
                      disabled
                      placeholder={!field.value ? 'Select address from map' : undefined} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="country" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input {...field}
                      disabled
                      placeholder={!field.value ? 'Select address from map' : undefined} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Phone <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          placeholder="Enter 10-digit phone number"
                          className={`${fieldState.error ? 'border-red-500' : ''} pr-12`}
                          onChange={(e) => {
                            // Only allow numbers and limit to 10 digits
                            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                            field.onChange(value);
                          }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          {field.value?.length || 0}/10
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 text-sm" />
                  </FormItem>
                )}
              />

              <FormField name="email" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <FormField name="taxId" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField name="licenseNumber" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>License Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* <FormField name="subscriptionStatus" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Status</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <FormField name="subscriptionExpiresAt" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Expires At</FormLabel>
                    <FormControl>
                      <DatePicker 
                        value={field.value ? new Date(field.value) : null}
                        onChange={(date) => field.onChange(date ? date.toISOString() : "")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} /> */}
            </div>

            {/* Location Selection Section */}
            <div className="space-y-4">
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Clinic Location</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Update the clinic location by selecting a position on the map below. This will automatically update the coordinates and address.
                </p>

                {/* Display current location data if set */}
                {mapInitialLocation && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-900">Current Location</p>
                    <p className="text-sm text-blue-700">{mapInitialLocation.address}</p>
                    <p className="text-xs text-blue-600">
                      Lat: {mapInitialLocation.lat.toFixed(6)}, Lng: {mapInitialLocation.lng.toFixed(6)}
                    </p>
                  </div>
                )}

                <AdvancedMap
                  onSaveLocation={handleLocationSelect}
                  className="h-[400px]"
                  initialLocation={mapInitialLocation}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white">
              Update Clinic
            </Button>
          </div>
        </form>
      </Form>

    </div>
  );
}
