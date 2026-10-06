"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { AdminButton } from "@/components/meditrack/admin/register"
import { SectionLabel, FieldLabel, FieldValue, Panel, InlineInfo, InlineWarning } from "@/components/meditrack/opd/shared/ui"

// ---------------------------------------------------------------------------
// Rich bodies for IPD stages 3–7 (screenshot set). Frontend/UI only; each
// stage owns its local demo state, as the rest of IPD does.
// ---------------------------------------------------------------------------

// ----- Stage 3 · Nursing Care & Rounds (MAR) -------------------------------

type MarCell = "given" | "due" | "missed" | "scheduled" | "none"

interface MarRow {
  drug: string
  route: string
  cells: { time: string; state: MarCell; by?: string }[]
}

const MAR_ROWS: MarRow[] = [
  { drug: "Inj. Enoxaparin 40mg", route: "S/C", cells: [{ time: "06:00", state: "given", by: "J.T." }, { time: "14:00", state: "given", by: "J.T." }, { time: "20:00", state: "due" }, { time: "02:00", state: "scheduled" }] },
  { drug: "Tab. Aspirin 75mg", route: "PO", cells: [{ time: "06:00", state: "given", by: "J.T." }, { time: "14:00", state: "none" }, { time: "20:00", state: "due" }, { time: "02:00", state: "none" }] },
  { drug: "Tab. Atorvastatin 40mg", route: "PO", cells: [{ time: "06:00", state: "none" }, { time: "14:00", state: "none" }, { time: "20:00", state: "due" }, { time: "02:00", state: "none" }] },
  { drug: "Inj. Pantoprazole 40mg", route: "IV", cells: [{ time: "06:00", state: "given", by: "J.T." }, { time: "14:00", state: "missed" }, { time: "20:00", state: "scheduled" }, { time: "02:00", state: "scheduled" }] },
  { drug: "Tab. Metoprolol 25mg", route: "PO", cells: [{ time: "06:00", state: "given", by: "J.T." }, { time: "14:00", state: "none" }, { time: "20:00", state: "scheduled" }, { time: "02:00", state: "none" }] },
]

const MAR_CELL_CLASS: Record<MarCell, string> = {
  given: "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark",
  due: "border-adminreg-amber bg-adminreg-amber-soft text-adminreg-amber-text",
  missed: "border-adminreg-red bg-adminreg-red-soft text-adminreg-red-text",
  scheduled: "border-adminreg-border bg-adminreg-card text-adminreg-muted",
  none: "border-transparent bg-transparent text-adminreg-muted",
}

const MAR_CELL_LABEL: Record<MarCell, string> = { given: "GIVEN", due: "DUE", missed: "MISSED", scheduled: "SCHEDULED", none: "—" }

