"use client";

import { Alert } from "@/components/ui";
import { BLOCK_COLOR, BLOCK_LABEL, BLOCK_RANK, BLOCK_TYPES, type BlockTypeKey } from "@/lib/athletics/events";
import type { BlockDraft, ExerciseDraft } from "@/lib/generator/types";
import { validateBlockOrder } from "@/lib/load/fatigue";
import { emptyExercise, type EditableSession } from "./types";

const intOr = (v: string, fallback: number) => {
  const n = Math.round(Number(v.replace(",", ".")));
  return Number.isFinite(n) && v.trim() !== "" ? Math.max(0, n) : fallback;
};
const floatOrNull = (v: string) => {
  const n = Number(v.replace(",", "."));
  return v.trim() !== "" && Number.isFinite(n) ? n : null;
};

/** Editor de sesión multibloque: bloques ordenados por prioridad neural y ejercicios con sus cargas. */
export function SessionEditor({ value, onChange }: { value: EditableSession; onChange: (next: EditableSession) => void }) {
  const warnings = validateBlockOrder(value.blocks);
  const setBlocks = (blocks: BlockDraft[]) => onChange({ ...value, blocks });
  const patchBlock = (i: number, patch: Partial<BlockDraft>) => setBlocks(value.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const patchExercise = (bi: number, ei: number, patch: Partial<ExerciseDraft>) =>
    patchBlock(bi, { exercises: value.blocks[bi].exercises.map((e, j) => (j === ei ? { ...e, ...patch } : e)) });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.blocks.length) return;
    const next = [...value.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };
  const addBlock = (type: BlockTypeKey) => {
    const next = [...value.blocks, { type, title: BLOCK_LABEL[type], notes: "", exercises: [emptyExercise()] }];
    // Se inserta ya en su posición fisiológica.
    setBlocks(next.map((b, idx) => ({ b, idx })).sort((x, y) => BLOCK_RANK[x.b.type] - BLOCK_RANK[y.b.type] || x.idx - y.idx).map((x) => x.b));
  };
  const sortBlocks = () => setBlocks(value.blocks.map((b, idx) => ({ b, idx })).sort((x, y) => BLOCK_RANK[x.b.type] - BLOCK_RANK[y.b.type] || x.idx - y.idx).map((x) => x.b));

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="label">Título de la sesión</span>
        <input className="input" value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
      </label>

      {warnings.length > 0 ? (
        <Alert kind="amber">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Orden fisiológico:</strong> {warnings[0]}
            </span>
            <button type="button" className="btn btn-sm" onClick={sortBlocks}>
              Ordenar por prioridad neural
            </button>
          </div>
        </Alert>
      ) : null}

      {value.blocks.map((b, bi) => (
        <div key={bi} className="rounded-lg border" style={{ borderColor: "var(--border)", borderLeft: `4px solid ${BLOCK_COLOR[b.type]}` }}>
          <div className="flex flex-wrap items-end gap-2 p-3">
            <label className="block">
              <span className="label">Tipo de bloque</span>
              <select className="input" value={b.type} onChange={(e) => patchBlock(bi, { type: e.target.value as BlockTypeKey })}>
                {BLOCK_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.rank + 1}. {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-[180px] flex-1">
              <span className="label">Título</span>
              <input className="input" value={b.title} onChange={(e) => patchBlock(bi, { title: e.target.value })} />
            </label>
            <label className="block min-w-[200px] flex-[2]">
              <span className="label">Notas técnicas del bloque</span>
              <input className="input" value={b.notes} onChange={(e) => patchBlock(bi, { notes: e.target.value })} />
            </label>
            <div className="flex gap-1">
              <button type="button" className="btn btn-sm" onClick={() => move(bi, -1)} disabled={bi === 0} aria-label="Subir bloque">↑</button>
              <button type="button" className="btn btn-sm" onClick={() => move(bi, 1)} disabled={bi === value.blocks.length - 1} aria-label="Bajar bloque">↓</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setBlocks(value.blocks.filter((_, j) => j !== bi))} aria-label="Eliminar bloque">✕</button>
            </div>
          </div>
          <div className="overflow-x-auto px-3 pb-3">
            <table className="w-full min-w-[1080px] text-xs">
              <thead>
                <tr className="muted text-left">
                  <th className="pb-1 font-medium">Ejercicio</th>
                  <th className="pb-1 font-medium">Series</th>
                  <th className="pb-1 font-medium">Reps</th>
                  <th className="pb-1 font-medium">Intensidad</th>
                  <th className="pb-1 font-medium">Desc. (s)</th>
                  <th className="pb-1 font-medium">Implemento</th>
                  <th className="pb-1 font-medium">Kg</th>
                  <th className="pb-1 font-medium" title="Metros totales de sprint">Sprint m</th>
                  <th className="pb-1 font-medium" title="Vallas pasadas en total">Vallas</th>
                  <th className="pb-1 font-medium" title="Contactos pliométricos totales">Contactos</th>
                  <th className="pb-1 font-medium" title="Lanzamientos totales">Lanz.</th>
                  <th className="pb-1 font-medium" title="Metros totales de carrera continua o series">Carrera m</th>
                  <th className="pb-1 font-medium">Notas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {b.exercises.map((e, ei) => (
                  <tr key={ei}>
                    <td className="py-0.5 pr-1"><input className="input !px-2 !py-1 text-xs" style={{ minWidth: 200 }} value={e.name} aria-label="Nombre del ejercicio" onChange={(ev) => patchExercise(bi, ei, { name: ev.target.value })} /></td>
                    <td className="py-0.5 pr-1"><input className="input !w-14 !px-2 !py-1 text-xs" value={e.sets} aria-label="Series" onChange={(ev) => patchExercise(bi, ei, { sets: Math.max(1, intOr(ev.target.value, 1)) })} /></td>
                    <td className="py-0.5 pr-1"><input className="input !w-14 !px-2 !py-1 text-xs" value={e.reps} aria-label="Repeticiones" onChange={(ev) => patchExercise(bi, ei, { reps: Math.max(1, intOr(ev.target.value, 1)) })} /></td>
                    <td className="py-0.5 pr-1">
                      <div className="flex gap-1">
                        <select className="input !w-16 !px-1 !py-1 text-xs" value={e.intensityType} aria-label="Tipo de intensidad" onChange={(ev) => patchExercise(bi, ei, { intensityType: ev.target.value as ExerciseDraft["intensityType"], intensityValue: ev.target.value === "NONE" ? null : e.intensityValue })}>
                          <option value="NONE">—</option>
                          <option value="PCT">%</option>
                          <option value="RPE">RPE</option>
                        </select>
                        <input className="input !w-14 !px-2 !py-1 text-xs" value={e.intensityValue ?? ""} aria-label="Valor de intensidad" disabled={e.intensityType === "NONE"} onChange={(ev) => patchExercise(bi, ei, { intensityValue: floatOrNull(ev.target.value) })} />
                      </div>
                    </td>
                    <td className="py-0.5 pr-1"><input className="input !w-16 !px-2 !py-1 text-xs" value={e.restSec ?? ""} aria-label="Descanso en segundos" onChange={(ev) => patchExercise(bi, ei, { restSec: ev.target.value.trim() === "" ? null : intOr(ev.target.value, 0) })} /></td>
                    <td className="py-0.5 pr-1"><input className="input !w-32 !px-2 !py-1 text-xs" value={e.implement ?? ""} aria-label="Implemento" onChange={(ev) => patchExercise(bi, ei, { implement: ev.target.value || null })} /></td>
                    <td className="py-0.5 pr-1"><input className="input !w-16 !px-2 !py-1 text-xs" value={e.loadKg ?? ""} aria-label="Carga en kg" onChange={(ev) => patchExercise(bi, ei, { loadKg: floatOrNull(ev.target.value) })} /></td>
                    <td className="py-0.5 pr-1"><input className="input !w-16 !px-2 !py-1 text-xs" value={e.sprintMeters} aria-label="Metros de sprint" onChange={(ev) => patchExercise(bi, ei, { sprintMeters: intOr(ev.target.value, 0) })} /></td>
                    <td className="py-0.5 pr-1"><input className="input !w-14 !px-2 !py-1 text-xs" value={e.hurdles} aria-label="Vallas" onChange={(ev) => patchExercise(bi, ei, { hurdles: intOr(ev.target.value, 0) })} /></td>
                    <td className="py-0.5 pr-1"><input className="input !w-14 !px-2 !py-1 text-xs" value={e.plyoContacts} aria-label="Contactos" onChange={(ev) => patchExercise(bi, ei, { plyoContacts: intOr(ev.target.value, 0) })} /></td>
                    <td className="py-0.5 pr-1"><input className="input !w-14 !px-2 !py-1 text-xs" value={e.throwsCount} aria-label="Lanzamientos" onChange={(ev) => patchExercise(bi, ei, { throwsCount: intOr(ev.target.value, 0) })} /></td>
                    <td className="py-0.5 pr-1"><input className="input !w-16 !px-2 !py-1 text-xs" value={e.distanceM} aria-label="Metros de carrera" onChange={(ev) => patchExercise(bi, ei, { distanceM: intOr(ev.target.value, 0) })} /></td>
                    <td className="py-0.5 pr-1"><input className="input !px-2 !py-1 text-xs" style={{ minWidth: 180 }} value={e.notes} aria-label="Notas" onChange={(ev) => patchExercise(bi, ei, { notes: ev.target.value })} /></td>
                    <td className="py-0.5">
                      <button type="button" className="btn btn-danger btn-sm" aria-label="Eliminar ejercicio" onClick={() => patchBlock(bi, { exercises: b.exercises.filter((_, j) => j !== ei) })}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn btn-sm mt-2" onClick={() => patchBlock(bi, { exercises: [...b.exercises, emptyExercise()] })}>
              + Ejercicio
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <span className="ink-2 text-xs font-semibold">Añadir bloque:</span>
        {BLOCK_TYPES.map((t) => (
          <button key={t.key} type="button" className="btn btn-sm" onClick={() => addBlock(t.key)} style={{ borderLeft: `4px solid ${t.color}` }}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted text-xs">Orden recomendado: 1. Movilidad/Prehab → 2. Velocidad/Técnica neural → 3. Saltos/Lanzamientos → 4. Fuerza/Potencia → 5. Capacidad metabólica. Los totales (metros, vallas, contactos, lanzamientos) alimentan el semáforo de fatiga.</p>
    </div>
  );
}

/** Vista de solo lectura de los bloques de una sesión. */
export function SessionBlocksView({ blocks }: { blocks: BlockDraft[] }) {
  if (blocks.length === 0) return <p className="muted text-sm">Sesión sin bloques todavía.</p>;
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <div key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--border)", borderLeft: `4px solid ${BLOCK_COLOR[b.type]}` }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold">
              {i + 1}. {b.title}
            </h4>
            <span className="badge">{BLOCK_LABEL[b.type]}</span>
          </div>
          {b.notes ? <p className="ink-2 mt-1 text-xs">{b.notes}</p> : null}
          <ul className="mt-2 space-y-1.5">
            {b.exercises.map((e, j) => (
              <li key={j} className="text-sm">
                <span className="font-medium">{e.name}</span>{" "}
                <span className="ink-2">
                  — {e.sets} × {e.reps}
                  {e.intensityType === "PCT" && e.intensityValue != null ? ` @ ${e.intensityValue} %` : ""}
                  {e.intensityType === "RPE" && e.intensityValue != null ? ` @ RPE ${e.intensityValue}` : ""}
                  {e.loadKg ? ` · ${e.loadKg} kg` : ""}
                  {e.implement ? ` · ${e.implement}` : ""}
                  {e.restSec ? ` · desc. ${e.restSec >= 60 ? `${Math.round((e.restSec / 60) * 10) / 10} min` : `${e.restSec} s`}` : ""}
                </span>
                {e.notes ? <div className="muted text-xs">{e.notes}</div> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
