import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { useCreateClinic } from "@/queries/clinic/create-clinic";
import { toast } from "@/hooks/use-toast";
import { getToastErrorMessage } from "@/utils/apiErrorHandler";
import { Clinic } from "./index";
import { DatePicker } from "../../ui/datePicker";
import AdvancedMap from "../map/advanced-map";
import { LocationData } from "../map/hooks/useMapAdvanced";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { useGetCompanies } from "@/queries/companies/get-company";
import { Textarea } from "../../ui/textarea";
import { useRootContext } from "@/context/RootContext";
import { getCompanyId } from "@/utils/clientCookie";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

type NewClinicProps = {
  onSuccess?: () => void;
};

export default function NewClinic({ onSuccess }: NewClinicProps) {
  const router = useRouter();
  const { user } = useRootContext();

  // Fetch companies for selection
  const { data: companies, isLoading: companiesLoading } = useGetCompanies();

  const createClinic = useCreateClinic({
    onSuccess: () => {
      toast({
        title: "Clinic Created",
        description: "Clinic has been created successfully",
        variant: "success",
      });
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/clinics");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to create clinic"),
        variant: "destructive",
      });
    },
  });

  const clinicSchema = z.object({
    companyId: z.string().min(1, "Company is required"),
    name: z.string().min(1, "Clinic name is required"),
    addressLine1: z.string().min(1, "Address Line 1 is required"),
    addressLine2: z.string().optional().nullable(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    postalCode: z.string().min(1, "Postal Code is required"),
    country: z.string().min(1, "Country is required"),
    phone: z
      .string()
      .min(10, "Phone number must be 10 digits")
      .max(10, "Phone number must be 10 digits")
      .regex(/^\d{10}$/, "Phone number must be 10 digits"),
    email: z.string().email("Invalid email"),
    website: z.string().optional().or(z.literal("")).transform((val) => {
      if (!val || val === "") return null;
      const value = val.trim();
      return /^https?:\/\//i.test(value) ? value : `https://${value}`;
    }),
    taxId: z.string(),
    licenseNumber: z.string(),
    location: z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string(),
    }),
  });

  const form = useForm<Omit<Clinic, "id" | "createdAt" | "updatedAt">>({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
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
      location: {
        lat: 0,
        lng: 0,
        address: "",
      },
    },
  });

  // Set company ID from local storage or user context
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.companyId) {
          form.setValue("companyId", user.companyId);
        }
      } catch (err) {
        console.error("Error parsing user from localStorage:", err);
      }
    }
  }, [form]);

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

      if (city && !form.getValues('city')) {
        form.setValue('city', city);
      }

      if (state && !form.getValues('state')) {
        form.setValue('state', state);
      }

      if (isPostalNumeric && !form.getValues('postalCode')) {
        form.setValue('postalCode', postalCode);
      } else if (!isPostalNumeric && addressParts.some(part => /^\d+$/.test(part))) {
        // If postal code isn't numeric but there is a numeric part somewhere, use that as postal code
        const numericPart = addressParts.find(part => /^\d+$/.test(part));
        if (numericPart) {
          form.setValue('postalCode', numericPart);
        }
      }

      if (country && !form.getValues('country')) {
        form.setValue('country', country);
      }
    }

    toast({
      title: "Location Saved",
      description: "Location has been saved for the clinic",
      duration: 800,
    });
  };

  const handleSubmit = async (values: Omit<Clinic, "id" | "createdAt" | "updatedAt">) => {
    try {
      const payload = {
        ...values,
        website: values.website?.trim() ? values.website.trim() : null,
      };

      await createClinic.mutateAsync(payload);
    } catch (error) {
      // handled in onError
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full">
        <div className="h-[calc(100vh-10rem)] overflow-y-auto p-4 border rounded-md">
          <div className="grid grid-cols-2 gap-4">
            <FormField name="name" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Name
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="addressLine1" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 1
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled
                    placeholder={!field.value ? 'Select address from map' : undefined}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="addressLine2" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 2</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled
                    placeholder={!field.value ? 'Select address from map' : undefined}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="city" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>City
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled
                    placeholder={!field.value ? 'Select address from map' : undefined}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="state" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>State
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled
                    placeholder={!field.value ? 'Select address from map' : undefined}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="postalCode" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled
                    placeholder={!field.value ? 'Select address from map' : undefined}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="country" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Country
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled
                    placeholder={!field.value ? 'Select address from map' : undefined}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="phone" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Phone
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    placeholder="Enter 10-digit phone number"
                    onChange={(e) => {
                      // Only allow numbers and limit to 10 digits
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="email" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Email
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl><Input {...field} type="email" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="website" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="url"
                    placeholder="https://example.com"
                    onBlur={(e) => {
                      const value = e.target.value?.trim();
                      if (!value) {
                        field.onChange("");
                        return;
                      }
                      if (!/^https?:\/\//i.test(value)) {
                        // Prepend https:// to values like www.example.com
                        const formattedValue = `https://${value}`;
                        field.onChange(formattedValue);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="taxId" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Tax ID
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="licenseNumber" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>License Number
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* <FormField name="subscriptionStatus" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Subscription Status</FormLabel>
              <FormControl><Input {...field} disabled /></FormControl>
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
                Select the clinic location on the map below. This will automatically capture the coordinates and address.
              </p>

              {/* Display current location data if set */}
              {form.watch('location.address') && (
                <div className="mb-4 p-3 w-full bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900">Selected Location</p>
                  <p className="text-sm text-blue-700">{form.watch('location.address')}</p>
                  <p className="text-xs text-blue-600">
                    Lat: {form.watch('location.lat').toFixed(6)}, Lng: {form.watch('location.lng').toFixed(6)}
                  </p>
                </div>
              )}

              <AdvancedMap
                onSaveLocation={handleLocationSelect}
                className="h-[400px]"
              />
            </div>
          </div>


        </div>
        <div className="flex justify-end">
          <Button type="submit" className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white">
            Create Clinic
          </Button>
        </div>
      </form>
    </Form>
  );
}
