"use client"

import { useMemo, useState } from "react"
import { AdminButton } from "@/components/meditrack/admin/register"
import { SectionLabel } from "./ui"

/**
 * Search-and-order component for diagnostics — the ONE ordering interaction
 * shared by Consultation (inline) and the Diagnostics screen (primary
 * interface), per the Arogya HMS addendum. Shape: search → select →
 * configure → confirm into a list. Never fork a second search experience.
 *
 * Demo/UI only: the catalogue below stands in for Admin → Test Master
 * (FR-ADM-08). All state is local.
 */

interface TestDef {
  id: string
  name: string
  code: string
  /** Clinical grouping shown in the result row. */
  category: string
  /** Drives the browse chips. */
  group: "Blood tests" | "Cardiac" | "Imaging" | "Pulmonary"
  price: number
  synonyms: string[]
  /** Seeded "already ordered earlier in this visit" — exercises the
   * duplicate-detection path without needing a prior confirm. */
  alreadyOnVisit?: boolean
}

const TEST_MASTER: TestDef[] = [
  { id: "CBC", name: "Complete Blood Count (CBC)", code: "CBC", category: "Lab — Haematology", group: "Blood tests", price: 350, synonyms: ["blood count", "hemogram", "haemogram"] },
  { id: "HB", name: "Haemoglobin", code: "HB", category: "Lab — Haematology", group: "Blood tests", price: 120, synonyms: ["hb", "hemoglobin"] },
  { id: "DD", name: "D-Dimer", code: "DD", category: "Lab — Haematology", group: "Blood tests", price: 1200, synonyms: ["d dimer", "clot"] },
  { id: "FBS", name: "Fasting Blood Glucose", code: "FBS", category: "Lab — Biochemistry", group: "Blood tests", price: 150, synonyms: ["sugar test", "fasting sugar", "glucose"] },
  { id: "PPBS", name: "Post-Prandial Blood Glucose", code: "PPBS", category: "Lab — Biochemistry", group: "Blood tests", price: 150, synonyms: ["pp sugar", "post meal sugar"] },
  { id: "HBA1C", name: "HbA1c", code: "HBA1C", category: "Lab — Biochemistry", group: "Blood tests", price: 550, synonyms: ["glycated haemoglobin", "diabetes control"] },
  { id: "LFT", name: "Liver Function Test", code: "LFT", category: "Lab — Biochemistry", group: "Blood tests", price: 650, synonyms: ["liver panel", "sgpt", "sgot"] },
  { id: "RFT", name: "Renal Function Test", code: "RFT", category: "Lab — Biochemistry", group: "Blood tests", price: 650, synonyms: ["kidney panel", "urea creatinine"] },
  { id: "LIPID", name: "Lipid Profile", code: "LIPID", category: "Lab — Biochemistry", group: "Blood tests", price: 700, synonyms: ["cholesterol", "triglycerides"] },
  { id: "SEK", name: "Serum Electrolytes", code: "SEK", category: "Lab — Biochemistry", group: "Blood tests", price: 400, synonyms: ["sodium potassium", "na k"] },
  { id: "TROP", name: "Troponin-I", code: "TROP-I", category: "Lab — Biochemistry", group: "Cardiac", price: 1500, synonyms: ["cardiac marker", "heart attack blood test"] },
  { id: "TFT", name: "Thyroid Profile", code: "TFT", category: "Lab — Endocrinology", group: "Blood tests", price: 600, synonyms: ["tsh", "t3 t4"] },
  { id: "CRP", name: "C-Reactive Protein", code: "CRP", category: "Lab — Immunology", group: "Blood tests", price: 500, synonyms: ["inflammation marker"] },
  { id: "URINE", name: "Urine Routine & Microscopy", code: "URINE-RM", category: "Lab — Clinical Pathology", group: "Blood tests", price: 150, synonyms: ["urine test", "urine r/m"] },
  { id: "ECG", name: "ECG (12-lead)", code: "ECG-12", category: "Cardiac diagnostics", group: "Cardiac", price: 350, synonyms: ["ekg", "electrocardiogram", "heart tracing"], alreadyOnVisit: true },
  { id: "ECHO", name: "2D Echocardiography", code: "ECHO-2D", category: "Cardiac diagnostics", group: "Cardiac", price: 2200, synonyms: ["echo", "heart scan", "cardiac ultrasound"] },
  { id: "TMT", name: "Treadmill Test (TMT)", code: "TMT", category: "Cardiac diagnostics", group: "Cardiac", price: 2000, synonyms: ["stress test", "exercise ecg"] },
  { id: "CXR", name: "Chest X-ray (PA view)", code: "CXR-PA", category: "Radiology", group: "Imaging", price: 600, synonyms: ["cxr", "chest film", "chest radiograph"] },
  { id: "USG", name: "USG Abdomen", code: "USG-ABD", category: "Radiology", group: "Imaging", price: 1400, synonyms: ["ultrasound abdomen", "sonography"] },
  { id: "PFT", name: "Pulmonary Function Test", code: "PFT", category: "Pulmonary function", group: "Pulmonary", price: 900, synonyms: ["spirometry", "lung function", "breathing test"] },
]

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

