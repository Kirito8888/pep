"use client";

import { useState, type FormEvent } from "react";
import { LinesChart } from "@/components/charts";
import { Alert, Card, DataTable, Field, PageHeader } from "@/components/ui";
import { isWindLegal } from "@/lib/athletics/combined";
import { EVENTS, EVENT_MAP, summarizeMarks, type AthleticsEvent } from "@/lib/athletics/events";
import { api, errorMessage, num, useFetch } from "@/lib/client";
import { formatDate, todayInput } from "@/lib/dates";
import { formatTime, parseTime } from "@/lib/format";

interface Mark {
  id: string;
  event: string;
  value: number;
  wind: number | null;
  indoor: boolean;
  date: string;
  competition: string;
}

const show = (e: AthleticsEvent | undefined, v: number) => (!e ? String(v) : e.type === "time" ? formatTime(v) : e.type === "points" ? `${Math.round(v)} pts` : `${v.toFixed(2)} m`);
const SECTORS = [...new Set(EVENTS.map((e) => e.sector))];

export default function MarksPage() {
  const marks = useFetch<Mark[]>("/api/marks");
  const [f, setF] = useState({ date: todayInput(), event: "100m", value: "", wind: "", indoor: false, competition: "" });
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const event = EVENT_MAP[f.event];
  const all = marks.data ?? [];
  const summary = summarizeMarks(all);
  const current = selected ?? summary[0]?.event.key ?? null;
  const currentEvent = current ? EVENT_MAP[current] : undefined;
  const history = all.filter((m) => m.event === current).sort((a, b) => a.date.localeCompare(b.date));
  const windValue = num(f.wind);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = event.type === "time" ? parseTime(f.value) : num(f.value);
    if (value == null || !Number.isFinite(value) || value <= 0) return setError("Marca no válida.");
    try {
      await api("/api/marks", { body: { date: f.date, event: f.event, value, wind: event.wind && !f.indoor ? windValue : null, indoor: f.indoor, competition: f.competition } });
      setSelected(f.event);
      setF((s) => ({ ...s, value: "", wind: "" }));
      marks.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="Registro global de marcas" subtitle="Mejor marca personal (PB) y de temporada (SB) en todas las pruebas, con validación reglamentaria de viento (≤ +2,0 m/s) en velocidad corta y saltos horizontales." />
      <Card title="Añadir marca" className="mb-4">
        <form onSubmit={submit} className="grid grid-cols-2 gap-3 md:grid-cols-7">
          <Field label="Fecha">
            <input className="input" type="date" required value={f.date} onChange={(e) => setF((s) => ({ ...s, date: e.target.value }))} />
          </Field>
          <Field label="Prueba" className="col-span-2">
            <select className="input" value={f.event} onChange={(e) => setF((s) => ({ ...s, event: e.target.value }))}>
              {SECTORS.map((sector) => (
                <optgroup key={sector} label={sector}>
                  {EVENTS.filter((x) => x.sector === sector).map((x) => (
                    <option key={x.key} value={x.key}>{x.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label={event.type === "time" ? "Marca (s o m:ss.cc)" : event.type === "points" ? "Puntos" : "Marca (m)"}>
            <input className="input" required value={f.value} onChange={(e) => setF((s) => ({ ...s, value: e.target.value }))} />
          </Field>
          <Field label="Viento (m/s)">
            <input className="input" inputMode="decimal" disabled={!event.wind || f.indoor} value={f.wind} onChange={(e) => setF((s) => ({ ...s, wind: e.target.value }))} placeholder={event.wind ? "+1.5" : "No aplica"} />
          </Field>
          <Field label="Competición">
            <input className="input" value={f.competition} onChange={(e) => setF((s) => ({ ...s, competition: e.target.value }))} />
          </Field>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={f.indoor} onChange={(e) => setF((s) => ({ ...s, indoor: e.target.checked }))} /> Pista cubierta
            </label>
            <button className="btn btn-primary">Guardar</button>
          </div>
        </form>
        {event.wind && !f.indoor && windValue != null && !isWindLegal(windValue) ? (
          <div className="mt-3"><Alert kind="amber">Viento de {windValue > 0 ? "+" : ""}{windValue} m/s: superior a +2,0. La marca se guardará como ventosa y no contará como PB ni SB.</Alert></div>
        ) : null}
        {error ? <div className="mt-3"><Alert kind="error">{error}</Alert></div> : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="PB y SB por prueba">
          {summary.length === 0 ? (
            <p className="muted py-6 text-center text-sm">Todavía no has registrado marcas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Prueba</th>
                    <th>PB</th>
                    <th>SB {new Date().getFullYear()}</th>
                    <th>Ventosa</th>
                    <th>Nº</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s) => (
                    <tr key={s.event.key}>
                      <td>
                        <button className="text-left font-medium underline-offset-2 hover:underline" onClick={() => setSelected(s.event.key)}>
                          {s.event.label}
                        </button>
                        <div className="muted text-xs">{s.event.sector}</div>
                      </td>
                      <td className="font-bold">{s.pb ? show(s.event, s.pb.value) : "—"}</td>
                      <td>{s.sb ? show(s.event, s.sb.value) : "—"}</td>
                      <td className="ink-2">{s.windAided ? `${show(s.event, s.windAided.value)} (${s.windAided.wind != null && s.windAided.wind > 0 ? "+" : ""}${s.windAided.wind})` : "—"}</td>
                      <td>{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title={currentEvent ? `Progresión · ${currentEvent.label}` : "Progresión"}>
          {history.length === 0 || !currentEvent ? (
            <p className="muted py-6 text-center text-sm">Selecciona una prueba para ver su progresión.</p>
          ) : (
            <>
              <LinesChart
                data={history.map((h) => ({ fecha: formatDate(h.date), marca: h.value }))}
                xKey="fecha"
                series={[{ key: "marca", label: currentEvent.label, color: 1 }]}
                unit={currentEvent.type === "time" ? "s" : currentEvent.type === "points" ? "pts" : "m"}
                reversed={currentEvent.type === "time"}
              />
              {currentEvent.type === "time" ? <p className="muted text-xs">Eje invertido: más arriba es más rápido.</p> : null}
              <DataTable
                rows={[...history].reverse()}
                onDelete={async (r) => {
                  await api(`/api/marks?id=${r.id}`, { method: "DELETE" });
                  marks.reload();
                }}
                columns={[
                  { header: "Fecha", cell: (r) => formatDate(r.date) },
                  { header: "Marca", cell: (r) => <strong>{show(currentEvent, r.value)}</strong> },
                  { header: "Viento", cell: (r) => (r.wind != null ? `${r.wind > 0 ? "+" : ""}${r.wind}${isWindLegal(r.wind) ? "" : " (ventosa)"}` : r.indoor ? "PC" : "—") },
                  { header: "Competición", cell: (r) => r.competition || "—" },
                ]}
              />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
