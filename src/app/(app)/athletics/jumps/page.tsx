"use client";

import { useState, type FormEvent } from "react";
import { BarsChart } from "@/components/charts";
import { Alert, Card, DataTable, Field, Light, PageHeader, Stat, Tabs } from "@/components/ui";
import { LEVELS } from "@/lib/athletics/events";
import { lightFor } from "@/lib/athletics/implements";
import { JUMP_EVENTS, PLYO_LIMITS, PLYO_TYPES, PLYO_WEIGHT, analyzeApproach, analyzePole } from "@/lib/athletics/jumps";
import { api, errorMessage, num, useFetch } from "@/lib/client";
import { addDays, formatDate, mondayOf, todayInput, toDateInput } from "@/lib/dates";

type Tab = "approach" | "plyo" | "pole";

interface Approach {
  id: string;
  date: string;
  event: string;
  name: string;
  distanceM: number;
  strides: number;
  midMarkM: number | null;
  midMarkStride: number | null;
  wind: number | null;
  adjustmentCm: number | null;
  notes: string;
}
interface Plyo {
  id: string;
  date: string;
  type: string;
  contacts: number;
  intensity: string;
  notes: string;
}
interface Pole {
  id: string;
  name: string;
  lengthM: number;
  flexLbs: number;
  gripHeightM: number;
  standardsCm: number;
  approachStrides: number | null;
  notes: string;
}

const eventLabel = (k: string) => JUMP_EVENTS.find((e) => e.key === k)?.label ?? k;

export default function JumpsPage() {
  const [tab, setTab] = useState<Tab>("approach");
  return (
    <div>
      <PageHeader title="Sector B · Saltos" subtitle="Longitud, triple, altura y pértiga: talonamientos con ajuste por viento, contactos pliométricos y configuración de pértigas." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "approach", label: "Talonamientos" },
          { key: "plyo", label: "Contactos pliométricos" },
          { key: "pole", label: "Configurador de pértiga" },
        ]}
      />
      {tab === "approach" ? <ApproachTab /> : null}
      {tab === "plyo" ? <PlyoTab /> : null}
      {tab === "pole" ? <PoleTab /> : null}
    </div>
  );
}

