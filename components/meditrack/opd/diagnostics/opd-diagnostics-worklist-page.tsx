"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { AdminButton } from "@/components/meditrack/admin/register"
import { useStaffRole } from "@/components/meditrack/layout/register/RoleProvider"
import { ROLE_LABEL, dxWorklistEditable } from "@/components/meditrack/layout/register/rbac"
import { useBranchScope } from "@/components/meditrack/admin/register/use-branch-scope"
import { SectionLabel, Panel, InlineInfo, ViewOnlyBanner } from "@/components/meditrack/opd/shared/ui"
import { DX_WORKLIST_DEFS, IMAGING_FAIL_REASONS, REJECTION_REASONS, type DxWorklistKey } from "./theme"
import {
  useAddDiagnosticResult,
  useCollectDiagnosticSample,
  useDiagnosticWorklist,
  useRejectDiagnosticSpecimen,
  type DiagnosticSpecimen,
  type DiagnosticWorklistItem,
} from "@/queries/meditrack/opd-diagnostics"

/** The equipment picker lives on this screen until a machine register exists. */
const IMAGING_ROOMS = [
  "DR Room 1 · Siemens Ysio Max",
  "Portable · Fuji FDR Go",
  "USG Room 2 · GE Logiq P9",
  "USG Room 3 · Philips Affiniti 50",
  "CT Room 1 · Siemens Somatom go.Top",
  "CT Room 2 · GE Revolution",
]

function todayIsoDate() {
  return new Date().toLocaleDateString("en-CA")
}

function dateLabel(d = new Date()) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function nowHhMm() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function hhMm(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function atTimeToday(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  const d = new Date()
  d.setHours(h || 0, m || 0, 0, 0)
  return d.toISOString()
}

function isRejected(status?: string | null) {
  return (status || "").toLowerCase() === "rejected"
}

function isImagingModality(modality?: string | null) {
  return (modality || "").toUpperCase() === "RADIOLOGY"
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

function EmptyWorklist({ message }: { message: string }) {
  return <p className="px-3.5 py-8 text-center text-xs text-adminreg-muted">{message}</p>
}

function invalidateWorklists(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["meditrack", "opd-dx-worklist"] })
  void queryClient.invalidateQueries({ queryKey: ["meditrack", "opd-dx-visit"] })
}

function pathoTone(label?: string | null): "collected" | "recollection" | "awaiting" {
  const v = (label || "").toLowerCase()
  if (v.includes("collected") && !v.includes("awaiting")) return "collected"
  if (v.includes("recollection")) return "recollection"
  return "awaiting"
}

function imagingTone(label?: string | null): "performed" | "repeat" | "awaiting" {
  const v = (label || "").toLowerCase()
  if (v.includes("performed") || v === "scan done") return "performed"
  if (v.includes("repeat")) return "repeat"
  return "awaiting"
}

function displayId(item: DiagnosticWorklistItem) {
  return item.orderNumber || item.orderId
}

function specNoFor(item: DiagnosticWorklistItem) {
  return item.specimenNumber || item.specimenBarcode || displayId(item)
}

function rejectedAttempts(attempts: DiagnosticSpecimen[]) {
  return attempts.filter((a) => isRejected(a.status))
}

function collectedAttempt(attempts: DiagnosticSpecimen[]) {
  return [...attempts].reverse().find((a) => !isRejected(a.status))
}

function failedAttempt(attempts: DiagnosticSpecimen[]) {
  return [...attempts].reverse().find((a) => isRejected(a.status))
}

function useKeepSelection(items: DiagnosticWorklistItem[], selectedId: string | null, setSelectedId: (id: string) => void) {
  useEffect(() => {
    if (items.length === 0) return
    if (selectedId && items.some((i) => i.orderId === selectedId)) return
    setSelectedId(items[0].orderId)
  }, [items, selectedId, setSelectedId])
}

