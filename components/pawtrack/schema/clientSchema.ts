import { z } from "zod";

export const clientFormSchema = z.object({
    id: z.string().optional(),
    firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
    lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    phonePrimary: z.string()
        .min(10, { message: "Phone number must be 10 digits" })
        .max(10, { message: "Phone number must be 10 digits" })
        .regex(/^\d{10}$/, { message: "Please enter a valid 10-digit phone number" }),
    phoneSecondary: z.string()
        .optional()
        .nullable()
        .transform((val) => val ?? "")
        .refine(
            (val) => !val || (val.length === 10 && /^\d+$/.test(val)),
            { message: "Please enter a valid 10-digit phone number or leave it empty" }
        ),
    addressLine1: z.string()
        .min(1, { message: "Address is required." })
        .max(100, { message: "Address cannot exceed 100 characters." }),
    addressLine2: z.string().optional(),
    city: z.string().min(1, { message: "City is required." }),
    state: z.string().min(1, { message: "State is required." }),
    postalCode: z.string().min(1, { message: "Postal code is required." }),
    emergencyContactName: z.string()
        .nullable()
        .optional()
        .transform((val) => val ?? ""),
    emergencyContactPhone: z.string()
        .optional()
        .nullable()
        .transform((val) => val ?? "")
        .refine(
            (val) => !val || (val.length === 10 && /^\d+$/.test(val)),
            { message: "Please enter a valid 10-digit phone number or leave it empty" }
        ),
    notes: z.string().optional(),
    isActive: z.boolean().default(true),
    isPremium: z.boolean().default(false),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