function ApproachTab() {
  const list = useFetch<Approach[]>("/api/jumps/approaches");
  const [f, setF] = useState({ date: todayInput(), event: "LJ", name: "Carrera completa", distanceM: "38.50", strides: "18", midMarkM: "", midMarkStride: "", wind: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const analysis = analyzeApproach(num(f.distanceM) ?? 0, Math.round(num(f.strides) ?? 0), num(f.wind));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/jumps/approaches", {
        body: {
          date: f.date,
          event: f.event,
          name: f.name,
          distanceM: num(f.distanceM),
          strides: num(f.strides),
          midMarkM: num(f.midMarkM),
          midMarkStride: num(f.midMarkStride),
          wind: num(f.wind),
          adjustmentCm: analysis.windAdjustmentCm,
          notes: f.notes,
        },
      });
      list.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Gestor de talonamiento" className="xl:col-span-2">
          <form onSubmit={submit} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Fecha">
              <input className="input" type="date" required value={f.date} onChange={set("date")} />
            </Field>
            <Field label="Prueba">
              <select className="input" value={f.event} onChange={set("event")}>
                {JUMP_EVENTS.map((e) => (
                  <option key={e.key} value={e.key}>{e.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Nombre de la carrera" className="col-span-2">
              <input className="input" required value={f.name} onChange={set("name")} />
            </Field>
            <Field label="Distancia exacta (m)" hint="Con centímetros: 38.50">
              <input className="input" inputMode="decimal" required value={f.distanceM} onChange={set("distanceM")} />
            </Field>
            <Field label="Nº de apoyos">
              <input className="input" inputMode="numeric" required value={f.strides} onChange={set("strides")} />
            </Field>
            <Field label="Marca intermedia (m)" hint="Distancia a la tabla / listón.">
              <input className="input" inputMode="decimal" value={f.midMarkM} onChange={set("midMarkM")} />
            </Field>
            <Field label="Apoyo de la marca intermedia">
              <input className="input" inputMode="numeric" value={f.midMarkStride} onChange={set("midMarkStride")} placeholder="6" />
            </Field>
            <Field label="Viento (m/s)" hint="+ a favor, − en contra.">
              <input className="input" inputMode="decimal" value={f.wind} onChange={set("wind")} placeholder="+1.2" />
            </Field>
            <Field label="Notas" className="md:col-span-2">
              <input className="input" value={f.notes} onChange={set("notes")} />
            </Field>
            <button className="btn btn-primary self-end">Guardar talonamiento</button>
          </form>
          {error ? <div className="mt-3"><Alert kind="error">{error}</Alert></div> : null}
        </Card>
        <Card title="Análisis">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Zancada media" value={analysis.avgStride.toFixed(2)} unit="m" />
            <Stat label="Ajuste por viento" value={`${analysis.windAdjustmentCm > 0 ? "+" : ""}${analysis.windAdjustmentCm}`} unit="cm" />
          </div>
          <div className="mt-3">
            <Stat label="Marca corregida" value={analysis.adjustedDistance.toFixed(2)} unit="m" />
          </div>
          <p className="ink-2 mt-3 text-sm">{analysis.advice}</p>
          <p className="muted mt-2 text-xs">Regla práctica: ≈ 0,5 cm por apoyo y por cada m/s. Confírmalo siempre con 2–3 carreras de comprobación.</p>
        </Card>
      </div>
      <Card title="Mis talonamientos">
        <DataTable
          rows={list.data ?? []}
          onDelete={async (r) => {
            await api(`/api/jumps/approaches?id=${r.id}`, { method: "DELETE" });
            list.reload();
          }}
          columns={[
            { header: "Fecha", cell: (r) => formatDate(r.date) },
            { header: "Prueba", cell: (r) => eventLabel(r.event) },
            { header: "Carrera", cell: (r) => <span className="font-medium">{r.name}</span> },
            { header: "Distancia", cell: (r) => `${r.distanceM.toFixed(2)} m` },
            { header: "Apoyos", cell: (r) => r.strides },
            { header: "Marca intermedia", cell: (r) => (r.midMarkM != null ? `${r.midMarkM.toFixed(2)} m${r.midMarkStride ? ` (apoyo ${r.midMarkStride})` : ""}` : "—") },
            { header: "Viento", cell: (r) => (r.wind != null ? `${r.wind > 0 ? "+" : ""}${r.wind} m/s` : "—") },
            { header: "Ajuste", cell: (r) => (r.adjustmentCm ? `${r.adjustmentCm > 0 ? "+" : ""}${r.adjustmentCm} cm` : "—") },
            { header: "Notas", cell: (r) => r.notes || "—" },
          ]}
        />
      </Card>
    </div>
  );
}

function PlyoTab() {
  const list = useFetch<Plyo[]>("/api/jumps/plyo");
  const [f, setF] = useState({ date: todayInput(), type: "DROP_JUMP", contacts: "30", intensity: "HIGH", notes: "" });
  const [level, setLevel] = useState("INTERMEDIATE");
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const typeLabel = (k: string) => PLYO_TYPES.find((t) => t.key === k)?.label ?? k;
  const rows = list.data ?? [];
  const weekStart = mondayOf(new Date());
  const week = rows.filter((r) => new Date(r.date) >= weekStart && new Date(r.date) < addDays(weekStart, 7));
  const contacts = week.reduce((a, r) => a + r.contacts, 0);
  const weighted = Math.round(week.reduce((a, r) => a + r.contacts * (PLYO_WEIGHT[r.intensity] ?? 1), 0));
  const limits = PLYO_LIMITS[level];
  const light = lightFor(weighted, limits);
  const trend = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(weekStart, (i - 7) * 7);
    const end = addDays(start, 7);
    const w = rows.filter((r) => new Date(r.date) >= start && new Date(r.date) < end);
    const sum = (k: string) => w.filter((r) => r.intensity === k).reduce((a, r) => a + r.contacts, 0);
    return { semana: toDateInput(start).slice(5), baja: sum("LOW"), media: sum("MEDIUM"), alta: sum("HIGH") };
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/jumps/plyo", { body: { date: f.date, type: f.type, contacts: num(f.contacts), intensity: f.intensity, notes: f.notes } });
      list.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Registrar contactos">
        <form onSubmit={submit} className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Field label="Fecha">
            <input className="input" type="date" required value={f.date} onChange={set("date")} />
          </Field>
          <Field label="Ejercicio" className="col-span-2">
            <select
              className="input"
              value={f.type}
              onChange={(e) => setF((s) => ({ ...s, type: e.target.value, intensity: PLYO_TYPES.find((t) => t.key === e.target.value)?.intensity ?? "MEDIUM" }))}
            >
              {PLYO_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Contactos">
            <input className="input" inputMode="numeric" required value={f.contacts} onChange={set("contacts")} />
          </Field>
          <Field label="Intensidad">
            <select className="input" value={f.intensity} onChange={set("intensity")}>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
            </select>
          </Field>
          <button className="btn btn-primary self-end">Añadir</button>
        </form>
        {error ? <div className="mt-3"><Alert kind="error">{error}</Alert></div> : null}
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Semana actual">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Contactos totales" value={contacts} />
            <Stat label="Carga ponderada" value={weighted} hint="Baja ×0,5 · Media ×1 · Alta ×1,5" />
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <Field label="Nivel del atleta">
              <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l.key} value={l.key}>{l.label}</option>
                ))}
              </select>
            </Field>
            <div className="pb-2">
              <Light status={light} label={`Ámbar ≥ ${limits[0]} · Rojo ≥ ${limits[1]}`} />
            </div>
          </div>
          {light !== "green" ? (
            <div className="mt-3">
              <Alert kind={light}>Volumen pliométrico {light === "red" ? "excesivo" : "elevado"}: riesgo de sobrecarga del tendón rotuliano y aquíleo. Reduce drop jumps y batidas hasta la próxima semana.</Alert>
            </div>
          ) : null}
        </Card>
        <Card title="Contactos semanales por intensidad">
          <BarsChart
            data={trend}
            xKey="semana"
            stacked
            series={[
              { key: "baja", label: "Baja", color: 3 },
              { key: "media", label: "Media", color: 4 },
              { key: "alta", label: "Alta", color: 8 },
            ]}
          />
        </Card>
      </div>
      <Card title="Historial">
        <DataTable
          rows={rows.slice(0, 40)}
          onDelete={async (r) => {
            await api(`/api/jumps/plyo?id=${r.id}`, { method: "DELETE" });
            list.reload();
          }}
          columns={[
            { header: "Fecha", cell: (r) => formatDate(r.date) },
            { header: "Ejercicio", cell: (r) => typeLabel(r.type) },
            { header: "Contactos", cell: (r) => r.contacts },
            { header: "Intensidad", cell: (r) => ({ LOW: "Baja", MEDIUM: "Media", HIGH: "Alta" })[r.intensity] ?? r.intensity },
          ]}
        />
      </Card>
    </div>
  );
}