// =========================================================================
// Screen 1 — Sample Collection (PHLEBOTOMY)
// =========================================================================

function SampleCollectionScreen({ editable, clinicId }: { editable: boolean; clinicId?: string }) {
  const queryClient = useQueryClient()
  const collect = useCollectDiagnosticSample()
  const reject = useRejectDiagnosticSpecimen()
  const worklist = useDiagnosticWorklist({
    stage: "collection",
    modality: "LAB",
    date: todayIsoDate(),
    includeDone: true,
  })

  const orders = worklist.data?.items ?? []
  const awaitingCount = worklist.data?.awaitingCount ?? orders.filter((o) => pathoTone(o.statusLabel) !== "collected").length
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [barcode, setBarcode] = useState("")
  const [banner, setBanner] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [collectTime, setCollectTime] = useState(nowHhMm)
  const todayLabel = dateLabel()

  useKeepSelection(orders, selectedId, setSelectedId)

  const selectedOrder = orders.find((o) => o.orderId === selectedId)
  const log = selectedOrder?.attempts ?? []
  const attempt = selectedOrder?.collectionAttempt || rejectedAttempts(log).length + 1
  const specNo = selectedOrder ? specNoFor(selectedOrder) : ""
  const status = pathoTone(selectedOrder?.statusLabel)
  const collected = collectedAttempt(log)
  const lastReject = failedAttempt(log)

  async function markCollected() {
    if (!editable || !selectedOrder) return
    setError(null)
    const spec = barcode.trim() || specNo
    try {
      await collect.mutateAsync({
        orderId: selectedOrder.orderId,
        specimenBarcode: barcode.trim() || undefined,
        sampleCollectedAt: atTimeToday(collectTime),
      })
      invalidateWorklists(queryClient)
      setBanner(`✓ ${selectedOrder.testName} collected at ${collectTime} · ${spec}. ${displayId(selectedOrder)} now appears on the result-entry worklist.`)
      setBarcode("")
      setRejecting(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark collected.")
    }
  }

  async function rejectSample(reason: string) {
    if (!selectedOrder) return
    setError(null)
    try {
      await reject.mutateAsync({ orderId: selectedOrder.orderId, reason })
      invalidateWorklists(queryClient)
      setBanner(`${selectedOrder.testName} — specimen rejected at lab receipt (${reason}). Order stays open; ${displayId(selectedOrder)} returns to this worklist as NEEDS RECOLLECTION. Billing untouched.`)
      setRejecting(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject specimen.")
    }
  }

  return (
    <div>
      {(banner || error) && (
        <div className={cn("mb-4 flex items-start justify-between gap-4 px-4 py-2.5 text-xs", error ? "border border-adminreg-red bg-adminreg-red-soft text-adminreg-red-text" : "border border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark")}>
          <span>{error || banner}</span>
          <button type="button" onClick={() => { setBanner(null); setError(null) }} className="flex-shrink-0 font-plexmono text-[10px] uppercase tracking-wide underline">Dismiss</button>
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
              Pathology orders confirmed on Diagnostics. Awaiting a specimen before result entry.
            </p>
          </div>
          {worklist.isLoading && orders.length === 0 && <EmptyWorklist message="Loading collection worklist…" />}
          {!worklist.isLoading && orders.length === 0 && (
            <EmptyWorklist message={worklist.error instanceof Error ? worklist.error.message : "No lab orders awaiting collection. Confirm a LAB test on Diagnostics and it appears here."} />
          )}
          {orders.map((o) => {
            const tone = pathoTone(o.statusLabel)
            return (
              <WorklistRow key={o.orderId} active={o.orderId === selectedId} onClick={() => { setSelectedId(o.orderId); setRejecting(false); setBarcode(""); setError(null) }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-adminreg-text">{o.testName}</span>
                  <Chip tone={tone === "collected" ? "collected" : tone === "recollection" ? "recollection" : "awaiting"}>
                    {o.statusLabel || (tone === "collected" ? "Collected" : tone === "recollection" ? "Needs recollection" : "Awaiting collection")}
                  </Chip>
                </div>
                <div className="mt-0.5 text-xs text-adminreg-muted">{o.patientName || "—"} · {o.patientUhid || "—"}</div>
                <div className="text-xs text-adminreg-muted">{o.specimenLine || "Specimen as per Test Master"}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-plexmono text-[10px] text-adminreg-muted2">{displayId(o)} · ordered {hhMm(o.orderedAt)}</span>
                  <Chip tone={(o.priority || "").toUpperCase() === "URGENT" ? "urgent" : "routine"}>{o.priority || "ROUTINE"}</Chip>
                </div>
              </WorklistRow>
            )
          })}
        </div>

        {/* Detail */}
        <Panel>
          {!selectedOrder ? (
            <p className="text-sm text-adminreg-muted">Select an order from the worklist.</p>
          ) : (
            <>
          <div className="text-lg font-extrabold text-adminreg-text">{selectedOrder.testName}</div>
          <div className="text-xs text-adminreg-muted">{selectedOrder.patientName || "—"} · {selectedOrder.patientUhid || "—"} · {selectedOrder.visitId}</div>
          <div className="mt-2"><Chip tone="routine">Pathology · specimen required</Chip></div>
          <p className="mt-2 font-plexmono text-[10px] text-adminreg-muted2">{displayId(selectedOrder)} · ordered by {selectedOrder.orderedByName || "—"} at {hhMm(selectedOrder.orderedAt)} · payment cleared</p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <DetailBox label="Specimen required">{selectedOrder.specimenLine || "As per Test Master"}</DetailBox>
            <DetailBox label="Payment / coverage" tone="indigo">{selectedOrder.paymentLine || "Payment cleared"}</DetailBox>
          </div>

          {status === "collected" ? (
            <>
              <div className="mt-3 border-l-[3px] border-adminreg-olive bg-adminreg-olive-soft p-3">
                <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-olive-dark">Collected — in the result-entry queue</div>
                <p className="mt-0.5 font-plexmono text-[10px] text-adminreg-olive-dark">
                  {hhMm(collected?.collectedAt || selectedOrder.sampleCollectedAt)} · {collected?.specimenNumber || selectedOrder.specimenBarcode || specNo} · {selectedOrder.collectedByName || collected?.collectedByName || "Phlebotomy"}
                </p>
                <p className="mt-1.5 text-xs text-adminreg-olive-dark">
                  Chain of custody starts here. {selectedOrder.testName} is now visible on Result Entry; nothing before this point was.
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                  <Link href="/opd/diagnostics?screen=result-entry" className="font-semibold text-adminreg-olive-dark underline">Open Result Entry →</Link>
                  {editable && <button type="button" onClick={() => setRejecting(true)} className="font-semibold text-adminreg-amber-text underline">Reject sample — needs recollection</button>}
                </div>
              </div>
            </>
          ) : status === "recollection" ? (
            <div className="mt-3">
              <div className="mb-2"><DashedTag>Recollection — attempt {attempt}</DashedTag></div>
              <div className="border-l-[3px] border-adminreg-red bg-adminreg-red-soft p-3">
                <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-red-text">Recollection required — order still open</div>
                <p className="mt-1 text-xs text-adminreg-red-text">
                  {selectedOrder.recollectionReason || `Specimen ${specNo} rejected at lab receipt — ${lastReject?.rejectionReason || "needs recollection"}. Order stays open; recollection required.`}
                </p>
              </div>
              <CollectForm editable={editable} barcode={barcode} setBarcode={setBarcode} specNo={specNo} onCollect={() => void markCollected()} time={collectTime} setTime={setCollectTime} dateLabel={todayLabel} busy={collect.isPending} />
            </div>
          ) : (
            <div className="mt-3">
              <div className="mb-2"><DashedTag>Awaiting collection — attempt {attempt}</DashedTag></div>
              <CollectForm editable={editable} barcode={barcode} setBarcode={setBarcode} specNo={specNo} onCollect={() => void markCollected()} time={collectTime} setTime={setCollectTime} dateLabel={todayLabel} busy={collect.isPending} />
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
                  <button key={r} type="button" disabled={reject.isPending} onClick={() => void rejectSample(r)} className="border border-adminreg-red bg-adminreg-card px-2 py-1 text-[11px] font-semibold text-adminreg-red-text hover:bg-adminreg-red-soft">{r}</button>
                ))}
              </div>
              <button type="button" onClick={() => setRejecting(false)} className="mt-2 text-[11px] text-adminreg-muted underline">Cancel</button>
            </div>
          )}

          {log.length > 0 && (
            <div className="mt-3 border-t border-adminreg-divider pt-2.5">
              <div className="font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-muted2">Collection attempts — same order</div>
              <div className="mt-1.5 space-y-1.5">
                {log.map((e) => {
                  const rejected = isRejected(e.status)
                  return (
                    <div key={e.id} className="flex items-start justify-between gap-2 border border-adminreg-divider bg-adminreg-bg px-2.5 py-1.5 text-[11px]">
                      <span className="text-adminreg-text">
                        {e.line || (rejected
                          ? `Attempt ${e.attemptNo} — rejected by ${e.rejectedByName || "Lab"} — ${e.rejectionReason}.`
                          : `Attempt ${e.attemptNo} — collected by ${e.collectedByName || "Phlebotomy"}. Specimen ${e.specimenNumber || e.barcode || specNo}.`)}
                      </span>
                      <Chip tone={rejected ? "recollection" : "collected"}>{rejected ? "Rejected" : "Collected"}</Chip>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}

function CollectForm({ editable, barcode, setBarcode, specNo, onCollect, time, setTime, dateLabel, busy }: { editable: boolean; barcode: string; setBarcode: (v: string) => void; specNo: string; onCollect: () => void; time: string; setTime: (v: string) => void; dateLabel: string; busy?: boolean }) {
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
            <span className="font-plexmono text-[11px] text-adminreg-muted">{dateLabel} ·</span>
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
        <AdminButton type="button" accent="indigo" className="mt-3 w-full" disabled={!time || busy} onClick={onCollect}>
          {busy ? "Saving…" : `Mark collected — ${dateLabel} ${time}`}
        </AdminButton>
      )}
    </div>
  )
}

// =========================================================================
// Screen 2 — Imaging Performed (RADIOGRAPHER)
// =========================================================================

function ImagingPerformedScreen({ editable, clinicId }: { editable: boolean; clinicId?: string }) {
  const queryClient = useQueryClient()
  const collect = useCollectDiagnosticSample()
  const reject = useRejectDiagnosticSpecimen()
  const worklist = useDiagnosticWorklist({
    stage: "collection",
    modality: "RADIOLOGY",
    date: todayIsoDate(),
    includeDone: true,
  })

  const orders = worklist.data?.items ?? []
  const awaitingCount = worklist.data?.awaitingCount ?? orders.filter((o) => imagingTone(o.statusLabel) !== "performed").length
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [failing, setFailing] = useState(false)
  const doneTime = nowHhMm()
  const todayLabel = dateLabel()

  useKeepSelection(orders, selectedId, setSelectedId)
  const selectedOrder = orders.find((o) => o.orderId === selectedId)
  const log = selectedOrder?.attempts ?? []
  const attempt = selectedOrder?.collectionAttempt || rejectedAttempts(log).length + 1
  const status = imagingTone(selectedOrder?.statusLabel)
  const performed = collectedAttempt(log)
  const lastFail = failedAttempt(log)
  const rooms = selectedOrder?.equipmentUsed && !IMAGING_ROOMS.includes(selectedOrder.equipmentUsed)
    ? [selectedOrder.equipmentUsed, ...IMAGING_ROOMS]
    : IMAGING_ROOMS

  async function markPerformed() {
    if (!editable || !selectedOrder || !equipment) return
    setError(null)
    try {
      await collect.mutateAsync({
        orderId: selectedOrder.orderId,
        equipmentUsed: equipment,
        sampleCollectedAt: atTimeToday(doneTime),
      })
      invalidateWorklists(queryClient)
      setBanner(`✓ ${selectedOrder.testName} performed at ${doneTime} on ${equipment}. ${displayId(selectedOrder)} now appears on the result-entry worklist for the report.`)
      setEquipment(null)
      setFailing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark performed.")
    }
  }

  async function logFailed(reason: string) {
    if (!selectedOrder) return
    setError(null)
    try {
      await reject.mutateAsync({ orderId: selectedOrder.orderId, reason })
      invalidateWorklists(queryClient)
      setBanner(`✓ ${displayId(selectedOrder)} — attempt logged as failed (${reason}). The failed attempt stays on the order record; a repeat is now due.`)
      setFailing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log failed attempt.")
    }
  }

  return (
    <div>
      {(banner || error) && (
        <div className={cn("mb-4 flex items-start justify-between gap-4 px-4 py-2.5 text-xs", error ? "border border-adminreg-red bg-adminreg-red-soft text-adminreg-red-text" : "border border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark")}>
          <span>{error || banner}</span>
          <button type="button" onClick={() => { setBanner(null); setError(null) }} className="flex-shrink-0 font-plexmono text-[10px] uppercase tracking-wide underline">Dismiss</button>
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
          {worklist.isLoading && orders.length === 0 && <EmptyWorklist message="Loading imaging worklist…" />}
          {!worklist.isLoading && orders.length === 0 && (
            <EmptyWorklist message={worklist.error instanceof Error ? worklist.error.message : "Nothing on the imaging worklist."} />
          )}
          {orders.map((o) => {
            const tone = imagingTone(o.statusLabel)
            return (
              <WorklistRow key={o.orderId} active={o.orderId === selectedId} onClick={() => { setSelectedId(o.orderId); setEquipment(null); setFailing(false); setError(null) }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-adminreg-text">{o.testName}</span>
                  <Chip tone={tone === "performed" ? "performed" : tone === "repeat" ? "repeat" : "awaiting"}>
                    {o.statusLabel || (tone === "performed" ? "Performed" : tone === "repeat" ? "Repeat required" : "Awaiting imaging")}
                  </Chip>
                </div>
                <div className="mt-0.5 text-xs text-adminreg-muted">{o.patientName || "—"} · {o.patientUhid || "—"}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-plexmono text-[10px] text-adminreg-muted2">{displayId(o)} · ordered {hhMm(o.orderedAt)}</span>
                  <Chip tone={(o.priority || "").toUpperCase() === "URGENT" ? "urgent" : "routine"}>{o.priority || "ROUTINE"}</Chip>
                </div>
              </WorklistRow>
            )
          })}
        </div>

        <Panel>
          {!selectedOrder ? (
            <p className="text-sm text-adminreg-muted">Select an order from the worklist.</p>
          ) : (
            <>
          <div className="text-lg font-extrabold text-adminreg-text">{selectedOrder.testName}</div>
          <div className="text-xs text-adminreg-muted">{selectedOrder.patientName || "—"} · {selectedOrder.patientUhid || "—"} · {selectedOrder.visitId}</div>
          <div className="mt-2"><Chip tone="routine">Radiology · no specimen</Chip></div>
          <p className="mt-2 font-plexmono text-[10px] text-adminreg-muted2">{displayId(selectedOrder)} · ordered by {selectedOrder.orderedByName || "—"} at {hhMm(selectedOrder.orderedAt)} · payment cleared</p>

          <div className="mt-3"><DetailBox label="Payment / coverage" tone="indigo">{selectedOrder.paymentLine || "Payment cleared"}</DetailBox></div>

          {status === "performed" ? (
            <div className="mt-3 border-l-[3px] border-adminreg-olive bg-adminreg-olive-soft p-3">
              <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-olive-dark">Imaging performed — in the result-entry queue</div>
              <p className="mt-0.5 font-plexmono text-[10px] text-adminreg-olive-dark">
                {hhMm(performed?.collectedAt || selectedOrder.sampleCollectedAt)} · {selectedOrder.equipmentUsed || performed?.line || rooms[0]} · {selectedOrder.collectedByName || "Radiographer"}
              </p>
              <p className="mt-1.5 text-xs text-adminreg-olive-dark">Images are with PACS and the order is now on Result Entry for the radiologist&apos;s report.</p>
              <div className="mt-2"><Link href="/opd/diagnostics?screen=result-entry" className="text-[11px] font-semibold text-adminreg-olive-dark underline">Open Result Entry →</Link></div>
            </div>
          ) : (
            <div className="mt-3">
              <div className="mb-2">
                <DashedTag>{status === "repeat" ? `Repeat — attempt ${attempt}` : `Awaiting imaging — attempt ${attempt}`}</DashedTag>
              </div>
              {status === "repeat" && (
                <div className="mb-2 border-l-[3px] border-adminreg-amber bg-adminreg-amber-soft p-3">
                  <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-amber-text">Repeat due — earlier attempt failed</div>
                  <p className="mt-1 text-xs text-adminreg-amber-text">
                    {selectedOrder.recollectionReason || `Attempt ${attempt - 1} failed — ${lastFail?.rejectionReason || "repeat required"}. Original attempt record retained for the radiologist.`}
                  </p>
                </div>
              )}
              <div className="font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-muted2">Modality / equipment used</div>
              <div className="mt-1 flex flex-col gap-1.5">
                {rooms.map((eq) => (
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
                <DetailBox label="Performed at">{todayLabel} · {doneTime}</DetailBox>
                <DetailBox label="Radiographer">S. Fernandes</DetailBox>
              </div>
              {editable && (
                <>
                  <AdminButton type="button" accent="indigo" className="mt-3 w-full" disabled={!equipment || collect.isPending} onClick={() => void markPerformed()}>
                    {collect.isPending ? "Saving…" : equipment ? `Mark imaging performed — ${todayLabel.split(" ").slice(0, 2).join(" ")} ${doneTime}` : "Choose the equipment used to continue"}
                  </AdminButton>
                  <button type="button" onClick={() => setFailing((v) => !v)} className="mt-2 text-[11px] text-adminreg-amber-text underline">Log a failed attempt instead</button>
                </>
              )}
              {failing && (
                <div className="mt-2 border-l-[3px] border-adminreg-amber bg-adminreg-amber-soft/60 p-3">
                  <div className="font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-amber-text">Failure reason — appended, not overwritten</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {IMAGING_FAIL_REASONS.map((r) => (
                      <button key={r} type="button" disabled={reject.isPending} onClick={() => void logFailed(r)} className="border border-adminreg-amber bg-adminreg-card px-2 py-1 text-[11px] font-semibold text-adminreg-amber-text hover:bg-adminreg-amber-soft">{r}</button>
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
                {log.map((e) => {
                  const failed = isRejected(e.status)
                  return (
                    <div key={e.id} className="flex items-start justify-between gap-2 border border-adminreg-divider bg-adminreg-bg px-2.5 py-1.5 text-[11px]">
                      <span className="text-adminreg-text">
                        {e.line || (failed
                          ? `Attempt ${e.attemptNo} — failed (${e.rejectionReason}), logged by ${e.rejectedByName || "Radiographer"}.`
                          : `Attempt ${e.attemptNo} — performed on ${selectedOrder.equipmentUsed || "equipment"} by ${e.collectedByName || "Radiographer"}.`)}
                      </span>
                      <Chip tone={failed ? "repeat" : "performed"}>{failed ? "Failed" : "Performed"}</Chip>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}

// =========================================================================
// Screen 3 — Result Entry (LAB / RADIOLOGY) — derived queue
// =========================================================================

function ResultEntryScreen({ editable, clinicId }: { editable: boolean; clinicId?: string }) {
  const queryClient = useQueryClient()
  const addResult = useAddDiagnosticResult()
  const params = { stage: "result-entry" as const, date: todayIsoDate(), includeDone: true }
  const lab = useDiagnosticWorklist({ ...params, modality: "LAB" })
  const rad = useDiagnosticWorklist({ ...params, modality: "RADIOLOGY" })

  const rows = useMemo(() => [...(lab.data?.items ?? []), ...(rad.data?.items ?? [])], [lab.data?.items, rad.data?.items])
  const awaiting = (lab.data?.awaitingCount ?? 0) + (rad.data?.awaitingCount ?? 0)
  const upstream = (lab.data?.upstreamCount ?? 0) + (rad.data?.upstreamCount ?? 0)
  const ready = rows.length
  const totalKnown = ready + upstream

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [value, setValue] = useState("")
  const [banner, setBanner] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set())

  useKeepSelection(rows, selectedId, setSelectedId)
  const selected = rows.find((r) => r.orderId === selectedId)
  const kind = selected && isImagingModality(selected.modality) ? "narrative" : "numeric"
  const submitted = selected ? submittedIds.has(selected.orderId) || !selected.canEnterResult : false
  const numericValue = Number(value)
  const isCritical = kind === "numeric" && selected && !Number.isNaN(numericValue) && (
    (selected.criticalLow != null && numericValue < selected.criticalLow) ||
    (selected.criticalHigh != null && numericValue > selected.criticalHigh)
  )
  const loadError = lab.error || rad.error
  const loading = (lab.isLoading || rad.isLoading) && rows.length === 0

  async function submit() {
    if (!editable || !selected || !value.trim()) return
    setError(null)
    const numeric = kind === "numeric" ? Number(value) : NaN
    try {
      await addResult.mutateAsync({
        orderId: selected.orderId,
        valueText: kind === "narrative" || Number.isNaN(numeric) ? value.trim() : undefined,
        valueNumeric: kind === "numeric" && !Number.isNaN(numeric) ? numeric : undefined,
        unit: selected.unit || undefined,
        referenceRange: selected.normalRange || undefined,
      })
      setSubmittedIds((prev) => new Set(prev).add(selected.orderId))
      invalidateWorklists(queryClient)
      setBanner(`✓ ${selected.testName} result entered${kind === "numeric" ? ` — ${value} ${selected.unit || ""}` : ""}. Now visible to ${selected.orderedByName || "the ordering doctor"}${isCritical ? " and auto-flagged CRITICAL — pushed to the doctor." : "."}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit result.")
    }
  }

  return (
    <div>
      {(banner || error) && (
        <div className={cn("mb-4 flex items-start justify-between gap-4 px-4 py-2.5 text-xs", error ? "border border-adminreg-red bg-adminreg-red-soft text-adminreg-red-text" : "border border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark")}>
          <span>{error || banner}</span>
          <button type="button" onClick={() => { setBanner(null); setError(null) }} className="flex-shrink-0 font-plexmono text-[10px] uppercase tracking-wide underline">Dismiss</button>
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
              {ready} of {totalKnown || ready} orders are ready for entry. {upstream} still upstream — pathology orders appear here only once Sample Collection marks them collected, radiology only once Imaging Performed marks the scan done.{" "}
              <Link href="/opd/diagnostics?screen=sample-collection" className="font-semibold underline">Sample Collection →</Link>{" "}
              <Link href="/opd/diagnostics?screen=imaging-performed" className="font-semibold underline">Imaging Performed →</Link>
            </InlineInfo>
          </div>
          {loading && <EmptyWorklist message="Loading result-entry worklist…" />}
          {!loading && rows.length === 0 && (
            <EmptyWorklist message={loadError instanceof Error ? loadError.message : "Nothing ready for result entry."} />
          )}
          {rows.map((r) => {
            const entered = submittedIds.has(r.orderId) || !r.canEnterResult
            return (
              <WorklistRow key={r.orderId} active={r.orderId === selectedId} onClick={() => { setSelectedId(r.orderId); setValue(""); setError(null) }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-adminreg-text">{r.testName}</span>
                  <Chip tone={entered ? "performed" : r.isOverdue ? "overdue" : "fresh"}>
                    {entered ? "Entered" : r.isOverdue ? "Overdue" : "Fresh"}
                  </Chip>
                </div>
                <div className="mt-0.5 text-xs text-adminreg-muted">{r.patientName || "—"} · {r.patientUhid || "—"}</div>
                <div className="text-xs text-adminreg-muted">Ordered by {r.orderedByName || "—"}</div>
                <div className="mt-1 font-plexmono text-[10px] text-adminreg-muted2">Sample {hhMm(r.sampleCollectedAt)} · {specNoFor(r)} · {r.waitingLabel || ""}</div>
              </WorklistRow>
            )
          })}
        </div>

        <Panel>
          {!selected ? (
            <p className="text-sm text-adminreg-muted">Select an order from the worklist.</p>
          ) : (
            <>
          <div className="text-lg font-extrabold text-adminreg-text">{selected.testName}</div>
          <div className="text-xs text-adminreg-muted">{selected.patientName || "—"} · {selected.patientUhid || "—"} · {selected.visitId}</div>
          <div className="mt-2"><Chip tone="routine">{kind === "numeric" ? "Pathology · numeric result" : "Radiology · narrative report"}</Chip></div>
          <p className="mt-2 font-plexmono text-[10px] text-adminreg-muted2">{displayId(selected)} · ordered by {selected.orderedByName || "—"} · sample {hhMm(selected.sampleCollectedAt)} · {specNoFor(selected)}</p>

          {submitted ? (
            <div className="mt-3 border-l-[3px] border-adminreg-olive bg-adminreg-olive-soft p-3 text-xs text-adminreg-olive-dark">
              Result submitted and released to {selected.orderedByName || "the ordering doctor"}. It now shows on the Diagnostics stage of this visit.
            </div>
          ) : (
            <>
              <div className="mt-3"><DashedTag>Draft — not visible to the doctor yet</DashedTag></div>
              {kind === "numeric" ? (
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
                    <div className="text-xs text-adminreg-text">{selected.normalRange || "—"}</div>
                  </div>
                  {isCritical && (
                    <div className="mt-2 border-2 border-adminreg-red bg-adminreg-red-soft px-3 py-2 text-xs font-bold text-adminreg-red-text">
                      ⚠ Outside the critical range — submitting will auto-flag this and push it to {selected.orderedByName || "the ordering doctor"} immediately.
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
                <AdminButton type="button" accent="indigo" className="mt-3 w-full" disabled={!value.trim() || addResult.isPending} onClick={() => void submit()}>
                  {addResult.isPending ? "Submitting…" : `Submit result → release to ${selected.orderedByName || "the ordering doctor"}`}
                </AdminButton>
              )}
            </>
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
  const { clinicId } = useBranchScope()
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
          {def.key === "sample-collection" && <SampleCollectionScreen editable={editable} clinicId={clinicId} />}
          {def.key === "imaging-performed" && <ImagingPerformedScreen editable={editable} clinicId={clinicId} />}
          {def.key === "result-entry" && <ResultEntryScreen editable={editable} clinicId={clinicId} />}
        </div>
      </div>
    </div>
  )
}
