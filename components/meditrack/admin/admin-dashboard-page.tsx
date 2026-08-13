"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertTriangle,
  BarChart3,
  Bed,
  BedDouble,
  Building2,
  CalendarClock,
  ClipboardList,
  ClipboardPlus,
  FlaskConical,
  IndianRupee,
  Microscope,
  Package,
  Pill,
  Receipt,
  ScrollText,
  ShieldAlert,
  Star,
  Stethoscope,
  UserPlus,
  UserRound,
  Users,
  Wallet,
} from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MtCard,
  MtButton,
  StatGrid,
  StatusBadge,
  MtDataTable,
  Timeline,
  formatCurrency,
  chartColors,
  type StatCardData,
  type MtColumn,
  type TimelineEvent,
  type Tone,
} from "@/components/meditrack/shared"
import { DOCTORS } from "@/components/meditrack/shared/directory"

// ---------------------------------------------------------------------------
// Mock data — frontend/UI only. The Hospital Overview range filter swaps
// between pre-built local datasets; nothing is fetched from a backend.
// ---------------------------------------------------------------------------

type OverviewRange = "today" | "7d" | "30d"

const OVERVIEW_DATA: Record<OverviewRange, { label: string; opd: number; ipd: number; appointments: number; admissions: number; discharges: number }[]> = {
  today: [
    { label: "8 AM", opd: 8, ipd: 40, appointments: 6, admissions: 1, discharges: 0 },
    { label: "10 AM", opd: 22, ipd: 42, appointments: 18, admissions: 2, discharges: 1 },
    { label: "12 PM", opd: 38, ipd: 44, appointments: 30, admissions: 3, discharges: 1 },
    { label: "2 PM", opd: 52, ipd: 46, appointments: 40, admissions: 5, discharges: 2 },
    { label: "4 PM", opd: 68, ipd: 47, appointments: 58, admissions: 6, discharges: 3 },
    { label: "6 PM", opd: 78, ipd: 48, appointments: 66, admissions: 8, discharges: 5 },
  ],
  "7d": [
    { label: "Mon", opd: 110, ipd: 44, appointments: 96, admissions: 6, discharges: 4 },
    { label: "Tue", opd: 128, ipd: 45, appointments: 108, admissions: 9, discharges: 5 },
    { label: "Wed", opd: 118, ipd: 46, appointments: 100, admissions: 7, discharges: 8 },
    { label: "Thu", opd: 135, ipd: 47, appointments: 115, admissions: 10, discharges: 6 },
    { label: "Fri", opd: 126, ipd: 48, appointments: 110, admissions: 8, discharges: 7 },
    { label: "Sat", opd: 96, ipd: 46, appointments: 82, admissions: 5, discharges: 4 },
    { label: "Sun", opd: 82, ipd: 48, appointments: 70, admissions: 8, discharges: 5 },
  ],
  "30d": [
    { label: "Wk 1", opd: 720, ipd: 45, appointments: 610, admissions: 42, discharges: 38 },
    { label: "Wk 2", opd: 780, ipd: 47, appointments: 655, admissions: 48, discharges: 44 },
    { label: "Wk 3", opd: 745, ipd: 46, appointments: 630, admissions: 45, discharges: 41 },
    { label: "Wk 4", opd: 812, ipd: 48, appointments: 690, admissions: 51, discharges: 47 },
  ],
}

const RANGE_LABEL: Record<OverviewRange, string> = { today: "Today", "7d": "Last 7 Days", "30d": "Last 30 Days" }

const OPD_IPD_COMPARISON = [
  { name: "OPD Patients", value: 125, color: chartColors.primary },
  { name: "IPD Patients", value: 48, color: chartColors.secondary },
]

const REVENUE_BY_CATEGORY = [
  { name: "OPD", value: 185000 },
  { name: "IPD", value: 420000 },
  { name: "Lab", value: 96000 },
  { name: "Radiology", value: 74000 },
  { name: "Pharmacy", value: 132000 },
  { name: "Procedures", value: 158000 },
]
const REVENUE_TOTAL = REVENUE_BY_CATEGORY.reduce((sum, r) => sum + r.value, 0)
const REVENUE_PAID = Math.round(REVENUE_TOTAL * 0.72)
const REVENUE_PENDING = Math.round(REVENUE_TOTAL * 0.18)
const REVENUE_INSURANCE = REVENUE_TOTAL - REVENUE_PAID - REVENUE_PENDING

