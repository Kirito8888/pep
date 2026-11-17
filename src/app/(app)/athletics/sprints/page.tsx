"use client";

import { useState } from "react";
import { LinesChart } from "@/components/charts";
import { Alert, Card, Field, PageHeader, Stat, Tabs } from "@/components/ui";
import { HURDLE_SPECS, hurdlePositions, hurdleRhythm, strideBetween, strideToFirst } from "@/lib/athletics/hurdles";
import { RELAYS, planRelay, type RelayKey } from "@/lib/athletics/relays";
import { SPLIT_MARKS, analyzeSplits, msToKmh, speedMs, sprintModel, type SprintDistance } from "@/lib/athletics/sprint";
import { num } from "@/lib/client";
import { formatTime, parseTime } from "@/lib/format";

type Tab = "splits" | "speed" | "hurdles" | "relays";

export default function SprintsPage() {
  const [tab, setTab] = useState<Tab>("splits");
  return (
    <div>
      <PageHeader title="Sector C · Velocidad, vallas y relevos" subtitle="60–400 m, 60/100/110/400 m vallas y 4×100, 4×200, 4×400: parciales, velocidad, ritmo entre vallas y planificación de postas." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "splits", label: "Calculadora de parciales" },
          { key: "speed", label: "Velocidad y lanzados" },
          { key: "hurdles", label: "Vallas" },
          { key: "relays", label: "Relevos" },
        ]}
      />
      {tab === "splits" ? <Splits /> : null}
      {tab === "speed" ? <Speed /> : null}
      {tab === "hurdles" ? <Hurdles /> : null}
      {tab === "relays" ? <Relays /> : null}
    </div>
  );
}

