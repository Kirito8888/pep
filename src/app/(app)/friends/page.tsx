"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert, Card, Empty, Field, PageHeader } from "@/components/ui";
import { SPECIALTY_LABEL } from "@/lib/athletics/events";
import { api, errorMessage, useFetch } from "@/lib/client";

interface Person {
  id: string;
  name: string;
  email?: string;
  specialty: string;
}
interface FriendsData {
  inviteCode: string;
  friends: { friendshipId: string; user: Person }[];
  incoming: { friendshipId: string; user: Person }[];
  outgoing: { friendshipId: string; user: Person }[];
}
interface SearchResult extends Person {
  relation: "none" | "friends" | "sent" | "received";
  friendshipId: string | null;
}

export default function FriendsPage() {
  const friends = useFetch<FriendsData>("/api/friends");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    const id = window.setTimeout(() => {
      api<SearchResult[]>(`/api/users/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => alive && setResults(r))
        .catch(() => alive && setResults([]));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [q, tick]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setMsg(null);
    try {
      await fn();
      setMsg({ kind: "success", text: ok });
      friends.reload();
      setTick((t) => t + 1);
    } catch (err) {
      setMsg({ kind: "error", text: errorMessage(err) });
    }
  }

  const respond = (id: string, action: "accept" | "reject") => act(() => api(`/api/friends/requests/${id}`, { method: "PATCH", body: { action } }), action === "accept" ? "Solicitud aceptada: ya podéis ver vuestras planificaciones." : "Solicitud rechazada.");
  const remove = (id: string, ok: string) => act(() => api(`/api/friends/requests/${id}`, { method: "DELETE" }), ok);

  async function redeem(e: FormEvent) {
    e.preventDefault();
    await act(async () => {
      await api("/api/friends/invite", { body: { code } });
      setCode("");
    }, "Código canjeado: ya sois amigos.");
  }

  const d = friends.data;
  const person = (p: Person) => (
    <div className="min-w-0">
      <div className="truncate text-sm font-semibold">{p.name}</div>
      <div className="muted truncate text-xs">{SPECIALTY_LABEL[p.specialty] ?? p.specialty}</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Amigos" subtitle="Conecta con compañeros de entrenamiento, atletas o tu entrenador para compartir planificaciones." />
      {msg ? <div className="mb-4"><Alert kind={msg.kind}>{msg.text}</Alert></div> : null}
      {friends.error ? <div className="mb-4"><Alert kind="error">{friends.error}</Alert></div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Buscar usuarios">
          <Field label="Nombre o email (mínimo 2 caracteres)">
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" />
          </Field>
          <ul className="mt-3 divide-y" style={{ borderColor: "var(--border)" }}>
            {q.trim().length >= 2 && results.length === 0 ? <li className="muted py-3 text-sm">Sin resultados.</li> : null}
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2" style={{ borderColor: "var(--border)" }}>
                {person(r)}
                {r.relation === "none" ? (
                  <button className="btn btn-primary btn-sm" onClick={() => act(() => api("/api/friends/requests", { body: { userId: r.id } }), `Solicitud enviada a ${r.name}.`)}>
                    Enviar solicitud
                  </button>
                ) : r.relation === "friends" ? (
                  <span className="badge">✓ Amigos</span>
                ) : r.relation === "sent" ? (
                  <span className="badge">Solicitud enviada</span>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => r.friendshipId && respond(r.friendshipId, "accept")}>
                    Aceptar solicitud
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Código de invitación">
          <p className="ink-2 text-sm">Comparte tu código: quien lo introduzca quedará conectado contigo directamente, sin solicitud.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded-lg px-4 py-2 text-xl font-black tracking-[0.25em]" style={{ background: "var(--surface-2)" }}>
              {d?.inviteCode ?? "········"}
            </code>
            <button
              className="btn btn-sm"
              disabled={!d}
              onClick={async () => {
                if (!d) return;
                try {
                  await navigator.clipboard.writeText(d.inviteCode);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                } catch {
                  setMsg({ kind: "error", text: "No se pudo copiar: selecciona el código manualmente." });
                }
              }}
            >
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
          <form onSubmit={redeem} className="mt-4 flex flex-wrap items-end gap-2">
            <Field label="Introducir el código de un amigo">
              <input className="input uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD2345" maxLength={20} />
            </Field>
            <button className="btn btn-primary" disabled={code.trim().length < 4}>
              Canjear
            </button>
          </form>
        </Card>

        <Card title={`Solicitudes recibidas (${d?.incoming.length ?? 0})`}>
          {!d || d.incoming.length === 0 ? (
            <Empty>No tienes solicitudes pendientes.</Empty>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {d.incoming.map((r) => (
                <li key={r.friendshipId} className="flex items-center justify-between gap-3 py-2" style={{ borderColor: "var(--border)" }}>
                  {person(r.user)}
                  <div className="flex gap-2">
                    <button className="btn btn-primary btn-sm" onClick={() => respond(r.friendshipId, "accept")}>Aceptar</button>
                    <button className="btn btn-sm" onClick={() => respond(r.friendshipId, "reject")}>Rechazar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {d && d.outgoing.length > 0 ? (
            <>
              <h3 className="card-title mt-4">Enviadas</h3>
              <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                {d.outgoing.map((r) => (
                  <li key={r.friendshipId} className="flex items-center justify-between gap-3 py-2" style={{ borderColor: "var(--border)" }}>
                    {person(r.user)}
                    <button className="btn btn-sm" onClick={() => remove(r.friendshipId, "Solicitud cancelada.")}>Cancelar</button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Card>

        <Card title={`Mis amigos (${d?.friends.length ?? 0})`}>
          {!d || d.friends.length === 0 ? (
            <Empty>Aún no tienes amigos conectados.</Empty>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {d.friends.map((r) => (
                <li key={r.friendshipId} className="flex items-center justify-between gap-3 py-2" style={{ borderColor: "var(--border)" }}>
                  {person(r.user)}
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar a ${r.user.name} de tus amigos? Dejaréis de ver vuestras planificaciones.`)) void remove(r.friendshipId, "Amistad eliminada.");
                    }}
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