const BED_OVERVIEW = [
  { name: "Occupied", value: 86, color: chartColors.secondary },
  { name: "Available", value: 34, color: chartColors.success },
  { name: "Reserved", value: 6, color: chartColors.warning },
  { name: "Cleaning", value: 4, color: chartColors.tertiary },
  { name: "Maintenance", value: 2, color: chartColors.neutral },
]
const BED_TOTAL = BED_OVERVIEW.reduce((sum, b) => sum + b.value, 0)

const WARD_BREAKDOWN = [
  { ward: "General Ward", occupied: 34, total: 44 },
  { ward: "ICU", occupied: 14, total: 16 },
  { ward: "Private", occupied: 12, total: 16 },
  { ward: "Semi-Private", occupied: 18, total: 24 },
  { ward: "Emergency", occupied: 8, total: 12 },
]

interface DepartmentPerformanceRow {
  department: string
  opd: number
  ipd: number
  appointments: number
  revenue: number
  doctors: number
  status: "Active" | "Understaffed" | "High Load"
}

const DEPARTMENT_PERFORMANCE: DepartmentPerformanceRow[] = [
  { department: "General Medicine", opd: 68, ipd: 12, appointments: 74, revenue: 186000, doctors: 4, status: "Active" },
  { department: "Cardiology", opd: 22, ipd: 8, appointments: 26, revenue: 214000, doctors: 2, status: "High Load" },
  { department: "Orthopedics", opd: 26, ipd: 7, appointments: 30, revenue: 168000, doctors: 3, status: "Active" },
  { department: "Pediatrics", opd: 30, ipd: 4, appointments: 34, revenue: 96000, doctors: 2, status: "Active" },
  { department: "Gynecology", opd: 18, ipd: 6, appointments: 21, revenue: 112000, doctors: 2, status: "Active" },
  { department: "ENT", opd: 14, ipd: 2, appointments: 16, revenue: 58000, doctors: 1, status: "Understaffed" },
  { department: "Dermatology", opd: 12, ipd: 0, appointments: 14, revenue: 42000, doctors: 1, status: "Understaffed" },
  { department: "Radiology", opd: 0, ipd: 0, appointments: 0, revenue: 74000, doctors: 1, status: "Active" },
  { department: "Pathology", opd: 0, ipd: 0, appointments: 0, revenue: 96000, doctors: 1, status: "Active" },
]

interface DoctorPerformanceRow {
  doctor: string
  department: string
  opd: number
  ipd: number
  appointments: number
  completed: number
  revenue: number
  rating: number
}

const DOCTOR_PERFORMANCE: DoctorPerformanceRow[] = DOCTORS.map((d, i) => ({
  doctor: d.name,
  department: d.department,
  opd: [68, 18, 26, 30, 22, 12, 14, 0, 0, 0][i],
  ipd: [6, 6, 7, 4, 8, 0, 2, 0, 0, 5][i],
  appointments: [74, 21, 30, 34, 26, 14, 16, 0, 0, 5][i],
  completed: [70, 19, 27, 32, 24, 13, 15, 0, 0, 5][i],
  revenue: [186000, 112000, 168000, 96000, 214000, 42000, 58000, 74000, 96000, 65000][i],
  rating: [4.7, 4.5, 4.8, 4.9, 4.6, 4.3, 4.4, 4.6, 4.5, 4.7][i],
}))

const PHARMACY_STATS = { totalMedicines: 1284, lowStock: 22, nearExpiry: 14, expired: 3, todaysIssues: 96 }
const PHARMACY_CHART = [
  { name: "Low Stock", value: PHARMACY_STATS.lowStock, color: chartColors.warning },
  { name: "Near Expiry", value: PHARMACY_STATS.nearExpiry, color: chartColors.tertiary },
  { name: "Expired", value: PHARMACY_STATS.expired, color: chartColors.danger },
]

