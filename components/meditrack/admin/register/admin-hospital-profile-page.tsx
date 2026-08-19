"use client"

import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { MtButton } from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"

// Frontend/UI only — static register content, no backend.

interface Branch {
  code: string
  name: string
  address: string
  beds: number
  status: "Active" | "Inactive"
}

const BRANCHES: Branch[] = [
  { code: "BR-01", name: "Sri Ramachandra — Main Campus", address: "Bannerghatta Road, Bengaluru", beds: 135, status: "Active" },
  { code: "BR-02", name: "Sri Ramachandra — Whitefield", address: "Whitefield, Bengaluru", beds: 60, status: "Active" },
]

type LicenseTone = "valid" | "warning" | "critical"

interface License {
  name: string
  cert: string
  issued: string
  expires: string
  statusLabel: string
  tone: LicenseTone
}

const LICENSES: License[] = [
  { name: "NABH Full Accreditation", cert: "NABH-2024-0871", issued: "14 Mar 2024", expires: "13 Mar 2027", statusLabel: "VALID", tone: "valid" },
  { name: "Fire & Safety NOC", cert: "KSFES-8821", issued: "02 Sep 2025", expires: "01 Sep 2026", statusLabel: "EXPIRES IN 20 DAYS", tone: "warning" },
  { name: "Biomedical Waste Authorization", cert: "BMW-2023-0456", issued: "10 Jun 2023", expires: "09 Jun 2026", statusLabel: "EXPIRED", tone: "critical" },
  { name: "Pollution Control Board Consent", cert: "PCB-2025-1187", issued: "01 Jan 2025", expires: "31 Dec 2027", statusLabel: "VALID", tone: "valid" },
]

const LICENSE_TONE_CLASS: Record<LicenseTone, { border: string; bg: string; text: string }> = {
  valid: { border: "border-adminreg-border", bg: "bg-adminreg-card", text: "text-adminreg-olive-700" },
  warning: { border: "border-adminreg-amber", bg: "bg-adminreg-amber-soft", text: "text-adminreg-amber-text" },
  critical: { border: "border-adminreg-red", bg: "bg-adminreg-red-soft", text: "text-adminreg-red-text" },
}

export function AdminHospitalProfilePage() {
  return (
    <div className="space-y-5">
      <AdminPageHeader title="Hospital Profile" subtitle="Branches, accreditation, licenses and compliance documents." />

      <AdminCard
        title="Branches"
        noPadding
        action={
          <MtButton className="gap-2">
            <Plus className="h-4 w-4" />
            Add branch
          </MtButton>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-adminreg-border bg-adminreg-header text-left text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted">
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3">Branch name</th>
              <th className="px-5 py-3">Address</th>
              <th className="px-5 py-3">Beds</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {BRANCHES.map((b) => (
              <tr key={b.code} className="border-b border-adminreg-divider last:border-0">
                <td className="px-5 py-3 font-mono text-xs text-adminreg-muted">{b.code}</td>
                <td className="px-5 py-3 font-medium text-adminreg-text">{b.name}</td>
                <td className="px-5 py-3 text-adminreg-muted">{b.address}</td>
                <td className="px-5 py-3">{b.beds}</td>
                <td className="px-5 py-3 text-xs font-semibold text-adminreg-olive-700">{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>

      <AdminCard title="Accreditation & Licenses">
        <div className="space-y-3">
          {LICENSES.map((l) => {
            const cls = LICENSE_TONE_CLASS[l.tone]
            return (
              <div key={l.cert} className={cn("flex flex-col gap-2 border p-3.5 sm:flex-row sm:items-center sm:justify-between", cls.border, cls.bg)}>
                <div>
                  <p className="text-sm font-semibold text-adminreg-text">{l.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-adminreg-muted">Cert. {l.cert}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-adminreg-muted sm:text-sm">
                  <span>Issued {l.issued}</span>
                  <span>Expires {l.expires}</span>
                  <span className={cn("font-mono text-[11px] font-bold uppercase tracking-[0.04em]", cls.text)}>{l.statusLabel}</span>
                </div>
              </div>
            )
          })}
        </div>
      </AdminCard>
    </div>
  )
}
