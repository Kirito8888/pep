"use client";

import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="ink-2 mt-1 max-w-3xl text-sm">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {title || actions ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? <h2 className="card-title !mb-0">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, unit, hint }: { label: string; value: ReactNode; unit?: string; hint?: ReactNode }) {
  return (
    <div className="card">
      <div className="muted text-xs font-medium uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-2xl font-bold">
        {value}
        {unit ? <span className="ink-2 ml-1 text-sm font-medium">{unit}</span> : null}
      </div>
      {hint ? <div className="ink-2 mt-1 text-xs">{hint}</div> : null}
    </div>
  );
}

export function Field({ label, children, className = "", hint }: { label: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="muted mt-1 block text-xs">{hint}</span> : null}
    </label>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b" style={{ borderColor: "var(--border)" }} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
            value === t.key ? "border-brand-600 text-brand-600 dark:text-brand-400" : "ink-2 border-transparent hover:border-[var(--axis)]"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export type LightColor = "green" | "amber" | "red";

const LIGHT: Record<LightColor, { color: string; label: string; icon: string }> = {
  green: { color: "var(--good)", label: "Verde", icon: "✓" },
  amber: { color: "var(--warning)", label: "Ámbar", icon: "!" },
  red: { color: "var(--critical)", label: "Rojo", icon: "✕" },
};

/** Semáforo: color + icono + texto (nunca solo color). */
export function Light({ status, label }: { status: LightColor; label?: string }) {
  const l = LIGHT[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      <span
        aria-hidden
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
        style={{ background: l.color, color: status === "amber" ? "#0b0b0b" : "#ffffff" }}
      >
        {l.icon}
      </span>
      {label ?? l.label}
    </span>
  );
}

export function Alert({ kind = "info", children }: { kind?: "info" | "error" | "success" | "amber" | "red"; children: ReactNode }) {
  const color = kind === "error" || kind === "red" ? "var(--critical)" : kind === "amber" ? "var(--warning)" : kind === "success" ? "var(--good)" : "var(--series-1)";
  return (
    <div className="rounded-lg border-l-4 px-3 py-2 text-sm" style={{ borderColor: color, background: "var(--surface-2)" }} role={kind === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="muted py-6 text-center text-sm">{children}</p>;
}

export function Loading() {
  return <p className="muted py-6 text-center text-sm">Cargando…</p>;
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({ rows, columns, onDelete, empty = "Sin registros todavía." }: { rows: T[]; columns: Column<T>[]; onDelete?: (row: T) => void; empty?: string }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.header} className={c.className}>
                {c.header}
              </th>
            ))}
            {onDelete ? <th className="w-8" /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {columns.map((c) => (
                <td key={c.header} className={c.className}>
                  {c.cell(r)}
                </td>
              ))}
              {onDelete ? (
                <td>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(r)} aria-label="Eliminar registro">
                    ✕
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
