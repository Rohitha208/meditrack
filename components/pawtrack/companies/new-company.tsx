import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { PDFUpload } from "../../ui/pdf-upload";
import { useCreateCompany, CreateCompanyRequest } from "@/queries/companies/create-company";
import { toast } from "@/hooks/use-toast";
import { getToastErrorMessage } from "@/utils/apiErrorHandler";
import { useEffect, useState } from "react";
import { Building, Mail, MapPin, FileText } from "lucide-react";

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  description: z.string().optional(),
  logoFile: z.any().optional(),
  registrationNumber: z.string().min(1, "Registration number is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(1, "Phone number is required"),
  domainName: z.string().min(1, "Domain is required"),
  address: z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    country: z.string().min(1, "Country is required"),
  }),
  status: z.string().min(1, "Status is required"),
  productType: z.string().min(1, "Type is required"),
  privacyPolicy: z.string().optional(),
  termsOfUse: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

type NewCompanyProps = {
  onSuccess?: () => void;
};

export default function NewCompany({ onSuccess }: NewCompanyProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const createCompanyMutation = useCreateCompany();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      description: "",
      logoFile: null,
      registrationNumber: "",
      email: "",
      phone: "",
      domainName: "",
      address: {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
      status: "active",
      productType:"",
      privacyPolicy: "",
      termsOfUse: "",
    },
  });

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const handleSubmit = async (values: CompanyFormValues) => {
    setIsSubmitting(true);
    try {
      await createCompanyMutation.mutateAsync(values as CreateCompanyRequest);
      toast({
        title: "Company Created",
        description: "Company has been successfully created",
        variant: "success",
      });
      form.reset();
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
        setLogoPreviewUrl(null);
      }
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to create company"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="h-[calc(100vh-10rem)] overflow-y-auto border p-4 rounded-md">
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <Building className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Basic Information</h3>
          </div>
          <div className="border p-4 rounded-md bg-gray-50">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Company Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Enter company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter company description"
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logoFile"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Company Logo*</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      field.onChange(file);
                      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
                      setLogoPreviewUrl(file ? URL.createObjectURL(file) : null);
                    }}
                  />
                </FormControl>
                {logoPreviewUrl && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">Preview</p>
                    <img
                      src={logoPreviewUrl}
                      alt="Company logo preview"
                      className="h-20 w-20 object-contain rounded-lg border-2 border-gray-200 p-2 bg-white"
                    />
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="registrationNumber"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Registration Number*</FormLabel>
                  <FormControl>
                    <Input placeholder="REG123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domainName"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Domain*</FormLabel>
                  <FormControl>
                    <Input placeholder="company.pawtrack.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
    name="status"
    render={({ field }) => (
      <FormItem className="mb-4">
        <FormLabel>Status*</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />

  <FormField
    control={form.control}
    name="productType"
    render={({ field }) => (
      <FormItem className="mb-4">
        <FormLabel>Product Type*</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="veterinary">Veterinary</SelectItem>
            <SelectItem value="human">Human</SelectItem>
           
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
        </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4 mt-4">
          <div className="flex gap-2 items-center">
              <Mail className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Contact Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md bg-gray-50">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email*</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="company@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone*</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-4 mt-4">
          <div className="flex gap-2 items-center">
            <MapPin className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold">Address Information</h3>
          </div>
          <div className="border p-4 rounded-md bg-gray-50">
          <FormField
            control={form.control}
            name="address.street"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Street Address*</FormLabel>
                <FormControl>
                  <Input placeholder="123 Main Street" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="address.city"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>City*</FormLabel>
                  <FormControl>
                    <Input placeholder="New York" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address.state"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>State*</FormLabel>
                  <FormControl>
                    <Input placeholder="NY" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="address.postalCode"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Postal Code*</FormLabel>
                  <FormControl>
                    <Input placeholder="10001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address.country"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Country*</FormLabel>
                  <FormControl>
                    <Input placeholder="United States" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          </div>
        </div>

        {/* Legal Documents */}
        <div className="space-y-4 mt-4">
          <div className="flex gap-2 items-center">
            <FileText className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Legal Documents</h3>
          </div>
          <div className="border p-4 rounded-md bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="privacyPolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <PDFUpload
                        label="Privacy Policy"
                        value={field.value}
                        onChange={field.onChange}
                        error={form.formState.errors.privacyPolicy?.message}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="termsOfUse"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <PDFUpload
                        label="Terms of Use"
                        value={field.value}
                        onChange={field.onChange}
                        error={form.formState.errors.termsOfUse?.message}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="theme-button text-white px-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Company"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
