"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { AdminButton } from "@/components/meditrack/admin/register"
import { SectionLabel } from "./ui"

/**
 * Search-and-add-drug component for e-Prescription (FR-OPD-07) — same
 * interaction shape as DxOrderPanel: search → select → configure → confirm
 * into the prescription list. Brand and composition both match; the Schedule
 * badge renders in the results before selection; Schedule H1 / X open their
 * statutory fields in the same step, never bolted on afterwards.
 *
 * Demo/UI only: the catalogue stands in for Admin → Drug Master. All state
 * is local.
 */

type Schedule = "" | "H" | "H1" | "X"

interface DrugDef {
  id: string
  brand: string
  generic: string
  cls: "Respiratory" | "Cardiovascular" | "Antibiotics" | "Analgesics" | "Anxiolytics" | "Gastro"
  form: string
  schedule: Schedule
  unit: string
  /** Max units per prescription (Schedule H1 / X ceiling). */
  limitQty: number
  limitLabel: string
  frequentlyUsed?: boolean
  recentByMe?: boolean
}

const DRUG_MASTER: DrugDef[] = [
  { id: "DOLO650", brand: "Dolo 650", generic: "Paracetamol 650 mg", cls: "Analgesics", form: "Tablet", schedule: "", unit: "tab", limitQty: 0, limitLabel: "", frequentlyUsed: true },
  { id: "PANTOP40", brand: "Pantop 40", generic: "Pantoprazole 40 mg", cls: "Gastro", form: "Tablet", schedule: "", unit: "tab", limitQty: 0, limitLabel: "", frequentlyUsed: true, recentByMe: true },
  { id: "MOX500", brand: "Mox 500", generic: "Amoxicillin 500 mg", cls: "Antibiotics", form: "Capsule", schedule: "H", unit: "cap", limitQty: 0, limitLabel: "", frequentlyUsed: true },
  { id: "ASTHALIN", brand: "Asthalin Inhaler", generic: "Salbutamol 100 mcg", cls: "Respiratory", form: "MDI inhaler", schedule: "", unit: "puff", limitQty: 0, limitLabel: "", frequentlyUsed: true },
  { id: "ALZOLAM025", brand: "Alzolam 0.25", generic: "Alprazolam 0.25 mg", cls: "Anxiolytics", form: "Tablet", schedule: "H1", unit: "tab", limitQty: 10, limitLabel: "10 tablets per prescription", recentByMe: true },
  { id: "ATENOLOL50", brand: "Aten 50", generic: "Atenolol 50 mg", cls: "Cardiovascular", form: "Tablet", schedule: "", unit: "tab", limitQty: 0, limitLabel: "", recentByMe: true },
  { id: "AMLONG5", brand: "Amlong 5", generic: "Amlodipine 5 mg", cls: "Cardiovascular", form: "Tablet", schedule: "", unit: "tab", limitQty: 0, limitLabel: "" },
  { id: "AUGMENTIN625", brand: "Augmentin 625", generic: "Amoxicillin + Clavulanate 625 mg", cls: "Antibiotics", form: "Tablet", schedule: "H", unit: "tab", limitQty: 0, limitLabel: "" },
  { id: "AZITHRAL500", brand: "Azithral 500", generic: "Azithromycin 500 mg", cls: "Antibiotics", form: "Tablet", schedule: "H", unit: "tab", limitQty: 0, limitLabel: "" },
  { id: "MONTAIRLC", brand: "Montair-LC", generic: "Montelukast + Levocetirizine", cls: "Respiratory", form: "Tablet", schedule: "", unit: "tab", limitQty: 0, limitLabel: "" },
  { id: "FORACORT", brand: "Foracort Inhaler", generic: "Budesonide + Formoterol", cls: "Respiratory", form: "MDI inhaler", schedule: "", unit: "puff", limitQty: 0, limitLabel: "" },
  { id: "ULTRACET", brand: "Ultracet", generic: "Tramadol + Paracetamol", cls: "Analgesics", form: "Tablet", schedule: "H1", unit: "tab", limitQty: 20, limitLabel: "20 tablets per prescription" },
  { id: "ZERODOL", brand: "Zerodol-SP", generic: "Aceclofenac + Serratiopeptidase", cls: "Analgesics", form: "Tablet", schedule: "", unit: "tab", limitQty: 0, limitLabel: "" },
  { id: "CLOPILET", brand: "Clopilet 75", generic: "Clopidogrel 75 mg", cls: "Cardiovascular", form: "Tablet", schedule: "", unit: "tab", limitQty: 0, limitLabel: "" },
  { id: "ECOSPRIN75", brand: "Ecosprin 75", generic: "Aspirin 75 mg", cls: "Cardiovascular", form: "Tablet", schedule: "", unit: "tab", limitQty: 0, limitLabel: "" },
  { id: "MORPHINE10", brand: "Morphine Sulphate 10", generic: "Morphine 10 mg", cls: "Analgesics", form: "Tablet", schedule: "X", unit: "tab", limitQty: 7, limitLabel: "7 tablets per prescription" },
]

