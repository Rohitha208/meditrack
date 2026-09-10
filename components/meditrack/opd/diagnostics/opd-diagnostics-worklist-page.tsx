"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AdminButton } from "@/components/meditrack/admin/register"
import { useStaffRole } from "@/components/meditrack/layout/register/RoleProvider"
import { ROLE_LABEL, dxWorklistEditable } from "@/components/meditrack/layout/register/rbac"
import { SectionLabel, Panel, InlineInfo, ViewOnlyBanner } from "@/components/meditrack/opd/shared/ui"
import { DX_WORKLIST_DEFS, IMAGING_FAIL_REASONS, REJECTION_REASONS, type DxWorklistKey } from "./theme"

// ---------------------------------------------------------------------------
// Frontend/UI only. Three technician worklists that sit between "order
// placed" on the Diagnostics stage and "result available". All state is
// local React state — the same independent-demo-state approach as the rest
// of OPD (no live shared store between screens).
// ---------------------------------------------------------------------------

/** The whole OPD demo is pinned to this day (see the shell header + every
 * seed record); collection/imaging timestamps use it so they read as part
 * of the same visit rather than "today". */
const DEMO_DATE_LABEL = "12 Aug 2026"

/** Current clock time as HH:MM — the default the technician sees, still editable. */
function nowHhMm() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="font-plexmono text-[9.5px] uppercase tracking-[0.05em] text-adminreg-muted2">{children}</div>
}

function Chip({ tone, children }: { tone: "urgent" | "routine" | "collected" | "awaiting" | "recollection" | "performed" | "repeat" | "overdue" | "fresh"; children: ReactNode }) {
  const map: Record<string, string> = {
    urgent: "border-adminreg-red text-adminreg-red-text",
    overdue: "border-adminreg-red text-adminreg-red-text",
    routine: "border-adminreg-border text-adminreg-muted",
    fresh: "border-adminreg-border text-adminreg-muted",
    collected: "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark",
    performed: "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark",
    awaiting: "border-adminreg-border bg-adminreg-bg text-adminreg-muted",
    recollection: "border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-indigo-dark",
    repeat: "border-adminreg-amber bg-adminreg-amber-soft text-adminreg-amber-text",
  }
  return <span className={cn("whitespace-nowrap border px-2 py-0.5 font-plexmono text-[9.5px] font-bold uppercase tracking-[0.03em]", map[tone])}>{children}</span>
}

function WorklistRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full border-b border-adminreg-divider px-3.5 py-3 text-left last:border-0 transition-colors",
        active ? "border-l-[3px] border-l-adminreg-indigo bg-adminreg-indigo-soft/50" : "border-l-[3px] border-l-transparent hover:bg-adminreg-bg"
      )}
    >
      {children}
    </button>
  )
}

function DetailBox({ label, children, tone }: { label: string; children: ReactNode; tone?: "indigo" }) {
  return (
    <div className={cn("border p-2.5", tone === "indigo" ? "border-adminreg-indigo bg-adminreg-indigo-soft" : "border-adminreg-border bg-adminreg-bg")}>
      <div className="font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-muted2">{label}</div>
      <div className="mt-0.5 text-xs text-adminreg-text">{children}</div>
    </div>
  )
}

function DashedTag({ children }: { children: ReactNode }) {
  return <div className="border border-dashed border-adminreg-border px-2.5 py-1 font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-muted2">{children}</div>
}

// =========================================================================
// Screen 1 — Sample Collection (PHLEBOTOMY)
// =========================================================================

type PathoStatus = "awaiting" | "collected" | "recollection"

interface PathoOrder {
  id: string
  test: string
  patient: string
  uhid: string
  visitId: string
  specimen: string
  orderedBy: string
  orderedTime: string
  priority: "URGENT" | "ROUTINE"
  payment: string
  status: PathoStatus
}

