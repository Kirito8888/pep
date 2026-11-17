"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BarsChart } from "@/components/charts";
import { Alert, Card, DataTable, Field, Light, PageHeader, Stat, Tabs } from "@/components/ui";
import {
  ANGLE_OPTIONS,
  CATEGORIES,
  CROSS_STEP_OPTIONS,
  IMPLEMENT_KINDS,
  IMPLEMENT_PRESETS,
  JAVELIN_THROW_TYPES,
  MEDBALL_TYPES,
  PREHAB_ITEMS,
  THROW_EVENTS,
  WEEKLY_THROW_LIMITS,
  WIND_TYPES,
  classifyImplement,
  describeLoad,
  jointLoad,
  officialWeight,
  weightPercent,
  windAdvice,
  type Category,
  type ThrowEvent,
} from "@/lib/athletics/implements";
import { api, errorMessage, num, useFetch } from "@/lib/client";
import { addDays, formatDate, mondayOf, todayInput, toDateInput } from "@/lib/dates";

type Tab = "implements" | "log" | "joints" | "medball";

interface Me {
  sex: "M" | "F";
}
interface Implement {
  id: string;
  event: string;
  name: string;
  kind: string;
  weightG: number;
  officialWeightG: number;
}
interface ThrowLog {
  id: string;
  date: string;
  event: string;
  implementName: string;
  weightG: number;
  officialWeightG: number;
  count: number;
  intensityPct: number;
  bestDistance: number | null;
  throwType: string | null;
  approachMeters: number | null;
  approachSteps: number | null;
  crossSteps: number | null;
  checkMark: number | null;
  anglePerceived: string | null;
  windType: string | null;
  windSpeed: number | null;
  notes: string;
}
interface Prehab {
  id: string;
  date: string;
  items: string[];
  notes: string;
}
interface MedBall {
  id: string;
  date: string;
  type: string;
  weightKg: number;
  throws: number;
  bestDistance: number | null;
  notes: string;
}

