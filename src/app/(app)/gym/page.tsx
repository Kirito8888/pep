"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { BarsChart, LinesChart } from "@/components/charts";
import { Alert, Card, DataTable, Field, PageHeader, Stat, Tabs } from "@/components/ui";
import { api, errorMessage, num, useFetch } from "@/lib/client";
import { addDays, formatDate, mondayOf, todayInput, toDateInput } from "@/lib/dates";
import { round } from "@/lib/format";
import { MUSCLE_GROUPS, PR_CATEGORIES, PR_EXERCISES, VOLUME_RANGE, totalTonnage, volumeByMuscle } from "@/lib/gym/muscleVolume";
import { RPE_SCALE, estimateOneRm, percentForRepsAtRpe, percentTable } from "@/lib/gym/oneRm";
import { PLATE_COLORS, calculatePlates } from "@/lib/gym/plates";

type Tab = "rm" | "plates" | "volume" | "rpe" | "timer" | "prs";

interface Lift {
  id: string;
  date: string;
  exercise: string;
  muscleGroup: string;
  sets: number;
  reps: number;
  weightKg: number;
  rpe: number | null;
}

interface Pr {
  id: string;
  date: string;
  exercise: string;
  category: string;
  value: number;
  unit: string;
  reps: number;
  notes: string;
}

export default function GymPage() {
  const [tab, setTab] = useState<Tab>("rm");
  return (
    <div>
      <PageHeader title="Herramientas de gimnasio" subtitle="Fuerza máxima, potencia balística e hipertrofia: 1RM, discos, volumen semanal, RPE/RIR, descansos y récords personales." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "rm", label: "Calculadora 1RM" },
          { key: "plates", label: "Discos por lado" },
          { key: "volume", label: "Volumen semanal" },
          { key: "rpe", label: "Escala RPE / RIR" },
          { key: "timer", label: "Temporizador" },
          { key: "prs", label: "Récords personales" },
        ]}
      />
      {tab === "rm" ? <OneRm /> : null}
      {tab === "plates" ? <Plates /> : null}
      {tab === "volume" ? <Volume /> : null}
      {tab === "rpe" ? <Rpe /> : null}
      {tab === "timer" ? <Timer /> : null}
      {tab === "prs" ? <Prs /> : null}
    </div>
  );
}

