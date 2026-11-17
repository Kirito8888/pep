"use client";

import { useState, type FormEvent } from "react";
import { BarsChart } from "@/components/charts";
import { Alert, Card, DataTable, Field, PageHeader, Stat, Tabs } from "@/components/ui";
import {
  ENDURANCE_EVENTS,
  ENDURANCE_TYPES,
  acwr,
  estimateMaxHr,
  hrZones,
  lapSplits,
  pace,
  paceZones,
  riegel,
  summarizeFartlek,
  summarizeIntervals,
  timeForVdot,
  vdot,
  type FartlekSegment,
  type IntervalRep,
} from "@/lib/athletics/endurance";
import { STEEPLE_HEIGHTS, STEEPLE_INFO } from "@/lib/athletics/hurdles";
import { api, errorMessage, num, useFetch } from "@/lib/client";
import { addDays, formatDate, mondayOf, todayInput, toDateInput } from "@/lib/dates";
import { formatTime, parseTime } from "@/lib/format";

type Tab = "pace" | "predict" | "hr" | "zones" | "builder" | "acwr";

interface Me {
  restingHr: number | null;
  maxHr: number | null;
}
interface EnduranceLog {
  id: string;
  date: string;
  type: string;
  distanceKm: number;
  durationMin: number;
  rpe: number;
  notes: string;
}

const paceStr = (secPerUnit: number) => formatTime(secPerUnit, 0);