interface DxOrderPanelProps {
  editable: boolean
  visitId: string
  patientLabel: string
  orderingDoctor: string
  /** Compact mode drops the intro copy — used for the inline Consultation panel. */
  compact?: boolean
  /** Called when the order is confirmed. */
  onConfirm?: (tests: { id: string; name: string; price: number; repeat: boolean }[]) => void
}

export function DxOrderPanel({ editable, visitId, patientLabel, orderingDoctor, compact, onConfirm }: DxOrderPanelProps) {
  const [query, setQuery] = useState("")
  const [order, setOrder] = useState<string[]>([])
  const [repeats, setRepeats] = useState<Set<string>>(new Set())
  const [dupFlag, setDupFlag] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const q = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (!q) return TEST_MASTER.map((t) => ({ test: t, synonymHit: null as string | null }))
    return TEST_MASTER
      .map((t) => {
        if (t.name.toLowerCase().includes(q)) return { test: t, synonymHit: null as string | null }
        const syn = t.synonyms.find((s) => s.includes(q))
        return syn ? { test: t, synonymHit: syn } : null
      })
      .filter((x): x is { test: TestDef; synonymHit: string | null } => x !== null)
  }, [q])

  const orderedTests = order.map((id) => TEST_MASTER.find((t) => t.id === id)!).filter(Boolean)
  const total = orderedTests.reduce((sum, t) => sum + t.price, 0)

  function addTest(t: TestDef) {
    if (order.includes(t.id)) return
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

  function confirmOrder() {
    if (!editable || dupFlag || orderedTests.length === 0) return
    setConfirmed(true)
    onConfirm?.(orderedTests.map((t) => ({ id: t.id, name: t.name, price: t.price, repeat: repeats.has(t.id) })))
  }

  const dupTest = dupFlag ? TEST_MASTER.find((t) => t.id === dupFlag) : null

  return (
    <div className="border border-adminreg-border bg-adminreg-card">
      <div className="border-b border-adminreg-divider bg-adminreg-header px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <SectionLabel>Search and order tests — Test Master</SectionLabel>
          <span className="font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">Diagnostics desk · {orderingDoctor}</span>
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
          {results.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-xs text-adminreg-muted">
              Nothing in Test Master matches that. New tests are added by Admin — they cannot be created here.
            </p>
          ) : (
            results.map(({ test, synonymHit }) => {
              const onOrder = order.includes(test.id)
              const needsRepeat = test.alreadyOnVisit && !repeats.has(test.id)
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

        {/* This order */}
        <div className="mt-4 border-t border-adminreg-divider pt-3">
          <div className="flex items-center justify-between">
            <span className="font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">This order · {orderedTests.length} test{orderedTests.length === 1 ? "" : "s"}</span>
            <span className="font-plexmono text-sm font-bold text-adminreg-text">{inr(total)}</span>
          </div>

          {orderedTests.length === 0 ? (
            <p className="mt-2 text-xs text-adminreg-muted">
              Nothing selected yet. Search or browse above and add tests — they collect here before anything is sent to Diagnostics.
            </p>
          ) : (
            <div className="mt-2 border border-adminreg-divider">
              {orderedTests.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 border-b border-adminreg-divider px-3 py-2 text-sm last:border-0">
                  <span className="text-adminreg-text">
                    {t.name}
                    {repeats.has(t.id) && <span className="ml-2 font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-amber-text">Repeat — clinically needed</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-plexmono text-adminreg-muted">{inr(t.price)}</span>
                    {editable && !confirmed && (
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
              <span className="font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-amber-text">Sample collection in progress</span>
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

        {editable && (
          <div className="mt-3">
            {confirmed ? (
              <div className="border border-adminreg-olive bg-adminreg-olive-soft px-3 py-2.5 text-xs text-adminreg-olive-dark">
                ✓ Order DX-20260812-0117 created — {orderedTests.length} test{orderedTests.length === 1 ? "" : "s"} sent to Diagnostics. Stage moves to ORDERED.
              </div>
            ) : (
              <AdminButton type="button" accent="indigo" disabled={!!dupFlag || orderedTests.length === 0} onClick={confirmOrder}>
                {dupFlag ? "Resolve the duplicate flag to continue" : `Confirm order → Diagnostics${total ? ` · ${inr(total)}` : ""}`}
              </AdminButton>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
