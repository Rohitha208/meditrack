/**
 * Shared mock lookups — the single source of truth for doctor/department
 * pairing, wards, and patient references, so identity data never drifts
 * between modules (Appointments, OPD, IPD, Nursing, ...).
 */

export interface DoctorDirectoryEntry {
  name: string
  degree: string
  department: string
  /** Defaults to "Active" wherever unset — most existing rows predate this field. */
  status?: "Active" | "Inactive"
}

export const DOCTORS: DoctorDirectoryEntry[] = [
  { name: "Dr. Amit Sharma", degree: "MBBS, MD", department: "General Medicine" },
  { name: "Dr. Neha Verma", degree: "MBBS, DGO", department: "Gynecology" },
  { name: "Dr. Rohan Mehta", degree: "MS (Ortho)", department: "Orthopedics" },
  { name: "Dr. Priya Nair", degree: "MBBS, DCH", department: "Pediatrics" },
  { name: "Dr. Vikram Joshi", degree: "DM (Cardiology)", department: "Cardiology" },
  { name: "Dr. Kavita Rao", degree: "MD (Dermatology)", department: "Dermatology" },
  { name: "Dr. Arjun Malhotra", degree: "MS (ENT)", department: "ENT" },
  { name: "Dr. Sanjay Gupta", degree: "MD (Radiology)", department: "Radiology" },
  { name: "Dr. Meera Iyer", degree: "MD (Pathology)", department: "Pathology" },
  { name: "Dr. Rahul Khanna", degree: "MD (Emergency Medicine)", department: "Emergency" },
]

export const DEPARTMENTS: string[] = Array.from(new Set(DOCTORS.map((d) => d.department)))

export function doctorsInDepartment(department: string): DoctorDirectoryEntry[] {
  return DOCTORS.filter((d) => d.department === department)
}

export const WARDS: string[] = ["General Ward", "ICU", "Deluxe Room", "Semi Private", "Maternity Ward", "Pediatric Ward"]

/** Lightweight patient roster used wherever another module needs to link to
 * a patient by UHID — e.g. Appointments/IPD/Lab patient pickers. */
export const PATIENT_DIRECTORY: { uhid: string; name: string; age: number; gender: "Male" | "Female" | "Other" }[] = [
  { uhid: "MED-2026-000101", name: "Amit Sharma", age: 34, gender: "Male" },
  { uhid: "MED-2026-000102", name: "Priya Verma", age: 28, gender: "Female" },
  { uhid: "MED-2026-000103", name: "Rahul Kumar", age: 45, gender: "Male" },
  { uhid: "MED-2026-000104", name: "Sneha Iyer", age: 26, gender: "Female" },
  { uhid: "MED-2026-000105", name: "Suresh Yadav", age: 60, gender: "Male" },
  { uhid: "MED-2026-000106", name: "Anjali Patel", age: 34, gender: "Female" },
  { uhid: "MED-2026-000107", name: "Vivek Mehta", age: 38, gender: "Male" },
  { uhid: "MED-2026-000108", name: "Kavya Menon", age: 24, gender: "Female" },
  { uhid: "MED-2026-000109", name: "Rakesh Khanna", age: 47, gender: "Male" },
  { uhid: "MED-2026-000110", name: "Anita Singh", age: 52, gender: "Female" },
]

let uhidSeq = PATIENT_DIRECTORY.length
export function generateUhid(): string {
  uhidSeq += 1
  return `MED-2026-${String(100 + uhidSeq).padStart(6, "0")}`
}

let opdTokenSeq = 24
export function generateOpdToken(): string {
  opdTokenSeq += 1
  return `OPD-${String(opdTokenSeq).padStart(3, "0")}`
}

let ipdSeq = 124
export function generateIpdNo(): string {
  ipdSeq += 1
  return `IPD-2026-${String(ipdSeq).padStart(5, "0")}`
}
