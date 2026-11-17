import type { BlockTypeKey } from "@/lib/athletics/events";
import type { BlockDraft, ExerciseDraft } from "@/lib/generator/types";
import type { PlanPermissions } from "@/lib/permissions";

export interface ExerciseNode extends ExerciseDraft {
  id: string;
}
export interface BlockNode {
  id: string;
  type: BlockTypeKey;
  title: string;
  notes: string;
  exercises: ExerciseNode[];
}
export interface SessionNode {
  id: string;
  date: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  feeling: number | null;
  sessionRpe: number | null;
  athleteNotes: string;
  blocks: BlockNode[];
  _count: { comments: number };
}
export interface MicroNode {
  id: string;
  weekNumber: number;
  focus: string;
  sessions: SessionNode[];
}
export interface MesoNode {
  id: string;
  name: string;
  phase: string;
  order: number;
  microcycles: MicroNode[];
}
export interface PlanNode {
  id: string;
  title: string;
  description: string;
  specialty: string;
  level: string;
  startDate: string;
  owner: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  mesocycles: MesoNode[];
}
export interface PlanResponse {
  plan: PlanNode;
  permissions: PlanPermissions;
}

/** Contenido editable de una sesión (lo que comparten el planificador y el generador). */
export interface EditableSession {
  title: string;
  blocks: BlockDraft[];
}

export const emptyExercise = (): ExerciseDraft => ({
  name: "",
  sets: 3,
  reps: 5,
  intensityType: "NONE",
  intensityValue: null,
  restSec: null,
  notes: "",
  implement: null,
  muscleGroup: null,
  loadKg: null,
  sprintMeters: 0,
  hurdles: 0,
  plyoContacts: 0,
  throwsCount: 0,
  distanceM: 0,
});

export function toEditable(s: { title: string; blocks: { type: BlockTypeKey; title: string; notes: string; exercises: ExerciseDraft[] }[] }): EditableSession {
  return {
    title: s.title,
    blocks: s.blocks.map((b) => ({
      type: b.type,
      title: b.title,
      notes: b.notes,
      exercises: b.exercises.map((e) => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        intensityType: e.intensityType,
        intensityValue: e.intensityValue,
        restSec: e.restSec,
        notes: e.notes,
        implement: e.implement,
        muscleGroup: e.muscleGroup,
        loadKg: e.loadKg,
        sprintMeters: e.sprintMeters,
        hurdles: e.hurdles,
        plyoContacts: e.plyoContacts,
        throwsCount: e.throwsCount,
        distanceM: e.distanceM,
      })),
    })),
  };
}