const eventLabel = (k: string) => THROW_EVENTS.find((e) => e.key === k)?.label ?? k;
const kindLabel = (k: string) => IMPLEMENT_KINDS.find((e) => e.key === k)?.label ?? k;
const fmtWeight = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString("es-ES")} kg` : `${g} g`);

export default function ThrowsPage() {
  const [tab, setTab] = useState<Tab>("implements");
  const me = useFetch<Me>("/api/me");
  const [event, setEvent] = useState<ThrowEvent>("JAVELIN");
  const [sexOverride, setSexOverride] = useState<"M" | "F" | null>(null);
  const [category, setCategory] = useState<Category>("SENIOR");
  const sex = sexOverride ?? me.data?.sex ?? "M";
  const official = officialWeight(event, sex, category);

  return (
    <div>
      <PageHeader title="Sector A · Lanzamientos" subtitle="Jabalina, peso, disco y martillo: implementos reglamentarios, lastrados y aligerados, registro específico de jabalina y control del volumen articular." />
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Prueba">
            <select className="input" value={event} onChange={(e) => setEvent(e.target.value as ThrowEvent)}>
              {THROW_EVENTS.map((x) => (
                <option key={x.key} value={x.key}>{x.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Sexo">
            <select className="input" value={sex} onChange={(e) => setSexOverride(e.target.value === "F" ? "F" : "M")}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </Field>
          <Field label="Categoría">
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </Field>
          <div>
            <span className="label">Artefacto reglamentario</span>
            <div className="text-2xl font-black">{fmtWeight(official)}</div>
          </div>
        </div>
      </Card>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "implements", label: "Implementos y cargas" },
          { key: "log", label: event === "JAVELIN" ? "Registro de jabalina" : "Registro de lanzamientos" },
          { key: "joints", label: "Volumen articular y prehab" },
          { key: "medball", label: "Balón medicinal" },
        ]}
      />
      {tab === "implements" ? <Implements event={event} official={official} /> : null}
      {tab === "log" ? <Log event={event} official={official} /> : null}
      {tab === "joints" ? <Joints event={event} /> : null}
      {tab === "medball" ? <MedBallTab /> : null}
    </div>
  );
}

function Implements({ event, official }: { event: ThrowEvent; official: number }) {
  const list = useFetch<Implement[]>("/api/throws/implements");
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [kind, setKind] = useState("HEAVY");
  const [error, setError] = useState<string | null>(null);
  const mine = (list.data ?? []).filter((i) => i.event === event);

  async function add(body: { name: string; weightG: number; kind: string }) {
    setError(null);
    try {
      await api("/api/throws/implements", { body: { ...body, event, officialWeightG: official } });
      list.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    const g = num(weight);
    if (!g) return setError("Indica el peso en gramos.");
    await add({ name: name || `${eventLabel(event)} ${fmtWeight(g)}`, weightG: Math.round(g), kind });
    setName("");
    setWeight("");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title={`Implementos habituales de ${eventLabel(event).toLowerCase()}`}>
        <p className="ink-2 mb-3 text-sm">% calculado respecto al artefacto oficial seleccionado ({fmtWeight(official)}). Pulsa «Añadir» para guardarlo en tu material.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Implemento</th>
              <th>Peso</th>
              <th>% oficial</th>
              <th>Uso</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {IMPLEMENT_PRESETS[event].map((p) => {
              const cls = p.kind === "NOCKENBALL" ? "NOCKENBALL" : classifyImplement(p.weightG, official);
              return (
                <tr key={p.name}>
                  <td className="font-medium">{p.name}</td>
                  <td>{fmtWeight(p.weightG)}</td>
                  <td className="font-semibold">{weightPercent(p.weightG, official)} %</td>
                  <td className="ink-2 text-xs">{cls === "NOCKENBALL" ? "Pelota lastrada: técnica de brazo y calentamiento específico." : describeLoad(p.weightG, official)}</td>
                  <td>
                    <button className="btn btn-sm" disabled={mine.some((m) => m.name === p.name)} onClick={() => add({ name: p.name, weightG: p.weightG, kind: cls })}>
                      Añadir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <div className="space-y-4">
        <Card title="Mi material">
          <DataTable
            rows={mine}
            empty="Todavía no has guardado implementos para esta prueba."
            onDelete={async (r) => {
              await api(`/api/throws/implements?id=${r.id}`, { method: "DELETE" });
              list.reload();
            }}
            columns={[
              { header: "Implemento", cell: (r) => <span className="font-medium">{r.name}</span> },
              { header: "Tipo", cell: (r) => kindLabel(r.kind) },
              { header: "Peso", cell: (r) => fmtWeight(r.weightG) },
              { header: "% oficial", cell: (r) => <strong>{weightPercent(r.weightG, official)} %</strong> },
            ]}
          />
        </Card>
        <Card title="Añadir implemento personalizado">
          <form onSubmit={submit} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Nombre" className="col-span-2">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jabalina 950 g" />
            </Field>
            <Field label="Peso (g)">
              <input className="input" inputMode="numeric" required value={weight} onChange={(e) => setWeight(e.target.value)} />
            </Field>
            <Field label="Tipo">
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
                {IMPLEMENT_KINDS.map((k) => (
                  <option key={k.key} value={k.key}>{k.label}</option>
                ))}
              </select>
            </Field>
            {num(weight) ? (
              <p className="ink-2 col-span-2 text-sm md:col-span-3">
                <strong>{weightPercent(num(weight) ?? 0, official)} %</strong> del oficial · {describeLoad(num(weight) ?? 0, official)}
              </p>
            ) : (
              <span className="col-span-2 md:col-span-3" />
            )}
            <button className="btn btn-primary">Guardar</button>
          </form>
          {error ? <div className="mt-3"><Alert kind="error">{error}</Alert></div> : null}
        </Card>
      </div>
    </div>
  );
}

function Log({ event, official }: { event: ThrowEvent; official: number }) {
  const logs = useFetch<ThrowLog[]>("/api/throws");
  const implementsList = useFetch<Implement[]>("/api/throws/implements");
  const isJav = event === "JAVELIN";
  const options = useMemo(() => {
    const own = (implementsList.data ?? []).filter((i) => i.event === event).map((i) => ({ name: i.name, weightG: i.weightG }));
    const presets = IMPLEMENT_PRESETS[event].map((p) => ({ name: p.name, weightG: p.weightG }));
    const seen = new Set<string>();
    return [...own, ...presets].filter((o) => (seen.has(o.name) ? false : (seen.add(o.name), true)));
  }, [implementsList.data, event]);
  const defaultImplement = options.find((o) => o.weightG === official)?.name ?? options[0]?.name ?? "";

  const [f, setF] = useState({
    date: todayInput(),
    implement: "",
    count: "10",
    intensityPct: "85",
    bestDistance: "",
    throwType: "STEP5",
    approachMeters: "",
    approachSteps: "",
    crossSteps: "5",
    checkMark: "",
    anglePerceived: "OPTIMAL",
    windType: "NONE",
    windSpeed: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const implementName = options.some((o) => o.name === f.implement) ? f.implement : defaultImplement;
  const chosen = options.find((o) => o.name === implementName);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!chosen) return setError("Selecciona un implemento.");
    try {
      await api("/api/throws", {
        body: {
          date: f.date,
          event,
          implementName: chosen.name,
          weightG: chosen.weightG,
          officialWeightG: official,
          count: num(f.count),
          intensityPct: num(f.intensityPct),
          bestDistance: num(f.bestDistance),
          notes: f.notes,
          ...(isJav
            ? {
                throwType: f.throwType,
                approachMeters: num(f.approachMeters),
                approachSteps: num(f.approachSteps),
                crossSteps: f.throwType === "STAND" ? null : Number(f.crossSteps),
                checkMark: num(f.checkMark),
                anglePerceived: f.anglePerceived,
                windType: f.windType,
                windSpeed: num(f.windSpeed),
              }
            : {}),
        },
      });
      setF((s) => ({ ...s, bestDistance: "", notes: "" }));
      logs.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const rows = (logs.data ?? []).filter((l) => l.event === event);
  const typeLabel = (k: string | null) => JAVELIN_THROW_TYPES.find((t) => t.key === k)?.label ?? "—";
  const windLabel = (l: ThrowLog) => (l.windType && l.windType !== "NONE" ? `${WIND_TYPES.find((w) => w.key === l.windType)?.label}${l.windSpeed != null ? ` ${l.windSpeed} m/s` : ""}` : "—");

  return (
    <div className="space-y-4">
      <Card title={`Registrar serie de ${eventLabel(event).toLowerCase()}`}>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Field label="Fecha">
              <input className="input" type="date" required value={f.date} onChange={set("date")} />
            </Field>
            <Field label="Implemento" hint={chosen ? `${weightPercent(chosen.weightG, official)} % del oficial` : undefined}>
              <select className="input" value={implementName} onChange={set("implement")}>
                {options.map((o) => (
                  <option key={o.name} value={o.name}>{o.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Nº de lanzamientos">
              <input className="input" inputMode="numeric" required value={f.count} onChange={set("count")} />
            </Field>
            <Field label="Intensidad (%)" hint="≥ 90 % cuenta como alta intensidad.">
              <input className="input" inputMode="numeric" required value={f.intensityPct} onChange={set("intensityPct")} />
            </Field>
            <Field label="Mejor distancia (m)">
              <input className="input" inputMode="decimal" value={f.bestDistance} onChange={set("bestDistance")} />
            </Field>
          </div>
          {isJav ? (
            <fieldset className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-brand-600">Específico de jabalina</legend>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Field label="Tipo de lanzamiento">
                  <select className="input" value={f.throwType} onChange={set("throwType")}>
                    {JAVELIN_THROW_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Pasos cruzados (impulsos)">
                  <select className="input" value={f.crossSteps} onChange={set("crossSteps")} disabled={f.throwType === "STAND"}>
                    {CROSS_STEP_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c} impulsos</option>
                    ))}
                  </select>
                </Field>
                <Field label="Carrera de impulso (m)">
                  <input className="input" inputMode="decimal" value={f.approachMeters} onChange={set("approachMeters")} placeholder="28.5" />
                </Field>
                <Field label="Nº total de pasos">
                  <input className="input" inputMode="numeric" value={f.approachSteps} onChange={set("approachSteps")} placeholder="14" />
                </Field>
                <Field label="Marca de referencia / check-mark (m)" hint="Distancia desde el arco al inicio de los cruzados.">
                  <input className="input" inputMode="decimal" value={f.checkMark} onChange={set("checkMark")} placeholder="11.2" />
                </Field>
                <Field label="Ángulo / actitud percibida">
                  <select className="input" value={f.anglePerceived} onChange={set("anglePerceived")}>
                    {ANGLE_OPTIONS.map((a) => (
                      <option key={a.key} value={a.key}>{a.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Viento">
                  <select className="input" value={f.windType} onChange={set("windType")}>
                    {WIND_TYPES.map((w) => (
                      <option key={w.key} value={w.key}>{w.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Velocidad del viento (m/s)">
                  <input className="input" inputMode="decimal" value={f.windSpeed} onChange={set("windSpeed")} disabled={f.windType === "NONE"} />
                </Field>
              </div>
              <p className="ink-2 mt-3 text-sm">{windAdvice(f.windType)}</p>
              {num(f.approachMeters) && num(f.approachSteps) ? (
                <p className="ink-2 mt-1 text-sm">
                  Longitud media de paso: <strong>{((num(f.approachMeters) ?? 0) / (num(f.approachSteps) ?? 1)).toFixed(2)} m</strong>.
                </p>
              ) : null}
            </fieldset>
          ) : null}
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Notas técnicas" className="min-w-[240px] flex-1">
              <input className="input" value={f.notes} onChange={set("notes")} />
            </Field>
            <button className="btn btn-primary">Guardar serie</button>
          </div>
          {error ? <Alert kind="error">{error}</Alert> : null}
        </form>
      </Card>
      <Card title="Historial">
        <DataTable
          rows={rows}
          onDelete={async (r) => {
            await api(`/api/throws?id=${r.id}`, { method: "DELETE" });
            logs.reload();
          }}
          columns={[
            { header: "Fecha", cell: (r) => formatDate(r.date) },
            { header: "Implemento", cell: (r) => `${r.implementName} (${weightPercent(r.weightG, r.officialWeightG)} %)` },
            { header: "Lanz.", cell: (r) => r.count },
            { header: "Int.", cell: (r) => `${r.intensityPct} %` },
            { header: "Mejor", cell: (r) => (r.bestDistance != null ? `${r.bestDistance.toFixed(2)} m` : "—") },
            ...(isJav
              ? [
                  { header: "Tipo", cell: (r: ThrowLog) => `${typeLabel(r.throwType)}${r.crossSteps ? ` · ${r.crossSteps} cruzados` : ""}` },
                  { header: "Carrera", cell: (r: ThrowLog) => (r.approachMeters != null ? `${r.approachMeters} m${r.approachSteps ? ` / ${r.approachSteps} pasos` : ""}${r.checkMark != null ? ` · marca ${r.checkMark} m` : ""}` : "—") },
                  { header: "Ángulo", cell: (r: ThrowLog) => ANGLE_OPTIONS.find((a) => a.key === r.anglePerceived)?.label ?? "—" },
                  { header: "Viento", cell: windLabel },
                ]
              : []),
            { header: "Notas", cell: (r) => r.notes || "—" },
          ]}
        />
      </Card>
    </div>
  );
}

function Joints({ event }: { event: ThrowEvent }) {
  const logs = useFetch<ThrowLog[]>("/api/throws");
  const prehab = useFetch<Prehab[]>("/api/prehab");
  const [checked, setChecked] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const weekStart = mondayOf(new Date());
  const all = (logs.data ?? []).filter((l) => l.event === event);
  const week = all.filter((l) => new Date(l.date) >= weekStart && new Date(l.date) < addDays(weekStart, 7));
  const load = jointLoad(week, event);
  const limits = WEEKLY_THROW_LIMITS[event];
  const trend = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(weekStart, (i - 7) * 7);
    const end = addDays(start, 7);
    const w = all.filter((l) => new Date(l.date) >= start && new Date(l.date) < end);
    const sum = (pred: (l: ThrowLog) => boolean) => w.filter(pred).reduce((a, l) => a + l.count, 0);
    return { semana: toDateInput(start).slice(5), baja: sum((l) => l.intensityPct < 75), media: sum((l) => l.intensityPct >= 75 && l.intensityPct < 90), alta: sum((l) => l.intensityPct >= 90) };
  });
  const prehabThisWeek = (prehab.data ?? []).filter((p) => new Date(p.date) >= weekStart).length;

  async function savePrehab() {
    setError(null);
    try {
      await api("/api/prehab", { body: { date: todayInput(), items: checked, notes } });
      setChecked([]);
      setNotes("");
      prehab.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Lanzamientos esta semana" value={load.total} hint={`Ámbar ≥ ${limits.total[0]} · Rojo ≥ ${limits.total[1]}`} />
        <Stat label="Alta intensidad (≥ 90 %)" value={load.high} hint={`Ámbar ≥ ${limits.high[0]} · Rojo ≥ ${limits.high[1]}`} />
        <Stat label="Media (75–89 %)" value={load.medium} />
        <Stat label="Baja (< 75 %)" value={load.low} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Semáforo articular del lanzador">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="muted text-xs uppercase tracking-wide">Codo (LCC)</div>
              <Light status={load.elbow} />
            </div>
            <div>
              <div className="muted text-xs uppercase tracking-wide">Manguito rotador</div>
              <Light status={load.shoulder} />
            </div>
            <div>
              <div className="muted text-xs uppercase tracking-wide">Zona lumbar</div>
              <Light status={load.lumbar} />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {load.messages.map((m, i) => (
              <Alert key={i} kind={load.elbow === "green" && load.shoulder === "green" && load.lumbar === "green" ? "success" : "amber"}>{m}</Alert>
            ))}
            {prehabThisWeek < 2 && load.total > 0 ? <Alert kind="amber">Solo {prehabThisWeek} rutina(s) preventiva(s) registrada(s) esta semana: el mínimo recomendado es una por cada sesión de lanzamientos.</Alert> : null}
          </div>
          <p className="muted mt-3 text-xs">
            Implementos ligeros a alta intensidad: {load.lightImplementHigh} · implementos pesados: {load.heavyImplement}. Los umbrales son orientativos y deben ajustarse al historial del atleta.
          </p>
        </Card>
        <Card title="Lanzamientos semanales por intensidad">
          <BarsChart
            data={trend}
            xKey="semana"
            stacked
            series={[
              { key: "baja", label: "Baja (< 75 %)", color: 3 },
              { key: "media", label: "Media (75–89 %)", color: 4 },
              { key: "alta", label: "Alta (≥ 90 %)", color: 8 },
            ]}
          />
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Checklist de rutina preventiva (hoy)">
          <ul className="space-y-2">
            {PREHAB_ITEMS.map((item) => (
              <li key={item.key}>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={checked.includes(item.key)} onChange={(e) => setChecked((c) => (e.target.checked ? [...c, item.key] : c.filter((x) => x !== item.key)))} />
                  <span>
                    {item.label} <span className="badge ml-1">{item.area}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Field label="Notas (molestias, sensaciones)" className="min-w-[200px] flex-1">
              <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <button className="btn btn-primary" onClick={savePrehab} disabled={checked.length === 0}>
              Guardar rutina ({checked.length}/{PREHAB_ITEMS.length})
            </button>
          </div>
          {error ? <div className="mt-3"><Alert kind="error">{error}</Alert></div> : null}
        </Card>
        <Card title="Historial de prehab">
          <DataTable
            rows={(prehab.data ?? []).slice(0, 12)}
            onDelete={async (r) => {
              await api(`/api/prehab?id=${r.id}`, { method: "DELETE" });
              prehab.reload();
            }}
            columns={[
              { header: "Fecha", cell: (r) => formatDate(r.date) },
              { header: "Completado", cell: (r) => `${r.items.length}/${PREHAB_ITEMS.length}` },
              { header: "Ejercicios", cell: (r) => <span className="ink-2 text-xs">{r.items.map((k) => PREHAB_ITEMS.find((p) => p.key === k)?.area ?? k).join(", ")}</span> },
              { header: "Notas", cell: (r) => r.notes || "—" },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}

function MedBallTab() {
  const logs = useFetch<MedBall[]>("/api/medball");
  const [f, setF] = useState({ date: todayInput(), type: "OVERHEAD", weightKg: "3", throws: "10", bestDistance: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const typeLabel = (k: string) => MEDBALL_TYPES.find((t) => t.key === k)?.label ?? k;
  const rows = logs.data ?? [];
  const weekStart = mondayOf(new Date());
  const week = rows.filter((r) => new Date(r.date) >= weekStart);
  const byType = MEDBALL_TYPES.map((t) => ({ tipo: t.label.split(" ")[0], lanzamientos: week.filter((r) => r.type === t.key).reduce((a, r) => a + r.throws, 0) }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/medball", { body: { date: f.date, type: f.type, weightKg: num(f.weightKg), throws: num(f.throws), bestDistance: num(f.bestDistance), notes: f.notes } });
      setF((s) => ({ ...s, bestDistance: "", notes: "" }));
      logs.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Registrar lanzamientos de balón medicinal">
        <form onSubmit={submit} className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Field label="Fecha">
            <input className="input" type="date" required value={f.date} onChange={set("date")} />
          </Field>
          <Field label="Tipo" className="col-span-2">
            <select className="input" value={f.type} onChange={set("type")}>
              {MEDBALL_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Peso (kg)">
            <input className="input" inputMode="decimal" required value={f.weightKg} onChange={set("weightKg")} />
          </Field>
          <Field label="Lanzamientos">
            <input className="input" inputMode="numeric" required value={f.throws} onChange={set("throws")} />
          </Field>
          <Field label="Mejor distancia (m)">
            <input className="input" inputMode="decimal" value={f.bestDistance} onChange={set("bestDistance")} />
          </Field>
          <Field label="Notas" className="col-span-2 md:col-span-5">
            <input className="input" value={f.notes} onChange={set("notes")} />
          </Field>
          <button className="btn btn-primary self-end">Guardar</button>
        </form>
        {error ? <div className="mt-3"><Alert kind="error">{error}</Alert></div> : null}
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Volumen de la semana por tipo">
          <BarsChart data={byType} xKey="tipo" series={[{ key: "lanzamientos", label: "Lanzamientos", color: 1 }]} height={200} />
        </Card>
        <Card title="Historial">
          <DataTable
            rows={rows.slice(0, 30)}
            onDelete={async (r) => {
              await api(`/api/medball?id=${r.id}`, { method: "DELETE" });
              logs.reload();
            }}
            columns={[
              { header: "Fecha", cell: (r) => formatDate(r.date) },
              { header: "Tipo", cell: (r) => typeLabel(r.type) },
              { header: "Peso", cell: (r) => `${r.weightKg} kg` },
              { header: "Lanz.", cell: (r) => r.throws },
              { header: "Mejor", cell: (r) => (r.bestDistance != null ? `${r.bestDistance.toFixed(2)} m` : "—") },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
