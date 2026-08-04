"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { PatientsTable } from "@/components/pawtrack/patients/patients-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox } from "@/components/ui/combobox"
import { Plus, Download, Filter } from "lucide-react"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet"
import { NewPatientForm } from "@/components/pawtrack/patients/new-patient-form"
import { useGetPatients } from "@/queries/patients/get-patients"
import { useDebounce } from "@/hooks/use-debounce"
import { useRootContext } from "@/context/RootContext"
import { getCompanyId } from "@/utils/clientCookie"
import Loader from "@/components/ui/loader"
import * as XLSX from 'xlsx'
import { toast } from "@/hooks/use-toast"
import { getToastErrorMessage } from "@/utils/apiErrorHandler"
import { Patient } from "@/queries/patients/get-patients"

export type PatientFilters = {
  name?: string
  gender?: string
  primaryBreed?: string
  microchipNumber?: string
  species?: string
}

const defaultFilters: PatientFilters = {
  name: "",
  gender: "",
  primaryBreed: "",
  microchipNumber: "",
  species: "",
}

export const PatientsScreen = () => {
  const [openNew, setOpenNew] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const { userType, clinic, user } = useRootContext()
  const [isExporting, setIsExporting] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<PatientFilters>({ ...defaultFilters })
  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => v != null && String(v).trim() !== "").length,
    [filters]
  )

  // Memoize companyId resolution
  const companyId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = getCompanyId()
      return stored || user?.companyId || ''
    }
    return user?.companyId || ''
  }, [user?.companyId])

  // Initialize search from URL params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const urlSearch = params.get('search')
      if (urlSearch) {
        setSearchQuery(urlSearch)
      }
    }
  }, [])
  
  // State for debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Update debounced search term when searchQuery changes
  useEffect(() => {
    if (isInitialLoad) {
      // Skip debounce on initial load
      setDebouncedSearchTerm(searchQuery)
      setIsInitialLoad(false)
      return
    }

    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchQuery)
      
      // Update URL with search parameter
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        if (searchQuery) {
          url.searchParams.set('search', searchQuery)
        } else {
          url.searchParams.delete('search')
        }
        window.history.replaceState({}, '', url.toString())
      }
      
      // Reset to first page on new search
      setPage(1)
    }, 300)
    
    return () => {
      clearTimeout(handler)
    }
  }, [searchQuery, isInitialLoad])
  
  // Memoize the query params to prevent unnecessary re-renders
  const queryParams = useMemo(() => ({
    page,
    pageSize,
    search: debouncedSearchTerm,
    companyId
  }), [page, pageSize, debouncedSearchTerm, companyId])
  
