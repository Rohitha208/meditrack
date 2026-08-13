"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Bed,
  BedDouble,
  CalendarClock,
  DoorOpen,
  FlaskConical,
  IndianRupee,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRootContext } from "@/context/RootContext";
import {
  MtCard,
  StatGrid,
  StatusBadge,
  Timeline,
  getInitials,
  formatCurrency,
  chartColors,
  type StatCardData,
  type TimelineEvent,
} from "@/components/meditrack/shared";

// ---------------------------------------------------------------------------
// Mock data — MediTrack's screens aren't wired to a real backend yet, so
// this dashboard renders representative demo data to preview the finished
// layout. Swap for live queries once those endpoints land.
// ---------------------------------------------------------------------------

const STAT_CARDS: StatCardData[] = [
  { label: "Today's Appointments", value: 42, trend: "+18% from yesterday", trendUp: true, icon: CalendarClock },
  { label: "OPD Patients", value: 156, trend: "+12% from yesterday", trendUp: true, icon: Users },
  { label: "IPD Patients", value: 38, trend: "No change", trendUp: null, icon: BedDouble },
  { label: "Available Beds", value: 34, trend: "28% of total", trendUp: true, icon: Bed },
  { label: "Occupied Beds", value: 86, trend: "72% of total", trendUp: false, icon: BedDouble },
  { label: "Today's Discharge", value: 9, trend: "+14% from yesterday", trendUp: true, icon: DoorOpen },
  { label: "Pending Lab Reports", value: 17, trend: "5 urgent", trendUp: false, icon: FlaskConical },
  { label: "Today's Collection", value: formatCurrency(245800), trend: "+16% from yesterday", trendUp: true, icon: IndianRupee },
];

const APPOINTMENT_STATUS = [
  { name: "Completed", value: 18, color: chartColors.primary },
  { name: "Consulting", value: 6, color: chartColors.secondary },
  { name: "Waiting", value: 10, color: chartColors.warning },
  { name: "Scheduled", value: 8, color: chartColors.tertiary },
];
const APPOINTMENT_TOTAL = APPOINTMENT_STATUS.reduce((sum, s) => sum + s.value, 0);

const OPD_DEPARTMENTS = [
  { name: "General Medicine", count: 68, percent: 100, icon: Stethoscope, color: chartColors.primary },
  { name: "Pediatrics", count: 26, percent: 38, icon: Activity, color: chartColors.secondary },
  { name: "Orthopedics", count: 22, percent: 32, icon: Activity, color: chartColors.tertiary },
  { name: "Gynecology", count: 18, percent: 26, icon: Activity, color: chartColors.warning },
  { name: "Cardiology", count: 12, percent: 18, icon: Activity, color: chartColors.danger },
];

const IPD_STATS = [
  { label: "Elective", count: 14, color: chartColors.primary },
  { label: "Emergency", count: 9, color: chartColors.danger },
  { label: "Referral", count: 8, color: chartColors.secondary },
  { label: "Day Care", count: 7, color: chartColors.tertiary },
];
const IPD_TOTAL = IPD_STATS.reduce((sum, i) => sum + i.count, 0);

const BED_OCCUPANCY = [
  { name: "Occupied", value: 86, color: chartColors.secondary },
  { name: "Available", value: 34, color: chartColors.neutral },
];
const BED_TOTAL = BED_OCCUPANCY.reduce((sum, b) => sum + b.value, 0);

const REVENUE_TREND = [
  { label: "05 Aug", value: 1.9 },
  { label: "06 Aug", value: 2.1 },
  { label: "07 Aug", value: 1.8 },
  { label: "08 Aug", value: 2.3 },
  { label: "09 Aug", value: 2.0 },
  { label: "10 Aug", value: 2.45 },
];

const RECENT_PATIENTS = [
  { uhid: "MED-2026-000110", name: "Anita Singh", type: "IPD", department: "General Medicine", status: "Admitted" },
  { uhid: "MED-2026-000109", name: "Rakesh Khanna", type: "OPD", department: "Cardiology", status: "Consulting" },
  { uhid: "MED-2026-000108", name: "Kavya Menon", type: "OPD", department: "Dermatology", status: "Waiting" },
  { uhid: "MED-2026-000107", name: "Vivek Mehta", type: "OPD", department: "ENT", status: "Completed" },
  { uhid: "MED-2026-000106", name: "Anjali Patel", type: "IPD", department: "Orthopedics", status: "Admitted" },
];