function Splits() {
  const [distance, setDistance] = useState<SprintDistance>(100);
  const [time, setTime] = useState("11.00");
  const [manual, setManual] = useState<Record<number, string>>({});
  const t = parseTime(time);
  const valid = Number.isFinite(t) && t > distance / 13 && t < distance / 2;
  const model = valid ? sprintModel(distance, t) : null;
  const marks = SPLIT_MARKS[distance];
  const real = analyzeSplits(marks, marks.map((m) => parseTime(manual[m] ?? "")));

  return (
    <div className="space-y-4">
      <Card title="Parciales estimados para una marca objetivo">
        <div className="grid max-w-lg grid-cols-2 gap-3">
          <Field label="Prueba">
            <select
              className="input"
              value={distance}
              onChange={(e) => {
                setDistance(Number(e.target.value) as SprintDistance);
                setManual({});
              }}
            >
              <option value={60}>60 m</option>
              <option value={100}>100 m</option>
              <option value={200}>200 m</option>
              <option value={400}>400 m</option>
            </select>
          </Field>
          <Field label="Marca objetivo" hint="Ej.: 10.85 o 1:02.30">
            <input className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        {!model ? (
          <div className="mt-3"><Alert kind="error">Introduce una marca realista para la distancia.</Alert></div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Velocidad media" value={model.avgMs.toFixed(2)} unit="m/s" hint={`${model.avgKmh.toFixed(1)} km/h`} />
              <Stat label="Velocidad máxima" value={model.vmaxMs.toFixed(2)} unit="m/s" hint={`${model.vmaxKmh.toFixed(1)} km/h`} />
              <Stat label="30 m lanzados" value={model.flying30.toFixed(2)} unit="s" hint="En el tramo más rápido" />
              <Stat label="Primer tramo" value={model.splits[0].segment.toFixed(2)} unit="s" hint={`0–${model.splits[0].to} m`} />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tramo</th>
                      <th>Parcial</th>
                      <th>Acumulado</th>
                      <th>m/s</th>
                      <th>km/h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.splits.map((s) => (
                      <tr key={s.to}>
                        <td className="font-medium">{s.from}–{s.to} m</td>
                        <td>{s.segment.toFixed(2)}</td>
                        <td>{formatTime(s.cumulative)}</td>
                        <td>{s.speedMs.toFixed(2)}</td>
                        <td>{s.speedKmh.toFixed(1)}</td>
                      </tr>
                    ))}
                    {model.hundreds.map((s) => (
                      <tr key={`h${s.to}`} className="font-semibold">
                        <td>{s.from}–{s.to} m (100 m)</td>
                        <td>{s.segment.toFixed(2)}</td>
                        <td>{formatTime(s.cumulative)}</td>
                        <td>{s.speedMs.toFixed(2)}</td>
                        <td>{s.speedKmh.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="ink-2 mb-1 text-xs font-semibold">Velocidad por tramo (m/s)</div>
                <LinesChart data={model.splits.map((s) => ({ tramo: `${s.to} m`, velocidad: Number(s.speedMs.toFixed(2)) }))} xKey="tramo" series={[{ key: "velocidad", label: "Velocidad", color: 1 }]} unit="m/s" />
              </div>
            </div>
            <p className="muted mt-3 text-xs">{model.note} Es una estimación orientativa, no una medición.</p>
          </>
        )}
      </Card>
      <Card title="Analizar parciales reales (tiempos acumulados)">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
          {marks.map((m) => (
            <Field key={m} label={`${m} m`}>
              <input className="input" value={manual[m] ?? ""} onChange={(e) => setManual((s) => ({ ...s, [m]: e.target.value }))} placeholder="—" />
            </Field>
          ))}
        </div>
        {real.length > 0 ? (
          <table className="table mt-3">
            <thead>
              <tr>
                <th>Tramo</th>
                <th>Parcial</th>
                <th>m/s</th>
                <th>km/h</th>
                {model ? <th>Dif. con el modelo</th> : null}
              </tr>
            </thead>
            <tbody>
              {real.map((s) => {
                const ref = model?.splits.find((x) => x.to === s.to && x.from === s.from);
                const diff = ref ? s.segment - ref.segment : null;
                return (
                  <tr key={s.to}>
                    <td className="font-medium">{s.from}–{s.to} m</td>
                    <td>{s.segment.toFixed(2)} s</td>
                    <td>{s.speedMs.toFixed(2)}</td>
                    <td>{s.speedKmh.toFixed(1)}</td>
                    {model ? <td>{diff != null ? `${diff > 0 ? "+" : ""}${diff.toFixed(2)} s` : "—"}</td> : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted mt-3 text-sm">Introduce los tiempos de paso (fotocélulas o vídeo) para obtener la velocidad de cada tramo.</p>
        )}
      </Card>
    </div>
  );
}

function Speed() {
  const [distance, setDistance] = useState("30");
  const [time, setTime] = useState("2.95");
  const d = num(distance) ?? 0;
  const t = parseTime(time);
  const v = Number.isFinite(t) ? speedMs(d, t) : 0;
  const refs = [
    { label: "10 m lanzados", d: 10 },
    { label: "20 m lanzados", d: 20 },
    { label: "30 m lanzados", d: 30 },
    { label: "50 m", d: 50 },
    { label: "100 m", d: 100 },
    { label: "200 m", d: 200 },
    { label: "400 m", d: 400 },
  ];
  return (
    <Card title="Conversor de velocidad">
      <div className="grid max-w-lg grid-cols-2 gap-3">
        <Field label="Distancia (m)">
          <input className="input" inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} />
        </Field>
        <Field label="Tiempo" hint="Segundos o m:ss.cc">
          <input className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4 grid max-w-lg grid-cols-2 gap-3">
        <Stat label="Velocidad" value={v.toFixed(2)} unit="m/s" />
        <Stat label="Velocidad" value={msToKmh(v).toFixed(1)} unit="km/h" />
      </div>
      <h3 className="card-title mt-6">Equivalencias a esa velocidad constante</h3>
      <table className="table max-w-lg">
        <thead>
          <tr>
            <th>Tramo</th>
            <th>Tiempo</th>
          </tr>
        </thead>
        <tbody>
          {refs.map((r) => (
            <tr key={r.label}>
              <td className="font-medium">{r.label}</td>
              <td>{v > 0 ? formatTime(r.d / v) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted mt-3 text-xs">Los tramos lanzados (10, 20 y 30 m) miden la velocidad máxima; a partir de 50 m la equivalencia ignora la aceleración y la pérdida de velocidad.</p>
    </Card>
  );
}

function Hurdles() {
  const [key, setKey] = useState("110mH_M");
  const spec = HURDLE_SPECS.find((s) => s.key === key) ?? HURDLE_SPECS[0];
  const [between, setBetween] = useState<number | null>(null);
  const [toFirst, setToFirst] = useState<number | null>(null);
  const [goal, setGoal] = useState("14.50");
  const stepsB = between && spec.stepsBetween.includes(between) ? between : spec.stepsBetween[Math.min(1, spec.stepsBetween.length - 1)];
  const stepsF = toFirst && spec.stepsToFirst.includes(toFirst) ? toFirst : spec.stepsToFirst[spec.stepsToFirst.length - 1];
  const t = parseTime(goal);
  const rhythm = Number.isFinite(t) && t > 0 ? hurdleRhythm(spec, t, stepsB) : null;
  const positions = hurdlePositions(spec);

  return (
    <div className="space-y-4">
      <Card title="Configurador de vallas">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Prueba y categoría" className="col-span-2">
            <select className="input" value={key} onChange={(e) => setKey(e.target.value)}>
              {HURDLE_SPECS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Pasos a la 1.ª valla">
            <select className="input" value={stepsF} onChange={(e) => setToFirst(Number(e.target.value))}>
              {spec.stepsToFirst.map((n) => (
                <option key={n} value={n}>{n} pasos</option>
              ))}
            </select>
          </Field>
          <Field label="Pasos entre vallas">
            <select className="input" value={stepsB} onChange={(e) => setBetween(Number(e.target.value))}>
              {spec.stepsBetween.map((n) => (
                <option key={n} value={n}>{n} pasos</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Altura" value={spec.heightM.toFixed(3)} unit="m" />
          <Stat label="Salida → 1.ª valla" value={spec.toFirst.toFixed(2)} unit="m" />
          <Stat label="Entre vallas" value={spec.spacing.toFixed(2)} unit="m" />
          <Stat label="Última → meta" value={spec.runIn.toFixed(2)} unit="m" />
          <Stat label="Nº de vallas" value={spec.hurdles} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label={`Zancada media con ${stepsB} pasos`} value={strideBetween(spec, stepsB).toFixed(2)} unit="m" hint={`Descontando ${spec.clearance.toFixed(2)} m de paso de valla`} />
          <Stat label={`Zancada media a la 1.ª (${stepsF} pasos)`} value={strideToFirst(spec, stepsF).toFixed(2)} unit="m" />
          <Stat label="Posición de las vallas" value={`${positions[0]} … ${positions[positions.length - 1]}`} unit="m" />
        </div>
      </Card>
      <Card title="Ritmo objetivo (touchdowns)">
        <div className="max-w-xs">
          <Field label="Marca objetivo">
            <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} />
          </Field>
        </div>
        {rhythm ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Intervalo medio" value={rhythm.avgInterval.toFixed(2)} unit="s" />
              <Stat label="Frecuencia entre vallas" value={rhythm.cadence.toFixed(2)} unit="pasos/s" />
              <Stat label="1.ª valla" value={rhythm.touchdowns[0].time.toFixed(2)} unit="s" />
              <Stat label="Última → meta" value={rhythm.runInTime.toFixed(2)} unit="s" />
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Valla</th>
                    <th>Posición</th>
                    <th>Contacto tras la valla</th>
                    <th>Intervalo</th>
                  </tr>
                </thead>
                <tbody>
                  {rhythm.touchdowns.map((td) => (
                    <tr key={td.hurdle}>
                      <td className="font-medium">{td.hurdle}</td>
                      <td>{td.position.toFixed(2)} m</td>
                      <td>{formatTime(td.time)}</td>
                      <td>{td.interval.toFixed(2)} s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted mt-2 text-xs">Modelo orientativo: en vallas cortas los intervalos son casi constantes; en 400 mv crecen ≈ 2 % por valla y suele ser necesario cambiar el patrón de pasos en la segunda mitad.</p>
          </>
        ) : (
          <div className="mt-3"><Alert kind="error">Introduce una marca válida.</Alert></div>
        )}
      </Card>
    </div>
  );
}

function Relays() {
  const [key, setKey] = useState<RelayKey>("4x100");
  const relay = RELAYS[key];
  const defaults: Record<RelayKey, string[]> = { "4x100": ["10.90", "10.75", "11.00", "10.60"], "4x200": ["22.10", "21.80", "22.30", "21.60"], "4x400": ["49.50", "48.80", "50.10", "48.20"] };
  const [names, setNames] = useState(["", "", "", ""]);
  const [times, setTimes] = useState<Record<RelayKey, string[]>>(defaults);
  const [efficiency, setEfficiency] = useState(85);
  const [exchange, setExchange] = useState("22");
  const legs = times[key].map((t, i) => ({ name: names[i], time: parseTime(t) }));
  const valid = legs.every((l) => Number.isFinite(l.time) && l.time > 0);
  const plan = valid ? planRelay(relay, legs, efficiency / 100, Math.min(relay.zone, Math.max(5, num(exchange) ?? 22))) : null;

  return (
    <div className="space-y-4">
      <Card title="Planificador de relevos">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Relevo">
            <select className="input" value={key} onChange={(e) => setKey(e.target.value as RelayKey)}>
              {Object.values(RELAYS).map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </Field>
          <Field label={`Eficiencia de los cambios: ${efficiency} %`} className="md:col-span-2" hint="100 % = entrega perfecta a máxima velocidad.">
            <input type="range" min={40} max={100} value={efficiency} onChange={(e) => setEfficiency(Number(e.target.value))} className="w-full" />
          </Field>
          <Field label="Punto de entrega en la zona (m)" hint={`Zona de transferencia: ${relay.zone} m.`}>
            <input className="input" inputMode="decimal" value={exchange} onChange={(e) => setExchange(e.target.value)} disabled={relay.leg === 400} />
          </Field>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-600">Posta {i + 1}</div>
              <Field label="Atleta">
                <input className="input" value={names[i]} onChange={(e) => setNames((n) => n.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Corredor ${i + 1}`} />
              </Field>
              <Field label={`Marca en ${relay.leg} m`} className="mt-2">
                <input className="input" value={times[key][i]} onChange={(e) => setTimes((t) => ({ ...t, [key]: t[key].map((x, j) => (j === i ? e.target.value : x)) }))} />
              </Field>
              <p className="muted mt-2 text-xs">{relay.legNotes[i]}</p>
            </div>
          ))}
        </div>
      </Card>
      {plan ? (
        <Card title="Estimación">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="Tiempo estimado" value={formatTime(plan.total)} />
            <Stat label="Suma de marcas individuales" value={formatTime(plan.sumFlat)} />
            <Stat label="Ganancia por cambios" value={plan.gain.toFixed(2)} unit="s" />
          </div>
          <table className="table mt-3">
            <thead>
              <tr>
                <th>Posta</th>
                <th>Atleta</th>
                <th>Marca individual</th>
                <th>Parcial estimado</th>
                <th>Marca de salida (go-mark)</th>
              </tr>
            </thead>
            <tbody>
              {plan.legs.map((l) => (
                <tr key={l.order}>
                  <td className="font-medium">{l.order}</td>
                  <td>{l.name}</td>
                  <td>{formatTime(l.flatTime)}</td>
                  <td>{formatTime(l.estimatedSplit)}</td>
                  <td>{l.goMark != null ? `${l.goMark.toFixed(2)} m (${Math.round(l.goMarkFeet ?? 0)} pies)` : relay.leg === 400 ? "Cambio visual" : "Sale de tacos"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted mt-2 text-xs">
            La marca de salida es la distancia por detrás del receptor a la que debe pasar el portador para que el receptor arranque; se calcula con la velocidad de llegada del portador y la aceleración del receptor hasta el punto de entrega. Ajústala ±1 pie en entrenamiento.
          </p>
        </Card>
      ) : (
        <Alert kind="error">Introduce las cuatro marcas individuales.</Alert>
      )}
    </div>
  );
}