const PATHO_SEED: PathoOrder[] = [
  { id: "LAB-4471", test: "Serum Potassium", patient: "Meera Kulkarni", uhid: "UHID-0004821", visitId: "OPD-20260812-0091", specimen: "Serum · 3 mL · plain red-top vial", orderedBy: "Dr. Anjali Nair", orderedTime: "09:04", priority: "URGENT", payment: "Cash — receipt REC-00861", status: "collected" },
  { id: "LAB-4483", test: "Haemoglobin", patient: "Anita Desai", uhid: "UHID-0004410", visitId: "OPD-20260812-0099", specimen: "Whole blood · 2 mL · EDTA lavender vial", orderedBy: "Dr. Rohan Mehta", orderedTime: "11:31", priority: "ROUTINE", payment: "Star Health TPA — pre-authorised", status: "collected" },
  { id: "LAB-4478", test: "Fasting Blood Sugar", patient: "Rakesh Menon", uhid: "UHID-0003190", visitId: "OPD-20260812-0104", specimen: "Plasma · 2 mL · fluoride grey vial", orderedBy: "Dr. Rohan Mehta", orderedTime: "10:22", priority: "ROUTINE", payment: "Cash — receipt REC-00863", status: "awaiting" },
  { id: "LAB-4491", test: "Complete Blood Count (CBC)", patient: "Imran Sheikh", uhid: "UHID-0004930", visitId: "OPD-20260812-0110", specimen: "Whole blood · 2 mL · EDTA lavender vial", orderedBy: "Dr. Sana Kapoor", orderedTime: "11:18", priority: "ROUTINE", payment: "Cash — receipt REC-00871", status: "awaiting" },
  { id: "LAB-4494", test: "Troponin-I", patient: "Sunita Patil", uhid: "UHID-0004102", visitId: "OPD-20260812-0112", specimen: "Serum · 3 mL · plain red-top vial", orderedBy: "Dr. Anjali Nair", orderedTime: "11:47", priority: "URGENT", payment: "Cash — receipt REC-00873", status: "awaiting" },
]

interface CollectionEvent {
  attempt: number
  kind: "collected" | "rejected"
  by: string
  time: string
  specimen: string
  reason?: string
}

