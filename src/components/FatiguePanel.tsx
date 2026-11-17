"use client";

import { BarsChart } from "@/components/charts";
import { Alert, Light } from "@/components/ui";
import type { WeekFatigue } from "@/lib/load/fatigue";

const LEVEL_LABEL = { rest: "Descanso", low: "Baja", moderate: "Media", high: "Alta" } as const;

/** Semáforo de fatiga neural (SNC) y estrés articular de una semana. */
export function FatiguePanel({ fatigue, compact = false }: { fatigue: WeekFatigue; compact?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <div>
          <div className="muted text-xs uppercase tracking-wide">Sistema nervioso central</div>
          <Light status={fatigue.neuralLight} />
        </div>
        <div>
          <div className="muted text-xs uppercase tracking-wide">Estrés articular</div>
          <Light status={fatigue.jointLight} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {fatigue.indicators.map((i) => (
          <div key={i.key} className="rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
            <div className="muted text-[11px] uppercase tracking-wide">{i.label}</div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-bold">
                {i.value.toLocaleString("es-ES")}
                {i.unit ? <span className="ink-2 ml-1 text-xs font-medium">{i.unit}</span> : null}
              </span>
              <Light status={i.light} label="" />
            </div>
            <div className="muted text-[11px]">
              Ámbar ≥ {i.amber.toLocaleString("es-ES")} · Rojo ≥ {i.red.toLocaleString("es-ES")}
            </div>
          </div>
        ))}
      </div>

      {!compact ? (
        <>
          <div>
            <div className="ink-2 mb-1 text-xs font-semibold">Carga diaria (puntos): alta demanda a partir de 6</div>
            <BarsChart
              data={fatigue.days.map((d) => ({ dia: d.label.slice(0, 3), neural: d.neural, articular: d.joint }))}
              xKey="dia"
              series={[
                { key: "neural", label: "Neural (SNC)", color: 1 },
                { key: "articular", label: "Articular", color: 2 },
              ]}
              height={200}
              unit="pts"
              reference={{ y: 6, label: "Alta demanda" }}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Neural</th>
                  <th>Articular</th>
                  <th>Sprint &gt;95 %</th>
                  <th>Vallas</th>
                  <th>Contactos</th>
                  <th>Lanz. (&gt;90 %)</th>
                  <th>Tonelaje</th>
                </tr>
              </thead>
              <tbody>
                {fatigue.days.map((d) => (
                  <tr key={d.day}>
                    <td className="font-medium">{d.label}</td>
                    <td>{LEVEL_LABEL[d.neuralLevel]}</td>
                    <td>{LEVEL_LABEL[d.jointLevel]}</td>
                    <td>{d.metrics.sprintMetersHigh} m</td>
                    <td>{d.metrics.hurdles}</td>
                    <td>{d.metrics.plyoContacts}</td>
                    <td>
                      {d.metrics.throwsTotal} ({d.metrics.throwsHigh})
                    </td>
                    <td>{Math.round(d.metrics.tonnageKg).toLocaleString("es-ES")} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <div className="space-y-2">
        {fatigue.alerts.length === 0 ? (
          <Alert kind="success">Sin alertas: la distribución de la carga respeta la recuperación neural y articular.</Alert>
        ) : (
          fatigue.alerts.map((a, i) => (
            <Alert key={i} kind={a.severity}>
              <strong>{a.severity === "red" ? "Alerta" : "Aviso"}:</strong> {a.message}
            </Alert>
          ))
        )}
      </div>
    </div>
  );
}