const LAB_STATS = { testsToday: 84, pendingSamples: 12, processing: 18, completed: 54, pendingReports: 9 }

const RECENT_ACTIVITY: TimelineEvent[] = [
  { id: "1", title: "New patient registered — Kavya Menon", description: "MED-2026-000108 · Front Desk", timestamp: "5 min ago", icon: UserPlus, tone: "primary" },
  { id: "2", title: "Appointment created", description: "Farhan Ali with Dr. Arjun Malhotra, 12:15 PM", timestamp: "12 min ago", icon: CalendarClock, tone: "secondary" },
  { id: "3", title: "IPD admission — Anita Singh", description: "IPD-2026-00125 · General Ward, Bed G-04", timestamp: "35 min ago", icon: BedDouble, tone: "info" },
  { id: "4", title: "Bed allocated — ICU-03", description: "Suresh Yadav moved from ER to ICU", timestamp: "48 min ago", icon: Bed, tone: "warning" },
  { id: "5", title: "Lab report completed", description: "CBC for Rahul Kumar (MED-2026-000103)", timestamp: "1 hr ago", icon: FlaskConical, tone: "success" },
  { id: "6", title: "Medicine issued", description: "Amoxicillin 500mg × 20, Pharmacy Counter 2", timestamp: "1.5 hr ago", icon: Pill, tone: "neutral" },
  { id: "7", title: "Payment received", description: "₹18,500 from Vivek Mehta (OPD Billing)", timestamp: "2 hr ago", icon: IndianRupee, tone: "success" },
  { id: "8", title: "Patient discharged", description: "Suresh Yadav — IPD-2026-00118", timestamp: "3 hr ago", icon: ClipboardList, tone: "neutral" },
]

const ADMIN_ALERTS: { id: string; title: string; description: string; tone: Tone }[] = [
  { id: "1", title: "Low Pharmacy Stock", description: "22 medicines below reorder threshold", tone: "warning" },
  { id: "2", title: "Bed Occupancy High", description: "ICU running at 88% occupancy hospital-wide", tone: "danger" },
  { id: "3", title: "Pending Payments", description: `${formatCurrency(REVENUE_PENDING)} in outstanding OPD/IPD bills`, tone: "warning" },
  { id: "4", title: "Pending Insurance Claims", description: "6 TPA claims awaiting approval", tone: "info" },
  { id: "5", title: "Pending Lab Reports", description: "9 reports pending release", tone: "info" },
  { id: "6", title: "Expiring Medicines", description: "14 batches expiring within 30 days", tone: "warning" },
  { id: "7", title: "Unapproved Users", description: "2 staff accounts awaiting admin approval", tone: "neutral" },
]

const QUICK_ACTIONS = [
  { label: "Add Patient", icon: UserPlus },
  { label: "New Appointment", icon: CalendarClock },
  { label: "New Admission", icon: ClipboardPlus },
  { label: "Add Doctor", icon: UserRound },
  { label: "Add Department", icon: Building2 },
  { label: "Add Service", icon: ClipboardList },
  { label: "Add Medicine", icon: Pill },
  { label: "Create Bill", icon: Receipt },
  { label: "View Reports", icon: BarChart3 },
]

