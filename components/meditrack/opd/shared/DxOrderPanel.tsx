"use client"

import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { AdminButton } from "@/components/meditrack/admin/register"
import {
  diagnosticVisitKey,
  isGuid,
  useCreateDiagnosticOrder,
  useDiagnosticCatalogue,
  type DiagnosticCatalogueItem,
} from "@/queries/meditrack/opd-diagnostics"
import { SectionLabel } from "./ui"

/**
 * Search-and-order component for diagnostics — the ONE ordering interaction
 * shared by Consultation (inline) and the Diagnostics screen (primary
 * interface), per the Arogya HMS addendum. Shape: search → select →
 * configure → confirm into a list. Never fork a second search experience.
 */

interface TestDef {
  id: string
  name: string
  code: string
  category: string
  price: number
  alreadyOnVisit?: boolean
  existingStatusLabel?: string | null
}

function toTestDef(item: DiagnosticCatalogueItem): TestDef {
  return {
    id: item.labTestId,
    name: item.name || "Untitled test",
    code: item.code || "—",
    category: item.categoryLabel || item.category || "Test Master",
    price: item.amount ?? 0,
    alreadyOnVisit: item.alreadyOnVisit,
    existingStatusLabel: item.existingStatusLabel,
  }
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

interface DxOrderPanelProps {
  editable: boolean
  visitId: string
  patientLabel: string
  orderingDoctor: string
  clinicId?: string
  paymentMethod?: string | null
  tpaName?: string | null
  /** Compact mode drops the intro copy — used for the inline Consultation panel. */
  compact?: boolean
  /** Tests already placed on this visit — shown in "This order", not the draft cart. */
  existingOrders?: { id: string; name: string; price: number; statusLabel?: string | null; isVoid?: boolean }[]
  /** Called when the order is confirmed. */
  onConfirm?: (tests: { id: string; name: string; price: number; repeat: boolean }[]) => void
}

export function DxOrderPanel({
  editable,
  visitId,
  patientLabel,
  orderingDoctor,
  clinicId,
  paymentMethod,
  tpaName,
  compact,
  existingOrders = [],
  onConfirm,
}: DxOrderPanelProps) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [order, setOrder] = useState<string[]>([])
  const [picked, setPicked] = useState<Record<string, TestDef>>({})
  const [repeats, setRepeats] = useState<Set<string>>(new Set())
  const [dupFlag, setDupFlag] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmedLabel, setConfirmedLabel] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const q = query.trim()
  const catalogue = useDiagnosticCatalogue({
    visitId,
    clinicId,
    search: q || undefined,
    limit: 100,
  })
  const createOrder = useCreateDiagnosticOrder()

  const tests = useMemo(
    () => (catalogue.data ?? []).map(toTestDef),
    [catalogue.data]
  )

  const results = useMemo(
    () => tests.map((test) => ({ test, synonymHit: null as string | null })),
    [tests]
  )

  const orderedTests = order
    .map((id) => picked[id] || tests.find((t) => t.id === id))
    .filter((t): t is TestDef => !!t)
  const placedOrders = existingOrders.filter((item) => !item.isVoid)
  const thisOrderCount = placedOrders.length + orderedTests.length
  const thisOrderTotal = placedOrders.reduce((sum, item) => sum + (item.price || 0), 0) + orderedTests.reduce((sum, t) => sum + t.price, 0)
  const total = orderedTests.reduce((sum, t) => sum + t.price, 0)

  function addTest(t: TestDef) {
    if (order.includes(t.id)) return
    setPicked((p) => ({ ...p, [t.id]: t }))
    if (t.alreadyOnVisit && !repeats.has(t.id)) {
      setDupFlag(t.id)
      setOrder((o) => [...o, t.id])
      return
    }
    setOrder((o) => [...o, t.id])
  }

  function removeTest(id: string) {
    setOrder((o) => o.filter((x) => x !== id))
    setRepeats((r) => {
      const next = new Set(r)
      next.delete(id)
      return next
    })
    if (dupFlag === id) setDupFlag(null)
  }

  function resolveDrop() {
    if (!dupFlag) return
    removeTest(dupFlag)
    setDupFlag(null)
  }

  function resolveRepeat() {
    if (!dupFlag) return
    setRepeats((r) => new Set(r).add(dupFlag))
    setDupFlag(null)
  }

  async function confirmOrder() {
    if (!editable || dupFlag || orderedTests.length === 0 || !isGuid(visitId)) return
    setConfirmError(null)
    try {
      const view = await createOrder.mutateAsync({
        visitId,
        paymentMethod: paymentMethod || undefined,
        tpaName: tpaName || undefined,
        tests: orderedTests.map((t) => ({
          labTestId: t.id,
          amount: t.price || undefined,
          allowDuplicate: repeats.has(t.id),
        })),
      })
      const orderNo = view.orders?.[0]?.orderNumber
      setConfirmedLabel(orderNo || null)
      setConfirmed(true)
      setOrder([])
      setPicked({})
      setRepeats(new Set())
      setDupFlag(null)
      void queryClient.invalidateQueries({ queryKey: diagnosticVisitKey(visitId) })
      void queryClient.invalidateQueries({ queryKey: ["meditrack", "opd-dx-catalogue"] })
      void queryClient.invalidateQueries({ queryKey: ["meditrack", "opd-dx-worklist"] })
      onConfirm?.(orderedTests.map((t) => ({ id: t.id, name: t.name, price: t.price, repeat: repeats.has(t.id) })))
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Could not place the order.")
    }
  }

  const dupTest = dupFlag ? tests.find((t) => t.id === dupFlag) ?? orderedTests.find((t) => t.id === dupFlag) : null
  const canConfirm = editable && !dupFlag && orderedTests.length > 0 && isGuid(visitId) && !createOrder.isPending

  return (
    <div className="border border-adminreg-border bg-adminreg-card">
      <div className="border-b border-adminreg-divider bg-adminreg-header px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <SectionLabel>Search and order tests — Test Master</SectionLabel>
          <span className="font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">
            {patientLabel ? `${patientLabel} · ` : ""}Diagnostics desk · {orderingDoctor}
          </span>
        </div>
        {!compact && (
          <p className="text-xs text-adminreg-muted">
            Primary ordering interface for this screen. Same component as the inline order panel in Consultation, so the catalogue, duplicate rules and pricing cannot drift apart.
          </p>
        )}
      </div>

      <div className="p-4">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!editable}
            placeholder='Search Test Master — name or common term (e.g. sugar test, echo, CXR)'
            className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
          />
          <AdminButton type="button" variant="secondary" className="flex-shrink-0" onClick={() => setQuery("")}>Clear</AdminButton>
        </div>

        <p className="mt-3 font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">
          {q
            ? `${results.length} match${results.length === 1 ? "" : "es"} for "${query.trim()}"`
            : `Test Master · ${results.length} tests`}
        </p>

        <div className="mt-1.5 max-h-[280px] overflow-y-auto border border-adminreg-divider">
          {catalogue.isLoading && results.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-xs text-adminreg-muted">Loading Test Master…</p>
          ) : results.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-xs text-adminreg-muted">
              Nothing in Test Master matches that. New tests are added by Admin — they cannot be created here.
            </p>
          ) : (
            results.map(({ test, synonymHit }) => {
              const onOrder = order.includes(test.id)
              const needsRepeat = !!test.alreadyOnVisit && !repeats.has(test.id)
              return (
                <div key={test.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-adminreg-divider px-3.5 py-2.5 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-adminreg-text">{test.name}</div>
                    <div className="font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-muted2">
                      Test Master · {test.code}
                      {test.alreadyOnVisit && <span className="ml-2 text-adminreg-amber-text">Already on this visit</span>}
                    </div>
                    {synonymHit && (
                      <div className="mt-0.5 font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-indigo-dark">Matched on &quot;{synonymHit}&quot;</div>
                    )}
                  </div>
                  <span className="text-xs text-adminreg-muted">{test.category}</span>
                  <span className="font-plexmono text-sm text-adminreg-text">{inr(test.price)}</span>
                  {onOrder ? (
                    <button type="button" disabled={!editable} onClick={() => removeTest(test.id)} className="border border-adminreg-border bg-adminreg-bg px-2.5 py-1 text-[11px] font-semibold text-adminreg-muted hover:text-adminreg-text disabled:opacity-60">On order</button>
                  ) : needsRepeat ? (
                    <button type="button" disabled={!editable} onClick={() => addTest(test)} className="border border-adminreg-amber bg-adminreg-amber-soft px-2.5 py-1 text-[11px] font-bold text-adminreg-amber-text disabled:opacity-60">Add again</button>
                  ) : (
                    <button type="button" disabled={!editable} onClick={() => addTest(test)} className="border border-adminreg-indigo bg-adminreg-indigo-soft px-2.5 py-1 text-[11px] font-bold text-adminreg-indigo-dark disabled:opacity-60">Add</button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* This order — already placed on the visit, plus anything staged to confirm */}
        <div className="mt-4 border-t border-adminreg-divider pt-3">
          <div className="flex items-center justify-between">
            <span className="font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">This order · {thisOrderCount} test{thisOrderCount === 1 ? "" : "s"}</span>
            <span className="font-plexmono text-sm font-bold text-adminreg-text">{inr(thisOrderTotal)}</span>
          </div>

          {thisOrderCount === 0 ? (
            <p className="mt-2 text-xs text-adminreg-muted">
              Nothing selected yet. Search or browse above and add tests — they collect here before anything is sent to Diagnostics.
            </p>
          ) : (
            <div className="mt-2 border border-adminreg-divider">
              {placedOrders.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-adminreg-divider px-3 py-2 text-sm last:border-0">
                  <span className="text-adminreg-text">
                    {item.name}
                    <span className="ml-2 font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-muted2">{item.statusLabel || "Ordered"}</span>
                  </span>
                  <span className="font-plexmono text-adminreg-muted">{inr(item.price)}</span>
                </div>
              ))}
              {orderedTests.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 border-b border-adminreg-divider px-3 py-2 text-sm last:border-0">
                  <span className="text-adminreg-text">
                    {t.name}
                    {repeats.has(t.id) && <span className="ml-2 font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-amber-text">Repeat — clinically needed</span>}
                    {!repeats.has(t.id) && <span className="ml-2 font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-indigo-dark">To confirm</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-plexmono text-adminreg-muted">{inr(t.price)}</span>
                    {editable && (
                      <button type="button" onClick={() => removeTest(t.id)} className="text-[11px] text-adminreg-amber-text underline">Remove</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Duplicate flag */}
        {dupTest && (
          <div className="mt-3 border-l-[3px] border-adminreg-amber bg-adminreg-amber-soft px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-amber-text">⚠ Duplicate — {dupTest.name}</span>
              <span className="font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-amber-text">{dupTest.existingStatusLabel || "Already on this visit"}</span>
            </div>
            <p className="mt-1.5 text-xs text-adminreg-amber-text">
              Already ordered for {visitId} earlier in this consultation. Confirming again bills {inr(dupTest.price)} a second time and sends a second collection request.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <button type="button" onClick={resolveDrop} className="text-[11px] font-bold text-adminreg-amber-text underline">Drop it — keep the existing order</button>
              <button type="button" onClick={resolveRepeat} className="text-[11px] font-bold text-adminreg-amber-text underline">Repeat it anyway — clinically needed</button>
            </div>
          </div>
        )}

        {/* Carried into the order */}
        {orderedTests.length > 0 && (
          <div className="mt-3 border border-adminreg-divider bg-adminreg-bg p-3">
            <p className="mb-2 font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-muted2">Carried into the order — what Diagnostics will receive</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-4"><span className="text-adminreg-muted">OPD visit</span><span className="text-right text-adminreg-text">{visitId} · {patientLabel}</span></div>
              <div className="flex justify-between gap-4"><span className="text-adminreg-muted">Ordering doctor</span><span className="text-right text-adminreg-text">{orderingDoctor}</span></div>
              <div className="flex justify-between gap-4"><span className="text-adminreg-muted">Tests</span><span className="text-right text-adminreg-text">{orderedTests.map((t) => t.name).join(", ")}</span></div>
              <div className="flex justify-between gap-4"><span className="text-adminreg-muted">Charge</span><span className="text-right text-adminreg-text">{inr(total)} — coverage checked at Diagnostics</span></div>
            </div>
          </div>
        )}

        {editable && (orderedTests.length > 0 || confirmed) && (
          <div className="mt-3">
            {confirmed && orderedTests.length === 0 ? (
              <div className="border border-adminreg-olive bg-adminreg-olive-soft px-3 py-2.5 text-xs text-adminreg-olive-dark">
                ✓ Order {confirmedLabel || "placed"} created — sent to Diagnostics. Stage moves to ORDERED.
              </div>
            ) : (
              <>
                <AdminButton type="button" accent="indigo" disabled={!canConfirm} onClick={() => void confirmOrder()}>
                  {dupFlag
                    ? "Resolve the duplicate flag to continue"
                    : createOrder.isPending
                      ? "Confirming…"
                      : `Confirm order → Diagnostics${total ? ` · ${inr(total)}` : ""}`}
                </AdminButton>
                {confirmError && <p className="mt-2 text-xs text-adminreg-amber-text">{confirmError}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