const CLASS_CHIPS = ["Frequently used", "Recent by me", "Respiratory", "Cardiovascular", "Antibiotics", "Analgesics", "Anxiolytics"] as const
type ClassChip = (typeof CLASS_CHIPS)[number]

const FREQ_OPTIONS = ["OD", "BD", "TDS", "QID", "HS", "SOS"] as const
type Freq = (typeof FREQ_OPTIONS)[number]
const FREQ_PER_DAY: Record<Freq, number> = { OD: 1, BD: 2, TDS: 3, QID: 4, HS: 1, SOS: 1 }

const DURATION_UNITS = ["days", "weeks", "Continue"] as const
type DurationUnit = (typeof DURATION_UNITS)[number]

/** Cautioned pairs (generic keyword → generic keyword) — same amber-flag
 * treatment as a duplicate. */
const INTERACTION_PAIRS: [string, string, string][] = [
  ["warfarin", "aspirin", "bleeding risk"],
  ["clopidogrel", "pantoprazole", "reduced antiplatelet effect"],
  ["tramadol", "alprazolam", "respiratory depression / sedation"],
  ["morphine", "alprazolam", "respiratory depression / sedation"],
  ["salbutamol", "atenolol", "reduced bronchodilator effect"],
]

const SCHEDULE_BADGE: Record<Exclude<Schedule, "">, string> = { H: "SCHEDULE H", H1: "SCHEDULE H1", X: "SCHEDULE X" }

function ScheduleBadge({ schedule }: { schedule: Schedule }) {
  if (!schedule) return <span className="text-xs text-adminreg-muted">—</span>
  return (
    <span className="w-fit whitespace-nowrap border-[1.5px] border-adminreg-red bg-adminreg-red-soft px-2 py-0.5 text-[11px] font-bold text-adminreg-red-text">
      {SCHEDULE_BADGE[schedule]}
    </span>
  )
}

interface AddedLine {
  id: string
  label: string
  sig: string
  schedule: Schedule
  note: string | null
}

interface RxAddPanelProps {
  editable: boolean
  prescriberReg: string
  prescriberName: string
  /** Generic/brand strings already on the prescription — drives duplicate + interaction flags. */
  existingDrugs: string[]
}

