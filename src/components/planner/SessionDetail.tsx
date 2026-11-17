"use client";

import { useEffect, useState } from "react";
import { Alert, Card, Field } from "@/components/ui";
import { api, errorMessage, useFetch } from "@/lib/client";
import { formatDateLong, toDateInput } from "@/lib/dates";
import type { PlanPermissions } from "@/lib/permissions";
import { SessionBlocksView, SessionEditor } from "./SessionEditor";
import { toEditable, type EditableSession, type SessionNode } from "./types";

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; name: string };
}

const FEELINGS = ["Muy mal", "Mal", "Normal", "Bien", "Excelente"];

export function SessionDetail({ session, perms, onChanged, onClose }: { session: SessionNode; perms: PlanPermissions; onChanged: () => void; onClose: () => void }) {
  const [draft, setDraft] = useState<EditableSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(session.completed);
  const [feeling, setFeeling] = useState<string>(session.feeling != null ? String(session.feeling) : "");
  const [rpe, setRpe] = useState<string>(session.sessionRpe != null ? String(session.sessionRpe) : "");
  const [notes, setNotes] = useState(session.athleteNotes);
  const [comment, setComment] = useState("");
  const [moveDate, setMoveDate] = useState(toDateInput(session.date));
  const comments = useFetch<Comment[]>(`/api/sessions/${session.id}/comments`);

  useEffect(() => {
    setDraft(null);
    setError(null);
    setCompleted(session.completed);
    setFeeling(session.feeling != null ? String(session.feeling) : "");
    setRpe(session.sessionRpe != null ? String(session.sessionRpe) : "");
    setNotes(session.athleteNotes);
    setMoveDate(toDateInput(session.date));
  }, [session.id, session.completed, session.feeling, session.sessionRpe, session.athleteNotes, session.date]);

  async function run(fn: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      after?.();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title={`${session.title} · ${formatDateLong(session.date)}`}
      actions={
        <div className="flex flex-wrap gap-2">
          {session.completed ? <span className="badge" style={{ background: "var(--good)", color: "#fff" }}>✓ Completada</span> : <span className="badge">Pendiente</span>}
          {perms.canEdit && !draft ? (
            <button className="btn btn-sm" onClick={() => setDraft(toEditable(session))}>
              Editar bloques
            </button>
          ) : null}
          <button className="btn btn-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>
      }
    >
      {error ? <div className="mb-3"><Alert kind="error">{error}</Alert></div> : null}

      {draft ? (
        <div>
          <SessionEditor value={draft} onChange={setDraft} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="btn btn-primary"
              disabled={busy || !draft.title.trim() || draft.blocks.some((b) => b.exercises.some((e) => !e.name.trim()))}
              onClick={() => run(() => api(`/api/sessions/${session.id}`, { method: "PUT", body: draft }), () => setDraft(null))}
            >
              Guardar cambios
            </button>
            <button className="btn" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            {draft.blocks.some((b) => b.exercises.some((e) => !e.name.trim())) ? <span className="muted self-center text-xs">Hay ejercicios sin nombre.</span> : null}
          </div>
        </div>
      ) : (
        <SessionBlocksView blocks={toEditable(session).blocks} />
      )}

      {perms.canEdit && !draft ? (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          <Field label="Mover a otra fecha">
            <input className="input" type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} />
          </Field>
          <button className="btn" disabled={busy || moveDate === toDateInput(session.date)} onClick={() => run(() => api(`/api/sessions/${session.id}`, { method: "PATCH", body: { date: moveDate } }))}>
            Mover
          </button>
          <span className="flex-1" />
          <button
            className="btn btn-danger"
            disabled={busy}
            onClick={() => {
              if (window.confirm("¿Eliminar esta sesión? No se puede deshacer.")) void run(() => api(`/api/sessions/${session.id}`, { method: "DELETE" }), onClose);
            }}
          >
            Eliminar sesión
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 border-t pt-4 lg:grid-cols-2" style={{ borderColor: "var(--border)" }}>
        <div>
          <h4 className="card-title">Registro del atleta</h4>
          {perms.canComplete ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} /> Sesión completada
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sensaciones">
                  <select className="input" value={feeling} onChange={(e) => setFeeling(e.target.value)}>
                    <option value="">—</option>
                    {FEELINGS.map((f, i) => (
                      <option key={f} value={i + 1}>
                        {i + 1} · {f}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="RPE de la sesión (1–10)">
                  <select className="input" value={rpe} onChange={(e) => setRpe(e.target.value)}>
                    <option value="">—</option>
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Notas del atleta (técnica, molestias, marcas)">
                <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() => run(() => api(`/api/sessions/${session.id}/complete`, { body: { completed, feeling: feeling ? Number(feeling) : null, sessionRpe: rpe ? Number(rpe) : null, athleteNotes: notes } }))}
              >
                Guardar registro
              </button>
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <p>
                Estado: <strong>{session.completed ? "Completada" : "Pendiente"}</strong>
              </p>
              <p>Sensaciones: {session.feeling != null ? `${session.feeling} · ${FEELINGS[session.feeling - 1]}` : "—"}</p>
              <p>RPE: {session.sessionRpe ?? "—"}</p>
              <p className="ink-2">{session.athleteNotes || "Sin notas del atleta."}</p>
              <p className="muted text-xs">Solo el propietario y el atleta asignado pueden completar la sesión.</p>
            </div>
          )}
        </div>
        <div>
          <h4 className="card-title">Comentarios técnicos</h4>
          <ul className="mb-3 space-y-2">
            {(comments.data ?? []).length === 0 ? <li className="muted text-sm">Sin comentarios.</li> : null}
            {(comments.data ?? []).map((c) => (
              <li key={c.id} className="rounded-lg p-2 text-sm" style={{ background: "var(--surface-2)" }}>
                <div className="muted text-xs">
                  <strong className="ink-2">{c.author.name}</strong> · {new Date(c.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                </div>
                {c.text}
              </li>
            ))}
          </ul>
          {perms.canComment ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!comment.trim()) return;
                void run(
                  () => api(`/api/sessions/${session.id}/comments`, { body: { text: comment } }),
                  () => {
                    setComment("");
                    comments.reload();
                  },
                );
              }}
            >
              <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escribe un comentario…" aria-label="Nuevo comentario" />
              <button className="btn" disabled={busy || !comment.trim()}>
                Enviar
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
