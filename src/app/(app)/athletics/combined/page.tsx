"use client";

import { useMemo, useState } from "react";
import { BarsChart, LinesChart } from "@/components/charts";
import { Alert, Card, DataTable, Field, PageHeader, Stat } from "@/components/ui";
import { COMPETITIONS, COMPETITION_LIST, WIND_LIMIT, performanceForPoints, scoreCompetition, type CombinedEvent, type CompetitionKey } from "@/lib/athletics/combined";
import { api, errorMessage, num, useFetch } from "@/lib/client";
import { formatDate, todayInput } from "@/lib/dates";
import { formatTime, parseTime } from "@/lib/format";

interface Saved {
  id: string;
  date: string;
  competition: CompetitionKey;
  label: string;
  totalPoints: number;
  performances: Record<string, { value: number | null; wind?: number | null }>;
}

const parsePerf = (event: CombinedEvent, raw: string): number | null => {
  if (!raw.trim()) return null;
  const v = event.kind === "track" ? parseTime(raw) : (num(raw) ?? NaN);
  return Number.isFinite(v) && v > 0 ? v : null;
};
const showPerf = (event: CombinedEvent, v: number) => (event.kind === "track" ? formatTime(v) : `${v.toFixed(2)} m`);

export default function CombinedPage() {
  const saved = useFetch<Saved[]>("/api/combined");
  const [key, setKey] = useState<CompetitionKey>("DECATHLON");
  const competition = COMPETITIONS[key];
  const [values, setValues] = useState<Record<string, string>>({});
  const [winds, setWinds] = useState<Record<string, string>>({});
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [goalTotal, setGoalTotal] = useState("");
  const [label, setLabel] = useState("");
  const [date, setDate] = useState(todayInput());
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const performances = useMemo(
    () => Object.fromEntries(competition.events.map((e) => [e.key, { value: parsePerf(e, values[e.key] ?? ""), wind: e.wind ? num(winds[e.key] ?? "") : null }])),
    [competition, values, winds],
  );
  const score = scoreCompetition(competition, performances);
  const targetPoints = (e: CombinedEvent, current: number) => Math.max(0, Math.round(num(targets[e.key] ?? "") ?? current));
  const targetTotal = score.events.reduce((a, s) => a + targetPoints(s.event, s.points), 0);

  function switchCompetition(k: CompetitionKey) {
    setKey(k);
    setValues({});
    setWinds({});
    setTargets({});
    setGoalTotal("");
    setMsg(null);
  }

  /** Reparte el objetivo total entre las pruebas en proporción a los puntos actuales. */
  function distribute() {
    const goal = num(goalTotal);
    if (!goal || score.total <= 0) return setMsg({ kind: "error", text: "Introduce tus marcas actuales y un objetivo total para repartirlo." });
    const factor = goal / score.total;
    setTargets(Object.fromEntries(score.events.map((s) => [s.event.key, String(Math.round(s.points * factor))])));
    setMsg(null);
  }

  function load(r: Saved) {
    const comp = COMPETITIONS[r.competition];
    setKey(r.competition);
    setValues(Object.fromEntries(comp.events.map((e) => [e.key, r.performances[e.key]?.value != null ? (e.kind === "track" ? formatTime(r.performances[e.key].value as number) : String(r.performances[e.key].value)) : ""])));
    setWinds(Object.fromEntries(comp.events.map((e) => [e.key, r.performances[e.key]?.wind != null ? String(r.performances[e.key].wind) : ""])));
    setTargets({});
    setLabel(r.label);
  }

  async function save() {
    setMsg(null);
    try {
      await api("/api/combined", { body: { date, competition: key, label: label || competition.name, performances } });
      setMsg({ kind: "success", text: "Resultado guardado." });
      saved.reload();
    } catch (err) {
      setMsg({ kind: "error", text: errorMessage(err) });
    }
  }

  const history = (saved.data ?? []).filter((r) => r.competition === key).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      <PageHeader title="Sector E · Pruebas combinadas" subtitle="Calculadora oficial World Athletics, P = A · |B − M|^C, con simulador de objetivos por prueba y validación de viento." />
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Competición" className="col-span-2">
            <select className="input" value={key} onChange={(e) => switchCompetition(e.target.value as CompetitionKey)}>
              {COMPETITION_LIST.map((c) => (
                <option key={c.key} value={c.key}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Stat label="Total" value={score.total.toLocaleString("es-ES")} unit="pts" hint={competition.events.some((e) => e.day === 2) ? `Día 1: ${score.day1} · Día 2: ${score.day2}` : "Competición de un día"} />
          <Stat label="Objetivo simulado" value={targetTotal.toLocaleString("es-ES")} unit="pts" hint={`${targetTotal - score.total >= 0 ? "+" : ""}${targetTotal - score.total} pts`} />
        </div>
      </Card>

      <Card title="Marcas, puntos y simulador de objetivos">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Prueba</th>
                <th>Marca</th>
                <th>Viento (m/s)</th>
                <th>Puntos</th>
                <th>Objetivo (pts)</th>
                <th>Marca necesaria</th>
                <th>Constantes A / B / C</th>
              </tr>
            </thead>
            <tbody>
              {score.events.map((s) => {
                const e = s.event;
                const tp = targetPoints(e, s.points);
                const needed = tp > 0 ? performanceForPoints(e, tp) : null;
                return (
                  <tr key={e.key}>
                    <td className="whitespace-nowrap font-medium">
                      {e.name} <span className="muted text-xs">· día {e.day}</span>
                    </td>
                    <td>
                      <input
                        className="input w-28"
                        aria-label={`Marca en ${e.name}`}
                        value={values[e.key] ?? ""}
                        onChange={(ev) => setValues((v) => ({ ...v, [e.key]: ev.target.value }))}
                        placeholder={e.kind === "track" ? (e.B > 100 ? "m:ss.cc" : "s.cc") : "metros"}
                      />
                    </td>
                    <td>
                      {e.wind ? (
                        <div className="flex items-center gap-2">
                          <input className="input w-20" aria-label={`Viento en ${e.name}`} inputMode="decimal" value={winds[e.key] ?? ""} onChange={(ev) => setWinds((v) => ({ ...v, [e.key]: ev.target.value }))} placeholder="+0.0" />
                          {s.windOverLimit ? <span className="badge" style={{ background: "var(--warning)", color: "#0b0b0b" }}>! &gt; +{WIND_LIMIT.toFixed(1)}</span> : null}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="text-lg font-bold">{s.points}</td>
                    <td>
                      <input className="input w-24" aria-label={`Objetivo de puntos en ${e.name}`} inputMode="numeric" value={targets[e.key] ?? ""} onChange={(ev) => setTargets((v) => ({ ...v, [e.key]: ev.target.value }))} placeholder={String(s.points)} />
                    </td>
                    <td className="whitespace-nowrap">
                      {needed != null ? (
                        <>
                          <strong>{showPerf(e, needed)}</strong>
                          {s.value != null ? <span className="muted ml-1 text-xs">({e.kind === "track" ? `${(needed - s.value).toFixed(2)} s` : `${needed - s.value >= 0 ? "+" : ""}${(needed - s.value).toFixed(2)} m`})</span> : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="muted whitespace-nowrap text-xs">{e.A} / {e.B} / {e.C}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3"><Alert kind={score.wind.recordLegal ? (score.wind.eventsOverLimit.length ? "amber" : "success") : "amber"}>{score.wind.message}</Alert></div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Objetivo total (pts)">
            <input className="input w-32" inputMode="numeric" value={goalTotal} onChange={(e) => setGoalTotal(e.target.value)} placeholder="7500" />
          </Field>
          <button className="btn" onClick={distribute}>Repartir entre pruebas</button>
          <button className="btn" onClick={() => setTargets({})}>Limpiar objetivos</button>
          <span className="flex-1" />
          <Field label="Nombre del resultado">
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Campeonato autonómico" />
          </Field>
          <Field label="Fecha">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <button className="btn btn-primary" onClick={save} disabled={score.total === 0}>Guardar resultado</button>
        </div>
        {msg ? <div className="mt-3"><Alert kind={msg.kind}>{msg.text}</Alert></div> : null}
        <p className="muted mt-3 text-xs">
          Carreras: P = ⌊A·(B − T)^C⌋ con T en segundos. Saltos: P = ⌊A·(M − B)^C⌋ con M en centímetros. Lanzamientos: P = ⌊A·(D − B)^C⌋ con D en metros. En combinadas la puntuación cuenta con cualquier viento; para récord, la media de las pruebas con anemómetro no debe superar +2,0 m/s.
        </p>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Puntos por prueba: actual frente a objetivo">
          <BarsChart
            data={score.events.map((s) => ({ prueba: s.event.key, actual: s.points, objetivo: targetPoints(s.event, s.points) }))}
            xKey="prueba"
            series={[
              { key: "actual", label: "Actual", color: 1 },
              { key: "objetivo", label: "Objetivo", color: 2 },
            ]}
            unit="pts"
          />
        </Card>
        <Card title={`Evolución · ${competition.name}`}>
          {history.length === 0 ? (
            <p className="muted py-6 text-center text-sm">Guarda resultados para ver la evolución de tus puntos.</p>
          ) : (
            <LinesChart data={history.map((h) => ({ fecha: formatDate(h.date), puntos: h.totalPoints }))} xKey="fecha" series={[{ key: "puntos", label: "Puntos", color: 1 }]} unit="pts" />
          )}
        </Card>
      </div>

      <Card title="Resultados guardados" className="mt-4">
        <DataTable
          rows={saved.data ?? []}
          onDelete={async (r) => {
            await api(`/api/combined?id=${r.id}`, { method: "DELETE" });
            saved.reload();
          }}
          columns={[
            { header: "Fecha", cell: (r) => formatDate(r.date) },
            { header: "Competición", cell: (r) => COMPETITIONS[r.competition]?.name ?? r.competition },
            { header: "Nombre", cell: (r) => r.label },
            { header: "Total", cell: (r) => <strong>{r.totalPoints.toLocaleString("es-ES")} pts</strong> },
            { header: "", cell: (r) => <button className="btn btn-sm" onClick={() => load(r)}>Cargar en la calculadora</button> },
          ]}
        />
      </Card>
    </div>
  );
}
