"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Search, Calendar, X, User, Building2, MapPin, Clock, Download } from "lucide-react"
import { useGetDischargeSummaryByClientId } from "@/queries/discharge-summary/get-discharge-summary-by-clientId"
import { useGetPatients } from "@/queries/patients/get-patients"
import { getClientId } from "@/utils/clientCookie"
import DischargeSummarySheet from "@/components/pawtrack/appointments/discharge-summary-sheet"
import CertificateDownload from "@/components/pawtrack/appointments/certificate-download"
import { DatePickerWithRangeV2 } from "@/components/ui/custom/date/date-picker-with-range"
import type { DateRange } from "react-day-picker"

export default function MedicalRecords() {
  const [isClient, setIsClient] = useState(false)
  const [dischargeSummaryOpen, setDischargeSummaryOpen] = useState(false)
  const [certificateDownloadOpen, setCertificateDownloadOpen] = useState(false)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  // Safely get clientId only on client side
  const [clientId, setClientId] = useState<string>("");

  useEffect(() => {
    // Only get clientId on client side
    if (typeof window !== 'undefined') {
      setClientId(getClientId() || "");
    }
  }, []);

  const { data: petsData } = useGetPatients(1, 100, "", clientId);
  const pets = petsData?.items || [];

  // Convert dates to ISO strings for API
  const fromDate = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : undefined;
  const toDate = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : undefined;

  const dischargeSummaryQuery = useGetDischargeSummaryByClientId(clientId, fromDate, toDate);

  // Handle the API response structure properly - the data might be directly an array or have an items property
  const dischargeSummaries = Array.isArray(dischargeSummaryQuery.data)
    ? dischargeSummaryQuery.data
    : dischargeSummaryQuery.data?.items || [];
  const isDischargeSummariesLoading = dischargeSummaryQuery.isLoading;
  const dischargeSummariesError = dischargeSummaryQuery.error;

  // Set isClient to true once component mounts on client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Safe date formatting to prevent hydration mismatches
  const formatDate = (dateString: string) => {
    if (!isClient) return ''; // Return empty string during SSR

    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return '';
    }
  }

  // Get appointment type badge color
  const getAppointmentTypeBadge = (appointmentType: string) => {
    const type = appointmentType?.toLowerCase() || '';
    if (type.includes('consultation')) {
      return <Badge className="bg-blue-100 text-blue-800">Consultation</Badge>;
    } else if (type.includes('surgery')) {
      return <Badge className="bg-red-100 text-red-800">Surgery</Badge>;
    } else if (type.includes('emergency')) {
      return <Badge className="bg-orange-100 text-orange-800">Emergency</Badge>;
    } else if (type.includes('deworming')) {
      return <Badge className="bg-green-100 text-green-800">Deworming</Badge>;
    } else if (type.includes('vaccination')) {
      return <Badge className="bg-purple-100 text-purple-800">Vaccination</Badge>;
    } else if (type.includes('certification')) {
      return <Badge className="bg-yellow-100 text-yellow-800">Certification</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800">{appointmentType}</Badge>;
    }
  };

  // Clear filters
  const clearFilters = () => {
    setDateRange(undefined)
  }

  // Don't render anything until we're on the client
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Medical Records</h2>
          <p className="text-gray-600 mt-1">View your pets' medical history and discharge summaries</p>
        </div>
        <div className="flex justify-between items-center">
          {/* Date Range Picker */}
          <DatePickerWithRangeV2
            date={dateRange}
            setDate={setDateRange}
            className="w-full max-w-md"
          />

          {/* Clear Filters Button */}
          {dateRange && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {isDischargeSummariesLoading ? (
        <Card className="bg-white shadow-lg border-0">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Medical Records</h3>
              <p className="text-gray-600">Please wait while we fetch your pet's medical history...</p>
            </div>
          </CardContent>
        </Card>
      ) : dischargeSummariesError ? (
        <Card className="bg-white shadow-lg border-0">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Records</h3>
              <p className="text-gray-600">Unable to load medical records. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      ) : dischargeSummaries.length === 0 ? (
        <Card className="bg-white shadow-lg border-0">
          <CardContent className="p-12">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Medical Records Found</h3>
              <p className="text-gray-600 mb-6">Your pet's medical records will appear here after completed appointments</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {dischargeSummaries.map((summary: any) => (
            <Card key={summary.appointmentId} className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-6 border-b mb-6">
                <div className="flex flex-wrap items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white font-bold">
                        {summary.patientName?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{summary.patientName}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getAppointmentTypeBadge(summary.appointmentType)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="theme-button-outline"
                      onClick={() => {
                        setSelectedAppointmentId(summary.appointmentId)
                        setSelectedAppointmentType(summary.appointmentType)
                        setDischargeSummaryOpen(true)
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Print Discharge Summary
                    </Button>

                    {/* Show Download Certificates button only for Certification appointments */}
                    {summary.appointmentType?.toLowerCase().includes('certification') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="theme-button-outline"
                        onClick={() => {
                          setSelectedAppointmentId(summary.appointmentId)
                          setSelectedPatientId(summary.patientId)
                          setSelectedAppointmentType(summary.appointmentType)
                          setCertificateDownloadOpen(true)
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Certificates
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Veterinarian</p>
                        <p className="font-semibold text-slate-900">{summary.veterinarianName || "Not assigned"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Clinic</p>
                        <p className="font-semibold text-slate-900">{summary.clinicName || "Not specified"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Room</p>
                        <p className="font-semibold text-slate-900">{summary.roomName || "Not assigned"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Created</p>
                        <p className="font-semibold text-slate-900">
                          {isClient && summary.visitCreatedAt ? formatDate(summary.visitCreatedAt) : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {summary.reason && (
                  <div className="bg-gray-50 rounded-lg p-3 border">
                    <p className="font-medium text-gray-700 mb-1">Visit Reason</p>
                    <p className="text-gray-600 text-sm">{summary.reason}</p>
                  </div>
                )}

                {summary.notes && (
                  <div className="bg-blue-50 rounded-lg p-3 border">
                    <p className="font-medium text-blue-700 mb-1">Notes</p>
                    <p className="text-blue-600 text-sm">{summary.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">

                  <div className="text-xs text-gray-500">
                    {isClient && summary.visitCreatedAt ? formatDate(summary.visitCreatedAt) : ""}
                  </div>
                </div>
              </CardContent>

            </Card>
          ))}
        </div>
      )}

      {/* Discharge Summary Sheet */}
      {selectedAppointmentId && (
        <DischargeSummarySheet
          isOpen={dischargeSummaryOpen}
          onClose={() => {
            setDischargeSummaryOpen(false)
            setSelectedAppointmentId(null)
            setSelectedAppointmentType(null)
          }}
          appointmentId={selectedAppointmentId}
          appointmentType={selectedAppointmentType || undefined}
        />
      )}

      {/* Certificate Download Sheet */}
      {certificateDownloadOpen && selectedAppointmentId && selectedPatientId && (
        <CertificateDownload
          appointmentId={selectedAppointmentId}
          patientId={selectedPatientId}
          onClose={() => {
            setCertificateDownloadOpen(false)
            setSelectedAppointmentId(null)
            setSelectedPatientId(null)
            setSelectedAppointmentType(null)
          }}
        />
      )}
    </div>
  )
} 