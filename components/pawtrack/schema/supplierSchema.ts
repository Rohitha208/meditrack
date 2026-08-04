import { z } from "zod";

export const supplierSchema = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  phone: z.string()
    .min(1, "Phone is required")
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  addressLine1: z.string().min(1, "Address Line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal Code is required"),
  accountNumber: z.string().min(1, "Account Number is required"),
  paymentTerms: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type SupplierFormValues = {
  clinicId: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  accountNumber: string;
  paymentTerms?: string;
  isActive: boolean;
};

export const defaultSupplierValues: Partial<SupplierFormValues> = {
  clinicId: "",
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  accountNumber: "",
  paymentTerms: "",
  isActive: true,
};