function PoleTab() {
  const list = useFetch<Pole[]>("/api/jumps/poles");
  const [f, setF] = useState({ name: "", lengthM: "4.60", flexLbs: "165", gripHeightM: "4.40", standardsCm: "60", approachStrides: "16", notes: "" });
  const [bodyWeight, setBodyWeight] = useState("75");
  const [bar, setBar] = useState("4.80");
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const a = analyzePole(num(f.lengthM) ?? 0, Math.round(num(f.flexLbs) ?? 0), num(f.gripHeightM) ?? 0, Math.round(num(f.standardsCm) ?? 0), num(bodyWeight), num(bar));
  const gripTooHigh = (num(f.gripHeightM) ?? 0) > (num(f.lengthM) ?? 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (gripTooHigh) return setError("La altura de agarre no puede superar la longitud de la pértiga.");
    try {
      await api("/api/jumps/poles", {
        body: {
          name: f.name || `${f.lengthM} m / ${f.flexLbs} lbs`,
          lengthM: num(f.lengthM),
          flexLbs: num(f.flexLbs),
          gripHeightM: num(f.gripHeightM),
          standardsCm: num(f.standardsCm),
          approachStrides: num(f.approachStrides),
          notes: f.notes,
        },
      });
      list.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Configuración de pértiga" className="xl:col-span-2">
          <form onSubmit={submit} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Nombre / etiqueta" className="col-span-2">
              <input className="input" value={f.name} onChange={set("name")} placeholder="Competición viento a favor" />
            </Field>
            <Field label="Longitud (m)">
              <input className="input" inputMode="decimal" required value={f.lengthM} onChange={set("lengthM")} />
            </Field>
            <Field label="Dureza (lbs)">
              <input className="input" inputMode="numeric" required value={f.flexLbs} onChange={set("flexLbs")} />
            </Field>
            <Field label="Altura de agarre (m)" hint="Mano superior, medida desde la punta.">
              <input className="input" inputMode="decimal" required value={f.gripHeightM} onChange={set("gripHeightM")} />
            </Field>
            <Field label="Profundidad de saltómetros (cm)" hint="Respecto al fondo del cajetín: 0–80 cm.">
              <input className="input" inputMode="numeric" required value={f.standardsCm} onChange={set("standardsCm")} />
            </Field>
            <Field label="Apoyos de carrera">
              <input className="input" inputMode="numeric" value={f.approachStrides} onChange={set("approachStrides")} />
            </Field>
            <Field label="Notas">
              <input className="input" value={f.notes} onChange={set("notes")} />
            </Field>
            <Field label="Tu peso corporal (kg)">
              <input className="input" inputMode="decimal" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)} />
            </Field>
            <Field label="Altura del listón (m)">
              <input className="input" inputMode="decimal" value={bar} onChange={(e) => setBar(e.target.value)} />
            </Field>
            <button className="btn btn-primary col-span-2 self-end">Guardar configuración</button>
          </form>
          {error ? <div className="mt-3"><Alert kind="error">{error}</Alert></div> : null}
        </Card>
        <Card title="Análisis">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Agarre efectivo" value={a.effectiveGrip.toFixed(2)} unit="m" hint="Descontados 20 cm de cajetín." />
            <Stat label="Empuje sobre agarre" value={a.pushOff != null ? `${a.pushOff > 0 ? "+" : ""}${a.pushOff.toFixed(2)}` : "—"} unit="m" />
          </div>
          <div className="mt-3 space-y-2">
            <Alert>{a.flexAdvice}</Alert>
            <Alert>{a.standardsAdvice}</Alert>
            {gripTooHigh ? <Alert kind="error">El agarre supera la longitud de la pértiga.</Alert> : null}
          </div>
        </Card>
      </div>
      <Card title="Mis pértigas">
        <DataTable
          rows={list.data ?? []}
          onDelete={async (r) => {
            await api(`/api/jumps/poles?id=${r.id}`, { method: "DELETE" });
            list.reload();
          }}
          columns={[
            { header: "Nombre", cell: (r) => <span className="font-medium">{r.name}</span> },
            { header: "Longitud", cell: (r) => `${r.lengthM.toFixed(2)} m` },
            { header: "Dureza", cell: (r) => `${r.flexLbs} lbs` },
            { header: "Agarre", cell: (r) => `${r.gripHeightM.toFixed(2)} m` },
            { header: "Saltómetros", cell: (r) => `${r.standardsCm} cm` },
            { header: "Apoyos", cell: (r) => r.approachStrides ?? "—" },
            { header: "Notas", cell: (r) => r.notes || "—" },
          ]}
        />
      </Card>
    </div>
  );
}
