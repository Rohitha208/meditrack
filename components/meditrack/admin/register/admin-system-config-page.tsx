"use client"

import { CheckCircle2, Plus, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { MtButton } from "@/components/meditrack/shared"
import { AdminPageHeader } from "./AdminPageHeader"
import { AdminCard } from "./AdminCard"

// Frontend/UI only — static register content, no backend.

const NOTIFICATION_TEMPLATES = [
  { template: "Appointment confirmation", channel: "SMS", subject: "—" },
  { template: "Bed allotment", channel: "Email", subject: "Bed allotted — {{patientName}}" },
  { template: "Discharge summary ready", channel: "SMS", subject: "—" },
]

const DOCUMENT_TEMPLATES = [
  { template: "Discharge summary letterhead", type: "PDF letterhead" },
  { template: "Admission consent form", type: "PDF form" },
  { template: "Death summary certificate", type: "PDF letterhead" },
]

const INTEGRATIONS = [
  { name: "SMS Gateway", provider: "Twilio", connected: true },
  { name: "Email Service", provider: "SendGrid", connected: true },
  { name: "Payment Gateway", provider: "Razorpay", connected: true },
  { name: "PMJAY Portal", provider: "NHA Sandbox", connected: false },
]

export function AdminSystemConfigPage() {
  return (
    <div className="space-y-5">
      <AdminPageHeader title="System Config" subtitle="Notification and document templates; integration health." />

      <AdminCard
        title="Notification Templates"
        noPadding
        action={
          <MtButton className="gap-2">
            <Plus className="h-4 w-4" />
            Add template
          </MtButton>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-adminreg-border bg-adminreg-border/30 text-left text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted">
              <th className="px-5 py-3">Template</th>
              <th className="px-5 py-3">Channel</th>
              <th className="px-5 py-3">Subject</th>
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_TEMPLATES.map((t) => (
              <tr key={t.template} className="border-b border-adminreg-border/70 last:border-0">
                <td className="px-5 py-3 font-semibold text-adminreg-text">{t.template}</td>
                <td className="px-5 py-3">{t.channel}</td>
                <td className="px-5 py-3 text-adminreg-muted">{t.subject}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>

      <AdminCard title="Document Templates" noPadding>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-adminreg-border bg-adminreg-border/30 text-left text-[11px] font-semibold uppercase tracking-wide text-adminreg-muted">
              <th className="px-5 py-3">Template</th>
              <th className="px-5 py-3">Type</th>
            </tr>
          </thead>
          <tbody>
            {DOCUMENT_TEMPLATES.map((t) => (
              <tr key={t.template} className="border-b border-adminreg-border/70 last:border-0">
                <td className="px-5 py-3 font-semibold text-adminreg-text">{t.template}</td>
                <td className="px-5 py-3 text-adminreg-muted">{t.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>

      <AdminCard title="Integrations">
        <ul className="divide-y divide-adminreg-border">
          {INTEGRATIONS.map((i) => (
            <li key={i.name} className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
              <div>
                <p className="font-medium text-adminreg-text">{i.name}</p>
                <p className="text-xs text-adminreg-muted">{i.provider}</p>
              </div>
              <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", i.connected ? "text-adminreg-olive-700" : "text-adminreg-red")}>
                {i.connected ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {i.connected ? "Connected" : "Not Connected"}
              </span>
            </li>
          ))}
        </ul>
      </AdminCard>
    </div>
  )
}
