"use client";

import Link from "next/link";
import { BarsChart, LinesChart } from "@/components/charts";
import { FatiguePanel } from "@/components/FatiguePanel";
import { Alert, Card, Empty, Loading, PageHeader, Stat } from "@/components/ui";
import { SPECIALTY_LABEL } from "@/lib/athletics/events";
import { useFetch } from "@/lib/client";
import type { DashboardData } from "@/lib/dashboard";
import { formatDate, formatDateLong } from "@/lib/dates";

type StatKey = "throws" | "contacts" | "sprint" | "distance" | "tonnage" | "hurdles";

/** Orden de las tarjetas según la especialidad del atleta. */
const PRIORITY: Record<string, StatKey[]> = {
  JAVELIN: ["throws", "tonnage", "contacts", "sprint"],
  THROWS_ROTATIONAL: ["throws", "tonnage", "contacts", "sprint"],
  THROWS_LINEAR: ["throws", "tonnage", "contacts", "sprint"],
  JUMPS: ["contacts", "sprint", "tonnage", "hurdles"],
  SPRINTS_HURDLES: ["sprint", "hurdles", "contacts", "tonnage"],
  ENDURANCE: ["distance", "tonnage", "sprint", "contacts"],
  COMBINED: ["sprint", "throws", "contacts", "tonnage", "hurdles", "distance"],
  HYPERTROPHY: ["tonnage", "distance"],
  MAX_STRENGTH: ["tonnage", "distance"],
  HYBRID: ["tonnage", "distance", "sprint"],
};

const SCOPE_LABEL = { own: "Mi plan", assigned: "Asignado por", friend: "Plan de" } as const;