export function RxAddPanel({ editable, prescriberReg, prescriberName, existingDrugs }: RxAddPanelProps) {
  const [query, setQuery] = useState("")
  const [chip, setChip] = useState<ClassChip>("Frequently used")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dose, setDose] = useState("1")
  const [freq, setFreq] = useState<Freq>("TDS")
  const [durationValue, setDurationValue] = useState("5")
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("days")
  const [h1Ack, setH1Ack] = useState(false)
  const [added, setAdded] = useState<AddedLine[]>([])
  const [flag, setFlag] = useState<{ kind: "duplicate" | "interaction"; label: string; detail: string } | null>(null)

  const q = query.trim().toLowerCase()
  const existingLower = existingDrugs.map((d) => d.toLowerCase())

  const results = useMemo(() => {
    let list = DRUG_MASTER
    if (chip === "Frequently used") list = list.filter((d) => d.frequentlyUsed)
    else if (chip === "Recent by me") list = list.filter((d) => d.recentByMe)
    else list = list.filter((d) => d.cls === chip)
    if (!q) return list
    return DRUG_MASTER.filter((d) => d.brand.toLowerCase().includes(q) || d.generic.toLowerCase().includes(q))
  }, [q, chip])

  const selected = selectedId ? DRUG_MASTER.find((d) => d.id === selectedId)! : null

  const durationDays = durationUnit === "weeks" ? Number(durationValue || 0) * 7 : durationUnit === "Continue" ? 0 : Number(durationValue || 0)
  const qty = Math.round(Number(dose || 0) * FREQ_PER_DAY[freq] * (durationDays || 0))
  const overLimit = !!selected && (selected.schedule === "H1" || selected.schedule === "X") && selected.limitQty > 0 && durationUnit !== "Continue" && qty > selected.limitQty
  const needsStatutory = !!selected && (selected.schedule === "H1" || selected.schedule === "X")

  const sig = `${dose || "0"} ${selected?.unit ?? "unit"} ${freq}${durationUnit === "Continue" ? " · Continue" : ` · ${durationValue || "0"} ${durationUnit}`}`

  function isDuplicate(d: DrugDef) {
    return existingLower.some((e) => e.includes(d.generic.split(" ")[0].toLowerCase()) || e.includes(d.brand.toLowerCase())) ||
      added.some((a) => a.label.toLowerCase().includes(d.brand.toLowerCase()))
  }

  function interactionWith(d: DrugDef): string | null {
    const gen = d.generic.toLowerCase()
    for (const [a, b, effect] of INTERACTION_PAIRS) {
      const hasA = gen.includes(a)
      const hasB = gen.includes(b)
      const otherHasA = existingLower.some((e) => e.includes(a)) || added.some((x) => x.label.toLowerCase().includes(a))
      const otherHasB = existingLower.some((e) => e.includes(b)) || added.some((x) => x.label.toLowerCase().includes(b))
      if ((hasA && otherHasB) || (hasB && otherHasA)) return effect
    }
    return null
  }

  function selectDrug(d: DrugDef) {
    if (isDuplicate(d)) {
      setFlag({ kind: "duplicate", label: d.brand, detail: `${d.generic} is already listed below. Adding it again double-doses the patient and double-bills at dispensing.` })
      setSelectedId(null)
      return
    }
    const effect = interactionWith(d)
    if (effect) {
      setFlag({ kind: "interaction", label: d.brand, detail: `${d.generic} with something already prescribed — ${effect}.` })
    } else {
      setFlag(null)
    }
    setSelectedId(d.id)
    setDose("1")
    setFreq("TDS")
    setDurationValue("5")
    setDurationUnit("days")
    setH1Ack(false)
  }

  function cancelSelection() {
    setSelectedId(null)
    setFlag(null)
  }

  function addLine() {
    if (!selected || !editable) return
    if (needsStatutory && (overLimit || !h1Ack)) return
    const note = flag?.kind === "interaction"
      ? `Interaction reviewed — ${flag.detail}`
      : null
    setAdded((a) => [
      ...a,
      {
        id: `${selected.id}-${a.length}`,
        label: `${selected.brand} — ${selected.generic}`,
        sig,
        schedule: selected.schedule,
        note,
      },
    ])
    setSelectedId(null)
    setFlag(null)
  }

  function removeAdded(id: string) {
    setAdded((a) => a.filter((x) => x.id !== id))
  }

  return (
    <div className="border border-adminreg-border bg-adminreg-card">
      <div className="border-b border-adminreg-divider bg-adminreg-header px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <SectionLabel>Search and add a drug</SectionLabel>
          <span className="font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">Not yet sent to pharmacy</span>
        </div>
        <p className="text-xs text-adminreg-muted">
          Same shape as the diagnostics order panel — search, select, configure, confirm into the list below. Brand and composition are both searchable, and Schedule status shows in the results before you pick.
        </p>
      </div>

      <div className="p-4">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!editable}
            placeholder="Search Drug Master — brand or composition (e.g. Alzolam, Alprazolam, Dolo)"
            className="w-full border border-adminreg-border bg-adminreg-bg px-2.5 py-2 text-sm text-adminreg-text placeholder:text-adminreg-muted2 focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-60"
          />
          <AdminButton type="button" variant="secondary" className="flex-shrink-0" onClick={() => { setQuery(""); setChip("Frequently used") }}>Clear</AdminButton>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {CLASS_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={!editable}
              onClick={() => setChip(c)}
              className={cn(
                "border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60",
                chip === c ? "border-adminreg-indigo bg-adminreg-indigo-soft text-adminreg-indigo-dark" : "border-adminreg-border bg-adminreg-bg text-adminreg-muted hover:text-adminreg-text"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <p className="mt-3 font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">
          {q
            ? `${results.length} match${results.length === 1 ? "" : "es"} for "${query.trim()}" · brand and composition`
            : `${chip} · ${results.length} of ${DRUG_MASTER.length} in Drug Master`}
        </p>

        <div className="mt-1.5 max-h-[260px] overflow-y-auto border border-adminreg-divider">
          {results.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-xs text-adminreg-muted">
              Nothing in Drug Master matches that. New drugs are an Admin action — they cannot be created here.
            </p>
          ) : (
            results.map((d) => {
              const isSelected = selectedId === d.id
              const onList = isDuplicate(d)
              return (
                <div key={d.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-adminreg-divider px-3.5 py-2.5 last:border-0", isSelected && "bg-adminreg-indigo-soft/60")}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-adminreg-text">{d.brand}</div>
                    <div className="text-xs text-adminreg-muted">{d.generic} · {d.form}</div>
                  </div>
                  <ScheduleBadge schedule={d.schedule} />
                  {isSelected ? (
                    <span className="border border-adminreg-indigo bg-adminreg-indigo px-2.5 py-1 text-[11px] font-bold text-adminreg-card">✓ Selected</span>
                  ) : onList ? (
                    <button type="button" disabled={!editable} onClick={() => selectDrug(d)} className="border border-adminreg-amber bg-adminreg-amber-soft px-2.5 py-1 text-[11px] font-bold text-adminreg-amber-text disabled:opacity-60">On list</button>
                  ) : (
                    <button type="button" disabled={!editable} onClick={() => selectDrug(d)} className="border border-adminreg-indigo bg-adminreg-indigo-soft px-2.5 py-1 text-[11px] font-bold text-adminreg-indigo-dark disabled:opacity-60">Select</button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Flag (duplicate / interaction) */}
        {flag && (
          <div className="mt-3 border-l-[3px] border-adminreg-amber bg-adminreg-amber-soft px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-amber-text">
                {flag.kind === "duplicate" ? `Already on this prescription — ${flag.label}` : `⚠ Interaction — ${flag.label}`}
              </span>
              <span className="font-plexmono text-[9.5px] uppercase tracking-[0.03em] text-adminreg-amber-text">{flag.kind === "duplicate" ? "Duplicate" : "Cautioned pair"}</span>
            </div>
            <p className="mt-1.5 text-xs text-adminreg-amber-text">{flag.detail}</p>
            {flag.kind === "duplicate" ? (
              <div className="mt-2 flex flex-wrap gap-3">
                <button type="button" onClick={() => setFlag(null)} className="text-[11px] font-bold text-adminreg-amber-text underline">Drop this drug</button>
                <button
                  type="button"
                  onClick={() => {
                    const d = DRUG_MASTER.find((x) => x.brand === flag.label)
                    if (d) { setFlag(null); setSelectedId(d.id) }
                  }}
                  className="text-[11px] font-bold text-adminreg-amber-text underline"
                >
                  Prescribe anyway — reviewed
                </button>
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] text-adminreg-amber-text">Reviewed — the decision is written into the line&apos;s note so pharmacy sees it.</p>
            )}
          </div>
        )}

        {/* Configure the selected drug */}
        {selected && (
          <div className="mt-3 border-l-[3px] border-adminreg-indigo bg-adminreg-bg p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-adminreg-text">{selected.brand}</div>
                <div className="text-xs text-adminreg-muted">{selected.generic} · {selected.form}</div>
              </div>
              <ScheduleBadge schedule={selected.schedule} />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">Dose</div>
                <div className="flex">
                  <input type="number" min={0} step="0.25" value={dose} onChange={(e) => setDose(e.target.value)} className="w-full border border-adminreg-border bg-adminreg-card px-2.5 py-1.5 text-sm text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-indigo" />
                  <span className="flex items-center border border-l-0 border-adminreg-border bg-adminreg-header px-2.5 text-xs text-adminreg-muted">{selected.unit}</span>
                </div>
              </div>
              <div>
                <div className="mb-1 font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">Frequency</div>
                <div className="flex flex-wrap gap-1">
                  {FREQ_OPTIONS.map((f) => (
                    <button key={f} type="button" onClick={() => setFreq(f)} className={cn("border px-2 py-1.5 text-[11px] font-semibold", freq === f ? "border-adminreg-indigo bg-adminreg-indigo text-adminreg-card" : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text")}>{f}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">Duration</div>
                <input type="number" min={0} value={durationValue} disabled={durationUnit === "Continue"} onChange={(e) => setDurationValue(e.target.value)} className="w-full border border-adminreg-border bg-adminreg-card px-2.5 py-1.5 text-sm text-adminreg-text focus:outline-none focus:ring-1 focus:ring-adminreg-indigo disabled:opacity-50" />
              </div>
              <div>
                <div className="mb-1 font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">Duration unit</div>
                <div className="flex flex-wrap gap-1">
                  {DURATION_UNITS.map((u) => (
                    <button key={u} type="button" onClick={() => setDurationUnit(u)} className={cn("border px-2 py-1.5 text-[11px] font-semibold", durationUnit === u ? "border-adminreg-indigo bg-adminreg-indigo text-adminreg-card" : "border-adminreg-border bg-adminreg-card text-adminreg-muted hover:text-adminreg-text")}>{u}</button>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-2.5 text-[11px] text-adminreg-muted">
              Structured, not free text — pharmacy dispensing and the drug register read these three fields directly. Written on the prescription as <strong className="text-adminreg-text">{sig}</strong>.
            </p>

            {needsStatutory && (
              <div className="mt-3 border-l-[3px] border-adminreg-red bg-adminreg-red-soft/60 p-3">
                <div className="font-plexmono text-[10px] font-bold uppercase tracking-[0.04em] text-adminreg-red-text">{SCHEDULE_BADGE[selected.schedule as "H1" | "X"]} — extra fields required</div>
                <div className="font-plexmono text-[9px] uppercase tracking-[0.03em] text-adminreg-red-text">Required to add this line · FR-OPD-07</div>
                <p className="mt-1.5 text-[11px] text-adminreg-red-text">
                  The prescriber&apos;s registration number is stamped on the line and the dispensing entry goes to the separate {SCHEDULE_BADGE[selected.schedule as "H1" | "X"]} register with a quantity ceiling.
                </p>

                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-red-text">Prescriber registration no.</div>
                    <input readOnly value={`${prescriberReg} · ${prescriberName}`} className="w-full border border-adminreg-border bg-adminreg-card px-2.5 py-1.5 text-xs text-adminreg-text" />
                    <p className="mt-1 text-[10px] text-adminreg-red-text">Pulled from the signed-in prescriber&apos;s Admin record and stamped onto the line.</p>
                  </div>
                  <div>
                    <div className="mb-1 font-plexmono text-[9px] uppercase tracking-[0.04em] text-adminreg-red-text">Quantity limit check</div>
                    <div className={cn("border px-2.5 py-1.5 text-xs", overLimit ? "border-adminreg-red bg-adminreg-red-soft text-adminreg-red-text" : "border-adminreg-olive bg-adminreg-olive-soft text-adminreg-olive-dark")}>
                      <span className="font-bold">{qty} {selected.unit} · limit {selected.limitQty}</span>
                      <p className="mt-0.5">
                        {overLimit
                          ? `Over the limit — ${selected.limitLabel}. Shorten the duration or reduce the frequency; the line cannot be added as it stands.`
                          : `Within the limit — ${selected.limitLabel}.`}
                      </p>
                    </div>
                  </div>
                </div>

                <label className="mt-2.5 flex items-start gap-2 text-[11px] text-adminreg-red-text">
                  <input type="checkbox" checked={h1Ack} onChange={(e) => setH1Ack(e.target.checked)} className="mt-0.5" />
                  I am prescribing this {SCHEDULE_BADGE[selected.schedule as "H1" | "X"]} drug under my registration and within the quantity limit
                </label>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <AdminButton
                type="button"
                accent="indigo"
                disabled={needsStatutory && (overLimit || !h1Ack)}
                onClick={addLine}
              >
                {overLimit ? "Quantity exceeds the statutory limit" : "Add to prescription"}
              </AdminButton>
              <AdminButton type="button" variant="secondary" onClick={cancelSelection}>Back to search</AdminButton>
            </div>
          </div>
        )}

        {/* Added this session */}
        {added.length > 0 && (
          <div className="mt-4 border-t border-adminreg-divider pt-3">
            <span className="font-plexmono text-[9.5px] uppercase tracking-[0.04em] text-adminreg-muted2">Added this session · {added.length}</span>
            <div className="mt-2 border border-adminreg-divider">
              {added.map((a) => (
                <div key={a.id} className="border-b border-l-[3px] border-l-adminreg-indigo border-adminreg-divider px-3 py-2 last:border-b-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-adminreg-text">{a.label}</span>
                    <span className="flex items-center gap-3">
                      <ScheduleBadge schedule={a.schedule} />
                      {editable && <button type="button" onClick={() => removeAdded(a.id)} className="text-[11px] text-adminreg-amber-text underline">Remove</button>}
                    </span>
                  </div>
                  <div className="mt-0.5 font-plexmono text-xs text-adminreg-muted">{a.sig}</div>
                  {a.note && <p className="mt-1 text-[11px] text-adminreg-amber-text">{a.note}</p>}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-adminreg-muted">These lines drop into the prescription table below; <span className="font-semibold">Remove</span> stays live until the prescription is sent to pharmacy.</p>
          </div>
        )}
      </div>
    </div>
  )
}
