"use client"

import { useState, useEffect, useRef } from "react"
import { Search, User, Loader2, Plus, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useGetPatients } from "@/queries/patients/get-patients"
import { useDebounce } from "@/hooks/use-debounce"
import { useRootContext } from '@/context/RootContext'
import { useSelectedPatient } from "./contexts/selectedDoctor"

// Extended patient interface to handle API response variations
interface SearchPatientResult {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  patientId?: string;
  species?: string;
  clientId?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientPhonePrimary?: string;
  microchipNumber?: string;
  client?: {
    id?: string;
    firstName?: string;
    lastName?: string;
  }
}

export function PatientSearchDropdown() {
  const { user, clinic } = useRootContext()
  const companyId = clinic?.companyId || user?.companyId || null
  
  // Patient search state
  const [patientSearchQuery, setPatientSearchQuery] = useState("")
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(patientSearchQuery);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [patientSearchQuery]);

  const { selectedPatient, setSelectedPatient } = useSelectedPatient()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: searchResults, isLoading: isSearching } = useGetPatients(
    1, // pageNumber
    50, // pageSize - get more results for search
    debouncedSearchTerm, // Use the debounced string value here
    '', // clientId - empty for general search
    companyId || undefined // companyId
  )

  // Cast the search results to our custom interface to handle API variations
  const typedSearchResults = (searchResults?.items || []) as SearchPatientResult[];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handlePatientSearch = (searchTerm: string) => {
    setPatientSearchQuery(searchTerm)
    setIsSearchDropdownOpen(true)
  }

  // Handle selecting a patient from search results
  const handlePatientSelect = (patient: SearchPatientResult) => {
    // Determine the correct patient name based on different possible API structures
    let patientName = '';

    if (patient.name) {
      patientName = patient.name;
    }
    else if (patient.patientId) {
      patientName = patient.patientId;
      if (patient.species) {
        patientName += ` (${patient.species})`;
      }
    }
    else if (patient.firstName || patient.lastName) {
      patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    }

    if (!patientName) {
      patientName = `Patient (ID: ${patient.id.substring(0, 8)}...)`;
    }

    // Get client ID - check both possible locations based on API structure
    const clientId = patient.clientId || patient.client?.id;

    // Always select the patient
    setSelectedPatient({
      id: patient.id,
      name: patientName,
      clientId: clientId
    });

    setPatientSearchQuery(""); // Clear the search input
    setIsSearchDropdownOpen(false); // Close the dropdown
  }

  const handleClearSelection = () => {
    setSelectedPatient(null)
    setPatientSearchQuery("")
  }

  return (
    <Card className="border border-[#1E3D3D]/40 dark:border-[#1E3D3D]/60 shadow-sm 
  bg-gradient-to-r from-white to-[#D2EFEC]/30 
  dark:from-slate-900 dark:to-[#1E3D3D]/20">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <div className="relative flex-1 w-full sm:w-auto" ref={dropdownRef}>
            <div className="flex flex-col sm:flex-row gap-1.5">
              <div className="relative flex-1">
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <span>{selectedPatient.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto"
                      onClick={handleClearSelection}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <Input
                        placeholder="Search patients by name"
                        className="pl-10"
                        value={patientSearchQuery}
                        onChange={(e) => {
                          handlePatientSearch(e.target.value);
                          setIsSearchDropdownOpen(true);
                        }}
                        onFocus={() => setIsSearchDropdownOpen(true)}
                      />
                    </div>

                    {/* Search results dropdown */}
                    {isSearchDropdownOpen && patientSearchQuery && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {isSearching ? (
                          <div className="p-2 text-center text-gray-500">Searching...</div>
                        ) : typedSearchResults.length === 0 ? (
                          <div className="p-2 text-center text-gray-500">No patients found</div>
                        ) : (
                          <ul>
                            {typedSearchResults.map((patient) => {
                              // Get the client name first
                              let clientName = '';

                              if (patient.client) {
                                clientName = `${patient.client.firstName || ''} ${patient.client.lastName || ''}`.trim();
                              } else if (patient.clientFirstName || patient.clientLastName) {
                                clientName = `${patient.clientFirstName || ''} ${patient.clientLastName || ''}`.trim();
                              }

                              // Get the patient name
                              let patientName = '';

                              if (patient.name) {
                                patientName = patient.name;
                              }
                              else if (patient.patientId) {
                                patientName = patient.patientId;
                                if (patient.species) {
                                  patientName += ` (${patient.species})`;
                                }
                              }
                              else if (patient.firstName || patient.lastName) {
                                patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
                              }

                              // If we still don't have a patient name, use the ID as last resort
                              if (!patientName) {
                                patientName = `Patient (ID: ${patient.id.substring(0, 8)}...)`;
                              }

                              // Combine client and patient names with phone number in the format {clients name}-{patients name} ({phone})
                              const phoneNumber = patient.clientPhonePrimary;
                              const microchipDisplay = patient.microchipNumber ? ` (Microchip: ${patient.microchipNumber})` : '';

                              const displayName = clientName
                                ? phoneNumber
                                  ? `${patientName}-${clientName} (${phoneNumber})${microchipDisplay}`
                                  : `${patientName}-${clientName}${microchipDisplay}`
                                : `${patientName}${microchipDisplay}`;

                              return (
                                <li
                                  key={patient.id}
                                  className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                  onClick={() => handlePatientSelect(patient)}
                                >
                                  <div className="font-medium">{displayName}</div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