export default function DashboardPage() {
  const { data, error, loading } = useFetch<DashboardData>("/api/dashboard");
  if (loading && !data) return <Loading />;
  if (error || !data) return <Alert kind="error">{error ?? "No se pudo cargar el panel"}</Alert>;

  const t = data.planned.totals;
  const stats: Record<StatKey, React.ReactNode> = {
    throws: <Stat key="throws" label="Lanzamientos" value={t.throwsTotal} hint={`Planificados · ${t.throwsHigh} a > 90 % · registrados: ${data.logged.throwsTotal}`} />,
    contacts: <Stat key="contacts" label="Contactos de salto" value={t.plyoContacts} hint={`Planificados · registrados: ${data.logged.plyoContacts}`} />,
    sprint: <Stat key="sprint" label="Sprint en pista" value={t.sprintMetersTotal.toLocaleString("es-ES")} unit="m" hint={`${t.sprintMetersHigh} m a > 95 %`} />,
    distance: <Stat key="distance" label="Carrera continua / series" value={(t.distanceM / 1000).toFixed(1)} unit="km" hint={`Planificados · registrados: ${data.logged.km} km`} />,
    tonnage: <Stat key="tonnage" label="Tonelaje de gimnasio" value={Math.round(t.tonnageKg).toLocaleString("es-ES")} unit="kg" hint={`Planificado · registrado: ${data.logged.tonnage.toLocaleString("es-ES")} kg`} />,
    hurdles: <Stat key="hurdles" label="Vallas pasadas" value={t.hurdles} hint="Planificadas esta semana" />,
  };
  const order = PRIORITY[data.user.specialty] ?? PRIORITY.COMBINED;
  const implementRows = Object.entries(t.throwsByImplement).sort((a, b) => b[1] - a[1]);
  const showThrows = order.includes("throws");
  const showCombined = data.combined.length > 0;

  return (
    <div>
      <PageHeader
        title={`Hola, ${data.user.name.split(" ")[0]}`}
        subtitle={`Resumen de la semana del ${formatDate(data.weekStart)} · Perfil: ${SPECIALTY_LABEL[data.user.specialty] ?? data.user.specialty}`}
        actions={
          <>
            <Link href="/generator" className="btn btn-primary">
              Generar planificación
            </Link>
            <Link href="/planner" className="btn">
              Abrir planificador
            </Link>
          </>
        }
      />

      {data.pendingRequests > 0 ? (
        <div className="mb-4">
          <Alert>
            Tienes {data.pendingRequests} solicitud(es) de amistad pendiente(s).{" "}
            <Link href="/friends" className="font-semibold underline">
              Revisar
            </Link>
          </Alert>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sesiones de la semana" value={`${data.completedSessions}/${data.plannedSessions}`} hint="Completadas / planificadas" />
        {order.slice(0, 3).map((k) => stats[k])}
      </div>
      {order.length > 3 ? <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{order.slice(3).map((k) => stats[k])}</div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Semáforo de fatiga · alertas de sobrecarga">
          {data.plannedSessions === 0 ? (
            <Empty>No hay sesiones planificadas esta semana. Crea o genera una planificación para activar el semáforo.</Empty>
          ) : (
            <FatiguePanel fatigue={data.planned} />
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Próximos entrenamientos (propios y compartidos)">
            {data.upcoming.length === 0 ? (
              <Empty>No hay sesiones en los próximos 7 días.</Empty>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                {data.upcoming.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2" style={{ borderColor: "var(--border)" }}>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{s.title}</div>
                      <div className="muted truncate text-xs">
                        {formatDateLong(s.date)} · {s.planTitle}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="badge">
                        {SCOPE_LABEL[s.scope]}
                        {s.scope !== "own" ? ` ${s.person}` : ""}
                      </span>
                      <Link href={`${s.scope === "friend" ? "/shared" : "/planner"}/${s.planId}`} className="btn btn-sm">
                        Ver
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {showThrows ? (
            <Card title="Lanzamientos por implemento (semana)">
              {implementRows.length === 0 && data.logged.throwsByImplement.length === 0 ? (
                <Empty>Sin lanzamientos planificados ni registrados esta semana.</Empty>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Implemento</th>
                      <th>Planificados</th>
                      <th>Registrados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...new Set([...implementRows.map((r) => r[0]), ...data.logged.throwsByImplement.map((r) => r.implement)])].map((name) => (
                      <tr key={name}>
                        <td className="font-medium">{name}</td>
                        <td>{t.throwsByImplement[name] ?? 0}</td>
                        <td>{data.logged.throwsByImplement.find((r) => r.implement === name)?.count ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Tonelaje registrado en gimnasio · últimas 8 semanas">
          <BarsChart data={data.trend.map((p) => ({ semana: p.week, tonelaje: p.tonnage }))} xKey="semana" series={[{ key: "tonelaje", label: "Tonelaje", color: 1 }]} unit="kg" />
        </Card>
        {data.user.specialty === "ENDURANCE" || data.user.specialty === "HYBRID" ? (
          <Card title="Kilómetros registrados · últimas 8 semanas">
            <BarsChart data={data.trend.map((p) => ({ semana: p.week, km: p.km }))} xKey="semana" series={[{ key: "km", label: "Kilómetros", color: 3 }]} unit="km" />
          </Card>
        ) : (
          <Card title="Lanzamientos y contactos registrados · últimas 8 semanas">
            <BarsChart
              data={data.trend.map((p) => ({ semana: p.week, lanzamientos: p.throws, contactos: p.contacts }))}
              xKey="semana"
              series={[
                { key: "lanzamientos", label: "Lanzamientos", color: 2 },
                { key: "contactos", label: "Contactos pliométricos", color: 3 },
              ]}
            />
          </Card>
        )}
        {showCombined ? (
          <Card title="Evolución de puntos en combinadas" className="xl:col-span-2">
            <LinesChart data={data.combined.map((c) => ({ fecha: formatDate(c.date), puntos: c.total }))} xKey="fecha" series={[{ key: "puntos", label: "Puntos", color: 1 }]} unit="pts" />
            <p className="muted mt-2 text-xs">{data.combined.map((c) => `${formatDate(c.date)}: ${c.label} — ${c.total} pts`).join(" · ")}</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
