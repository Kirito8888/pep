"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { FatiguePanel } from "@/components/FatiguePanel";
import { SessionBlocksView, SessionEditor } from "@/components/planner/SessionEditor";
import { Alert, Card, Field, Light, PageHeader } from "@/components/ui";
import { LEVELS, PHASES, PHASE_LABEL, SPECIALTIES, type LevelKey, type PhaseKey, type SpecialtyKey } from "@/lib/athletics/events";
import { api, errorMessage, num, useFetch } from "@/lib/client";
import { addDays, DAY_NAMES, mondayOf, parseDateInput, todayInput } from "@/lib/dates";
import { EQUIPMENT, LIFT_REFS, type Equipment, type GeneratedPlan, type LiftRef, type SessionDraft } from "@/lib/generator/types";
import { analyzeWeek } from "@/lib/load/fatigue";

interface Me {
  sex: "M" | "F";
  specialty: string;
}
interface Pr {
  exercise: string;
  value: number;
  unit: string;
  reps: number;
}
interface Friends {
  friends: { user: { id: string; name: string } }[];
}

const ALL_EQUIPMENT = EQUIPMENT.map((e) => e.key);

export default function GeneratorPage() {
  const router = useRouter();
  const me = useFetch<Me>("/api/me");
  const prs = useFetch<Pr[]>("/api/gym/prs");
  const friends = useFetch<Friends>("/api/friends");

  const [specialty, setSpecialty] = useState<SpecialtyKey | null>(null);
  const [phase, setPhase] = useState<PhaseKey>("SPP");
  const [level, setLevel] = useState<LevelKey>("INTERMEDIATE");
  const [days, setDays] = useState(4);
  const [weeks, setWeeks] = useState(4);
  const [sex, setSex] = useState<"M" | "F" | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>(ALL_EQUIPMENT);
  const [oneRm, setOneRm] = useState<Partial<Record<LiftRef, string>>>({});
  const [prefilled, setPrefilled] = useState(false);

  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [weekIdx, setWeekIdx] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(todayInput());
  const [assigneeId, setAssigneeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const spec = specialty ?? ((SPECIALTIES.some((s) => s.key === me.data?.specialty) ? me.data?.specialty : "COMBINED") as SpecialtyKey);
  const sexVal = sex ?? me.data?.sex ?? "M";

  // Precarga los 1RM de referencia con los récords personales guardados.
  useEffect(() => {
    if (prefilled || !prs.data) return;
    const next: Partial<Record<LiftRef, string>> = {};
    for (const ref of LIFT_REFS) {
      const best = prs.data.filter((p) => p.exercise === ref.prExercise && p.unit === "kg" && p.reps === 1).reduce((a, p) => Math.max(a, p.value), 0);
      if (best > 0) next[ref.key] = String(best);
    }
    setOneRm(next);
    setPrefilled(true);
  }, [prs.data, prefilled]);

  async function generate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const rm = Object.fromEntries(Object.entries(oneRm).map(([k, v]) => [k, num(v ?? "")]).filter(([, v]) => typeof v === "number" && v > 0));
      const res = await api<GeneratedPlan>("/api/generator", { body: { specialty: spec, phase, level, daysPerWeek: days, weeks, sex: sexVal, equipment, oneRm: rm } });
      setPlan(res);
      setTitle(res.title);
      setWeekIdx(0);
      setEditing(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function patchSession(si: number, next: Pick<SessionDraft, "title" | "blocks">) {
    if (!plan) return;
    setPlan({ ...plan, weeks: plan.weeks.map((w, wi) => (wi === weekIdx ? { ...w, sessions: w.sessions.map((s, i) => (i === si ? { ...s, ...next } : s)) } : w)) });
  }
  function patchDay(si: number, dayOffset: number) {
    if (!plan) return;
    setPlan({ ...plan, weeks: plan.weeks.map((w, wi) => (wi === weekIdx ? { ...w, sessions: w.sessions.map((s, i) => (i === si ? { ...s, dayOffset } : s)) } : w)) });
  }
  function removeSession(si: number) {
    if (!plan) return;
    setEditing(null);
    setPlan({ ...plan, weeks: plan.weeks.map((w, wi) => (wi === weekIdx ? { ...w, sessions: w.sessions.filter((_, i) => i !== si) } : w)) });
  }

  async function save() {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ id: string }>("/api/plans", {
        body: {
          title: title || plan.title,
          description: plan.description,
          specialty: plan.specialty,
          level: plan.level,
          startDate,
          assigneeId: assigneeId || null,
          mesocycles: [
            {
              name: PHASE_LABEL[plan.phase],
              phase: plan.phase,
              weeks: plan.weeks.map((w) => ({ focus: w.focus, sessions: w.sessions.map((s) => ({ dayOffset: s.dayOffset, title: s.title, blocks: s.blocks })) })),
            },
          ],
        },
      });
      router.push(`/planner/${res.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const week = plan?.weeks[weekIdx] ?? null;
  const monday = mondayOf(parseDateInput(startDate));
  const fatigue = week ? analyzeWeek(week.sessions.map((s) => ({ date: addDays(monday, s.dayOffset), title: s.title, blocks: s.blocks }))) : null;
  const invalid = plan?.weeks.some((w) => w.sessions.some((s) => !s.title.trim() || s.blocks.some((b) => b.exercises.some((e) => !e.name.trim())))) ?? false;

  return (
    <div>
      <PageHeader title="Generador inteligente de microciclos" subtitle="Motor determinista local: programa cada especialidad con su propia lógica, respeta el orden neural de la sesión y nunca encadena dos días de alta demanda. No usa servicios externos." />

      <Card title="Parámetros" className="mb-4">
        <form onSubmit={generate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Field label="Especialidad principal" className="col-span-2">
              <select className="input" value={spec} onChange={(e) => setSpecialty(e.target.value as SpecialtyKey)}>
                {SPECIALTIES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Fase de la temporada" className="col-span-2">
              <select className="input" value={phase} onChange={(e) => setPhase(e.target.value as PhaseKey)}>
                {PHASES.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Nivel">
              <select className="input" value={level} onChange={(e) => setLevel(e.target.value as LevelKey)}>
                {LEVELS.map((l) => (
                  <option key={l.key} value={l.key}>{l.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Sexo (implementos)">
              <select className="input" value={sexVal} onChange={(e) => setSex(e.target.value === "F" ? "F" : "M")}>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </Field>
            <Field label={`Días por semana: ${days}`} className="col-span-2" hint={spec === "COMBINED" && days < 4 ? "Combinadas requiere un mínimo de 4 días: se programarán 4." : undefined}>
              <input type="range" min={2} max={6} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full" />
            </Field>
            <Field label={`Microciclos (semanas): ${weeks}`} className="col-span-2" hint={weeks >= 3 ? "La última semana es de descarga (−30 %)." : undefined}>
              <input type="range" min={1} max={6} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="w-full" />
            </Field>
          </div>

          <fieldset>
            <legend className="label">Equipamiento disponible</legend>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.map((eq) => {
                const on = equipment.includes(eq.key);
                return (
                  <label key={eq.key} className={`btn btn-sm cursor-pointer ${on ? "btn-primary" : ""}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => setEquipment((list) => (on ? list.filter((x) => x !== eq.key) : [...list, eq.key]))} />
                    {on ? "✓ " : ""}
                    {eq.label}
                  </label>
                );
              })}
            </div>
            <p className="muted mt-1 text-xs">Lo que no esté marcado se sustituye automáticamente (mancuernas o peso corporal, balón medicinal, imitaciones técnicas…).</p>
          </fieldset>

          <fieldset>
            <legend className="label">1RM de referencia (opcional): permite calcular cargas en kg y tonelaje</legend>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {LIFT_REFS.map((r) => (
                <Field key={r.key} label={`${r.label} (kg)`}>
                  <input className="input" inputMode="decimal" value={oneRm[r.key] ?? ""} onChange={(e) => setOneRm((o) => ({ ...o, [r.key]: e.target.value }))} placeholder="—" />
                </Field>
              ))}
            </div>
          </fieldset>

          <button className="btn btn-primary" disabled={busy}>
            {busy && !plan ? "Generando…" : plan ? "Regenerar con estos parámetros" : "Generar planificación"}
          </button>
          {plan ? <span className="muted ml-3 text-xs">Regenerar descarta las ediciones manuales.</span> : null}
        </form>
      </Card>

      {error ? <div className="mb-4"><Alert kind="error">{error}</Alert></div> : null}

      {plan && week && fatigue ? (
        <>
          <Card title="Resultado · revisa y edita antes de guardar" className="mb-4">
            <p className="ink-2 text-sm">{plan.description}</p>
            <ul className="ink-2 mt-2 list-disc space-y-1 pl-5 text-sm">
              {plan.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-1" role="tablist" aria-label="Microciclos">
              {plan.weeks.map((w, i) => (
                <button key={w.weekNumber} role="tab" aria-selected={i === weekIdx} className={`btn btn-sm ${i === weekIdx ? "btn-primary" : ""}`} onClick={() => { setWeekIdx(i); setEditing(null); }}>
                  Semana {w.weekNumber} · {w.focus}
                </button>
              ))}
            </div>
          </Card>

          <div className="mb-4 space-y-3">
            {[...week.sessions.map((s, i) => ({ s, i }))]
              .sort((a, b) => a.s.dayOffset - b.s.dayOffset)
              .map(({ s, i }) => (
                <Card
                  key={i}
                  title={`${DAY_NAMES[s.dayOffset]} · ${s.title}`}
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge">{s.demand === "high" ? "Alta demanda neural" : "Baja demanda"}</span>
                      <select className="input !w-auto !py-1 text-xs" value={s.dayOffset} onChange={(e) => patchDay(i, Number(e.target.value))} aria-label="Día de la semana">
                        {DAY_NAMES.map((d, di) => (
                          <option key={d} value={di}>{d}</option>
                        ))}
                      </select>
                      <button className="btn btn-sm" onClick={() => setEditing(editing === i ? null : i)}>
                        {editing === i ? "Terminar edición" : "Editar"}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => removeSession(i)} aria-label="Eliminar sesión">✕</button>
                    </div>
                  }
                >
                  {editing === i ? <SessionEditor value={{ title: s.title, blocks: s.blocks }} onChange={(next) => patchSession(i, next)} /> : <SessionBlocksView blocks={s.blocks} />}
                </Card>
              ))}
          </div>

          <Card title={`Semáforo de fatiga de la semana ${week.weekNumber}`} className="mb-4" actions={<Light status={fatigue.overall} />}>
            <FatiguePanel fatigue={fatigue} />
          </Card>

          <Card title="Guardar planificación">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Título" className="col-span-2">
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="Fecha de inicio" hint="Se ajusta al lunes de esa semana.">
                <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
              <Field label="Planificación para">
                <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">Para mí</option>
                  {(friends.data?.friends ?? []).map((f) => (
                    <option key={f.user.id} value={f.user.id}>{f.user.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            {invalid ? <div className="mt-3"><Alert kind="amber">Hay sesiones o ejercicios sin nombre: complétalos antes de guardar.</Alert></div> : null}
            <button className="btn btn-primary mt-3" onClick={save} disabled={busy || invalid || !title.trim()}>
              {busy ? "Guardando…" : "Guardar en mi planificador"}
            </button>
          </Card>
        </>
      ) : null}
    </div>
  );
}