function OneRm() {
  const [weight, setWeight] = useState("100");
  const [reps, setReps] = useState("5");
  const w = num(weight) ?? 0;
  const r = Math.max(1, Math.round(num(reps) ?? 1));
  const res = estimateOneRm(w, r);
  const table = percentTable(res.average);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Estimación de 1RM">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso levantado (kg)">
            <input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <Field label="Repeticiones" hint="Más fiable entre 1 y 10.">
            <input className="input" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Epley" value={round(res.epley, 1)} unit="kg" />
          <Stat label="Brzycki" value={Number.isFinite(res.brzycki) ? round(res.brzycki, 1) : "—"} unit="kg" />
          <Stat label="Lombardi" value={round(res.lombardi, 1)} unit="kg" />
          <Stat label="Media" value={round(res.average, 1)} unit="kg" />
        </div>
        <p className="muted mt-3 text-xs">Epley: P·(1 + r/30) · Brzycki: P·36/(37 − r) · Lombardi: P·r^0,10. Con más de 10 repeticiones las tres fórmulas divergen.</p>
      </Card>
      <Card title="Tabla de porcentajes (sobre la media)">
        <table className="table">
          <thead>
            <tr>
              <th>% 1RM</th>
              <th>Carga</th>
              <th>Repeticiones equivalentes</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.pct}>
                <td className="font-semibold">{row.pct} %</td>
                <td>{row.weight} kg</td>
                <td>{row.reps} RM</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Plates() {
  const [target, setTarget] = useState("100");
  const [bar, setBar] = useState<20 | 15>(20);
  const res = calculatePlates(num(target) ?? 0, bar);
  return (
    <Card title="Discos por lado de la barra">
      <div className="grid max-w-md grid-cols-2 gap-3">
        <Field label="Peso total objetivo (kg)">
          <input className="input" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label="Barra olímpica">
          <select className="input" value={bar} onChange={(e) => setBar(Number(e.target.value) === 15 ? 15 : 20)}>
            <option value={20}>20 kg (masculina)</option>
            <option value={15}>15 kg (femenina)</option>
          </select>
        </Field>
      </div>
      <div className="my-6 flex items-center overflow-x-auto py-2" aria-label={`Barra con ${res.perSide.join(", ")} kg por lado`}>
        <div className="h-3 w-16 shrink-0 rounded-l" style={{ background: "var(--axis)" }} />
        <div className="h-8 w-3 shrink-0" style={{ background: "var(--muted)" }} />
        {res.perSide.map((p, i) => (
          <div
            key={i}
            className="mx-px flex shrink-0 items-center justify-center rounded border text-[10px] font-bold"
            style={{ background: PLATE_COLORS[p], borderColor: "var(--ink-2)", color: p === 5 || p === 0.5 || p === 15 || p === 1.25 ? "#0b0b0b" : "#ffffff", width: p >= 10 ? 26 : 18, height: 40 + p * 4 }}
          >
            <span style={{ writingMode: "vertical-rl" }}>{p}</span>
          </div>
        ))}
        <div className="h-3 w-10 shrink-0 rounded-r" style={{ background: "var(--axis)" }} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Por lado" value={res.perSide.length ? res.perSide.join(" + ") : "Solo barra"} unit={res.perSide.length ? "kg" : undefined} />
        <Stat label="Peso cargado" value={res.achieved} unit="kg" />
        <Stat label="Sin cubrir" value={res.remainder} unit="kg" hint={res.remainder > 0 ? "No alcanzable con discos de 25 a 0,5 kg." : "Carga exacta."} />
      </div>
    </Card>
  );
}