// Only make API call when query params change
  const { data: patientsData, isLoading, isError } = useGetPatients(
    queryParams.page,
    queryParams.pageSize,
    queryParams.search,
    '', // clientId
    companyId // Pass companyId for filtering
  )
  
  // Extract patients from the data source
  const patients = patientsData?.items || []
  const totalPages = patientsData?.totalPages || 1

  // Client-side filter by name, gender, primary breed, microchip number, species
  const filteredPatients = useMemo(() => {
    if (activeFilterCount === 0) return patients
    const n = (filters.name ?? "").trim().toLowerCase()
    const g = (filters.gender ?? "").trim().toLowerCase()
    const b = (filters.primaryBreed ?? "").trim().toLowerCase()
    const m = (filters.microchipNumber ?? "").trim().toLowerCase()
    const s = (filters.species ?? "").trim().toLowerCase()
    return patients.filter((p: Patient) => {
      if (n && !(p.name ?? "").toLowerCase().includes(n)) return false
      if (g && (p.gender ?? "").toLowerCase() !== g) return false
      if (b && !(p.breed ?? "").toLowerCase().includes(b)) return false
      if (m && !(p.microchipNumber ?? "").toLowerCase().includes(m)) return false
      if (s && !(p.species ?? "").toLowerCase().includes(s)) return false
      return true
    })
  }, [patients, filters, activeFilterCount])

  // Optimized search handler with URL sync
  const handleSearch = useCallback((searchTerm: string) => {
    setSearchQuery(searchTerm)
    setPage(1) // Reset to first page on new search
    
    // Update URL with search parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (searchTerm) {
        url.searchParams.set('search', searchTerm)
      } else {
        url.searchParams.delete('search')
      }
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize)
    setPage(1) // Reset to first page when changing page size
  }, [])

  const fetchAllPatients = useCallback(async () => {
    const params = new URLSearchParams()
    if (companyId) params.append('companyId', companyId)

    const url = `/api/patients${params.toString() ? `?${params.toString()}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to fetch patients data')
    }
    
    const data = await response.json()
    return data.items || data || []
  }, [companyId])

  const handleExportToExcel = useCallback(async () => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company ID not found. Please try again.",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)
    try {
      const allPatients = await fetchAllPatients()
      
      if (allPatients.length === 0) {
        toast({
          title: "No Data",
          description: "No patients found to export.",
          variant: "destructive",
        })
        return
      }
      
      // Prepare data for Excel export
      const excelData = allPatients.map((patient: any) => ({
        'Patient Name': patient.name,
        'Species': patient.species,
        'Breed': patient.breed,
        'Secondary Breed': patient.secondaryBreed || '',
        'Color': patient.color,
        'Gender': patient.gender,
        'Neutered': patient.isNeutered ? 'Yes' : 'No',
        'Date of Birth': patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '',
        'Weight (Kg)': patient.weightKg || '',
        'Microchip Number': patient.microchipNumber || '',
        'Registration Number': patient.registrationNumber || '',
        'Insurance Provider': patient.insuranceProvider || '',
        'Insurance Policy Number': patient.insurancePolicyNumber || '',
        'Allergies': patient.allergies || '',
        'Medical Conditions': patient.medicalConditions || '',
        'Behavioral Notes': patient.behavioralNotes || '',
        'Client First Name': patient.clientFirstName,
        'Client Last Name': patient.clientLastName,
        'Client Email': patient.clientEmail,
        'Client Phone': patient.clientPhonePrimary,
        'Client Address': `${patient.clientAddressLine1}, ${patient.clientCity}, ${patient.clientState} ${patient.clientPostalCode}`,
        'Active': patient.isActive ? 'Yes' : 'No',
        'Created At': patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : '',
        'Updated At': patient.updatedAt ? new Date(patient.updatedAt).toLocaleDateString() : ''
      }))

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(excelData)
      
      // Set column widths
      const columnWidths = [
        { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
        { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 15 },
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 30 },
        { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
        { wch: 40 }, { wch: 8 }, { wch: 12 }, { wch: 12 }
      ]
      worksheet['!cols'] = columnWidths

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Patients')

      const currentDate = new Date().toISOString().split('T')[0]
      const filename = `patients_export_${currentDate}.xlsx`

      XLSX.writeFile(workbook, filename)

      toast({
        title: "Export Successful",
        description: `Exported ${allPatients.length} patients to ${filename}`,
        variant: "success",
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Export Failed",
        description: getToastErrorMessage(error, "Failed to export patients data"),
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }, [companyId, fetchAllPatients])

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4 md:mb-0">
          Patients
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export to Excel"}
          </Button>
          <Sheet open={openNew} onOpenChange={setOpenNew}>
            <SheetTrigger asChild>
              <Button className={`theme-button text-white`}>
                <Plus className="mr-2 h-4 w-4" /> Add Patient
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[62%]">
              <SheetHeader>
                <SheetTitle className="relative top-[-10px]">New Patient</SheetTitle>
              </SheetHeader>
              <NewPatientForm onSuccess={() => setOpenNew(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="space-y-4 bg-slate-50 dark:bg-slate-900 p-6">
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Filters</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ ...defaultFilters })}
              >
                Clear Filters
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-name">Name</Label>
                <Input
                  id="filter-name"
                  placeholder="Search by name..."
                  value={filters.name ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-gender">Gender</Label>
                <Combobox
                  options={[
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                  ]}
                  value={[ "Male", "Female" ].includes(filters.gender ?? "") ? (filters.gender ?? "") : ""}
                  onValueChange={(v) => setFilters((f) => ({ ...f, gender: v }))}
                  placeholder="Select gender"
                  searchPlaceholder="Search gender..."
                  emptyText="No gender found."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-breed">Primary Breed</Label>
                <Input
                  id="filter-breed"
                  placeholder="Search by breed..."
                  value={filters.primaryBreed ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, primaryBreed: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-microchip">Microchip Number</Label>
                <Input
                  id="filter-microchip"
                  placeholder="Microchip number..."
                  value={filters.microchipNumber ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, microchipNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-species">Species</Label>
                <Combobox
                  options={[
                    { value: "Dog", label: "Dog" },
                    { value: "Cat", label: "Cat" },
                  ]}
                  value={[ "Dog", "Cat" ].includes(filters.species ?? "") ? (filters.species ?? "") : ""}
                  onValueChange={(v) => setFilters((f) => ({ ...f, species: v }))}
                  placeholder="Select species"
                  searchPlaceholder="Search species..."
                  emptyText="No species found."
                />
              </div>
            </div>
          </div>
        )}

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.name && (
              <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 px-2 py-1 rounded text-xs">
                Name: {filters.name}
              </span>
            )}
            {filters.gender && (
              <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 px-2 py-1 rounded text-xs">
                Gender: {filters.gender}
              </span>
            )}
            {filters.primaryBreed && (
              <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 px-2 py-1 rounded text-xs">
                Breed: {filters.primaryBreed}
              </span>
            )}
            {filters.microchipNumber && (
              <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-1 rounded text-xs">
                Microchip: {filters.microchipNumber}
              </span>
            )}
            {filters.species && (
              <span className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-2 py-1 rounded text-xs">
                Species: {filters.species}
              </span>
            )}
            <button
              type="button"
              className="text-xs text-gray-500 dark:text-gray-400 underline"
              onClick={() => setFilters({ ...defaultFilters })}
            >
              Clear all
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="min-h-[calc(100vh-20rem)] flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader size="lg" label="Loading patients..." />
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-destructive">Error loading patients. Please try again.</p>
          </div>
        ) : (
          <PatientsTable
            patients={filteredPatients}
            totalPages={totalPages}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSearch={handleSearch}
            showClinicColumn={!user?.clinicId}
          />
        )}
      </div>
    </div>
  )
}