"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PHASE_COLOR, PHASE_LABEL, SPECIALTY_LABEL } from "@/lib/athletics/events";
import { formatDate } from "@/lib/dates";
import type { PlanSummary } from "@/lib/plans";

/** El JSON de la API serializa las fechas como texto. */
export type PlanSummaryJson = Omit<PlanSummary, "startDate" | "updatedAt"> & { startDate: string; updatedAt: string };

export function PlanCard({ plan, href, meId, actions }: { plan: PlanSummaryJson; href: string; meId?: string; actions?: ReactNode }) {
  const pct = plan.totalSessions ? Math.round((plan.completedSessions / plan.totalSessions) * 100) : 0;
  const role = meId ? (plan.ownerId === meId ? (plan.assignee ? `Creado por ti para ${plan.assignee.name}` : "Plan propio") : `Asignado por ${plan.owner.name}`) : `De ${plan.owner.name}${plan.assignee ? ` para ${plan.assignee.name}` : ""}`;
  return (
    <article className="card flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold">
            <Link href={href} className="hover:underline">
              {plan.title}
            </Link>
          </h3>
          <p className="muted text-xs">
            {SPECIALTY_LABEL[plan.specialty] ?? plan.specialty} · inicio {formatDate(plan.startDate)} · {plan.weeks} semanas
          </p>
        </div>
        <span className="badge shrink-0">{role}</span>
      </div>
      <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`Fases: ${plan.phases.map((p) => `${PHASE_LABEL[p.phase]} ${p.weeks} semanas`).join(", ")}`}>
        {plan.phases.map((p, i) => (
          <div key={i} style={{ flex: Math.max(1, p.weeks), background: PHASE_COLOR[p.phase] }} title={`${PHASE_LABEL[p.phase]} · ${p.weeks} sem.`} />
        ))}
      </div>
      <p className="ink-2 mt-1 text-xs">{plan.phases.map((p) => `${p.phase.replace("_", "-")} ${p.weeks}s`).join(" → ")}</p>
      <div className="mt-3">
        <div className="flex justify-between text-xs">
          <span className="ink-2">Sesiones completadas</span>
          <span className="font-semibold">
            {plan.completedSessions}/{plan.totalSessions} ({pct} %)
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
          <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={href} className="btn btn-primary btn-sm">
          Abrir
        </Link>
        {actions}
      </div>
    </article>
  );
}
