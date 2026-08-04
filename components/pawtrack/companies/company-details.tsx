import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { PDFUpload } from "../../ui/pdf-upload";
import { useGetCompanyById } from "@/queries/companies/get-company";
import { useUpdateCompany, UpdateCompanyRequest } from "@/queries/companies/update-comapny";
import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Building, Mail, MapPin, FileText } from "lucide-react";
import { CompanyLogo } from "@/components/pawtrack/company-logo";

const companySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Company name is required"),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  logoFile: z.any().optional(),
  removeLogo: z.boolean().optional(),
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
  privacyPolicy: z.string().optional(),
  termsOfUse: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

type CompanyDetailsProps = {
  companyId: string;
  onSuccess?: () => void;
};

export default function CompanyDetails({ companyId, onSuccess }: CompanyDetailsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormReady, setIsFormReady] = useState(false);

  const { data: company, isLoading } = useGetCompanyById(companyId);
  const updateCompanyMutation = useUpdateCompany();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      id: companyId,
      name:   "",
      description: "",
      logoUrl: "",
      logoFile: null,
      removeLogo: false,
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
      privacyPolicy: "",
      termsOfUse: "",
    },
  });

  // Update form when company data is loaded
  useEffect(() => {
    if (company && !isFormReady) {
      const normalizedStatus = String(company.status || "active").trim().toLowerCase();
      const status = normalizedStatus === "inactive" ? "inactive" : "active";
      form.reset({
        id: companyId,
        name: company.name,
        description: company.description,
        logoUrl: company.logoUrl || "",
        logoFile: null,
        removeLogo: false,
        registrationNumber: company.registrationNumber,
        email: company.email,
        phone: company.phone,
        domainName: company.domainName,
        address: {
          street: company.address.street,
          city: company.address.city,
          state: company.address.state,
          postalCode: company.address.postalCode,
          country: company.address.country,
        },
        status,
        privacyPolicy: company.privacyPolicy || "",
        termsOfUse: company.termsOfUse || "",
      });
      setIsFormReady(true);
    }
  }, [company, form, isFormReady]);

  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const handleSubmit = async (values: CompanyFormValues) => {
    setIsSubmitting(true);
    try {
      const { logoFile: rawLogoFile, removeLogo, ...rest } = values;
      const logoFile = rawLogoFile instanceof File ? rawLogoFile : null;

      await updateCompanyMutation.mutateAsync({
        ...(rest as unknown as UpdateCompanyRequest),
        logoFile,
        // If user wants to remove logo and no new file is uploaded, clear it.
        logoUrl: removeLogo && !logoFile ? "" : values.logoUrl,
      });

      toast({
        title: "Company Updated",
        description: "Company has been successfully updated",
        variant: "success",
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update company",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading company details...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Company not found</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="h-[calc(100vh-10rem)] overflow-y-auto border p-4 rounded-md">
        {/* Hidden ID field */}
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <input type="hidden" {...field} />
          )}
        />

        {/* Basic Information */}
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

            <div className="mb-4">
              <FormLabel>Current Logo</FormLabel>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative h-20 w-20">
                  <CompanyLogo
                    logoUrl={company.logoUrl}
                    companyName={company.name}
                    context="company-details-current"
                    fallbackSrc="/images/logo.png"
                    fill
                    className="object-contain rounded-lg border-2 border-gray-200 p-2 bg-white"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Upload a new logo below to replace current logo.
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="logoFile"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Upload New Logo</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        field.onChange(file);
                        if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
                        setLogoPreviewUrl(file ? URL.createObjectURL(file) : null);
                        if (file) form.setValue("removeLogo", false);
                      }}
                    />
                  </FormControl>
                  {logoPreviewUrl && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">New logo preview</p>
                      <img
                        src={logoPreviewUrl}
                        alt="New company logo preview"
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="">
                    <FormLabel>Status*</FormLabel>
                    <Select key={field.value || 'status-select'} onValueChange={field.onChange} value={field.value}>
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
            className="bg-green-600 hover:bg-green-700 text-white px-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Company"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