const RECENT_ACTIVITIES: TimelineEvent[] = [
  { id: "1", title: "Patient discharged — Suresh Yadav", description: "IPD-2026-00118 · General Ward", timestamp: "10 min ago", icon: DoorOpen, tone: "success" },
  { id: "2", title: "New admission — Anita Singh", description: "IPD-2026-00125 · Bed G-04", timestamp: "35 min ago", icon: BedDouble, tone: "secondary" },
  { id: "3", title: "Lab report completed", description: "CBC for Rahul Kumar (MED-2026-000103)", timestamp: "1 hr ago", icon: FlaskConical, tone: "primary" },
  { id: "4", title: "Appointment rescheduled", description: "Priya Verma moved to 11:30 AM", timestamp: "2 hr ago", icon: CalendarClock, tone: "warning" },
];

function getGreeting(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function MediTrackDashboardPage() {
  const { user } = useRootContext();
  const firstName = user?.firstName || "Doctor";

  const greeting = useMemo(() => getGreeting(new Date().getHours()), []);
  const bedOccupancyPercent = useMemo(() => Math.round((BED_OCCUPANCY[0].value / BED_TOTAL) * 100), []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {greeting}, Dr. {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Here&apos;s what&apos;s happening across your hospital today.
        </p>
      </div>

      <StatGrid stats={STAT_CARDS} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MtCard title="Appointments Overview" description="Today">
          <div className="mt-2 flex items-center gap-4">
            <div className="relative h-32 w-32 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={APPOINTMENT_STATUS} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={3} cornerRadius={4} stroke="none">
                    {APPOINTMENT_STATUS.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} appointments`, name]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-900 dark:text-white">{APPOINTMENT_TOTAL}</span>
                <span className="text-[10px] text-slate-400">Total</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-2">
              {APPOINTMENT_STATUS.map((s) => (
                <li key={s.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span className="ml-2 flex-shrink-0 font-semibold text-slate-900 dark:text-white">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </MtCard>

        <MtCard title="OPD Department Wise" description="Today">
          <div className="space-y-3">
            {OPD_DEPARTMENTS.map((d) => (
              <div key={d.name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                    <d.icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: d.color }} />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="ml-2 flex-shrink-0 font-semibold text-slate-900 dark:text-white">{d.count}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-1.5 rounded-full" style={{ width: `${d.percent}%`, backgroundColor: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </MtCard>

        <MtCard title="IPD Statistics" description="Admission type breakdown">
          <div className="space-y-3">
            {IPD_STATS.map((i) => (
              <div key={i.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: i.color }} />
                  {i.label}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {i.count} <span className="font-normal text-slate-400">({Math.round((i.count / IPD_TOTAL) * 100)}%)</span>
                </span>
              </div>
            ))}
          </div>
        </MtCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MtCard title="Revenue Overview" description="Last 6 days" className="lg:col-span-2">
          <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(245800)}</p>
          <p className="mb-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">↑ 16% from yesterday</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_TREND} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="meditrackRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: number) => `₹${v}L`} />
                <Tooltip formatter={(value: number) => [`₹${value}L`, "Revenue"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area type="monotone" dataKey="value" stroke={chartColors.primary} strokeWidth={2} fill="url(#meditrackRevenueFill)" dot={{ r: 3, fill: chartColors.primary, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </MtCard>

        <MtCard title="Bed Occupancy">
          <div className="flex items-center gap-4">
            <div className="relative h-28 w-28 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={BED_OCCUPANCY} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="100%" paddingAngle={3} cornerRadius={4} stroke="none">
                    {BED_OCCUPANCY.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} beds`, name]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold text-slate-900 dark:text-white">{bedOccupancyPercent}%</span>
                <span className="text-[9px] text-slate-400">Occupied</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-2">
              {BED_OCCUPANCY.map((b) => (
                <li key={b.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                    {b.name}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">{b.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </MtCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MtCard title="Recent Patients" description="Latest registrations & visits">
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Patient</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Department</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_PATIENTS.map((p) => (
                  <TableRow key={p.uhid}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarFallback className="bg-brand-50 text-[10px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                            {getInitials(p.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{p.name}</p>
                          <p className="truncate text-[10px] text-slate-400">{p.uhid}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{p.type}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{p.department}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </MtCard>

        <MtCard title="Recent Activities" description="Live hospital feed" icon={<UserRound className="h-4 w-4" />}>
          <Timeline events={RECENT_ACTIVITIES} />
        </MtCard>
      </div>
    </div>
  );
}