export default function EndurancePage() {
  const [tab, setTab] = useState<Tab>("pace");
  const [eventKey, setEventKey] = useState("5000m");
  const [time, setTime] = useState("18:30");
  const event = ENDURANCE_EVENTS.find((e) => e.key === eventKey) ?? ENDURANCE_EVENTS[0];
  const seconds = parseTime(time);
  const valid = Number.isFinite(seconds) && seconds > 0;

  return (
    <div>
      <PageHeader title="Sector D · Medio fondo, fondo, obstáculos y marcha" subtitle="Ritmos, pasos por vuelta, predicción de marcas, zonas de FC y de ritmo, constructor de series y control de carga (ACWR)." />
      <Card className="mb-4">
        <div className="grid max-w-xl grid-cols-2 gap-3">
          <Field label="Prueba de referencia">
            <select className="input" value={eventKey} onChange={(e) => setEventKey(e.target.value)}>
              {["Medio fondo", "Fondo", "Obstáculos", "Marcha", "Ruta"].map((g) => (
                <optgroup key={g} label={g}>
                  {ENDURANCE_EVENTS.filter((e) => e.group === g).map((e) => (
                    <option key={e.key} value={e.key}>{e.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Marca" hint="m:ss o h:mm:ss">
            <input className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
      </Card>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "pace", label: "Ritmos y vueltas" },
          { key: "predict", label: "Predicción (Riegel + VDOT)" },
          { key: "hr", label: "Zonas de FC" },
          { key: "zones", label: "Zonas de ritmo Z1–Z5" },
          { key: "builder", label: "Series y fartlek" },
          { key: "acwr", label: "Carga aguda:crónica" },
        ]}
      />
      {!valid && tab !== "hr" && tab !== "acwr" && tab !== "builder" ? <Alert kind="error">Introduce una marca válida (por ejemplo 18:30).</Alert> : null}
      {tab === "pace" && valid ? <PaceTab meters={event.meters} seconds={seconds} eventKey={event.key} group={event.group} /> : null}
      {tab === "predict" && valid ? <Predict meters={event.meters} seconds={seconds} walk={event.group === "Marcha"} /> : null}
      {tab === "hr" ? <HrTab /> : null}
      {tab === "zones" && valid ? <Zones meters={event.meters} seconds={seconds} /> : null}
      {tab === "builder" ? <Builder /> : null}
      {tab === "acwr" ? <AcwrTab /> : null}
    </div>
  );
}

function PaceTab({ meters, seconds, eventKey, group }: { meters: number; seconds: number; eventKey: string; group: string }) {
  const p = pace(meters, seconds);
  const every = meters <= 10000 ? 400 : 1000;
  const splits = lapSplits(meters, seconds, every).filter((_, i, arr) => arr.length <= 30 || i % Math.ceil(arr.length / 30) === 0 || i === arr.length - 1);
  const steeple = STEEPLE_INFO.find((s) => s.key === eventKey);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Ritmo" value={paceStr(p.secPerKm)} unit="min/km" />
        <Stat label="Ritmo" value={paceStr(p.secPerMile)} unit="min/milla" />
        <Stat label="Paso por vuelta (400 m)" value={formatTime(p.lap400, 1)} />
        <Stat label="Velocidad" value={p.speedKmh.toFixed(2)} unit="km/h" />
        <Stat label="Velocidad" value={p.speedMs.toFixed(2)} unit="m/s" />
      </div>
      {steeple ? (
        <Alert>
          <strong>{steeple.label}:</strong> {steeple.barriers} obstáculos secos + {steeple.waterJumps} pasos de ría ({steeple.laps}). Altura: {STEEPLE_HEIGHTS.M} m hombres / {STEEPLE_HEIGHTS.F} m mujeres. Cada obstáculo cuesta ≈ 0,4–0,6 s frente a la carrera lisa y la ría ≈ 1 s: el ritmo liso equivalente es más rápido que el mostrado.
        </Alert>
      ) : null}
      {group === "Marcha" ? <Alert>Marcha: mantén contacto permanente con el suelo y la rodilla extendida desde el apoyo hasta la vertical. Los pasos por vuelta sirven para controlar el ritmo en pista.</Alert> : null}
      <Card title={`Tiempos de paso cada ${every} m (ritmo constante)`}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-5">
          {splits.map((s) => (
            <div key={s.distance} className="flex justify-between border-b py-1" style={{ borderColor: "var(--border)" }}>
              <span className="ink-2">{Math.round(s.distance).toLocaleString("es-ES")} m</span>
              <span className="font-semibold">{formatTime(s.time, 0)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Predict({ meters, seconds, walk }: { meters: number; seconds: number; walk: boolean }) {
  const v = vdot(meters, seconds);
  const targets = ENDURANCE_EVENTS.filter((e) => (walk ? e.group === "Marcha" : e.group !== "Marcha" && e.group !== "Obstáculos"));
  return (
    <Card title="Predicción de marcas">
      <div className="mb-4 grid max-w-md grid-cols-2 gap-3">
        <Stat label="VDOT (Daniels)" value={walk ? "—" : v.toFixed(1)} hint={walk ? "No aplicable a la marcha" : "Índice de rendimiento aeróbico"} />
        <Stat label="Exponente de Riegel" value="1,06" hint="T2 = T1 · (D2/D1)^1,06" />
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Prueba</th>
            <th>Riegel</th>
            {!walk ? <th>VDOT</th> : null}
            <th>Ritmo (Riegel)</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((e) => {
            const r = riegel(seconds, meters, e.meters);
            return (
              <tr key={e.key} className={Math.abs(e.meters - meters) < 1 ? "font-semibold" : ""}>
                <td>{e.label}</td>
                <td>{formatTime(r, r < 600 ? 1 : 0)}</td>
                {!walk ? <td>{formatTime(timeForVdot(v, e.meters), e.meters < 3000 ? 1 : 0)}</td> : null}
                <td>{paceStr(pace(e.meters, r).secPerKm)} /km</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted mt-3 text-xs">
        Riegel asume el mismo nivel de entrenamiento en ambas distancias y es fiable entre distancias próximas (relación ≤ 4:1). VDOT pondera el coste de oxígeno y la fracción de VO2máx sostenible según la duración. Las predicciones hacia distancias mucho más largas suelen ser optimistas si falta volumen.
      </p>
    </Card>
  );
}

function HrTab() {
  const me = useFetch<Me>("/api/me");
  const [maxHr, setMaxHr] = useState<string | null>(null);
  const [resting, setResting] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const maxVal = maxHr ?? (me.data?.maxHr != null ? String(me.data.maxHr) : "190");
  const restVal = resting ?? (me.data?.restingHr != null ? String(me.data.restingHr) : "50");
  const max = num(maxVal) ?? 0;
  const rest = num(restVal);
  const zones = max > 0 ? hrZones(max, rest) : [];

  async function save() {
    setSaved(null);
    try {
      await api("/api/me", { method: "PATCH", body: { maxHr: Math.round(max), restingHr: rest != null ? Math.round(rest) : null } });
      setSaved("Frecuencias guardadas en tu perfil.");
    } catch (err) {
      setSaved(errorMessage(err));
    }
  }

  return (
    <Card title="Zonas de frecuencia cardíaca">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Field label="FC máxima (ppm)">
          <input className="input" inputMode="numeric" value={maxVal} onChange={(e) => setMaxHr(e.target.value)} />
        </Field>
        <Field label="FC en reposo (ppm)">
          <input className="input" inputMode="numeric" value={restVal} onChange={(e) => setResting(e.target.value)} />
        </Field>
        <Field label="Edad (para estimar FCmáx)" hint="Tanaka: 208 − 0,7 · edad">
          <input className="input" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
        </Field>
        <button className="btn self-end" disabled={!num(age)} onClick={() => setMaxHr(String(estimateMaxHr(num(age) ?? 30)))}>
          Estimar FCmáx
        </button>
        <button className="btn btn-primary self-end" onClick={save} disabled={max < 100}>
          Guardar en mi perfil
        </button>
      </div>
      {saved ? <div className="mt-3"><Alert>{saved}</Alert></div> : null}
      <table className="table mt-4">
        <thead>
          <tr>
            <th>Zona</th>
            <th>Nombre</th>
            <th>% intensidad</th>
            <th>% FCmáx</th>
            <th>Karvonen (FC de reserva)</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.zone}>
              <td className="font-bold">{z.zone}</td>
              <td>{z.name}</td>
              <td>{z.pctLo}–{z.pctHi} %</td>
              <td>{z.maxLo}–{z.maxHi} ppm</td>
              <td>{z.karvonenLo != null ? `${z.karvonenLo}–${z.karvonenHi} ppm` : "Indica la FC en reposo"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted mt-3 text-xs">Karvonen: FC objetivo = FC reposo + % · (FCmáx − FC reposo). Es más preciso que el % de FCmáx en atletas con FC de reposo baja.</p>
    </Card>
  );
}

function Zones({ meters, seconds }: { meters: number; seconds: number }) {
  const v = vdot(meters, seconds);
  const zones = paceZones(v);
  return (
    <Card title={`Zonas de ritmo (VDOT ${v.toFixed(1)})`}>
      <table className="table">
        <thead>
          <tr>
            <th>Zona</th>
            <th>Nombre</th>
            <th>Ritmo (min/km)</th>
            <th>Vuelta de 400 m</th>
            <th>Uso</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.zone}>
              <td className="font-bold">{z.zone}</td>
              <td>{z.name}</td>
              <td className="whitespace-nowrap">{paceStr(z.slow)} – {paceStr(z.fast)}</td>
              <td className="whitespace-nowrap">{formatTime(z.slow * 0.4, 0)} – {formatTime(z.fast * 0.4, 0)}</td>
              <td className="ink-2 text-xs">{z.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted mt-3 text-xs">Zonas derivadas del % de VO2máx (Daniels). No son válidas para la marcha: en ese caso usa las zonas de FC.</p>
    </Card>
  );
}

function Builder() {
  const [sets, setSets] = useState<{ reps: string; distanceM: string; pace: string; recoverySec: string; recoveryJogM: string }[]>([
    { reps: "6", distanceM: "1000", pace: "3:30", recoverySec: "120", recoveryJogM: "200" },
    { reps: "4", distanceM: "200", pace: "3:00", recoverySec: "90", recoveryJogM: "0" },
  ]);
  const [fart, setFart] = useState<{ reps: string; fastSec: string; fastPace: string; slowSec: string; slowPace: string }[]>([{ reps: "8", fastSec: "120", fastPace: "3:40", slowSec: "60", slowPace: "5:00" }]);
  const parsed: IntervalRep[] = sets
    .map((s) => ({ reps: Math.round(num(s.reps) ?? 0), distanceM: num(s.distanceM) ?? 0, paceSecKm: parseTime(s.pace), recoverySec: num(s.recoverySec) ?? 0, recoveryJogM: num(s.recoveryJogM) ?? 0 }))
    .filter((s) => s.reps > 0 && s.distanceM > 0 && Number.isFinite(s.paceSecKm));
  const sum = summarizeIntervals(parsed);
  const fparsed: FartlekSegment[] = fart
    .map((s) => ({ reps: Math.round(num(s.reps) ?? 0), fastSec: num(s.fastSec) ?? 0, fastPaceSecKm: parseTime(s.fastPace), slowSec: num(s.slowSec) ?? 0, slowPaceSecKm: parseTime(s.slowPace) }))
    .filter((s) => s.reps > 0 && Number.isFinite(s.fastPaceSecKm) && Number.isFinite(s.slowPaceSecKm));
  const fsum = summarizeFartlek(fparsed);
  const upd = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, i: number, k: keyof T, v: string) => setter((arr) => arr.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Constructor de series" actions={<button className="btn btn-sm" onClick={() => setSets((s) => [...s, { reps: "4", distanceM: "400", pace: "3:20", recoverySec: "90", recoveryJogM: "0" }])}>+ Bloque</button>}>
        <div className="space-y-2">
          {sets.map((s, i) => (
            <div key={i} className="grid grid-cols-6 items-end gap-2">
              <Field label="Reps"><input className="input" value={s.reps} onChange={(e) => upd(setSets, i, "reps", e.target.value)} /></Field>
              <Field label="Metros"><input className="input" value={s.distanceM} onChange={(e) => upd(setSets, i, "distanceM", e.target.value)} /></Field>
              <Field label="Ritmo /km"><input className="input" value={s.pace} onChange={(e) => upd(setSets, i, "pace", e.target.value)} /></Field>
              <Field label="Rec. (s)"><input className="input" value={s.recoverySec} onChange={(e) => upd(setSets, i, "recoverySec", e.target.value)} /></Field>
              <Field label="Trote (m)"><input className="input" value={s.recoveryJogM} onChange={(e) => upd(setSets, i, "recoveryJogM", e.target.value)} /></Field>
              <button className="btn btn-danger" onClick={() => setSets((arr) => arr.filter((_, j) => j !== i))} aria-label="Eliminar bloque">✕</button>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Volumen de calidad" value={(sum.workMeters / 1000).toFixed(2)} unit="km" />
          <Stat label="Volumen total" value={(sum.totalMeters / 1000).toFixed(2)} unit="km" />
          <Stat label="Duración" value={formatTime(sum.totalSeconds, 0)} />
          <Stat label="Densidad" value={sum.density ? sum.density.toFixed(2) : "—"} hint="Trabajo : recuperación" />
        </div>
        <table className="table mt-3">
          <thead>
            <tr>
              <th>Bloque</th>
              <th>Tiempo por repetición</th>
              <th>Paso por 400 m</th>
            </tr>
          </thead>
          <tbody>
            {sum.rows.map((r, i) => (
              <tr key={i}>
                <td className="font-medium">{r.label}</td>
                <td>{formatTime(r.repTime, 1)}</td>
                <td>{formatTime(r.lap400, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Constructor de fartlek" actions={<button className="btn btn-sm" onClick={() => setFart((s) => [...s, { reps: "5", fastSec: "60", fastPace: "3:30", slowSec: "60", slowPace: "5:00" }])}>+ Bloque</button>}>
        <div className="space-y-2">
          {fart.map((s, i) => (
            <div key={i} className="grid grid-cols-6 items-end gap-2">
              <Field label="Reps"><input className="input" value={s.reps} onChange={(e) => upd(setFart, i, "reps", e.target.value)} /></Field>
              <Field label="Rápido (s)"><input className="input" value={s.fastSec} onChange={(e) => upd(setFart, i, "fastSec", e.target.value)} /></Field>
              <Field label="Ritmo /km"><input className="input" value={s.fastPace} onChange={(e) => upd(setFart, i, "fastPace", e.target.value)} /></Field>
              <Field label="Suave (s)"><input className="input" value={s.slowSec} onChange={(e) => upd(setFart, i, "slowSec", e.target.value)} /></Field>
              <Field label="Ritmo /km"><input className="input" value={s.slowPace} onChange={(e) => upd(setFart, i, "slowPace", e.target.value)} /></Field>
              <button className="btn btn-danger" onClick={() => setFart((arr) => arr.filter((_, j) => j !== i))} aria-label="Eliminar bloque">✕</button>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Duración" value={formatTime(fsum.totalSeconds, 0)} />
          <Stat label="Distancia" value={(fsum.totalMeters / 1000).toFixed(2)} unit="km" />
          <Stat label="A ritmo rápido" value={(fsum.fastMeters / 1000).toFixed(2)} unit="km" />
          <Stat label="Ritmo medio" value={fsum.avgPaceSecKm ? paceStr(fsum.avgPaceSecKm) : "—"} unit="/km" />
        </div>
      </Card>
    </div>
  );
}

function AcwrTab() {
  const logs = useFetch<EnduranceLog[]>("/api/endurance/logs");
  const [f, setF] = useState({ date: todayInput(), type: "EASY", distanceKm: "10", durationMin: "50", rpe: "4", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const rows = logs.data ?? [];
  const ratio = acwr(rows.map((r) => ({ date: r.date, load: r.durationMin * r.rpe })), addDays(new Date(), 0));
  const weekStart = mondayOf(new Date());
  const trend = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(weekStart, (i - 7) * 7);
    const end = addDays(start, 7);
    const w = rows.filter((r) => new Date(r.date) >= start && new Date(r.date) < end);
    return { semana: toDateInput(start).slice(5), carga: Math.round(w.reduce((a, r) => a + r.durationMin * r.rpe, 0)), km: Math.round(w.reduce((a, r) => a + r.distanceKm, 0) * 10) / 10 };
  });
  const kind = ratio.status === "óptimo" ? "success" : ratio.status === "riesgo alto" ? "red" : ratio.status === "sin datos" ? "info" : "amber";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/endurance/logs", { body: { date: f.date, type: f.type, distanceKm: num(f.distanceKm), durationMin: num(f.durationMin), rpe: num(f.rpe), notes: f.notes } });
      logs.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Registrar sesión">
        <form onSubmit={submit} className="grid grid-cols-2 gap-3 md:grid-cols-7">
          <Field label="Fecha"><input className="input" type="date" required value={f.date} onChange={set("date")} /></Field>
          <Field label="Tipo">
            <select className="input" value={f.type} onChange={set("type")}>
              {ENDURANCE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Distancia (km)"><input className="input" inputMode="decimal" required value={f.distanceKm} onChange={set("distanceKm")} /></Field>
          <Field label="Duración (min)"><input className="input" inputMode="decimal" required value={f.durationMin} onChange={set("durationMin")} /></Field>
          <Field label="RPE (1–10)"><input className="input" inputMode="numeric" required value={f.rpe} onChange={set("rpe")} /></Field>
          <Field label="Notas"><input className="input" value={f.notes} onChange={set("notes")} /></Field>
          <button className="btn btn-primary self-end">Añadir</button>
        </form>
        {error ? <div className="mt-3"><Alert kind="error">{error}</Alert></div> : null}
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Ratio de carga aguda:crónica (ACWR)">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Aguda (7 días)" value={Math.round(ratio.acute)} unit="UA" />
            <Stat label="Crónica (media 28 días)" value={Math.round(ratio.chronic)} unit="UA" />
            <Stat label="Ratio" value={ratio.ratio != null ? ratio.ratio.toFixed(2) : "—"} hint={ratio.status} />
          </div>
          <div className="mt-3"><Alert kind={kind}>{ratio.message}</Alert></div>
          <p className="muted mt-3 text-xs">Carga de sesión (sRPE) = minutos × RPE, en unidades arbitrarias (UA). Zona óptima 0,8–1,3.</p>
        </Card>
        <Card title="Carga semanal (sRPE)">
          <BarsChart data={trend} xKey="semana" series={[{ key: "carga", label: "Carga", color: 1 }]} unit="UA" height={200} />
          <p className="muted mt-2 text-xs">Kilómetros por semana: {trend.map((t) => `${t.semana}: ${t.km}`).join(" · ")}</p>
        </Card>
      </div>
      <Card title="Historial">
        <DataTable
          rows={rows.slice(0, 40)}
          onDelete={async (r) => {
            await api(`/api/endurance/logs?id=${r.id}`, { method: "DELETE" });
            logs.reload();
          }}
          columns={[
            { header: "Fecha", cell: (r) => formatDate(r.date) },
            { header: "Tipo", cell: (r) => ENDURANCE_TYPES.find((t) => t.key === r.type)?.label ?? r.type },
            { header: "Distancia", cell: (r) => `${r.distanceKm} km` },
            { header: "Duración", cell: (r) => `${r.durationMin} min` },
            { header: "Ritmo", cell: (r) => (r.distanceKm > 0 ? `${paceStr((r.durationMin * 60) / r.distanceKm)} /km` : "—") },
            { header: "RPE", cell: (r) => r.rpe },
            { header: "Carga", cell: (r) => `${Math.round(r.durationMin * r.rpe)} UA` },
          ]}
        />
      </Card>
    </div>
  );
}
