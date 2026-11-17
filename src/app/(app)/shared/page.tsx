"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlanCard, type PlanSummaryJson } from "@/components/planner/PlanCard";
import { Alert, Card, Empty, Loading, PageHeader } from "@/components/ui";
import { api, errorMessage, useFetch } from "@/lib/client";

interface Plans {
  mine: PlanSummaryJson[];
  shared: PlanSummaryJson[];
}
interface Me {
  id: string;
}

export default function SharedPage() {
  const router = useRouter();
  const plans = useFetch<Plans>("/api/plans");
  const me = useFetch<Me>("/api/me");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function clone(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await api<{ id: string }>(`/api/plans/${id}/clone`, { method: "POST", body: {} });
      router.push(`/planner/${res.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  const meId = me.data?.id;
  const withFriends = (plans.data?.mine ?? []).filter((p) => p.assigneeId !== null && (p.ownerId === meId || p.assigneeId === meId));

  return (
    <div>
      <PageHeader
        title="Planificaciones compartidas"
        subtitle="Planes de tus amigos conectados y planes que os habéis asignado mutuamente. Puedes verlos, comentar las sesiones y clonarlos a tu cuenta."
        actions={
          <Link href="/friends" className="btn">
            Gestionar amigos
          </Link>
        }
      />
      {error ? <div className="mb-3"><Alert kind="error">{error}</Alert></div> : null}
      {plans.loading && !plans.data ? <Loading /> : null}
      {plans.error ? <Alert kind="error">{plans.error}</Alert> : null}
      {plans.data ? (
        <div className="space-y-6">
          <section>
            <h2 className="card-title">Asignadas entre mis amigos y yo</h2>
            {withFriends.length === 0 ? (
              <Card>
                <Empty>Ninguna planificación asignada. Desde el planificador o el generador puedes crear un plan «para» un amigo.</Empty>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {withFriends.map((p) => (
                  <PlanCard key={p.id} plan={p} href={`/planner/${p.id}`} meId={meId} />
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="card-title">Planificaciones de mis amigos</h2>
            {plans.data.shared.length === 0 ? (
              <Card>
                <Empty>Tus amigos aún no tienen planificaciones visibles, o todavía no has añadido amigos.</Empty>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {plans.data.shared.map((p) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    href={`/shared/${p.id}`}
                    actions={
                      <button className="btn btn-sm" disabled={busy === p.id} onClick={() => clone(p.id)}>
                        {busy === p.id ? "Clonando…" : "Clonar planificación a mi cuenta"}
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
