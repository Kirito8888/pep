"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PlanCard, type PlanSummaryJson } from "@/components/planner/PlanCard";
import { Alert, Card, Empty, Field, Loading, PageHeader } from "@/components/ui";
import { LEVELS, PHASES, SPECIALTIES, PHASE_LABEL } from "@/lib/athletics/events";
import { api, errorMessage, useFetch } from "@/lib/client";
import { todayInput } from "@/lib/dates";

interface Plans {
  mine: PlanSummaryJson[];
  shared: PlanSummaryJson[];
}
interface Me {
  id: string;
  specialty: string;
}
interface Friends {
  friends: { user: { id: string; name: string } }[];
}

const DEFAULT_PHASES = [
  { phase: "GPP", weeks: "4" },
  { phase: "SPP", weeks: "4" },
  { phase: "PRE_COMP", weeks: "3" },
  { phase: "COMP", weeks: "3" },
  { phase: "TAPER", weeks: "1" },
];

export default function PlannerPage() {
  const router = useRouter();
  const plans = useFetch<Plans>("/api/plans");
  const me = useFetch<Me>("/api/me");
  const friends = useFetch<Friends>("/api/friends");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", specialty: "", level: "INTERMEDIATE", startDate: todayInput(), assigneeId: "", description: "" });
  const [phases, setPhases] = useState(DEFAULT_PHASES);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const specialty = form.specialty || me.data?.specialty || "COMBINED";
  const totalWeeks = phases.reduce((a, p) => a + (Math.round(Number(p.weeks)) || 0), 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ id: string }>("/api/plans", {
        body: {
          title: form.title,
          description: form.description,
          specialty,
          level: form.level,
          startDate: form.startDate,
          assigneeId: form.assigneeId || null,
          mesocycles: phases
            .filter((p) => Math.round(Number(p.weeks)) > 0)
            .map((p) => ({ name: PHASE_LABEL[p.phase], phase: p.phase, weeks: Array.from({ length: Math.min(16, Math.round(Number(p.weeks))) }, () => ({ focus: "", sessions: [] })) })),
        },
      });
      router.push(`/planner/${res.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Planificador de temporada"
        subtitle="Macrociclos, mesociclos y microciclos por fases (GPP, SPP, pre-competitivo, competitivo y tapering) con sesiones multibloque y semáforo de fatiga neural y articular."
        actions={
          <>
            <button className="btn btn-primary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? "Cerrar" : "Nueva planificación"}
            </button>
            <Link href="/generator" className="btn">
              Generador inteligente
            </Link>
          </>
        }
      />

      {open ? (
        <Card title="Crear macrociclo" className="mb-4">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Título" className="col-span-2">
                <input className="input" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Temporada aire libre" />
              </Field>
              <Field label="Especialidad">
                <select className="input" value={specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}>
                  {SPECIALTIES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Nivel">
                <select className="input" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}>
                  {LEVELS.map((l) => (
                    <option key={l.key} value={l.key}>{l.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha de inicio" hint="Se ajusta al lunes de esa semana.">
                <input className="input" type="date" required value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </Field>
              <Field label="Planificación para">
                <select className="input" value={form.assigneeId} onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}>
                  <option value="">Para mí</option>
                  {(friends.data?.friends ?? []).map((f) => (
                    <option key={f.user.id} value={f.user.id}>{f.user.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Descripción / objetivo" className="col-span-2">
                <input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </Field>
            </div>
            <div>
              <div className="label">Mesociclos (en orden) · {totalWeeks} semanas en total</div>
              <div className="space-y-2">
                {phases.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <select className="input max-w-xs" value={p.phase} aria-label="Fase" onChange={(e) => setPhases((arr) => arr.map((x, j) => (j === i ? { ...x, phase: e.target.value } : x)))}>
                      {PHASES.map((ph) => (
                        <option key={ph.key} value={ph.key}>{ph.label}</option>
                      ))}
                    </select>
                    <input className="input w-20" inputMode="numeric" value={p.weeks} aria-label="Semanas" onChange={(e) => setPhases((arr) => arr.map((x, j) => (j === i ? { ...x, weeks: e.target.value } : x)))} />
                    <span className="muted text-sm">semanas</span>
                    <button type="button" className="btn btn-danger btn-sm" disabled={phases.length <= 1} onClick={() => setPhases((arr) => arr.filter((_, j) => j !== i))} aria-label="Quitar mesociclo">✕</button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-sm mt-2" onClick={() => setPhases((arr) => [...arr, { phase: "SPP", weeks: "3" }])}>
                + Mesociclo
              </button>
            </div>
            {error ? <Alert kind="error">{error}</Alert> : null}
            <button className="btn btn-primary" disabled={busy || totalWeeks === 0}>
              {busy ? "Creando…" : "Crear planificación"}
            </button>
          </form>
        </Card>
      ) : null}

      {plans.loading && !plans.data ? <Loading /> : null}
      {plans.error ? <Alert kind="error">{plans.error}</Alert> : null}
      {plans.data ? (
        plans.data.mine.length === 0 ? (
          <Card>
            <Empty>Aún no tienes planificaciones. Crea un macrociclo vacío o usa el generador inteligente para partir de un microciclo específico.</Empty>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.data.mine.map((p) => (
              <PlanCard key={p.id} plan={p} href={`/planner/${p.id}`} meId={me.data?.id} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
