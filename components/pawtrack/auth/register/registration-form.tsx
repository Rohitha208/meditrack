"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { Loader2, Building2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
// import { useToast } from '@/hooks/use-toast';
import { useCreateClientRegistration } from "@/queries/clientRegistration/create-registration"
import { getCompanySubdomain } from "@/utils/subdomain"
import { useGetCompanyBySubdomain } from "@/queries/companies"
import { useLoginMutation } from "@/queries/auth/login-user"
import { setJwtToken, setUserId, setClientId } from "@/utils/clientCookie"
import { useRootContext } from "@/context/RootContext"

const registrationSchema = z
  .object({
    firstName: z.string().min(2, {
      message: "First name is required.",
    }),
    lastName: z.string().min(2, {
      message: "Last name is required.",
    }),
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
    password: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string().min(8, {
      message: "Please confirm your password.",
    }),
    phonePrimary: z
      .string()
      .min(10, {
        message: "Phone number must be 10 digits.",
      })
      .max(10, {
        message: "Phone number must be exactly 10 digits.",
      })
      .regex(/^\d{10}$/, {
        message: "Please enter a valid 10-digit phone number (numbers only).",
      }),
    addressLine1: z.string().min(5, {
      message: "Address is required.",
    }),
    city: z.string().min(2, {
      message: "City is required.",
    }),
    state: z.string().min(2, {
      message: "State is required.",
    }),
    postalCode: z.string().min(5, {
      message: "Postal code is required.",
    }),
    phoneSecondary: z.string().optional(),
    addressLine2: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    notes: z.string().optional(),
    includePetsInRegistration: z.boolean().default(false),
    pets: z
      .array(
        z.object({
          name: z.string().min(1, { message: "Pet name is required" }),
          species: z.string().min(1, { message: "Species is required" }),
          breed: z.string().min(1, { message: "Breed is required" }),
          secondaryBreed: z.string().optional(),
          color: z.string().optional(),
          gender: z.string().min(1, { message: "Gender is required" }),
          isNeutered: z.boolean().optional(),
          dateOfBirth: z.string().min(1, { message: "Date of birth is required" }),
          weightKg: z.coerce.number().optional(),
          microchipNumber: z.string().optional(),
          registrationNumber: z.string().optional(),
          insuranceProvider: z.string().optional(),
          insurancePolicyNumber: z.string().optional(),
          allergies: z.string().optional(),
          medicalConditions: z.string().optional(),
          behavioralNotes: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .default([]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type RegistrationFormValues = z.infer<typeof registrationSchema>

export function RegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  // const { toast } = useToast();
  const router = useRouter()
  const createClientRegistration = useCreateClientRegistration()
  const { fetchUser } = useRootContext()

  // Get company information based on subdomain
  const subdomain = getCompanySubdomain()
  const { data: company, isLoading: companyLoading, error: companyError } = useGetCompanyBySubdomain(subdomain)

  const loginMutation = useLoginMutation({
    onSuccess: (data: any) => {
      setJwtToken(data.token)
      setUserId(data.user.id)
      if (data.user.roleName === "Client") {
        setClientId(data.user.id)
      }
      fetchUser(data, data.user.roleName)
      router.push(data.redirectUrl ? data.redirectUrl : "/dashboard")
      toast.success("Login Successful", {
        description: "Welcome to the PawTrack",
      })
    },
    onError: (error) => {
      toast.error("Login failed", {
        description: error instanceof Error ? error.message : "Please try logging in manually.",
      })
      setIsSubmitting(false)
    },
  })

  const form = useForm<RegistrationFormValues>({
    resolver: async (data, context, options) => {
      // Validate with Zod
      const result = await zodResolver(registrationSchema)(data, context, options)

      // Log the validation result
      console.log("Validation result:", {
        isValid: !Object.keys(result.errors || {}).length,
        errors: result.errors,
      })

      return result
    },
    mode: "onBlur",
    criteriaMode: "all", // Show all validation errors
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phonePrimary: "",
      phoneSecondary: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: "",
      includePetsInRegistration: false,
      pets: [],
    },
  })

  const {
    fields: petFields,
    append: addPet,
    remove: removePet,
  } = useFieldArray({
    control: form.control,
    name: "pets",
  })
  const includePets = form.watch("includePetsInRegistration")
  // When Include Pets is No, clear the pets array to avoid validation on blank items
  useEffect(() => {
    if (!includePets) {
      form.setValue("pets", [])
    }
  }, [includePets, form])

  // When entering Step 2 with Include Pets = Yes and no pets yet, append a blank pet item
  useEffect(() => {
    if (includePets && step === 2 && (form.getValues("pets")?.length ?? 0) === 0) {
      addPet({
        name: "",
        species: "",
        breed: "",
        secondaryBreed: "",
        color: "",
        gender: "",
        isNeutered: false,
        dateOfBirth: "",
        weightKg: "" as any,
        microchipNumber: "",
        registrationNumber: "",
        insuranceProvider: "",
        insurancePolicyNumber: "",
        allergies: "",
        medicalConditions: "",
        behavioralNotes: "",
        isActive: true,
      } as any)
    }
  }, [includePets, step, addPet, form])

  if (companyLoading) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading company information...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (companyError || !company) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="py-8">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Company Not Found</h3>
            <p className="text-muted-foreground mb-4">Unable to find company information for this subdomain.</p>
            <p className="text-sm text-muted-foreground">
              Please contact your administrator or try accessing the correct company portal.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const onSubmit = async (values: RegistrationFormValues) => {
    setIsSubmitting(true)

    // Remove confirmPassword as it's not part of the API payload
    const { confirmPassword, ...registrationData } = values

    // Add company ID to the registration data
    const registrationWithCompany = {
      ...registrationData,
      companyId: company?.id as string,
      includePetsInRegistration: registrationData.includePetsInRegistration,
      pets: registrationData.includePetsInRegistration
        ? (registrationData.pets || [])
            .filter((p) => p && (p.name?.trim() || "").length > 0)
            .map((p) => {
              const rawWeight: any = (p as any).weightKg
              return {
                ...p,
                dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString() : undefined,
                isActive: true,
                weightKg:
                  rawWeight === "" || rawWeight === undefined
                    ? undefined
                    : typeof rawWeight === "string"
                      ? isNaN(Number.parseFloat(rawWeight))
                        ? undefined
                        : Number.parseFloat(rawWeight)
                      : rawWeight,
              }
            })
        : [],
    }

    createClientRegistration.mutate(registrationWithCompany, {
      onSuccess: () => {
        // Immediately log the user in with the provided credentials
        loginMutation.mutate({
          email: registrationWithCompany.email,
          password: registrationWithCompany.password,
        } as any)
      },
      onError: (error) => {
        toast.error("Registration failed", {
          description: error instanceof Error ? error.message : "Registration failed. Please try again.",
        })
        setIsSubmitting(false)
      },
      onSettled: () => {
        // Keep isSubmitting controlled by login attempt
        if (!loginMutation.isPending) setIsSubmitting(false)
      },
    })
  }

  return (
    <Card className="mx-auto max-w-2xl max-h-full md:max-h-[calc(100vh-15rem)] overflow-y-auto">
      <CardContent>
        <Form {...form}>
          {step === 2 ? (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Patient Details</h3>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      addPet({
                        name: "",
                        species: "",
                        breed: "",
                        secondaryBreed: "",
                        color: "",
                        gender: "",
                        isNeutered: false,
                        dateOfBirth: "",
                        weightKg: "" as any,
                        microchipNumber: "",
                        registrationNumber: "",
                        insuranceProvider: "",
                        insurancePolicyNumber: "",
                        allergies: "",
                        medicalConditions: "",
                        behavioralNotes: "",
                        isActive: true,
                      })
                    }
                  >
                    Add Pet
                  </Button>
                </div>

                {petFields.map((pf, index) => (
                  <div key={pf.id} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Pet {index + 1}</div>
                      {petFields.length > 1 && (
                        <Button type="button" variant="ghost" onClick={() => removePet(index)}>
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`pets.${index}.name` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Pet Name <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Buddy" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`pets.${index}.species` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Species <span className="text-destructive">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select species" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Dog">Dog</SelectItem>
                                <SelectItem value="Cat">Cat</SelectItem>
                                <SelectItem value="Bird">Bird</SelectItem>
                                <SelectItem value="Rabbit">Rabbit</SelectItem>
                                <SelectItem value="Turtle">Turtle</SelectItem>
                                <SelectItem value="Hamster">Hamster</SelectItem>
                                <SelectItem value="Fish">Fish</SelectItem>
                                <SelectItem value="Guinea Pig">Guinea Pig</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`pets.${index}.breed` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Breed <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Breed" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`pets.${index}.secondaryBreed` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secondary Breed</FormLabel>
                            <FormControl>
                              <Input placeholder="Secondary breed" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`pets.${index}.gender` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Gender <span className="text-destructive">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">male</SelectItem>
                                <SelectItem value="female">female</SelectItem>
                                <SelectItem value="unknown">unknown</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`pets.${index}.dateOfBirth` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Date of Birth <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <DatePicker
                                selected={field.value ? new Date(field.value as any) : null}
                                onChange={(date: Date | null) => field.onChange(date ? date.toISOString() : "")}
                                minDate={new Date("1900-01-01")}
                                maxDate={new Date()}
                                placeholderText="dd/MM/yyyy"
                                dateFormat="dd/MM/yyyy"
                                showYearDropdown
                                showMonthDropdown
                                dropdownMode="select"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`pets.${index}.weightKg` as const}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" placeholder="0" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`pets.${index}.isNeutered` as const}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 pt-6">
                            <FormLabel className="!mb-0">Neutered</FormLabel>
                            <FormControl>
                              <input
                                type="checkbox"
                                className="mt-0 align-middle"
                                checked={!!field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-4`}>
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        First Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Last Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your.email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phonePrimary"
                  render={({ field }) => {
                    const formatPhoneNumber = (value: string) => {
                      const numbers = value.replace(/\D/g, "")
                      return numbers.slice(0, 10)
                    }
                    return (
                      <FormItem>
                        <FormLabel>
                          Phone Number <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="9876543210"
                            {...field}
                            value={field.value}
                            onChange={(e) => {
                              const formatted = formatPhoneNumber(e.target.value)
                              field.onChange(formatted)
                            }}
                            maxLength={10}
                            inputMode="numeric"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Password <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Confirm Password <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Address <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        City <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        State <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Postal Code <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Postal code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="includePetsInRegistration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Include pet in registration?</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2">
                          <input type="radio" checked={field.value === true} onChange={() => field.onChange(true)} />
                          Yes
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" checked={field.value === false} onChange={() => field.onChange(false)} />
                          No
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </Form>

        <div className="flex items-center justify-between mt-6">
          {step === 2 ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.clearErrors("pets")
                  setStep(1)
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex justify-end">
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    createClientRegistration.isPending ||
                    loginMutation.isPending ||
                    !!form.formState.errors.pets ||
                    (form.watch("includePetsInRegistration") &&
                      (!form.watch("pets") ||
                        form.watch("pets").length === 0 ||
                        form
                          .watch("pets")
                          .some(
                            (pet) =>
                              !pet.name?.trim() ||
                              !pet.species?.trim() ||
                              !pet.breed?.trim() ||
                              !pet.gender?.trim() ||
                              !pet.dateOfBirth,
                          )))
                  }
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit
                </Button>
              </form>
            </>
          ) : (
            <Button
              type="button"
              className="ml-auto"
              onClick={async () => {
                const isValid = await form.trigger([
                  "firstName",
                  "lastName",
                  "email",
                  "phonePrimary",
                  "password",
                  "confirmPassword",
                  "addressLine1",
                  "city",
                  "state",
                  "postalCode",
                ])

                if (!isValid) return

                if (form.watch("includePetsInRegistration")) {
                  setStep(2)
                } else {
                  await form.handleSubmit(onSubmit)()
                }
              }}
              disabled={
                isSubmitting ||
                createClientRegistration.isPending ||
                loginMutation.isPending ||
                !form.watch("firstName")?.trim() ||
                !form.watch("lastName")?.trim() ||
                !form.watch("email")?.trim() ||
                !form.watch("phonePrimary")?.trim() ||
                !form.watch("password") ||
                !form.watch("confirmPassword") ||
                !form.watch("addressLine1")?.trim() ||
                !form.watch("city")?.trim() ||
                !form.watch("state")?.trim() ||
                !form.watch("postalCode")?.trim()
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {form.watch("includePetsInRegistration") ? "Next" : "Submitting..."}
                </>
              ) : form.watch("includePetsInRegistration") ? (
                "Next"
              ) : (
                "Submit"
              )}
            </Button>
          )}
        </div>

        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link
            href="/login"
            className="ml-auto inline-block text-sm underline theme-text-accent hover:opacity-80 font-medium"
          >
            Login here
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