export function AdminDashboardPage() {
  const [range, setRange] = useState<OverviewRange>("7d")
  const overviewData = OVERVIEW_DATA[range]

  const stats: StatCardData[] = useMemo(
    () => [
      { label: "Total Patients", value: "4,286", icon: Users, trend: "+56 this month", trendUp: true },
      { label: "Today's OPD", value: 156, icon: Stethoscope, trend: "+12% from yesterday", trendUp: true },
      { label: "Current IPD", value: 48, icon: BedDouble, trend: "76% bed occupancy", trendUp: null },
      { label: "Today's Appointments", value: 82, icon: CalendarClock, trend: "+18% from yesterday", trendUp: true },
      { label: "Available Beds", value: 34, icon: Bed, trend: `${BED_TOTAL} total beds`, trendUp: null },
      { label: "Today's Revenue", value: formatCurrency(245800), icon: IndianRupee, trend: "+16% from yesterday", trendUp: true },
      { label: "Pending Payments", value: formatCurrency(REVENUE_PENDING), icon: Wallet, trend: "Across OPD & IPD", trendUp: false },
      { label: "Pharmacy Stock Alerts", value: PHARMACY_STATS.lowStock + PHARMACY_STATS.expired, icon: AlertTriangle, trend: `${PHARMACY_STATS.expired} expired`, trendUp: false },
    ],
    []
  )

  const departmentColumns: MtColumn<DepartmentPerformanceRow>[] = [
    { key: "department", header: "Department", alwaysVisible: true, render: (r) => <span className="font-medium text-slate-900 dark:text-white">{r.department}</span> },
    { key: "opd", header: "OPD Patients", render: (r) => r.opd, sortValue: (r) => r.opd },
    { key: "ipd", header: "IPD Patients", render: (r) => r.ipd, sortValue: (r) => r.ipd },
    { key: "appointments", header: "Appointments", render: (r) => r.appointments, sortValue: (r) => r.appointments },
    { key: "revenue", header: "Revenue", render: (r) => formatCurrency(r.revenue), sortValue: (r) => r.revenue },
    { key: "doctors", header: "Doctors", render: (r) => r.doctors, sortValue: (r) => r.doctors },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} tone={r.status === "Active" ? "success" : r.status === "High Load" ? "warning" : "danger"} /> },
  ]

  const doctorColumns: MtColumn<DoctorPerformanceRow>[] = [
    { key: "doctor", header: "Doctor", alwaysVisible: true, render: (r) => <span className="font-medium text-slate-900 dark:text-white">{r.doctor}</span> },
    { key: "department", header: "Department", render: (r) => r.department },
    { key: "opd", header: "OPD", render: (r) => r.opd, sortValue: (r) => r.opd },
    { key: "ipd", header: "IPD", render: (r) => r.ipd, sortValue: (r) => r.ipd },
    { key: "appointments", header: "Appointments", render: (r) => r.appointments, sortValue: (r) => r.appointments },
    { key: "completed", header: "Completed", render: (r) => r.completed, sortValue: (r) => r.completed },
    { key: "revenue", header: "Revenue", render: (r) => formatCurrency(r.revenue), sortValue: (r) => r.revenue },
    {
      key: "rating",
      header: "Rating",
      render: (r) => (
        <span className="inline-flex items-center gap-1 font-medium text-slate-900 dark:text-white">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {r.rating.toFixed(1)}
        </span>
      ),
      sortValue: (r) => r.rating,
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hospital Administration Overview</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Operations, revenue, staff and analytics across the hospital.</p>
      </div>

      <StatGrid stats={stats} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <MtCard
          title="Hospital Overview"
          description="OPD, IPD, appointments, admissions & discharges"
          icon={<BarChart3 className="h-4 w-4" />}
          className="xl:col-span-2"
          action={
            <Select value={range} onValueChange={(v) => setRange(v as OverviewRange)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <p className="mb-2 text-xs text-slate-400">{RANGE_LABEL[range]}</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overviewData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} width={30} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="opd" name="OPD" stroke={chartColors.primary} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ipd" name="IPD" stroke={chartColors.secondary} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="appointments" name="Appointments" stroke={chartColors.tertiary} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="admissions" name="Admissions" stroke={chartColors.warning} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="discharges" name="Discharges" stroke={chartColors.danger} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </MtCard>

        <MtCard title="OPD vs IPD Statistics" description="Current split" icon={<Users className="h-4 w-4" />}>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={OPD_IPD_COMPARISON} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {OPD_IPD_COMPARISON.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Admissions</p>
              <p className="font-semibold text-slate-900 dark:text-white">8 today</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Discharges</p>
              <p className="font-semibold text-slate-900 dark:text-white">5 today</p>
            </div>
          </div>
        </MtCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MtCard title="Revenue Analytics" description="By category" icon={<IndianRupee className="h-4 w-4" />}>
          <div className="mb-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
              <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(REVENUE_TOTAL)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Paid</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(REVENUE_PAID)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pending / Insurance</p>
              <p className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(REVENUE_PENDING + REVENUE_INSURANCE)}</p>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REVENUE_BY_CATEGORY} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" fill={chartColors.primary} radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MtCard>

        <MtCard title="Bed Occupancy Overview" description={`${BED_TOTAL} beds hospital-wide`} icon={<BedDouble className="h-4 w-4" />}>
          <div className="flex items-center gap-4">
            <div className="relative h-28 w-28 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={BED_OVERVIEW} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={3} cornerRadius={4} stroke="none">
                    {BED_OVERVIEW.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} beds`, name]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold text-slate-900 dark:text-white">{Math.round((BED_OVERVIEW[0].value / BED_TOTAL) * 100)}%</span>
                <span className="text-[9px] text-slate-400">Occupied</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5">
              {WARD_BREAKDOWN.map((w) => (
                <li key={w.ward} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">{w.ward}</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {w.occupied}/{w.total}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-1 rounded-full bg-brand-500" style={{ width: `${Math.round((w.occupied / w.total) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </MtCard>
      </div>

      <MtCard title="Department Performance" description="Across all departments" icon={<Building2 className="h-4 w-4" />} noPadding>
        <MtDataTable columns={departmentColumns} rows={DEPARTMENT_PERFORMANCE} keyExtractor={(r) => r.department} />
      </MtCard>

      <MtCard title="Doctor Performance" description="Across all departments" icon={<UserRound className="h-4 w-4" />} noPadding>
        <MtDataTable columns={doctorColumns} rows={DOCTOR_PERFORMANCE} keyExtractor={(r) => r.doctor} enableColumnVisibility />
      </MtCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MtCard title="Pharmacy Overview" icon={<Package className="h-4 w-4" />}>
          <div className="flex items-center gap-4">
            <div className="h-28 w-28 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={PHARMACY_CHART} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="100%" paddingAngle={3} cornerRadius={4} stroke="none">
                    {PHARMACY_CHART.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Total Medicines</span>
                <span className="font-semibold text-slate-900 dark:text-white">{PHARMACY_STATS.totalMedicines}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Low Stock</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{PHARMACY_STATS.lowStock}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Near Expiry</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{PHARMACY_STATS.nearExpiry}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Expired</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">{PHARMACY_STATS.expired}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Today's Issues</span>
                <span className="font-semibold text-slate-900 dark:text-white">{PHARMACY_STATS.todaysIssues}</span>
              </li>
            </ul>
          </div>
        </MtCard>

        <MtCard title="Lab Overview" icon={<Microscope className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tests Today</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{LAB_STATS.testsToday}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pending Samples</p>
              <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">{LAB_STATS.pendingSamples}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Processing</p>
              <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">{LAB_STATS.processing}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
              <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{LAB_STATS.completed}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pending Reports</p>
              <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">{LAB_STATS.pendingReports}</p>
            </div>
          </div>
        </MtCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MtCard title="Recent Activity" description="Live hospital feed" icon={<ScrollText className="h-4 w-4" />}>
          <Timeline events={RECENT_ACTIVITY} />
        </MtCard>

        <MtCard title="Alerts" description="Needs administrator attention" icon={<ShieldAlert className="h-4 w-4" />}>
          <ul className="space-y-3">
            {ADMIN_ALERTS.map((alert) => (
              <li key={alert.id} className="flex items-start gap-2.5 text-sm">
                <span
                  className={
                    "mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full " +
                    (alert.tone === "danger" ? "bg-rose-500" : alert.tone === "warning" ? "bg-amber-500" : alert.tone === "info" ? "bg-blue-500" : "bg-slate-400")
                  }
                />
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">{alert.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{alert.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </MtCard>
      </div>

      <MtCard title="Quick Actions" icon={<ClipboardList className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_ACTIONS.map((action) => (
            <MtButton key={action.label} variant="outline" className="h-auto flex-col gap-2 py-3 text-xs">
              <action.icon className="h-4 w-4" />
              {action.label}
            </MtButton>
          ))}
        </div>
      </MtCard>
    </div>
  )
}