export function MarBody({ editable }: { editable: boolean }) {
  const [rows, setRows] = useState<MarRow[]>(MAR_ROWS)
  const [notice, setNotice] = useState<string | null>(null)

  function chart(r: number, c: number) {
    if (!editable) return
    const cell = rows[r].cells[c]
    if (cell.state !== "due") return
    setRows((rs) => rs.map((row, i) => (i !== r ? row : { ...row, cells: row.cells.map((x, j) => (j === c ? { ...x, state: "given", by: "J.T." } : x)) })))
    setNotice(`${rows[r].drug} charted as given at ${cell.time}.`)
  }

  const dueCount = rows.reduce((n, r) => n + r.cells.filter((c) => c.state === "due").length, 0)

  return (
    <div className="space-y-5">
      <Panel className="border-l-[3px] border-adminreg-ipd bg-adminreg-ipd/[0.06]">
        <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-ipd">Medication administration record · Day 4 · 12 Aug</div>
        <div className="mt-1 font-plexmono text-[10px] uppercase text-adminreg-muted">Shift 14:00–22:00 · NRS J. Thomas</div>
        <p className="mt-1 text-sm text-adminreg-text">{dueCount} doses due this shift. Tap a DUE cell to chart it — one tap, no dialog. Tap a GIVEN cell to file a correction.</p>
      </Panel>

      {notice && <InlineInfo>{notice}</InlineInfo>}

      <div className="overflow-x-auto border border-adminreg-border bg-adminreg-card">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[1.6fr_repeat(4,1fr)] bg-adminreg-header px-4 py-2.5 font-plexmono text-[10px] font-bold uppercase text-adminreg-muted">
            <span>Medication</span>
            {["06:00", "14:00", "20:00", "02:00"].map((t) => <span key={t}>{t}</span>)}
          </div>
          {rows.map((row, r) => (
            <div key={row.drug} className="grid grid-cols-[1.6fr_repeat(4,1fr)] items-center gap-2 border-t border-adminreg-divider px-4 py-2.5">
              <div>
                <div className="text-sm font-semibold text-adminreg-text">{row.drug}</div>
                <div className="font-plexmono text-[10px] text-adminreg-muted">{row.route}</div>
              </div>
              {row.cells.map((cell, c) => (
                <button
                  key={c}
                  type="button"
                  disabled={!editable || cell.state !== "due"}
                  onClick={() => chart(r, c)}
                  className={cn("border px-2 py-2 text-center disabled:cursor-default", MAR_CELL_CLASS[cell.state], cell.state === "due" && editable && "hover:opacity-80")}
                >
                  <span className="block font-plexmono text-[10px] font-bold">{MAR_CELL_LABEL[cell.state]}</span>
                  <span className="block font-plexmono text-[9px] opacity-80">{cell.state === "given" ? `${cell.time} · ${cell.by}` : cell.state === "due" ? "Tap to chart" : cell.state === "missed" ? "Not charted" : cell.state === "scheduled" ? "—" : ""}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel>
          <SectionLabel>Doctor&apos;s round notes</SectionLabel>
          <div className="space-y-3 text-sm">
            <div className="border-b border-adminreg-divider pb-3">
              <div className="font-plexmono text-[10px] uppercase text-adminreg-muted">Day 4 · 08:40 · Dr. Anjali Nair</div>
              <p className="mt-1 text-adminreg-text">Chest pain settled. Ambulating in ward. Continue current regimen. Add Atorvastatin 40mg OD — charted to MAR, first dose 20:00 today.</p>
              <div className="mt-2 inline-block border border-adminreg-olive px-2 py-0.5 font-plexmono text-[9.5px] font-bold uppercase text-adminreg-olive-dark">→ Charted to MAR</div>
            </div>
            <div className="border-b border-adminreg-divider pb-3">
              <div className="font-plexmono text-[10px] uppercase text-adminreg-muted">Day 3 · 09:05 · Dr. Anjali Nair</div>
              <p className="mt-1 text-adminreg-text">Post-op day 1. Wound clean and dry. BP settling on Metoprolol. Step down from ICU to ward if stable overnight.</p>
            </div>
          </div>
        </Panel>
        <Panel>
          <SectionLabel>Nursing observations — this shift</SectionLabel>
          <div className="grid grid-cols-2 gap-3 font-plexmono">
            <div><FieldLabel>BP</FieldLabel><div className="text-lg font-bold text-adminreg-text">128 / 82</div></div>
            <div><FieldLabel>Pulse</FieldLabel><div className="text-lg font-bold text-adminreg-text">78</div></div>
            <div><FieldLabel>Temp</FieldLabel><div className="text-lg font-bold text-adminreg-text">98.4 °F</div></div>
            <div><FieldLabel>SpO₂</FieldLabel><div className="text-lg font-bold text-adminreg-text">98%</div></div>
          </div>
          <div className="mt-3"><FieldLabel>Intake / output (24 h)</FieldLabel><FieldValue>1,800 mL in · 1,650 mL out</FieldValue></div>
          <div className="mt-3">
            <FieldLabel>Shift note</FieldLabel>
            <textarea rows={2} disabled={!editable} defaultValue="Ambulating unaided. No chest pain reported." className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" />
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ----- Stage 4 · Diagnostics & OT ------------------------------------------

export function DiagnosticsOtBody({ editable }: { editable: boolean }) {
  const [mode, setMode] = useState<"surgical" | "non">("surgical")
  const [implant, setImplant] = useState(false)
  const [complication, setComplication] = useState<"none" | "open" | "logged">("open")

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode("surgical")} className={cn("border px-4 py-2 text-sm font-bold", mode === "surgical" ? "border-adminreg-ipd bg-adminreg-ipd/10 text-adminreg-ipd" : "border-adminreg-border bg-adminreg-card text-adminreg-muted")}>Surgical — OT required</button>
        <button type="button" onClick={() => setMode("non")} className={cn("border px-4 py-2 text-sm font-bold", mode === "non" ? "border-adminreg-ipd bg-adminreg-ipd/10 text-adminreg-ipd" : "border-adminreg-border bg-adminreg-card text-adminreg-muted")}>Non-surgical — lab / radiology</button>
      </div>

      {mode === "surgical" ? (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel>
              <SectionLabel>OT slot</SectionLabel>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3 border-b border-adminreg-divider pb-2"><dt className="text-adminreg-muted">Procedure</dt><dd className="text-right font-semibold text-adminreg-text">Coronary angioplasty + stent</dd></div>
                <div className="flex justify-between gap-3 border-b border-adminreg-divider pb-2"><dt className="text-adminreg-muted">Theatre</dt><dd className="text-right text-adminreg-text">Cath Lab 2</dd></div>
                <div className="flex justify-between gap-3 border-b border-adminreg-divider pb-2"><dt className="text-adminreg-muted">Slot</dt><dd className="font-plexmono text-adminreg-text">10 Aug, 14:00–15:30</dd></div>
                <div className="flex justify-between gap-3 border-b border-adminreg-divider pb-2"><dt className="text-adminreg-muted">Surgeon / anaesthetist</dt><dd className="text-right text-adminreg-text">Dr. A. Nair / Dr. S. Rao</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-adminreg-muted">Billing route</dt><dd className="text-right font-mono text-xs text-adminreg-text">PMJAY package PKG-C-104</dd></div>
              </dl>
            </Panel>
            <Panel>
              <SectionLabel>Pre-op checklist</SectionLabel>
              <div className="space-y-2 text-sm">
                {["Consent signed (patient + witness)", "Anaesthesia clearance — Dr. S. Rao", "NPO since 22:00", "Site marked", "Blood cross-match — 2 units reserved"].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-adminreg-text"><span className="text-adminreg-olive-dark">✓</span>{item}</div>
                ))}
                <label className="flex items-start gap-2 text-adminreg-amber-text">
                  <input type="checkbox" checked={implant} disabled={!editable} onChange={(e) => setImplant(e.target.checked)} className="mt-0.5" />
                  Implant / stent availability confirmed
                </label>
              </div>
              {!implant && <div className="mt-4"><InlineWarning>One item outstanding. The theatre list shows this case as NOT CLEARED until implant availability is confirmed — blocking is deliberate here, unlike the soft warnings elsewhere.</InlineWarning></div>}
            </Panel>
          </div>

          <div className="border-l-[3px] border-adminreg-red bg-adminreg-red-soft px-5 py-4">
            <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-red-text">Post-operative complication — escalation path</div>
            <p className="mt-1.5 text-sm text-adminreg-text">Post-op day 1: BP instability recorded on the 22:00 nursing round. Escalation raises the consultant alert, opens a bed transfer to ICU, and adds an ICU tariff line from the hour of transfer — the three consequences are shown together because they are one decision, not three forms.</p>
            {complication === "open" && editable && (
              <div className="mt-3 flex flex-wrap gap-2">
                <AdminButton type="button" variant="danger" onClick={() => setComplication("logged")}>Escalate to ICU</AdminButton>
                <AdminButton type="button" variant="secondary" onClick={() => setComplication("logged")}>Log complication only</AdminButton>
              </div>
            )}
            {complication === "logged" && <p className="mt-3 text-xs font-semibold text-adminreg-red-text">Recorded — consultant alerted, bed transfer requested.</p>}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Panel>
            <SectionLabel>Orders — lab &amp; radiology</SectionLabel>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-adminreg-divider text-left font-plexmono text-[10px] uppercase text-adminreg-muted">
                    <th className="py-2 font-normal">Test</th><th className="py-2 font-normal">Ordered</th><th className="py-2 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-adminreg-divider"><td className="py-2.5 font-semibold text-adminreg-text">Serum electrolytes</td><td className="py-2.5 font-plexmono text-xs">12 Aug 08:50</td><td className="py-2.5 font-bold text-adminreg-olive-dark">Resulted</td></tr>
                  <tr className="border-b border-adminreg-divider"><td className="py-2.5 font-semibold text-adminreg-text">Chest X-ray PA</td><td className="py-2.5 font-plexmono text-xs">12 Aug 09:10</td><td className="py-2.5 font-bold text-adminreg-amber-text">Awaited</td></tr>
                  <tr><td className="py-2.5 font-semibold text-adminreg-text">2D Echo</td><td className="py-2.5 font-plexmono text-xs">12 Aug 09:10</td><td className="py-2.5 font-bold text-adminreg-muted">Scheduled</td></tr>
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel>
            <SectionLabel>Routing</SectionLabel>
            <p className="text-sm text-adminreg-muted">Non-surgical inpatient orders route through the same lab and radiology queues as OPD — identical worklist, identical result-entry screens. The only difference is that results post back to the stay record rather than a visit, and each order posts a charge line to that day&apos;s accrual instead of a one-time bill.</p>
            {editable && <AdminButton type="button" variant="secondary" className="mt-3.5">+ Order test</AdminButton>}
          </Panel>
        </div>
      )}
    </div>
  )
}

// ----- Stage 5 · Daily Billing Accrual -------------------------------------

interface LedgerLine { label: string; amount: number; voided?: boolean }
interface LedgerDay { label: string; lines: LedgerLine[] }

const LEDGER: LedgerDay[] = [
  { label: "Day 1 · 09 Aug", lines: [{ label: "Bed — General ward", amount: 2400 }, { label: "Consultant visit", amount: 700 }, { label: "Investigations — ECG, Trop-I", amount: 1850 }] },
  { label: "Day 2 · 10 Aug", lines: [{ label: "Bed — General ward", amount: 2400 }, { label: "Angioplasty — PMJAY package", amount: 28500 }, { label: "OT charges", amount: 4200 }] },
  { label: "Day 3 · 11 Aug", lines: [{ label: "Bed — ICU", amount: 6800 }, { label: "Physiotherapy session", amount: 800 }, { label: "Pharmacy — day total", amount: 1340 }] },
  { label: "Day 4 · 12 Aug (running)", lines: [{ label: "Bed — General ward", amount: 2400 }, { label: "Consultant visit", amount: 700 }, { label: "Pharmacy — day total so far", amount: 910 }] },
]

const APPROVED_LIMIT = 120000

export function DailyBillingBody({ editable }: { editable: boolean }) {
  const [ledger, setLedger] = useState<LedgerDay[]>(LEDGER)
  const [voidFor, setVoidFor] = useState<{ day: number; line: number } | null>(null)
  const [reason, setReason] = useState("")
  const [voided, setVoided] = useState<string[]>([])

  const total = ledger.reduce((sum, d) => sum + d.lines.reduce((s, l) => (l.voided ? s : s + l.amount), 0), 0)
  const pct = Math.round((total / APPROVED_LIMIT) * 100)

  function confirmVoid() {
    if (!voidFor || !reason.trim()) return
    setLedger((ls) => ls.map((d, di) => (di !== voidFor.day ? d : { ...d, lines: d.lines.map((l, li) => (li === voidFor.line ? { ...l, voided: true } : l)) })))
    setVoided((v) => [...v, ledger[voidFor.day].lines[voidFor.line].label])
    setVoidFor(null)
    setReason("")
  }

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <FieldLabel>Accrued to date — running, not a bill</FieldLabel>
            <div className="font-plexmono text-3xl font-bold text-adminreg-text">₹{total.toLocaleString("en-IN")}</div>
          </div>
          <div className="text-right">
            <FieldLabel>Against approved limit</FieldLabel>
            <div className="font-plexmono text-lg font-bold text-adminreg-text">₹{APPROVED_LIMIT.toLocaleString("en-IN")}</div>
          </div>
        </div>
        <div className="mt-3 h-2 w-full bg-adminreg-divider"><div className="h-2 bg-adminreg-ipd" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
        <div className="mt-1.5 flex justify-between font-plexmono text-[10px] text-adminreg-muted"><span>{pct}% of approved limit consumed by day 4</span><span>At this burn rate the limit is reached on day 9</span></div>
      </Panel>

      <InlineWarning>Low balance — act before discharge. Alerting on day 4 rather than at settlement is the point of this screen. Billing raises a top-up pre-auth request now, while the patient is still in the bed and the TPA can still respond.</InlineWarning>

      {voided.length > 0 && voided.map((v) => (
        <div key={v} className="border-l-[3px] border-adminreg-ipd bg-adminreg-card px-4 py-3 text-sm text-adminreg-text">
          <span className="font-plexmono text-[10px] uppercase text-adminreg-muted">Voided · credit note CN-IPD-0041 · billing</span>
          <div>{v} reversed — the original line stays on the ledger.</div>
        </div>
      ))}

      <div>
        <FieldLabel>Daily accrual ledger — one posting per day of stay</FieldLabel>
        <div className="space-y-3">
          {ledger.map((day, di) => {
            const dayTotal = day.lines.reduce((s, l) => (l.voided ? s : s + l.amount), 0)
            return (
              <div key={day.label} className="border border-adminreg-border bg-adminreg-card">
                <div className="flex items-center justify-between bg-adminreg-header px-4 py-2.5">
                  <span className="font-plexmono text-[10px] font-bold uppercase text-adminreg-muted">{day.label}</span>
                  <span className="font-plexmono text-sm font-bold text-adminreg-text">₹{dayTotal.toLocaleString("en-IN")}</span>
                </div>
                {day.lines.map((l, li) => (
                  <div key={l.label} className="flex items-center justify-between gap-3 border-t border-adminreg-divider px-4 py-2.5 text-sm">
                    <span className={cn(l.voided ? "text-adminreg-muted line-through" : "text-adminreg-text")}>{l.label}</span>
                    <span className="flex items-center gap-3">
                      <span className={cn("font-plexmono", l.voided ? "text-adminreg-muted line-through" : "text-adminreg-text")}>₹{l.amount.toLocaleString("en-IN")}</span>
                      {editable && !l.voided && (
                        <button type="button" onClick={() => setVoidFor({ day: di, line: li })} className="text-[11px] text-adminreg-amber-text underline">Void a charge line</button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {voidFor && (
        <Panel className="border-l-[3px] border-adminreg-ipd">
          <SectionLabel>Void this charge line — reason required</SectionLabel>
          <p className="mb-2 text-xs text-adminreg-muted">The line is struck through and a credit note is raised. Nothing is deleted from the ledger.</p>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Session did not take place, posted in error" className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm" />
          <div className="mt-3 flex gap-2">
            <AdminButton type="button" accent="indigo" disabled={!reason.trim()} onClick={confirmVoid}>Confirm void</AdminButton>
            <AdminButton type="button" variant="secondary" onClick={() => { setVoidFor(null); setReason("") }}>Cancel</AdminButton>
          </div>
        </Panel>
      )}
    </div>
  )
}

// ----- Stage 6 · Discharge Planning ---------------------------------------

type DischargeType = "planned" | "dama" | "mortality"

const DISCHARGE_TYPES: { key: DischargeType; label: string }[] = [
  { key: "planned", label: "Planned discharge" },
  { key: "dama", label: "Against medical advice (DAMA)" },
  { key: "mortality", label: "In-hospital mortality" },
]

export function DischargeBody({ editable }: { editable: boolean }) {
  const [type, setType] = useState<DischargeType>("planned")
  const [reclassified, setReclassified] = useState(false)
  const [diagnosis, setDiagnosis] = useState("Unstable angina (I20.0) — post PCI, stent to LAD")
  const [signed, setSigned] = useState(false)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-5">
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <SectionLabel>Discharge type</SectionLabel>
            {editable && type === "planned" && !reclassified && <button type="button" onClick={() => setReclassified(false)} className="text-xs font-semibold text-adminreg-indigo-dark underline">Reclassify</button>}
          </div>
          <div className="space-y-2">
            {DISCHARGE_TYPES.map((d) => (
              <button
                key={d.key}
                type="button"
                disabled={!editable}
                onClick={() => {
                  if (d.key !== type) setReclassified(true)
                  setType(d.key)
                }}
                className={cn("block w-full border px-4 py-2.5 text-left text-sm font-semibold disabled:opacity-60", type === d.key ? "border-adminreg-ipd bg-adminreg-ipd/10 text-adminreg-ipd" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted")}
              >
                {d.label}
              </button>
            ))}
          </div>
          {reclassified && (
            <div className="mt-3 border-l-[3px] border-adminreg-ipd bg-adminreg-bg px-3.5 py-3">
              <div className="font-plexmono text-[10px] uppercase text-adminreg-muted">Reclassified · 12 Aug 16:40 · Dr. A. Nair</div>
              <p className="mt-1 text-sm text-adminreg-text">
                Originally filed <span className="text-adminreg-muted line-through">Planned discharge</span>{" "}
                <span className="border border-adminreg-amber px-1 font-plexmono text-[9.5px] font-bold uppercase text-adminreg-amber-text">Superseded</span> — re-filed as {type === "dama" ? "DAMA" : type === "mortality" ? "in-hospital mortality" : "planned discharge"}. Reason: patient left before summary sign-off.
              </p>
            </div>
          )}
        </Panel>

        <Panel>
          <SectionLabel>Discharge summary</SectionLabel>
          <div className="space-y-3">
            <div>
              <FieldLabel>Final diagnosis</FieldLabel>
              <input value={diagnosis} disabled={!editable} onChange={(e) => setDiagnosis(e.target.value)} className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" />
            </div>
            <div>
              <FieldLabel>Course in hospital</FieldLabel>
              <textarea rows={4} disabled={!editable} defaultValue="Admitted from OPD referral with unstable angina. Angioplasty day 2 with stent to LAD. Uneventful recovery. Ambulating unaided, chest pain free at rest." className="w-full border border-adminreg-border bg-adminreg-bg px-3 py-2 text-sm disabled:opacity-60" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><FieldLabel>Discharge medication</FieldLabel><FieldValue>5 items — carried from MAR</FieldValue></div>
              <div><FieldLabel>Follow-up</FieldLabel><FieldValue>OPD Cardiology, 19 Aug</FieldValue></div>
            </div>
          </div>
          {editable && (
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminButton type="button" accent="indigo" disabled={signed} onClick={() => setSigned(true)}>{signed ? "Signed off ✓" : "Sign off → Final settlement"}</AdminButton>
              <AdminButton type="button" variant="secondary">Save draft</AdminButton>
            </div>
          )}
        </Panel>
      </div>

      <Panel>
        <SectionLabel>Admission trail</SectionLabel>
        <p className="mb-3 text-xs text-adminreg-muted">Traceable end to end — including the OPD visit this stay originated from.</p>
        <div className="space-y-3 text-sm">
          {[
            ["08 Aug · OPD", "OPD visit OPD-20260812-0217 — Dr. Anjali Nair, unstable angina"],
            ["09 Aug · IPD", "Admitted from OPD referral · bed GM-004 allocated"],
            ["10 Aug · OT", "Angioplasty performed — PMJAY package PKG-C-104"],
            ["11 Aug · IPD", "ICU step-down reviewed — remained in GM-004"],
            ["12 Aug · IPD", "Discharge planning initiated"],
          ].map(([when, what]) => (
            <div key={when} className="border-t border-adminreg-divider pt-3 first:border-0 first:pt-0">
              <div className="font-plexmono text-[10px] uppercase text-adminreg-muted">{when}</div>
              <div className="text-adminreg-text">{what}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

// ----- Stage 7 · Final Billing & Settlement --------------------------------

export function FinalBillingBody({ editable }: { editable: boolean }) {
  const [settled, setSettled] = useState(false)
  const gross = 53000
  const pmjayAdj = 6500
  const gst = 1180
  const cashless = 120000
  const deposit = 25000
  const refund = deposit
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
      <Panel>
        <SectionLabel>Consolidated bill — 4 days</SectionLabel>
        <div className="space-y-2 font-plexmono text-sm">
          <Row label="Gross accrued charges (4 days)" value={`₹${gross.toLocaleString("en-IN")}`} />
          <Row label="PMJAY package cap adjustment — PKG-C-104" value={`– ₹${pmjayAdj.toLocaleString("en-IN")}`} />
          <Row label="GST (as applicable, non-package items)" value={`+ ₹${gst.toLocaleString("en-IN")}`} />
          <Row label="Approved cashless amount (TPA / PMJAY)" value={`– ₹${cashless.toLocaleString("en-IN")}`} />
          <Row label="Advance deposit received" value={`– ₹${deposit.toLocaleString("en-IN")}`} />
        </div>
        <div className="mt-3 flex items-center justify-between border-t-2 border-adminreg-ipd pt-3">
          <span className="text-base font-bold text-adminreg-text">Refund due to patient</span>
          <span className="font-plexmono text-xl font-bold text-adminreg-text">₹{refund.toLocaleString("en-IN")}</span>
        </div>
        <p className="mt-2 text-xs text-adminreg-muted">Approved cashless covers the full net bill, so the advance deposit returns in full. Where the bill exceeds the approved amount this line reads BALANCE DUE instead — same layout, opposite sign, no separate screen.</p>
      </Panel>

      <div className="space-y-5">
        <div className="border-l-[3px] border-adminreg-olive bg-adminreg-olive-soft px-4 py-4">
          <div className="font-plexmono text-[10px] font-bold uppercase text-adminreg-olive-dark">Reconciliation — cleared</div>
          <p className="mt-1.5 text-sm text-adminreg-text">Accrued total matches the sum of daily postings, less one credit note. PMJAY package cap applied to the angioplasty line. No unbilled pharmacy or investigation items outstanding.</p>
        </div>
        <Panel>
          <SectionLabel>GST invoice</SectionLabel>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3 border-b border-adminreg-divider pb-2"><dt className="text-adminreg-muted">Invoice no.</dt><dd className="font-plexmono text-xs">INV-IPD-20260812-0042</dd></div>
            <div className="flex justify-between gap-3 border-b border-adminreg-divider pb-2"><dt className="text-adminreg-muted">GSTIN</dt><dd className="font-plexmono text-xs">29AABCU9603R1ZM</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-adminreg-muted">Taxable / exempt split</dt><dd className="font-plexmono text-xs">₹6,550 / ₹46,450</dd></div>
          </dl>
          {settled ? (
            <InlineInfo>Settled and released. Refund of ₹{refund.toLocaleString("en-IN")} recorded.</InlineInfo>
          ) : (
            editable && (
              <div className="mt-4 flex flex-wrap gap-2">
                <AdminButton type="button" accent="indigo" onClick={() => setSettled(true)}>Settle &amp; release patient</AdminButton>
                <AdminButton type="button" variant="secondary">Print invoice</AdminButton>
              </div>
            )
          )}
        </Panel>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-adminreg-divider pb-2">
      <span className="font-sans text-adminreg-text">{label}</span>
      <span className="whitespace-nowrap text-adminreg-text">{value}</span>
    </div>
  )
}
