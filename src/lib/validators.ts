import { z } from "zod";

const SPECIALTY = z.enum(["JAVELIN", "THROWS_ROTATIONAL", "THROWS_LINEAR", "JUMPS", "SPRINTS_HURDLES", "ENDURANCE", "COMBINED", "HYPERTROPHY", "MAX_STRENGTH", "HYBRID"]);
const PHASE = z.enum(["GPP", "SPP", "PRE_COMP", "COMP", "TAPER"]);
const LEVEL = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
const BLOCK = z.enum(["MOBILITY", "TECHNIQUE", "JUMPS_THROWS", "STRENGTH", "METABOLIC"]);
const SEX = z.enum(["M", "F"]);
const EQUIP = z.enum(["BARBELL", "DUMBBELLS", "MACHINES", "BANDS", "TRACK", "HURDLES", "PLYO_BOXES", "JUMP_PIT", "THROWING_AREA", "VARIED_IMPLEMENTS", "MEDBALL"]);

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}/, "fecha no válida (AAAA-MM-DD)");
const text = (max = 200) => z.string().trim().max(max);
const nonNeg = z.number().int().min(0).max(1_000_000);
const optNum = z.number().finite().nullable().optional();

export const registerSchema = z.object({
  name: text(80).min(2, "mínimo 2 caracteres"),
  email: z.string().trim().toLowerCase().email("email no válido").max(160),
  password: z.string().min(8, "mínimo 8 caracteres").max(100),
  sex: SEX.default("M"),
  specialty: SPECIALTY.default("COMBINED"),
});

export const profileSchema = z.object({
  name: text(80).min(2).optional(),
  sex: SEX.optional(),
  specialty: SPECIALTY.optional(),
  restingHr: z.number().int().min(25).max(120).nullable().optional(),
  maxHr: z.number().int().min(100).max(240).nullable().optional(),
});

export const exerciseSchema = z.object({
  name: text(160).min(1),
  sets: z.number().int().min(1).max(100).default(1),
  reps: z.number().int().min(1).max(1000).default(1),
  intensityType: z.enum(["PCT", "RPE", "NONE"]).default("NONE"),
  intensityValue: z.number().min(0).max(130).nullable().default(null),
  restSec: z.number().int().min(0).max(3600).nullable().default(null),
  notes: text(500).default(""),
  implement: text(80).nullable().default(null),
  muscleGroup: text(60).nullable().default(null),
  loadKg: z.number().min(0).max(1000).nullable().default(null),
  sprintMeters: nonNeg.default(0),
  hurdles: nonNeg.default(0),
  plyoContacts: nonNeg.default(0),
  throwsCount: nonNeg.default(0),
  distanceM: nonNeg.default(0),
});

export const blockSchema = z.object({
  type: BLOCK,
  title: text(120).min(1),
  notes: text(500).default(""),
  exercises: z.array(exerciseSchema).max(40).default([]),
});

export const sessionDraftSchema = z.object({
  dayOffset: z.number().int().min(0).max(6),
  title: text(140).min(1),
  blocks: z.array(blockSchema).max(12).default([]),
});