function SampleCollectionScreen({ editable }: { editable: boolean }) {
  const [orders, setOrders] = useState<PathoOrder[]>(PATHO_SEED)
  const [selectedId, setSelectedId] = useState("LAB-4478")
  const [barcode, setBarcode] = useState("")
  const [events, setEvents] = useState<Record<string, CollectionEvent[]>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  // Collection time — the phlebotomist confirms/edits this; it defaults to
  // the current clock time (pinned to the demo day) and is stamped onto the
  // collected event, the confirmation banner and the attempt log.
  const [collectTime, setCollectTime] = useState(nowHhMm)

  const awaitingCount = orders.filter((o) => o.status !== "collected").length
  const selected = orders.find((o) => o.id === selectedId)!
  const log = events[selected.id] ?? []
  const attempt = log.filter((e) => e.kind === "rejected").length + 1
  const specNo = `SPEC-20260812-${selected.id.split("-")[1]}`

  function markCollected() {
    if (!editable) return
    const spec = barcode.trim() || specNo
    setOrders((os) => os.map((o) => (o.id === selected.id ? { ...o, status: "collected" } : o)))
    setEvents((e) => ({
      ...e,
      [selected.id]: [...(e[selected.id] ?? []), { attempt, kind: "collected", by: "K. Rao (Phlebotomy)", time: collectTime, specimen: spec }],
    }))
    setBanner(`✓ ${selected.test} collected at ${collectTime} · ${spec}. ${selected.id} now appears on the result-entry worklist.`)
    setBarcode("")
    setRejecting(false)
  }

  function rejectSample(reason: string) {
    setOrders((os) => os.map((o) => (o.id === selected.id ? { ...o, status: "recollection" } : o)))
    setEvents((e) => ({
      ...e,
      [selected.id]: [...(e[selected.id] ?? []), { attempt, kind: "rejected", by: "M. Pillai (Lab)", time: "12:14", specimen: specNo, reason }],
    }))
    setBanner(`${selected.test} — specimen rejected at lab receipt (${reason}). Order stays open; ${selected.id} returns to this worklist as NEEDS RECOLLECTION. Billing untouched.`)
    setRejecting(false)
  }

  return (
    <div>
      {banner && (
        <div className="mb-4 flex items-start justify-between gap-4 border border-adminreg-olive bg-adminreg-olive-soft px-4 py-2.5 text-xs text-adminreg-olive-dark">
          <span>{banner}</span>
          <button type="button" onClick={() => setBanner(null)} className="flex-shrink-0 font-plexmono text-[10px] uppercase tracking-wide underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Worklist */}
        <div className="border border-adminreg-border bg-adminreg-card">
          <div className="border-b border-adminreg-divider bg-adminreg-header px-3.5 py-3">
            <div className="flex items-center justify-between">
              <SectionLabel>Collection worklist</SectionLabel>
              <span className="font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">{awaitingCount} awaiting collection</span>
            </div>
            <p className="text-xs text-adminreg-muted">
              K. Rao (Phlebotomy). Pathology orders that are payment- or coverage-cleared and awaiting a specimen. This queue sits upstream of result entry — a technician entering results never sees an uncollected order.
            </p>
          </div>
          {orders.map((o) => (
            <WorklistRow key={o.id} active={o.id === selectedId} onClick={() => { setSelectedId(o.id); setRejecting(false); setBarcode("") }}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-adminreg-text">{o.test}</span>
                <Chip tone={o.status === "collected" ? "collected" : o.status === "recollection" ? "recollection" : "awaiting"}>
                  {o.status === "collected" ? "Collected" : o.status === "recollection" ? "Needs recollection" : "Awaiting collection"}
                </Chip>
              </div>
              <div className="mt-0.5 text-xs text-adminreg-muted">{o.patient} · {o.uhid}</div>
              <div className="text-xs text-adminreg-muted">{o.specimen}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-plexmono text-[10px] text-adminreg-muted2">{o.id} · ordered {o.orderedTime}</span>
                <Chip tone={o.priority === "URGENT" ? "urgent" : "routine"}>{o.priority}</Chip>
              </div>
            </WorklistRow>
          ))}
        </div>

        {/* Detail */}
        <Panel>
          <div className="text-lg font-extrabold text-adminreg-text">{selected.test}</div>
          <div className="text-xs text-adminreg-muted">{selected.patient} · {selected.uhid} · {selected.visitId}</div>
          <div className="mt-2"><Chip tone="routine">Pathology · specimen required</Chip></div>
          <p className="mt-2 font-plexmono text-[10px] text-adminreg-muted2">{selected.id} · ordered by {selected.orderedBy} at {selected.orderedTime} · payment cleared</p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <DetailBox label="Specimen required">{selected.specimen}</DetailBox>
            <DetailBox label="Payment / coverage" tone="indigo">{selected.payment}</DetailBox>
          </div>

          {selected.status === "collected" ? (
            <>
              <div className="mt-3 border-l-[3px] border-adminreg-olive bg-adminreg-olive-soft p-3">
                <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-olive-dark">Collected — in the result-entry queue</div>
                <p className="mt-0.5 font-plexmono text-[10px] text-adminreg-olive-dark">
                  {(log.find((e) => e.kind === "collected")?.time) ?? collectTime} · {(log.find((e) => e.kind === "collected")?.specimen) ?? specNo} · K. Rao (Phlebotomy)
                </p>
                <p className="mt-1.5 text-xs text-adminreg-olive-dark">
                  Chain of custody starts here. {selected.test} is now visible to M. Pillai on Result Entry; nothing before this point was.
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                  <Link href="/opd/diagnostics?screen=result-entry" className="font-semibold text-adminreg-olive-dark underline">Open Result Entry →</Link>
                  {editable && <button type="button" onClick={() => setRejecting(true)} className="font-semibold text-adminreg-amber-text underline">Reject sample — needs recollection</button>}
                </div>
              </div>
            </>
          ) : selected.status === "recollection" ? (
            <div className="mt-3">
              <div className="mb-2"><DashedTag>Recollection — attempt {attempt}</DashedTag></div>
              <div className="border-l-[3px] border-adminreg-red bg-adminreg-red-soft p-3">
                <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-red-text">Recollection required — order still open</div>
                <p className="mt-1 text-xs text-adminreg-red-text">
                  Specimen {specNo} rejected at lab receipt — {log.filter((e) => e.kind === "rejected").slice(-1)[0]?.reason}. Reported by M. Pillai (Lab). Order stays open; recollection required.
                </p>
              </div>
              <CollectForm editable={editable} barcode={barcode} setBarcode={setBarcode} specNo={specNo} onCollect={markCollected} time={collectTime} setTime={setCollectTime} />
            </div>
          ) : (
            <div className="mt-3">
              <div className="mb-2"><DashedTag>Awaiting collection — attempt {attempt}</DashedTag></div>
              <CollectForm editable={editable} barcode={barcode} setBarcode={setBarcode} specNo={specNo} onCollect={markCollected} time={collectTime} setTime={setCollectTime} />
            </div>
          )}

          {rejecting && (
            <div className="mt-3 border-l-[3px] border-adminreg-red bg-adminreg-red-soft/60 p-3">
              <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-red-text">Reject sample at lab receipt</div>
              <div className="font-plexmono text-[9px] uppercase tracking-[0.03em] text-adminreg-red-text">Order is not voided</div>
              <p className="mt-1 text-[11px] text-adminreg-red-text">
                The order stays open against the same visit and returns to this worklist as NEEDS RECOLLECTION. Billing is untouched — the patient is not charged twice for one test.
              </p>
              <div className="mt-2 font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-red-text">Rejection reason</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {REJECTION_REASONS.map((r) => (
                  <button key={r} type="button" onClick={() => rejectSample(r)} className="border border-adminreg-red bg-adminreg-card px-2 py-1 text-[11px] font-semibold text-adminreg-red-text hover:bg-adminreg-red-soft">{r}</button>
                ))}
              </div>
              <button type="button" onClick={() => setRejecting(false)} className="mt-2 text-[11px] text-adminreg-muted underline">Cancel</button>
            </div>
          )}

          {log.length > 0 && (
            <div className="mt-3 border-t border-adminreg-divider pt-2.5">
              <div className="font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-muted2">Collection attempts — same order</div>
              <div className="mt-1.5 space-y-1.5">
                {log.map((e, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 border border-adminreg-divider bg-adminreg-bg px-2.5 py-1.5 text-[11px]">
                    <span className="text-adminreg-text">
                      Attempt {e.attempt} — {e.kind === "collected" ? `collected by ${e.by}. Specimen ${e.specimen}.` : `rejected by ${e.by} — ${e.reason}.`}
                    </span>
                    <Chip tone={e.kind === "collected" ? "collected" : "recollection"}>{e.kind === "collected" ? "Collected" : "Rejected"}</Chip>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function CollectForm({ editable, barcode, setBarcode, specNo, onCollect, time, setTime }: { editable: boolean; barcode: string; setBarcode: (v: string) => void; specNo: string; onCollect: () => void; time: string; setTime: (v: string) => void }) {
  return (
    <div className="mt-3">
      <div className="font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-muted2">Specimen barcode — optional</div>
      <div className="mt-1 flex gap-2">
        <input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          disabled={!editable}
          placeholder="Scan the label…"
          className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-1.5 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
        />
        <AdminButton type="button" variant="secondary" className="flex-shrink-0" disabled={!editable} onClick={() => setBarcode(specNo)}>Scan label</AdminButton>
      </div>
      <p className="mt-1 text-[11px] text-adminreg-muted">
        Where barcoding is in use, scanning fills this and ties the vial to the order for chain of custody. Where it is not, collection can still be logged without it.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="border border-adminreg-border bg-adminreg-bg p-2.5">
          <div className="font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-muted2">Collection time</div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="font-plexmono text-[11px] text-adminreg-muted">{DEMO_DATE_LABEL} ·</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!editable}
              className="border border-adminreg-border bg-adminreg-card px-1.5 py-0.5 font-plexmono text-xs text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
            />
          </div>
          <p className="mt-1 text-[10px] text-adminreg-muted">Defaults to now — adjust if the vial was drawn earlier.</p>
        </div>
        <DetailBox label="Collected by">K. Rao (Phlebotomy)</DetailBox>
      </div>
      {editable && (
        <AdminButton type="button" accent="indigo" className="mt-3 w-full" disabled={!time} onClick={onCollect}>
          Mark collected — {DEMO_DATE_LABEL} {time}
        </AdminButton>
      )}
    </div>
  )
}

// =========================================================================
// Screen 2 — Imaging Performed (RADIOGRAPHER)
// =========================================================================

type ImagingStatus = "awaiting" | "performed" | "repeat"

interface ImagingOrder {
  id: string
  study: string
  patient: string
  uhid: string
  visitId: string
  orderedBy: string
  orderedTime: string
  priority: "URGENT" | "ROUTINE"
  payment: string
  equipment: string[]
  status: ImagingStatus
}

const IMAGING_SEED: ImagingOrder[] = [
  { id: "RAD-2210", study: "Chest X-ray (PA view)", patient: "Meera Kulkarni", uhid: "UHID-0004821", visitId: "OPD-20260812-0091", orderedBy: "Dr. Anjali Nair", orderedTime: "09:34", priority: "URGENT", payment: "Star Health TPA — pre-authorised", equipment: ["DR Room 1 · Siemens Ysio Max", "Portable · Fuji FDR Go"], status: "performed" },
  { id: "RAD-2214", study: "USG Abdomen", patient: "Rakesh Menon", uhid: "UHID-0003190", visitId: "OPD-20260812-0104", orderedBy: "Dr. Rohan Mehta", orderedTime: "10:44", priority: "ROUTINE", payment: "Cash — receipt REC-00863", equipment: ["USG Room 2 · GE Logiq P9", "USG Room 3 · Philips Affiniti 50"], status: "awaiting" },
  { id: "RAD-2218", study: "CT Chest (plain)", patient: "Imran Sheikh", uhid: "UHID-0004930", visitId: "OPD-20260812-0110", orderedBy: "Dr. Sana Kapoor", orderedTime: "11:26", priority: "ROUTINE", payment: "Cash — receipt REC-00871", equipment: ["CT Room 1 · Siemens Somatom go.Top", "CT Room 2 · GE Revolution"], status: "awaiting" },
]

interface ImagingEvent {
  attempt: number
  kind: "performed" | "failed"
  by: string
  time: string
  equipment: string
  reason?: string
}

function ImagingPerformedScreen({ editable }: { editable: boolean }) {
  const [orders, setOrders] = useState<ImagingOrder[]>(IMAGING_SEED)
  const [selectedId, setSelectedId] = useState("RAD-2214")
  const [equipment, setEquipment] = useState<string | null>(null)
  const [events, setEvents] = useState<Record<string, ImagingEvent[]>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [failing, setFailing] = useState(false)

  const awaitingCount = orders.filter((o) => o.status !== "performed").length
  const selected = orders.find((o) => o.id === selectedId)!
  const log = events[selected.id] ?? []
  const attempt = log.filter((e) => e.kind === "failed").length + 1
  const doneTime = "12:03"

  function markPerformed() {
    if (!editable || !equipment) return
    setOrders((os) => os.map((o) => (o.id === selected.id ? { ...o, status: "performed" } : o)))
    setEvents((e) => ({ ...e, [selected.id]: [...(e[selected.id] ?? []), { attempt, kind: "performed", by: "S. Fernandes (Radiographer)", time: doneTime, equipment }] }))
    setBanner(`✓ ${selected.study} performed at ${doneTime} on ${equipment}. ${selected.id} now appears on the result-entry worklist for the report.`)
    setEquipment(null)
    setFailing(false)
  }

  function logFailed(reason: string) {
    setOrders((os) => os.map((o) => (o.id === selected.id ? { ...o, status: "repeat" } : o)))
    setEvents((e) => ({ ...e, [selected.id]: [...(e[selected.id] ?? []), { attempt, kind: "failed", by: "S. Fernandes (Radiographer)", time: "12:21", equipment: equipment ?? "—", reason }] }))
    setBanner(`✓ ${selected.id} — attempt logged as failed (${reason}). The failed attempt stays on the order record; a repeat is now due.`)
    setFailing(false)
  }

  return (
    <div>
      {banner && (
        <div className="mb-4 flex items-start justify-between gap-4 border border-adminreg-olive bg-adminreg-olive-soft px-4 py-2.5 text-xs text-adminreg-olive-dark">
          <span>{banner}</span>
          <button type="button" onClick={() => setBanner(null)} className="flex-shrink-0 font-plexmono text-[10px] uppercase tracking-wide underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="border border-adminreg-border bg-adminreg-card">
          <div className="border-b border-adminreg-divider bg-adminreg-header px-3.5 py-3">
            <div className="flex items-center justify-between">
              <SectionLabel>Imaging worklist</SectionLabel>
              <span className="font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">{awaitingCount} awaiting imaging</span>
            </div>
            <p className="text-xs text-adminreg-muted">
              S. Fernandes (Radiographer). Radiology orders that are payment- or coverage-cleared and awaiting the scan. No specimen is involved — what is captured here is the equipment used and the time performed.
            </p>
          </div>
          {orders.map((o) => (
            <WorklistRow key={o.id} active={o.id === selectedId} onClick={() => { setSelectedId(o.id); setEquipment(null); setFailing(false) }}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-adminreg-text">{o.study}</span>
                <Chip tone={o.status === "performed" ? "performed" : o.status === "repeat" ? "repeat" : "awaiting"}>
                  {o.status === "performed" ? "Performed" : o.status === "repeat" ? "Repeat required" : "Awaiting imaging"}
                </Chip>
              </div>
              <div className="mt-0.5 text-xs text-adminreg-muted">{o.patient} · {o.uhid}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-plexmono text-[10px] text-adminreg-muted2">{o.id} · ordered {o.orderedTime}</span>
                <Chip tone={o.priority === "URGENT" ? "urgent" : "routine"}>{o.priority}</Chip>
              </div>
            </WorklistRow>
          ))}
        </div>

        <Panel>
          <div className="text-lg font-extrabold text-adminreg-text">{selected.study}</div>
          <div className="text-xs text-adminreg-muted">{selected.patient} · {selected.uhid} · {selected.visitId}</div>
          <div className="mt-2"><Chip tone="routine">Radiology · no specimen</Chip></div>
          <p className="mt-2 font-plexmono text-[10px] text-adminreg-muted2">{selected.id} · ordered by {selected.orderedBy} at {selected.orderedTime} · payment cleared</p>

          <div className="mt-3"><DetailBox label="Payment / coverage" tone="indigo">{selected.payment}</DetailBox></div>

          {selected.status === "performed" ? (
            <div className="mt-3 border-l-[3px] border-adminreg-olive bg-adminreg-olive-soft p-3">
              <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-olive-dark">Imaging performed — in the result-entry queue</div>
              <p className="mt-0.5 font-plexmono text-[10px] text-adminreg-olive-dark">
                {(log.find((e) => e.kind === "performed")?.time) ?? doneTime} · {(log.find((e) => e.kind === "performed")?.equipment) ?? selected.equipment[0]} · S. Fernandes (Radiographer)
              </p>
              <p className="mt-1.5 text-xs text-adminreg-olive-dark">Images are with PACS and the order is now on Result Entry for the radiologist&apos;s report.</p>
              <div className="mt-2"><Link href="/opd/diagnostics?screen=result-entry" className="text-[11px] font-semibold text-adminreg-olive-dark underline">Open Result Entry →</Link></div>
            </div>
          ) : (
            <div className="mt-3">
              <div className="mb-2">
                <DashedTag>{selected.status === "repeat" ? `Repeat — attempt ${attempt}` : `Awaiting imaging — attempt ${attempt}`}</DashedTag>
              </div>
              {selected.status === "repeat" && (
                <div className="mb-2 border-l-[3px] border-adminreg-amber bg-adminreg-amber-soft p-3">
                  <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-amber-text">Repeat due — earlier attempt failed</div>
                  <p className="mt-1 text-xs text-adminreg-amber-text">
                    Attempt {attempt - 1} failed — {log.filter((e) => e.kind === "failed").slice(-1)[0]?.reason}. Logged by S. Fernandes (Radiographer). Original attempt record retained for the radiologist.
                  </p>
                </div>
              )}
              <div className="font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-muted2">Modality / equipment used</div>
              <div className="mt-1 flex flex-col gap-1.5">
                {selected.equipment.map((eq) => (
                  <button
                    key={eq}
                    type="button"
                    disabled={!editable}
                    onClick={() => setEquipment(eq)}
                    className={cn("border px-2.5 py-1.5 text-left text-xs disabled:opacity-60", equipment === eq ? "border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-indigo-dark" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted hover:text-adminreg-text")}
                  >
                    {eq}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <DetailBox label="Performed at">12 Aug 2026 · {doneTime}</DetailBox>
                <DetailBox label="Radiographer">S. Fernandes</DetailBox>
              </div>
              {editable && (
                <>
                  <AdminButton type="button" accent="indigo" className="mt-3 w-full" disabled={!equipment} onClick={markPerformed}>
                    {equipment ? `Mark imaging performed — 12 Aug ${doneTime}` : "Choose the equipment used to continue"}
                  </AdminButton>
                  <button type="button" onClick={() => setFailing((v) => !v)} className="mt-2 text-[11px] text-adminreg-amber-text underline">Log a failed attempt instead</button>
                </>
              )}
              {failing && (
                <div className="mt-2 border-l-[3px] border-adminreg-amber bg-adminreg-amber-soft/60 p-3">
                  <div className="font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-amber-text">Failure reason — appended, not overwritten</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {IMAGING_FAIL_REASONS.map((r) => (
                      <button key={r} type="button" onClick={() => logFailed(r)} className="border border-adminreg-amber bg-adminreg-card px-2 py-1 text-[11px] font-semibold text-adminreg-amber-text hover:bg-adminreg-amber-soft">{r}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {log.length > 0 && (
            <div className="mt-3 border-t border-adminreg-divider pt-2.5">
              <div className="font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-muted2">Attempts — same order</div>
              <div className="mt-1.5 space-y-1.5">
                {log.map((e, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 border border-adminreg-divider bg-adminreg-bg px-2.5 py-1.5 text-[11px]">
                    <span className="text-adminreg-text">
                      Attempt {e.attempt} — {e.kind === "performed" ? `performed on ${e.equipment} by ${e.by}.` : `failed (${e.reason}), logged by ${e.by}.`}
                    </span>
                    <Chip tone={e.kind === "performed" ? "performed" : "repeat"}>{e.kind === "performed" ? "Performed" : "Failed"}</Chip>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

// =========================================================================
// Screen 3 — Result Entry (LAB / RADIOLOGY) — derived queue
// =========================================================================

interface ResultRow {
  id: string
  test: string
  patient: string
  uhid: string
  visitId: string
  orderedBy: string
  sampleTime: string
  specNo: string
  ageLabel: string
  overdue: boolean
  kind: "numeric" | "narrative"
  unit?: string
  normalRange?: string
  critical?: (v: string) => boolean
  status: "draft" | "submitted"
}

const RESULT_SEED: ResultRow[] = [
  { id: "LAB-4471", test: "Serum Potassium", patient: "Meera Kulkarni", uhid: "UHID-0004821", visitId: "OPD-20260812-0091", orderedBy: "Dr. Anjali Nair", sampleTime: "09:12", specNo: "SPEC-20260812-4471", ageLabel: "2h 41m ago", overdue: true, kind: "numeric", unit: "mmol/L", normalRange: "3.5–5.1 mmol/L", critical: (v) => { const n = Number(v); return !Number.isNaN(n) && (n < 3.0 || n > 6.0) }, status: "draft" },
  { id: "LAB-4483", test: "Haemoglobin", patient: "Anita Desai", uhid: "UHID-0004410", visitId: "OPD-20260812-0099", orderedBy: "Dr. Rohan Mehta", sampleTime: "11:42", specNo: "SPEC-20260812-4483", ageLabel: "11m ago", overdue: false, kind: "numeric", unit: "g/dL", normalRange: "12.0–15.5 g/dL", critical: (v) => { const n = Number(v); return !Number.isNaN(n) && n < 7 }, status: "draft" },
  { id: "RAD-2210", test: "Chest X-ray (PA view)", patient: "Meera Kulkarni", uhid: "UHID-0004821", visitId: "OPD-20260812-0091", orderedBy: "Dr. Anjali Nair", sampleTime: "09:41", specNo: "PACS-RAD-2210", ageLabel: "2h 12m ago", overdue: true, kind: "narrative", status: "draft" },
]

function ResultEntryScreen({ editable }: { editable: boolean }) {
  const [rows, setRows] = useState<ResultRow[]>(RESULT_SEED)
  const [selectedId, setSelectedId] = useState("LAB-4471")
  const [value, setValue] = useState("6.4")
  const [banner, setBanner] = useState<string | null>(null)

  const selected = rows.find((r) => r.id === selectedId)!
  const awaiting = rows.filter((r) => r.status === "draft").length
  const isCritical = !!selected.critical?.(value)

  function submit() {
    if (!editable) return
    setRows((rs) => rs.map((r) => (r.id === selected.id ? { ...r, status: "submitted" } : r)))
    setBanner(`✓ ${selected.test} result entered${selected.kind === "numeric" ? ` — ${value} ${selected.unit}` : ""}. Now visible to ${selected.orderedBy}${isCritical ? " and auto-flagged CRITICAL — pushed to the doctor." : "."}`)
  }

  return (
    <div>
      {banner && (
        <div className="mb-4 flex items-start justify-between gap-4 border border-adminreg-olive bg-adminreg-olive-soft px-4 py-2.5 text-xs text-adminreg-olive-dark">
          <span>{banner}</span>
          <button type="button" onClick={() => setBanner(null)} className="flex-shrink-0 font-plexmono text-[10px] uppercase tracking-wide underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="border border-adminreg-border bg-adminreg-card">
          <div className="border-b border-adminreg-divider bg-adminreg-header px-3.5 py-3">
            <div className="flex items-center justify-between">
              <SectionLabel>My worklist</SectionLabel>
              <span className="font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">{awaiting} awaiting entry</span>
            </div>
            <p className="text-xs text-adminreg-muted">
              Assigned to M. Pillai · sample already collected, result not yet entered. Ordered oldest first — a sample sitting past two hours is flagged overdue.
            </p>
          </div>
          <div className="p-3.5">
            <InlineInfo>
              3 of 8 orders are ready for entry. 5 still upstream — pathology orders appear here only once Sample Collection marks them collected, radiology only once Imaging Performed marks the scan done.{" "}
              <Link href="/opd/diagnostics?screen=sample-collection" className="font-semibold underline">Sample Collection →</Link>{" "}
              <Link href="/opd/diagnostics?screen=imaging-performed" className="font-semibold underline">Imaging Performed →</Link>
            </InlineInfo>
          </div>
          {rows.map((r) => (
            <WorklistRow key={r.id} active={r.id === selectedId} onClick={() => { setSelectedId(r.id); setValue(r.id === "LAB-4471" ? "6.4" : "") }}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-adminreg-text">{r.test}</span>
                <Chip tone={r.status === "submitted" ? "performed" : r.overdue ? "overdue" : "fresh"}>
                  {r.status === "submitted" ? "Entered" : r.overdue ? "Overdue" : "Fresh"}
                </Chip>
              </div>
              <div className="mt-0.5 text-xs text-adminreg-muted">{r.patient} · {r.uhid}</div>
              <div className="text-xs text-adminreg-muted">Ordered by {r.orderedBy}</div>
              <div className="mt-1 font-plexmono text-[10px] text-adminreg-muted2">Sample {r.sampleTime} · {r.specNo} · {r.ageLabel}</div>
            </WorklistRow>
          ))}
        </div>

        <Panel>
          <div className="text-lg font-extrabold text-adminreg-text">{selected.test}</div>
          <div className="text-xs text-adminreg-muted">{selected.patient} · {selected.uhid} · {selected.visitId}</div>
          <div className="mt-2"><Chip tone="routine">{selected.kind === "numeric" ? "Pathology · numeric result" : "Radiology · narrative report"}</Chip></div>
          <p className="mt-2 font-plexmono text-[10px] text-adminreg-muted2">{selected.id} · ordered by {selected.orderedBy} · sample {selected.sampleTime} · {selected.specNo}</p>

          {selected.status === "submitted" ? (
            <div className="mt-3 border-l-[3px] border-adminreg-olive bg-adminreg-olive-soft p-3 text-xs text-adminreg-olive-dark">
              Result submitted and released to {selected.orderedBy}. It now shows on the Diagnostics stage of {selected.visitId}.
            </div>
          ) : (
            <>
              <div className="mt-3"><DashedTag>Draft — not visible to the doctor yet</DashedTag></div>
              {selected.kind === "numeric" ? (
                <>
                  <div className="mt-3 font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-muted2">Result value</div>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      disabled={!editable}
                      className={cn(
                        "w-32 border-2 px-3 py-2 text-2xl font-bold text-adminreg-text focus:outline-none disabled:opacity-60",
                        isCritical ? "border-adminreg-red bg-adminreg-red-soft/40" : "border-adminreg-border bg-adminreg-bg focus:border-adminreg-indigo"
                      )}
                    />
                    <span className="text-sm text-adminreg-muted">{selected.unit}</span>
                  </div>
                  <div className="mt-2 border border-adminreg-border bg-adminreg-bg px-2.5 py-1.5">
                    <div className="font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-muted2">Normal range · Admin → Test Master</div>
                    <div className="text-xs text-adminreg-text">{selected.normalRange}</div>
                  </div>
                  {isCritical && (
                    <div className="mt-2 border-2 border-adminreg-red bg-adminreg-red-soft px-3 py-2 text-xs font-bold text-adminreg-red-text">
                      ⚠ Outside the critical range — submitting will auto-flag this and push it to {selected.orderedBy} immediately.
                    </div>
                  )}
                </>
              ) : (
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={!editable}
                  rows={4}
                  placeholder="Radiologist's report…"
                  className="mt-3 w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
                />
              )}

              {editable && (
                <AdminButton type="button" accent="indigo" className="mt-3 w-full" disabled={!value.trim()} onClick={submit}>
                  Submit result → release to {selected.orderedBy}
                </AdminButton>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}

// =========================================================================
// Page shell
// =========================================================================

export function OpdDiagnosticsWorklistPage() {
  const searchParams = useSearchParams()
  const { role } = useStaffRole()
  const screenParam = (searchParams.get("screen") as DxWorklistKey) || "sample-collection"
  const def = useMemo(() => DX_WORKLIST_DEFS.find((d) => d.key === screenParam) ?? DX_WORKLIST_DEFS[0], [screenParam])

  // Lab / Radiology Tech operates these queues; Hospital Admin sees them
  // read-only for oversight; every other role gets the view-only banner.
  const editable = dxWorklistEditable(role)

  return (
    <div className="min-h-full">
      <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-4 border-b border-adminreg-border bg-adminreg-header px-4 py-4 font-archivo sm:px-6 md:px-8">
        <div>
          <div className="mb-1 font-plexmono text-[10px] tracking-[0.05em] text-adminreg-muted">{def.breadcrumb}</div>
          <h1 className="text-[21px] font-extrabold tracking-[-0.01em] text-adminreg-text">{def.name}</h1>
        </div>
      </div>

      {!editable && <ViewOnlyBanner role={ROLE_LABEL[role]} />}

      <div className="px-4 pb-16 pt-6 font-archivo sm:px-6 md:px-8">
        <div className="mx-auto max-w-[1240px]">
          {def.key === "sample-collection" && <SampleCollectionScreen editable={editable} />}
          {def.key === "imaging-performed" && <ImagingPerformedScreen editable={editable} />}
          {def.key === "result-entry" && <ResultEntryScreen editable={editable} />}
        </div>
      </div>
    </div>
  )
}