function Volume() {
  const lifts = useFetch<Lift[]>("/api/gym/lifts");
  const [form, setForm] = useState({ date: todayInput(), exercise: "", muscleGroup: MUSCLE_GROUPS[0] as string, sets: "3", reps: "8", weightKg: "60", rpe: "" });
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const weekStart = useMemo(() => addDays(mondayOf(new Date()), weekOffset * 7), [weekOffset]);
  const weekEnd = addDays(weekStart, 7);
  const all = lifts.data ?? [];
  const week = all.filter((l) => new Date(l.date) >= weekStart && new Date(l.date) < weekEnd);
  const volumes = volumeByMuscle(week);
  const trend = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(mondayOf(new Date()), (i - 7) * 7);
    const end = addDays(start, 7);
    return { semana: toDateInput(start).slice(5), tonelaje: totalTonnage(all.filter((l) => new Date(l.date) >= start && new Date(l.date) < end)) };
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/gym/lifts", {
        body: { date: form.date, exercise: form.exercise, muscleGroup: form.muscleGroup, sets: num(form.sets), reps: num(form.reps), weightKg: num(form.weightKg), rpe: num(form.rpe) },
      });
      setForm((f) => ({ ...f, exercise: "" }));
      lifts.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Registrar trabajo de fuerza">
        <form onSubmit={submit} className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <Field label="Fecha">
            <input className="input" type="date" required value={form.date} onChange={set("date")} />
          </Field>
          <Field label="Ejercicio" className="col-span-2">
            <input className="input" required value={form.exercise} onChange={set("exercise")} placeholder="Sentadilla" />
          </Field>
          <Field label="Grupo muscular">
            <select className="input" value={form.muscleGroup} onChange={set("muscleGroup")}>
              {MUSCLE_GROUPS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Series">
            <input className="input" inputMode="numeric" required value={form.sets} onChange={set("sets")} />
          </Field>
          <Field label="Reps">
            <input className="input" inputMode="numeric" required value={form.reps} onChange={set("reps")} />
          </Field>
          <Field label="Peso (kg)">
            <input className="input" inputMode="decimal" required value={form.weightKg} onChange={set("weightKg")} />
          </Field>
          <Field label="RPE">
            <input className="input" inputMode="decimal" value={form.rpe} onChange={set("rpe")} placeholder="8" />
          </Field>
          <button className="btn btn-primary col-span-2 md:col-span-4 lg:col-span-8">Añadir</button>
        </form>
        {error ? <div className="mt-3"><Alert kind="error">{error}</Alert></div> : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title={`Series por grupo muscular · semana del ${formatDate(weekStart)}`}
          actions={
            <div className="flex gap-1">
              <button className="btn btn-sm" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Semana anterior">←</button>
              <button className="btn btn-sm" onClick={() => setWeekOffset(0)}>Hoy</button>
              <button className="btn btn-sm" onClick={() => setWeekOffset((w) => Math.min(0, w + 1))} aria-label="Semana siguiente">→</button>
            </div>
          }
        >
          {volumes.length === 0 ? (
            <p className="muted py-6 text-center text-sm">Sin registros esta semana.</p>
          ) : (
            <>
              <BarsChart data={volumes.map((v) => ({ grupo: v.group, series: v.sets }))} xKey="grupo" series={[{ key: "series", label: "Series", color: 1 }]} reference={{ y: VOLUME_RANGE.optimalMax, label: `Máx. recomendado (${VOLUME_RANGE.optimalMax})` }} />
              <table className="table mt-3">
                <thead>
                  <tr>
                    <th>Grupo</th>
                    <th>Series</th>
                    <th>Tonelaje</th>
                    <th>Estado ({VOLUME_RANGE.min}–{VOLUME_RANGE.optimalMax} series)</th>
                  </tr>
                </thead>
                <tbody>
                  {volumes.map((v) => (
                    <tr key={v.group}>
                      <td className="font-medium">{v.group}</td>
                      <td>{v.sets}</td>
                      <td>{v.tonnage.toLocaleString("es-ES")} kg</td>
                      <td>{v.status === "óptimo" ? "✓ Óptimo" : v.status === "bajo" ? "↓ Bajo" : "↑ Alto"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>
        <Card title="Evolución de cargas · tonelaje semanal">
          <BarsChart data={trend} xKey="semana" series={[{ key: "tonelaje", label: "Tonelaje", color: 1 }]} unit="kg" />
          <p className="muted mt-2 text-xs">Tonelaje de la semana seleccionada: {totalTonnage(week).toLocaleString("es-ES")} kg.</p>
        </Card>
      </div>

      <Card title="Registros de la semana">
        <DataTable
          rows={week}
          onDelete={async (r) => {
            await api(`/api/gym/lifts?id=${r.id}`, { method: "DELETE" });
            lifts.reload();
          }}
          columns={[
            { header: "Fecha", cell: (r) => formatDate(r.date) },
            { header: "Ejercicio", cell: (r) => r.exercise },
            { header: "Grupo", cell: (r) => r.muscleGroup },
            { header: "Series × reps", cell: (r) => `${r.sets} × ${r.reps}` },
            { header: "Peso", cell: (r) => `${r.weightKg} kg` },
            { header: "RPE", cell: (r) => r.rpe ?? "—" },
          ]}
        />
      </Card>
    </div>
  );
}

function Rpe() {
  const [rpe, setRpe] = useState(8);
  const [reps, setReps] = useState(5);
  const [oneRm, setOneRm] = useState("120");
  const row = RPE_SCALE.find((r) => r.rpe === rpe) ?? RPE_SCALE[0];
  const pct = percentForRepsAtRpe(reps, rpe);
  const rm = num(oneRm) ?? 0;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Escala interactiva RPE / RIR">
        <div className="flex flex-wrap gap-1">
          {RPE_SCALE.map((r) => (
            <button key={r.rpe} type="button" onClick={() => setRpe(r.rpe)} aria-pressed={rpe === r.rpe} className={`btn btn-sm ${rpe === r.rpe ? "btn-primary" : ""}`}>
              {r.rpe}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-lg p-4" style={{ background: "var(--surface-2)" }}>
          <div className="text-3xl font-black">
            RPE {row.rpe} <span className="ink-2 text-lg font-semibold">· RIR {row.rir}</span>
          </div>
          <div className="mt-1 font-semibold">{row.label}</div>
          <p className="ink-2 mt-1 text-sm">{row.description}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label={`Repeticiones de la serie: ${reps}`}>
            <input type="range" min={1} max={12} value={reps} onChange={(e) => setReps(Number(e.target.value))} className="w-full" />
          </Field>
          <Field label="Tu 1RM (kg)">
            <input className="input" inputMode="decimal" value={oneRm} onChange={(e) => setOneRm(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="% 1RM estimado" value={round(pct, 1)} unit="%" />
          <Stat label="Carga sugerida" value={round((rm * pct) / 100 / 2.5, 0) * 2.5} unit="kg" hint={`${reps} reps a RPE ${rpe}`} />
        </div>
      </Card>
      <Card title="Tabla de referencia">
        <table className="table">
          <thead>
            <tr>
              <th>RPE</th>
              <th>RIR</th>
              <th>Sensación</th>
              <th>% 1RM a {reps} reps</th>
            </tr>
          </thead>
          <tbody>
            {RPE_SCALE.map((r) => (
              <tr key={r.rpe} className={r.rpe === rpe ? "font-semibold" : ""}>
                <td>{r.rpe}</td>
                <td>{r.rir}</td>
                <td>{r.label}</td>
                <td>{round(percentForRepsAtRpe(reps, r.rpe), 1)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const PRESETS = [
  { s: 60, label: "1:00 · Hipertrofia" },
  { s: 90, label: "1:30 · Accesorios" },
  { s: 180, label: "3:00 · Fuerza" },
  { s: 300, label: "5:00 · Fuerza máx. / potencia" },
];

function beep(times = 3) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.35;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    }
    setTimeout(() => void ctx.close(), times * 400 + 200);
  } catch {
    /* sin audio disponible: queda la alerta visual */
  }
}

function Timer() {
  const [duration, setDuration] = useState(180);
  const [remaining, setRemaining] = useState(180);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [sound, setSound] = useState(true);
  const endRef = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        setDone(true);
        if (sound) beep();
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running, sound]);

  const start = (seconds = remaining > 0 ? remaining : duration) => {
    endRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setDone(false);
    setRunning(true);
  };
  const preset = (s: number) => {
    setDuration(s);
    start(s);
  };
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const progress = duration > 0 ? (1 - remaining / duration) * 100 : 0;

  return (
    <Card title="Temporizador de descanso">
      <div className={`rounded-xl p-6 text-center transition ${done ? "animate-pulse" : ""}`} style={{ background: done ? "var(--good)" : "var(--surface-2)", color: done ? "#ffffff" : "var(--ink)" }} role="timer" aria-live="polite">
        <div className="text-6xl font-black tabular-nums sm:text-7xl">
          {mm}:{ss}
        </div>
        <div className="mt-1 text-sm font-semibold">{done ? "¡Descanso terminado! A por la siguiente serie." : running ? "Descansando…" : "Listo"}</div>
        <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full" style={{ background: "var(--axis)" }}>
          <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {PRESETS.map((p) => (
          <button key={p.s} className="btn" onClick={() => preset(p.s)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-center gap-3">
        <Field label="Personalizado (segundos)">
          <input
            className="input w-32"
            inputMode="numeric"
            value={duration}
            onChange={(e) => {
              const v = Math.max(0, Math.min(3600, Math.round(num(e.target.value) ?? 0)));
              setDuration(v);
              if (!running) setRemaining(v);
            }}
          />
        </Field>
        {running ? (
          <button className="btn" onClick={() => setRunning(false)}>Pausar</button>
        ) : (
          <button className="btn btn-primary" onClick={() => start()} disabled={duration === 0}>Iniciar</button>
        )}
        <button
          className="btn"
          onClick={() => {
            setRunning(false);
            setDone(false);
            setRemaining(duration);
          }}
        >
          Reiniciar
        </button>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Alerta sonora
        </label>
      </div>
    </Card>
  );
}

function Prs() {
  const prs = useFetch<Pr[]>("/api/gym/prs");
  const [form, setForm] = useState({ date: todayInput(), category: "STRENGTH", exercise: PR_EXERCISES.STRENGTH[0], value: "", unit: "kg", reps: "1", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const all = useMemo(() => prs.data ?? [], [prs.data]);

  const best = useMemo(() => {
    const map = new Map<string, Pr>();
    for (const p of all) {
      const cur = map.get(p.exercise);
      if (!cur || p.value > cur.value) map.set(p.exercise, p);
    }
    return [...map.values()].sort((a, b) => a.category.localeCompare(b.category) || a.exercise.localeCompare(b.exercise));
  }, [all]);
  const current = selected ?? best[0]?.exercise ?? null;
  const history = all.filter((p) => p.exercise === current).sort((a, b) => a.date.localeCompare(b.date));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/gym/prs", { body: { ...form, value: num(form.value), reps: num(form.reps) ?? 1 } });
      setSelected(form.exercise);
      setForm((f) => ({ ...f, value: "", notes: "" }));
      prs.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Registrar marca de gimnasio">
        <form onSubmit={submit} className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <Field label="Fecha">
            <input className="input" type="date" required value={form.date} onChange={set("date")} />
          </Field>
          <Field label="Categoría">
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, exercise: PR_EXERCISES[e.target.value][0], unit: e.target.value === "BALLISTIC" ? "cm" : "kg" }))}
            >
              {PR_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Ejercicio" className="col-span-2">
            <input className="input" required list="pr-exercises" value={form.exercise} onChange={set("exercise")} />
            <datalist id="pr-exercises">
              {PR_EXERCISES[form.category].map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </Field>
          <Field label="Marca">
            <input className="input" inputMode="decimal" required value={form.value} onChange={set("value")} />
          </Field>
          <Field label="Unidad">
            <select className="input" value={form.unit} onChange={set("unit")}>
              <option value="kg">kg</option>
              <option value="cm">cm</option>
              <option value="m">m</option>
              <option value="W">W</option>
            </select>
          </Field>
          <Field label="Reps">
            <input className="input" inputMode="numeric" value={form.reps} onChange={set("reps")} />
          </Field>
          <Field label="Notas" className="col-span-2 md:col-span-3 lg:col-span-6">
            <input className="input" value={form.notes} onChange={set("notes")} />
          </Field>
          <button className="btn btn-primary self-end">Guardar</button>
        </form>
        {error ? <div className="mt-3"><Alert kind="error">{error}</Alert></div> : null}
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Mejores marcas (PR)">
          <DataTable
            rows={best}
            empty="Aún no has registrado récords."
            columns={[
              { header: "Ejercicio", cell: (r) => <button className="text-left font-medium underline-offset-2 hover:underline" onClick={() => setSelected(r.exercise)}>{r.exercise}</button> },
              { header: "Categoría", cell: (r) => PR_CATEGORIES.find((c) => c.key === r.category)?.label ?? r.category },
              { header: "PR", cell: (r) => <strong>{r.value} {r.unit}{r.reps > 1 ? ` × ${r.reps}` : ""}</strong> },
              { header: "Fecha", cell: (r) => formatDate(r.date) },
            ]}
          />
        </Card>
        <Card title={current ? `Progresión · ${current}` : "Progresión"}>
          {history.length === 0 ? (
            <p className="muted py-6 text-center text-sm">Selecciona un ejercicio para ver su evolución.</p>
          ) : (
            <>
              <LinesChart data={history.map((h) => ({ fecha: formatDate(h.date), marca: h.value }))} xKey="fecha" series={[{ key: "marca", label: current ?? "", color: 1 }]} unit={history[0].unit} />
              <DataTable
                rows={[...history].reverse()}
                onDelete={async (r) => {
                  await api(`/api/gym/prs?id=${r.id}`, { method: "DELETE" });
                  prs.reload();
                }}
                columns={[
                  { header: "Fecha", cell: (r) => formatDate(r.date) },
                  { header: "Marca", cell: (r) => `${r.value} ${r.unit}${r.reps > 1 ? ` × ${r.reps}` : ""}` },
                  { header: "Notas", cell: (r) => r.notes || "—" },
                ]}
              />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