export const planCreateSchema = z.object({
  title: text(140).min(1),
  description: text(1000).default(""),
  specialty: SPECIALTY,
  level: LEVEL.default("INTERMEDIATE"),
  startDate: dateStr,
  assigneeId: z.string().nullable().optional(),
  mesocycles: z
    .array(
      z.object({
        name: text(100).min(1),
        phase: PHASE,
        weeks: z.array(z.object({ focus: text(140).default(""), sessions: z.array(sessionDraftSchema).max(14).default([]) })).min(1).max(16),
      }),
    )
    .min(1)
    .max(12),
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;

export const planPatchSchema = z.object({
  title: text(140).min(1).optional(),
  description: text(1000).optional(),
  assigneeId: z.string().nullable().optional(),
});

export const mesocycleCreateSchema = z.object({ name: text(100).min(1), phase: PHASE, weeks: z.number().int().min(1).max(16) });
export const mesocyclePatchSchema = z.object({ mesocycleId: z.string(), name: text(100).min(1).optional(), phase: PHASE.optional() });
export const microcyclePatchSchema = z.object({ microcycleId: z.string(), focus: text(140) });

export const sessionCreateSchema = z.object({ microcycleId: z.string(), dayOffset: z.number().int().min(0).max(6), title: text(140).min(1) });
export const sessionPutSchema = z.object({ title: text(140).min(1), blocks: z.array(blockSchema).max(12) });
export const sessionMoveSchema = z.object({ date: dateStr });
export const sessionCompleteSchema = z.object({
  completed: z.boolean(),
  feeling: z.number().int().min(1).max(5).nullable().optional(),
  sessionRpe: z.number().int().min(1).max(10).nullable().optional(),
  athleteNotes: text(1000).optional(),
});
export const commentSchema = z.object({ text: text(1000).min(1) });

export const generatorSchema = z.object({
  specialty: SPECIALTY,
  phase: PHASE,
  level: LEVEL,
  daysPerWeek: z.number().int().min(2).max(6),
  equipment: z.array(EQUIP).max(20),
  weeks: z.number().int().min(1).max(6).default(4),
  sex: SEX.default("M"),
  oneRm: z.record(z.enum(["SQUAT", "BENCH", "DEADLIFT", "CLEAN", "SNATCH"]), z.number().min(0).max(600)).optional(),
});

export const liftSchema = z.object({
  date: dateStr,
  exercise: text(100).min(1),
  muscleGroup: text(60).min(1),
  sets: z.number().int().min(1).max(50),
  reps: z.number().int().min(1).max(200),
  weightKg: z.number().min(0).max(1000),
  rpe: z.number().min(1).max(10).nullable().optional(),
});

export const prSchema = z.object({
  date: dateStr,
  exercise: text(100).min(1),
  category: z.enum(["STRENGTH", "OLYMPIC", "BALLISTIC"]),
  value: z.number().min(0).max(100000),
  unit: z.enum(["kg", "cm", "m", "W"]).default("kg"),
  reps: z.number().int().min(1).max(50).default(1),
  notes: text(300).default(""),
});

const THROW_EVENT = z.enum(["JAVELIN", "SHOT", "DISCUS", "HAMMER"]);

export const implementSchema = z.object({
  event: THROW_EVENT,
  name: text(80).min(1),
  kind: z.enum(["OFFICIAL", "HEAVY", "LIGHT", "NOCKENBALL", "MEDBALL"]),
  weightG: z.number().int().min(50).max(20000),
  officialWeightG: z.number().int().min(50).max(20000),
});

export const throwLogSchema = z.object({
  date: dateStr,
  event: THROW_EVENT,
  implementName: text(80).min(1),
  weightG: z.number().int().min(50).max(20000),
  officialWeightG: z.number().int().min(50).max(20000),
  count: z.number().int().min(1).max(300),
  intensityPct: z.number().int().min(30).max(100),
  bestDistance: optNum,
  throwType: z.enum(["STAND", "STEP3", "STEP5", "FULL"]).nullable().optional(),
  approachMeters: optNum,
  approachSteps: z.number().int().min(0).max(40).nullable().optional(),
  crossSteps: z.union([z.literal(3), z.literal(5), z.literal(7)]).nullable().optional(),
  checkMark: optNum,
  anglePerceived: z.enum(["LOW", "OPTIMAL", "HIGH", "NOSE_UP", "NOSE_DOWN"]).nullable().optional(),
  windType: z.enum(["NONE", "HEAD", "TAIL", "CROSS"]).nullable().optional(),
  windSpeed: optNum,
  notes: text(500).default(""),
});

export const prehabSchema = z.object({ date: dateStr, items: z.array(text(40)).max(20), notes: text(300).default("") });

export const medballSchema = z.object({
  date: dateStr,
  type: z.enum(["OVERHEAD", "ROTATIONAL", "CHEST", "SHOT"]),
  weightKg: z.number().min(0.5).max(20),
  throws: z.number().int().min(1).max(300),
  bestDistance: optNum,
  notes: text(300).default(""),
});

export const approachSchema = z.object({
  date: dateStr,
  event: z.enum(["LJ", "TJ", "HJ", "PV"]),
  name: text(80).min(1),
  distanceM: z.number().min(1).max(60),
  strides: z.number().int().min(2).max(30),
  midMarkM: optNum,
  midMarkStride: z.number().int().min(1).max(30).nullable().optional(),
  wind: z.number().min(-10).max(10).nullable().optional(),
  adjustmentCm: optNum,
  notes: text(300).default(""),
});

export const plyoSchema = z.object({
  date: dateStr,
  type: z.enum(["DROP_JUMP", "HORIZONTAL", "SHORT_APPROACH", "HURDLE_HOPS", "BOX", "POGO"]),
  contacts: z.number().int().min(1).max(1000),
  intensity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  notes: text(300).default(""),
});

export const poleSchema = z.object({
  name: text(80).min(1),
  lengthM: z.number().min(2).max(5.5),
  flexLbs: z.number().int().min(50).max(230),
  gripHeightM: z.number().min(1.5).max(5.4),
  standardsCm: z.number().int().min(0).max(120),
  approachStrides: z.number().int().min(2).max(24).nullable().optional(),
  notes: text(300).default(""),
});

export const markSchema = z.object({
  date: dateStr,
  event: text(30).min(1),
  value: z.number().positive().max(1_000_000),
  wind: z.number().min(-10).max(10).nullable().optional(),
  indoor: z.boolean().default(false),
  competition: text(140).default(""),
});

export const combinedResultSchema = z.object({
  date: dateStr,
  competition: z.enum(["DECATHLON", "HEPTATHLON", "HEPTATHLON_INDOOR", "PENTATHLON_INDOOR"]),
  label: text(140).min(1),
  performances: z.record(z.string(), z.object({ value: z.number().nullable(), wind: z.number().nullable().optional() })),
});

export const enduranceLogSchema = z.object({
  date: dateStr,
  type: z.enum(["EASY", "LONG", "TEMPO", "INTERVAL", "FARTLEK", "WALK", "RACE"]),
  distanceKm: z.number().min(0).max(300),
  durationMin: z.number().min(1).max(1500),
  rpe: z.number().int().min(1).max(10),
  notes: text(300).default(""),
});

export const friendRequestSchema = z.object({ userId: z.string().min(1) });
export const friendActionSchema = z.object({ action: z.enum(["accept", "reject"]) });
export const inviteSchema = z.object({ code: z.string().trim().toUpperCase().min(4).max(20) });
