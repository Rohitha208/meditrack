"use client"

import React, { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import DatePicker from "react-datepicker"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Plus, Mic, Loader2, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCreatePatient } from "@/queries/patients/create-patients"
import { ClientForm } from "@/components/clients/client-form"
import { Separator } from "@/components/ui/separator"
import { Client } from "@/queries/clients/get-client"
import { useRootContext } from '@/context/RootContext'
import { useGetClients } from "@/queries/clients/get-client"
import { getCompanyId } from "@/utils/clientCookie"
import { AudioManager } from "@/components/audioTranscriber/AudioManager"
import { useTranscriber } from "@/components/audioTranscriber/hooks/useTranscriber"
import { useDebounce } from "@/hooks/use-debounce"
import { patientFormSchema, PatientFormValues, defaultPatientValues } from "@/components/schema/patientSchema"
import "react-datepicker/dist/react-datepicker.css"

interface NewPatientFormProps {
  onSuccess: () => void;
  defaultClientId?: string;
  hideOwnerSection?: boolean;
}

export function NewPatientForm({ onSuccess, defaultClientId, hideOwnerSection = false }: NewPatientFormProps) {
  const [isPending, setIsPending] = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)
  const { user, userType, clinic } = useRootContext()
  const createPatientMutation = useCreatePatient()
  const { toast } = useToast()
  
  // New states for client search
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)
  const debouncedClientQuery = useDebounce(handleClientSearch, 300)  // Debounce the client search query
  const [selectedClient, setSelectedClient] = useState<{ id: string, name: string } | null>(null)
  
  const companyId = (typeof window !== 'undefined' && getCompanyId()) || user?.companyId || ''
  const { data: clientsData, isLoading: isLoadingClients } = useGetClients(
    1, 100, clientSearchQuery, 'first_name', companyId, !!clientSearchQuery
  )
  const clients = clientsData?.items || []

  // Set default values with provided clientId
  const initialValues = {
    ...defaultPatientValues,
    clientId: defaultClientId || "",
  }

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: initialValues
  })

  // Set clientId when defaultClientId is provided
  useEffect(() => {
    if (defaultClientId) {
      form.setValue("clientId", defaultClientId);
    }
  }, [defaultClientId, form]);

  // Handle client selection
  const handleClientSelect = (client: Client) => {
    setSelectedClient({
      id: client.id,
      name: `${client.firstName} ${client.lastName}`
    });
    
    form.setValue("clientId", client.id);
    
    setClientSearchQuery(""); // Clear the search input
    setIsSearchDropdownOpen(false); // Close the dropdown
  };
  
  // Clear the selected client
  const clearSelectedClient = () => {
    setSelectedClient(null);
    form.setValue("clientId", "");
  };

  async function onSubmit(data: PatientFormValues) {
    setIsPending(true)
    try {
      // Use the selected client ID from the form
      const patientData = {
        ...data,
        // Ensure weight is always a number, defaulting to 0 when cleared
        weightKg: data.weightKg ?? 0,
        companyId,
        dateOfBirth: format(data.dateOfBirth, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
      }

      await createPatientMutation.mutateAsync(patientData)
      
      toast({
        title: "Pet registered",
        description: "Your pet has been successfully registered.",
        variant: "success", 
      })
      
      onSuccess()
      form.reset(initialValues)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred while registering the pet.",
        variant: "error",
      })
    } finally {
      setIsPending(false)
    }
  }

  function handleClientSearch(searchTerm: string) {
    setClientSearchQuery(searchTerm);
  }

  const handleClientCreated = (client: Client) => {
    // Set the client ID in the form
    form.setValue("clientId", client.id);
    setSelectedClient({
      id: client.id,
      name: `${client.firstName} ${client.lastName}`
    });
    toast({
      title: "Owner added",
      description: `${client.firstName} ${client.lastName} has been added as an owner.`,
      variant: "success",
    });
    // Delay closing the form to allow the toast to be seen
    setTimeout(() => {
      setShowClientForm(false);
    }, 500); // Adjust delay as needed, 500ms (0.5 seconds) is usually enough
  };

  const [audioModalOpen, setAudioModalOpen] = useState<null>(null);
  const transcriber = useTranscriber();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 h-[calc(100vh-6rem)]">
        <div className="flex flex-col lg:flex-row  rounded-md gap-4">
          {/* Left side - Owner information */}
          {!hideOwnerSection && (
            <div className="flex-1 space-y-6 p-4 border rounded-md h-[calc(100vh-10rem)] overflow-y-auto">
              <h3 className="text-lg font-medium">Owner Information</h3>
              {!showClientForm ? (
                <div className="space-y-4">
                  {/* Owner search */}
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner*</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <div className="relative flex-grow">
                              {selectedClient ? (
                                <div className="flex items-center justify-between p-2 border rounded-md">
                                  <span>{selectedClient.name}</span>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    className="p-1 h-auto"
                                    onClick={clearSelectedClient}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <div className="relative w-full">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                    <Input
                                      placeholder="Search owners by name"
                                      className="pl-10"
                                      value={clientSearchQuery}
                                      onChange={(e) => {
                                        debouncedClientQuery(e.target.value);
                                      
                                        setIsSearchDropdownOpen(true);
                                      }}
                                      onFocus={() => setIsSearchDropdownOpen(true)}
                                    />
                                  </div>
                                  
                                  {/* Search results dropdown */}
                                  {isSearchDropdownOpen && clientSearchQuery && (
                                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                      {isLoadingClients ? (
                                        <div className="p-2 text-center text-gray-500">Searching...</div>
                                      ) : clients.length === 0 ? (
                                        <div className="p-2 text-center text-gray-500">No owners found</div>
                                      ) : (
                                        <ul>
                                          {clients.map((client) => (
                                            <li
                                              key={client.id}
                                              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                              onClick={() => handleClientSelect(client)}
                                            >
                                              <div className="font-medium">{client.firstName} {client.lastName}</div>
                                              <div className="text-sm text-gray-500">
                                                {client.email}
                                              </div>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                              onClick={() => setShowClientForm(!showClientForm)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <input type="hidden" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="mb-2"
                    onClick={() => setShowClientForm(false)}
                  >
                    Back to Owner Selection
                  </Button>
                  <ClientForm 
                    onSuccess={handleClientCreated}
                    nestedForm={true}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Hidden input for clientId when owner section is hidden */}
          {hideOwnerSection && (
            <input type="hidden" {...form.register("clientId")} />
          )}

          {/* Vertical separator */}
          {!hideOwnerSection && (
            <>
              <div className="hidden lg:block">
                <Separator orientation="vertical" className="h-full" />
              </div>
              
              {/* Horizontal separator for mobile */}
              <div className="block lg:hidden">
                <Separator className="w-full" />
              </div>
            </>
          )}

          {/* Right side - Patient information */}
          <div className={`flex-1 p-4 space-y-6 h-[calc(100vh-10rem)] border rounded-md overflow-y-auto ${hideOwnerSection ? 'w-full' : ''}`}>
            <h3 className="text-lg font-medium">Pet Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Pet name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="species"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Species*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  name="breed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Breed*</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Primary Breed"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.replace(/\d/g, ""))}
                          inputMode="text"
                          pattern="[^0-9]*"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="secondaryBreed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Breed</FormLabel>
                      <FormControl>
                        <Input placeholder="Secondary breed (optional)" {...field} 
                        onChange={(e) => field.onChange(e.target.value.replace(/\d/g, ""))}
                        inputMode="text"
                        pattern="[^0-9]*"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color*</FormLabel>
                      <FormControl>
                        <Input placeholder="Color" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
          
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth*</FormLabel>
                      <FormControl>
                        <DatePicker
                          selected={field.value}
                          onChange={(date) => field.onChange(date)}
                          minDate={new Date("1900-01-01")}
                          maxDate={new Date()}
                          placeholderText="dd/mm/yyyy"
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
                  name="weightKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
            
                <FormField
                  control={form.control}
                  name="microchipNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Microchip Number*</FormLabel>
                      <FormControl>
                        <Input placeholder="Microchip number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="registrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Registration number (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
      
                <FormField
                  control={form.control}
                  name="insuranceProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance Provider</FormLabel>
                      <FormControl>
                        <Input placeholder="Insurance provider (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="insurancePolicyNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance Policy Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Policy number (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes field */}
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes (optional)" 
                          className="min-h-[100px]"
                          {...field} 
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

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => onSuccess()}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isPending || (!hideOwnerSection && showClientForm)}
            className="theme-button text-white"
          >
            {isPending ? "Registering..." : "Register Pet"}
          </Button>
        </div>
      </form>
    </Form>
  )
}