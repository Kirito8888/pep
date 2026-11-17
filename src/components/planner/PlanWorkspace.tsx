"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type DragEvent } from "react";
import { FatiguePanel } from "@/components/FatiguePanel";
import { Alert, Card, Field, Light, Loading, PageHeader } from "@/components/ui";
import { LEVELS, PHASES, PHASE_COLOR, PHASE_LABEL, SPECIALTY_LABEL } from "@/lib/athletics/events";
import { api, errorMessage, useFetch } from "@/lib/client";
import { addDays, DAY_NAMES, DAY_SHORT, dayIndex, diffDays, formatDate, mondayOf, toDateInput, toUtcMidnight } from "@/lib/dates";
import { analyzeWeek } from "@/lib/load/fatigue";
import { SessionDetail } from "./SessionDetail";
import type { MesoNode, MicroNode, PlanResponse, SessionNode } from "./types";

interface FriendsResponse {
  friends: { friendshipId: string; user: { id: string; name: string } }[];
}

const LEVEL_DOT = { rest: "var(--axis)", low: "var(--good)", moderate: "var(--warning)", high: "var(--critical)" } as const;
const LEVEL_TEXT = { rest: "Descanso", low: "Baja", moderate: "Media", high: "Alta" } as const;

export function PlanWorkspace({ planId, backHref }: { planId: string; backHref: string }) {
  const router = useRouter();
  const { data, error, loading, reload } = useFetch<PlanResponse>(`/api/plans/${planId}`);
  const [week, setWeek] = useState<number | null>(null);
  const [view, setView] = useState<"week" | "month">("week");
  const [selected, setSelected] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);

  const micros = useMemo(() => (data ? data.plan.mesocycles.flatMap((m) => m.microcycles.map((mc) => ({ ...mc, meso: m }))) : []), [data]);

  if (loading && !data) return <Loading />;
  if (error || !data) {
    return (
      <div className="space-y-3">
        <Alert kind="error">{error ?? "No se pudo cargar la planificación"}</Alert>
        <Link href={backHref} className="btn">
          Volver
        </Link>
      </div>
    );
  }

  const { plan, permissions: perms } = data;
  const start = mondayOf(plan.startDate);
  const totalWeeks = micros.length;
  const todayWeek = Math.floor(diffDays(toUtcMidnight(new Date()), start) / 7) + 1;
  const currentWeek = Math.min(Math.max(week ?? (todayWeek >= 1 && todayWeek <= totalWeeks ? todayWeek : 1), 1), Math.max(1, totalWeeks));
  const micro = micros.find((m) => m.weekNumber === currentWeek);
  const weekStart = addDays(start, (currentWeek - 1) * 7);
  const allSessions = micros.flatMap((m) => m.sessions);
  const selectedSession = allSessions.find((s) => s.id === selected) ?? null;
  const fatigue = analyzeWeek(micro?.sessions ?? []);
  const done = allSessions.filter((s) => s.completed).length;

  async function act(fn: () => Promise<unknown>, ok?: string) {
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg({ kind: "success", text: ok });
      reload();
    } catch (err) {
      setMsg({ kind: "error", text: errorMessage(err) });
    }
  }

  const onDragStart = (e: DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDrop = (e: DragEvent, date: Date) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    const session = allSessions.find((s) => s.id === id);
    if (!id || !session || toDateInput(session.date) === toDateInput(date)) return;
    void act(() => api(`/api/sessions/${id}`, { method: "PATCH", body: { date: toDateInput(date) } }));
  };
  const dropProps = (date: Date) =>
    perms.canEdit
      ? {
          onDragOver: (e: DragEvent) => {
            e.preventDefault();
            setDragOver(toDateInput(date));
          },
          onDragLeave: () => setDragOver(null),
          onDrop: (e: DragEvent) => onDrop(e, date),
        }
      : {};

  const chip = (s: SessionNode, compact = false) => (
    <button
      key={s.id}
      type="button"
      draggable={perms.canEdit}
      onDragStart={(e) => onDragStart(e, s.id)}
      onClick={() => {
        setSelected(s.id);
        setView("week");
        const w = micros.find((m) => m.sessions.some((x) => x.id === s.id));
        if (w) setWeek(w.weekNumber);
      }}
      className={`w-full rounded-md border px-2 py-1 text-left text-xs transition hover:border-brand-500 ${perms.canEdit ? "cursor-grab active:cursor-grabbing" : ""} ${selected === s.id ? "border-brand-600 ring-2 ring-brand-500/30" : ""}`}
      style={{ background: "var(--surface)", borderColor: selected === s.id ? undefined : "var(--border)" }}
      title={perms.canEdit ? "Arrastra para cambiar de día" : s.title}
    >
      <span className="line-clamp-2 font-medium">
        {s.completed ? "✓ " : ""}
        {s.title}
      </span>
      {!compact ? (
        <span className="muted block">
          {s.blocks.length} bloques{s._count.comments ? ` · ${s._count.comments} com.` : ""}
        </span>
      ) : null}
    </button>
  );

  return (
    <div>
      <PageHeader
        title={plan.title}
        subtitle={`${SPECIALTY_LABEL[plan.specialty] ?? plan.specialty} · ${LEVELS.find((l) => l.key === plan.level)?.label ?? plan.level} · Inicio ${formatDate(start)} · ${totalWeeks} semanas · ${done}/${allSessions.length} sesiones completadas`}
        actions={
          <>
            <Link href={backHref} className="btn">
              ← Volver
            </Link>
            <button
              className="btn"
              onClick={async () => {
                setMsg(null);
                try {
                  const res = await api<{ id: string }>(`/api/plans/${plan.id}/clone`, { method: "POST", body: {} });
                  router.push(`/planner/${res.id}`);
                } catch (err) {
                  setMsg({ kind: "error", text: errorMessage(err) });
                }
              }}
            >
              Clonar planificación a mi cuenta
            </button>
            {perms.canEdit ? (
              <button className="btn" onClick={() => setSettings((s) => !s)} aria-expanded={settings}>
                Ajustes
              </button>
            ) : null}
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="badge">Propietario: {plan.owner.name}</span>
        <span className="badge">Atleta: {plan.assignee?.name ?? plan.owner.name}</span>
        {!perms.canEdit ? <span className="badge">{perms.canComplete ? "Puedes completar sesiones y comentar" : "Solo lectura · puedes comentar y clonar"}</span> : null}
      </div>
      {plan.description ? <p className="ink-2 mb-3 text-sm">{plan.description}</p> : null}
      {msg ? <div className="mb-3"><Alert kind={msg.kind}>{msg.text}</Alert></div> : null}

      {settings && perms.canEdit ? <Settings plan={plan} isOwner={perms.isOwner} onAct={act} onDeleted={() => router.push("/planner")} /> : null}

      {/* Macrociclo: mesociclos por fase */}
      <Card title="Macrociclo · mesociclos y microciclos" className="mb-4">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {plan.mesocycles.map((m) => (
            <div key={m.id} className="min-w-fit rounded-lg p-2" style={{ flex: `${Math.max(1, m.microcycles.length)} 0 auto`, background: "var(--surface-2)", borderTop: `4px solid ${PHASE_COLOR[m.phase]}` }}>
              <div className="mb-1 whitespace-nowrap text-xs font-semibold">{m.name}</div>
              <div className="muted mb-2 whitespace-nowrap text-[11px]">{PHASE_LABEL[m.phase]}</div>
              <div className="flex gap-1">
                {m.microcycles.map((mc) => (
                  <button
                    key={mc.id}
                    type="button"
                    onClick={() => {
                      setWeek(mc.weekNumber);
                      setSelected(null);
                    }}
                    aria-pressed={mc.weekNumber === currentWeek}
                    className={`btn btn-sm ${mc.weekNumber === currentWeek ? "btn-primary" : ""}`}
                    title={mc.focus || `Semana ${mc.weekNumber}`}
                  >
                    S{mc.weekNumber}
                    {mc.weekNumber === todayWeek ? " •" : ""}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="muted mt-2 text-xs">• = semana actual. {perms.canEdit ? "Arrastra las sesiones entre días para reorganizar el microciclo." : ""}</p>
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button className="btn btn-sm" onClick={() => setWeek(Math.max(1, currentWeek - 1))} disabled={currentWeek <= 1} aria-label="Semana anterior">←</button>
          <div className="text-sm font-semibold">
            Semana {currentWeek} · {formatDate(weekStart)} – {formatDate(addDays(weekStart, 6))}
            {micro ? <span className="muted font-normal"> · {PHASE_LABEL[micro.meso.phase]}{micro.focus ? ` · ${micro.focus}` : ""}</span> : null}
          </div>
          <button className="btn btn-sm" onClick={() => setWeek(Math.min(totalWeeks, currentWeek + 1))} disabled={currentWeek >= totalWeeks} aria-label="Semana siguiente">→</button>
        </div>
        <div className="flex gap-1" role="group" aria-label="Vista del calendario">
          <button className={`btn btn-sm ${view === "week" ? "btn-primary" : ""}`} onClick={() => setView("week")} aria-pressed={view === "week"}>Semanal</button>
          <button className={`btn btn-sm ${view === "month" ? "btn-primary" : ""}`} onClick={() => setView("month")} aria-pressed={view === "month"}>Mensual / completo</button>
        </div>
      </div>

      {view === "week" && micro ? (
        <div className="mb-4 grid gap-2 md:grid-cols-7">
          {DAY_NAMES.map((name, i) => {
            const date = addDays(weekStart, i);
            const sessions = micro.sessions.filter((s) => dayIndex(s.date) === i);
            const d = fatigue.days[i];
            const over = dragOver === toDateInput(date);
            return (
              <div key={name} {...dropProps(date)} className={`min-h-[120px] rounded-lg border p-2 transition ${over ? "border-brand-500 ring-2 ring-brand-500/30" : ""}`} style={{ background: "var(--surface-2)", borderColor: over ? undefined : "var(--border)" }}>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">{name}</div>
                    <div className="muted text-[11px]">{formatDate(date)}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px]" title={`Demanda neural: ${LEVEL_TEXT[d.neuralLevel]}`}>
                    <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: LEVEL_DOT[d.neuralLevel] }} />
                    {LEVEL_TEXT[d.neuralLevel]}
                  </span>
                </div>
                <div className="space-y-1">{sessions.map((s) => chip(s))}</div>
                {perms.canEdit ? <AddSession microcycleId={micro.id} dayOffset={i} onAct={act} onCreated={setSelected} /> : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {view === "month" ? (
        <Card className="mb-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-1 text-xs">
              <thead>
                <tr className="muted text-left">
                  <th className="w-24 font-medium">Semana</th>
                  {DAY_SHORT.map((d) => (
                    <th key={d} className="font-medium">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {micros.map((mc) => {
                  const ws = addDays(start, (mc.weekNumber - 1) * 7);
                  return (
                    <tr key={mc.id}>
                      <td className="align-top">
                        <button className={`btn btn-sm w-full ${mc.weekNumber === currentWeek ? "btn-primary" : ""}`} style={{ borderLeft: `4px solid ${PHASE_COLOR[mc.meso.phase]}` }} onClick={() => { setWeek(mc.weekNumber); setView("week"); }}>
                          S{mc.weekNumber}
                        </button>
                        <div className="muted mt-0.5 text-[10px]">{formatDate(ws)}</div>
                      </td>
                      {DAY_SHORT.map((_, i) => {
                        const date = addDays(ws, i);
                        const over = dragOver === toDateInput(date);
                        return (
                          <td key={i} {...dropProps(date)} className={`h-14 rounded-md border p-1 align-top ${over ? "border-brand-500" : ""}`} style={{ background: "var(--surface-2)", borderColor: over ? undefined : "var(--border)" }}>
                            <div className="space-y-1">{mc.sessions.filter((s) => dayIndex(s.date) === i).map((s) => chip(s, true))}</div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {selectedSession ? (
        <div className="mb-4">
          <SessionDetail session={selectedSession} perms={perms} onChanged={reload} onClose={() => setSelected(null)} />
        </div>
      ) : null}

      <Card
        title={`Semáforo de fatiga neural (SNC) y estrés articular · semana ${currentWeek}`}
        actions={<Light status={fatigue.overall} label={fatigue.overall === "green" ? "Carga equilibrada" : fatigue.overall === "amber" ? "Precaución" : "Sobrecarga"} />}
      >
        {micro && micro.sessions.length > 0 ? <FatiguePanel fatigue={fatigue} /> : <p className="muted py-4 text-center text-sm">Esta semana no tiene sesiones.</p>}
      </Card>

      {perms.canEdit ? <MesocycleManager plan={plan} micro={micro ?? null} onAct={act} /> : null}
    </div>
  );
}

type Act = (fn: () => Promise<unknown>, ok?: string) => Promise<void>;

function AddSession({ microcycleId, dayOffset, onAct, onCreated }: { microcycleId: string; dayOffset: number; onAct: Act; onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  if (!open) {
    return (
      <button type="button" className="muted mt-1 w-full rounded-md border border-dashed px-2 py-1 text-xs hover:border-brand-500" style={{ borderColor: "var(--axis)" }} onClick={() => setOpen(true)}>
        + Sesión
      </button>
    );
  }
  return (
    <form
      className="mt-1 space-y-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        void onAct(async () => {
          const res = await api<{ id: string }>("/api/sessions", { body: { microcycleId, dayOffset, title } });
          onCreated(res.id);
          setTitle("");
          setOpen(false);
        });
      }}
    >
      <input className="input !px-2 !py-1 text-xs" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la sesión" aria-label="Título de la nueva sesión" />
      <div className="flex gap-1">
        <button className="btn btn-primary btn-sm flex-1">Crear</button>
        <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>✕</button>
      </div>
    </form>
  );
}

function Settings({ plan, isOwner, onAct, onDeleted }: { plan: PlanResponse["plan"]; isOwner: boolean; onAct: Act; onDeleted: () => void }) {
  const friends = useFetch<FriendsResponse>("/api/friends");
  const [title, setTitle] = useState(plan.title);
  const [description, setDescription] = useState(plan.description);
  const [assignee, setAssignee] = useState(plan.assignee?.id ?? "");
  return (
    <Card title="Ajustes de la planificación" className="mb-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Título">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Descripción">
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Planificación para" hint="Solo puedes asignarla a amigos aceptados.">
          <select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Para mí</option>
            {(friends.data?.friends ?? []).map((f) => (
              <option key={f.user.id} value={f.user.id}>
                {f.user.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={!title.trim()} onClick={() => onAct(() => api(`/api/plans/${plan.id}`, { method: "PATCH", body: { title, description, assigneeId: assignee || null } }), "Ajustes guardados.")}>
          Guardar ajustes
        </button>
        <span className="flex-1" />
        {isOwner ? (
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (!window.confirm("¿Eliminar la planificación completa? No se puede deshacer.")) return;
              try {
                await api(`/api/plans/${plan.id}`, { method: "DELETE" });
                onDeleted();
              } catch (err) {
                window.alert(errorMessage(err));
              }
            }}
          >
            Eliminar planificación
          </button>
        ) : null}
      </div>
    </Card>
  );
}

function MesocycleManager({ plan, micro, onAct }: { plan: PlanResponse["plan"]; micro: (MicroNode & { meso: MesoNode }) | null; onAct: Act }) {
  const [name, setName] = useState("");
  const [phase, setPhase] = useState("SPP");
  const [weeks, setWeeks] = useState("4");
  const [focus, setFocus] = useState<{ id: string; text: string } | null>(null);
  const focusValue = micro ? (focus?.id === micro.id ? focus.text : micro.focus) : "";
  const base = `/api/plans/${plan.id}/mesocycles`;
  return (
    <Card title="Gestor de mesociclos y microciclos" className="mt-4">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Mesociclo</th>
              <th>Fase</th>
              <th>Semanas</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {plan.mesocycles.map((m) => (
              <tr key={m.id}>
                <td>
                  <input className="input" defaultValue={m.name} aria-label="Nombre del mesociclo" onBlur={(e) => e.target.value.trim() && e.target.value !== m.name && onAct(() => api(base, { method: "PATCH", body: { mesocycleId: m.id, name: e.target.value } }))} />
                </td>
                <td>
                  <select className="input" value={m.phase} aria-label="Fase" onChange={(e) => onAct(() => api(base, { method: "PATCH", body: { mesocycleId: m.id, phase: e.target.value } }))}>
                    {PHASES.map((p) => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </td>
                <td>
                  {m.microcycles.length ? `S${m.microcycles[0].weekNumber}–S${m.microcycles[m.microcycles.length - 1].weekNumber}` : "—"} ({m.microcycles.length})
                </td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={plan.mesocycles.length <= 1}
                    onClick={() => {
                      if (window.confirm(`¿Eliminar "${m.name}" con todas sus sesiones? Las semanas posteriores se adelantarán.`)) void onAct(() => api(`${base}?mesocycleId=${m.id}`, { method: "DELETE" }));
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="mt-3 grid grid-cols-2 items-end gap-3 md:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          void onAct(async () => {
            await api(base, { body: { name: name || PHASE_LABEL[phase], phase, weeks: Math.round(Number(weeks)) || 1 } });
            setName("");
          }, "Mesociclo añadido al final de la planificación.");
        }}
      >
        <Field label="Nuevo mesociclo" className="col-span-2">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (opcional)" />
        </Field>
        <Field label="Fase">
          <select className="input" value={phase} onChange={(e) => setPhase(e.target.value)}>
            {PHASES.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Semanas">
          <input className="input" inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} />
        </Field>
        <button className="btn btn-primary">Añadir mesociclo</button>
      </form>
      {micro ? (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          <Field label={`Foco del microciclo (semana ${micro.weekNumber})`} className="min-w-[240px] flex-1">
            <input className="input" value={focusValue} onChange={(e) => setFocus({ id: micro.id, text: e.target.value })} placeholder="Carga de impacto, descarga, competición…" />
          </Field>
          <button className="btn" disabled={focusValue === micro.focus} onClick={() => onAct(() => api(base, { method: "PATCH", body: { microcycleId: micro.id, focus: focusValue } }), "Foco guardado.")}>
            Guardar foco
          </button>
        </div>
      ) : null}
    </Card>
  );
}
