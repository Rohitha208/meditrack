"use client"

import { useState, useEffect, useRef } from "react"
import { Search } from "lucide-react"
import { usePatientSearch, Patient } from "@/components/pawtrack/appointments/hooks/use-patient-search"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

// Re-export the Patient interface for other components to use
export type { Patient }

interface PatientSearchProps {
    onPatientSelect: (patient: Patient) => void
    className?: string
}

const searchOptions = [
    { value: "name", label: "Patient Name" },
    { value: "client_first_name", label: "Client Name" },
    { value: "client_email", label: "Client Email" },
    { value: "client_phone_primary", label: "Client Phone" },
]

export function PatientSearch({ onPatientSelect, className }: PatientSearchProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [searchType, setSearchType] = useState("name")
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const { results, isLoading, error } = usePatientSearch(searchQuery, searchType)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
        setIsDropdownOpen(true)
    }

    const handleSelect = (patient: Patient) => {
        onPatientSelect(patient)
        setSearchQuery("")
        setIsDropdownOpen(false)
    }

    // Helper function to get secondary information for display
    const getSecondaryInfo = (patient: Patient): string => {
        // If we have client information, display it
        if (patient.email && searchType === "client_email") {
            return `Email: ${patient.email}`;
        }
        if (patient.phone && searchType === "client_phone_primary") {
            return `Phone: ${patient.phone}`;
        }
        // Default to displaying any available contact info regardless of search type
        if (patient.email) return `Email: ${patient.email}`;
        if (patient.phone) return `Phone: ${patient.phone}`;
        return '';
    }

    return (
        <div className={cn("relative w-full", className)} ref={dropdownRef}>
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                        type="text"
                        placeholder="Search patients..."
                        value={searchQuery}
                        onChange={handleInputChange}
                        className="pl-10 h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-md"
                    />
                </div>
                <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger className="w-full sm:w-[180px] h-11 transition-all duration-200">
                        <SelectValue placeholder="Search by" />
                    </SelectTrigger>
                    <SelectContent>
                        {searchOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isDropdownOpen && searchQuery && (
                <div className="absolute z-50 mt-2 w-full rounded-lg bg-white shadow-xl border border-gray-100 transition-all duration-200 animate-in fade-in slide-in-from-top-2">
                    {isLoading ? (
                        <div className="p-4 text-sm text-gray-500 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                            Loading...
                        </div>
                    ) : error ? (
                        <div className="p-4 text-sm text-red-500 bg-red-50 rounded-lg m-2">Error: {error}</div>
                    ) : results.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">No results found</div>
                    ) : (
                        <ul className="max-h-[300px] overflow-auto py-2">
                            {results.map((patient) => (
                                <li
                                    key={patient.id}
                                    className="cursor-pointer px-4 py-3 hover:bg-gray-50 transition-colors duration-150"
                                    onClick={() => handleSelect(patient)}
                                >
                                    <div className="font-medium text-gray-900">{patient.name}</div>
                                    {patient.clientName && (
                                        <div className="text-sm text-gray-600 mt-0.5">
                                            Owner: {patient.clientName}
                                        </div>
                                    )}
                                    {getSecondaryInfo(patient) && (
                                        <div className="text-sm text-gray-500 mt-0.5">
                                            {getSecondaryInfo(patient)}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
} 