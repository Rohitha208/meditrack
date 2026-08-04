import { z } from "zod"

export const patientFormSchema = z.object({
  clientId: z.string().nonempty("Owner is required"),
  name: z.string().min(1, "Name is required"),
  species: z.string().min(1, "Species is required"),
  breed: z.string().min(1, "Breed is required"),
  secondaryBreed: z.string().optional(),
  color: z.string().min(1, "Color is required"),
  gender: z.string().min(1, "Gender is required"),
  isNeutered: z.boolean().default(false),
  dateOfBirth: z.coerce.date().max(new Date(), "Date of birth cannot be in the future"),
  weightKg: z
    .preprocess(
      (val) => (val === "" || val === null ? undefined : val),
      z.coerce.number().min(0, "Weight must be a positive number")
    )
    .optional(),
  microchipNumber: z.string().min(1, "Microchip number is required"),
  registrationNumber: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type PatientFormValues = z.infer<typeof patientFormSchema>

export const defaultPatientValues: Partial<PatientFormValues> = {
  clientId: "",
  name: "",
  species: "",
  breed: "",
  secondaryBreed: "",
  color: "",
  gender: "",
  isNeutered: false,
  isActive: true,
  weightKg: 0,
  microchipNumber: "",
}
