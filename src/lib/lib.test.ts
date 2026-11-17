import { describe, expect, it } from "vitest";
import { COMPETITIONS, performanceForPoints, scoreCompetition, scoreEvent } from "./athletics/combined";
import { acwr, hrZones, pace, riegel, timeForVdot, vdot } from "./athletics/endurance";
import { summarizeMarks } from "./athletics/events";
import { HURDLE_SPECS } from "./athletics/hurdles";
import { jointLoad, officialWeight, weightPercent } from "./athletics/implements";
import { sprintModel } from "./athletics/sprint";
import { parseTime, formatTime } from "./format";
import { generatePlan } from "./generator";
import { EQUIPMENT, type GeneratorInput } from "./generator/types";
import { brzycki, epley, lombardi, percentTable } from "./gym/oneRm";
import { calculatePlates } from "./gym/plates";
import { analyzeWeek, validateBlockOrder } from "./load/fatigue";
import { SPECIALTIES, PHASES, LEVELS } from "./athletics/events";

const dec = COMPETITIONS.DECATHLON;
const hep = COMPETITIONS.HEPTATHLON;
const byKey = (c: typeof dec, k: string) => c.events.find((e) => e.key === k)!;

describe("combinadas World Athletics", () => {
  it("puntúa marcas de referencia del decatlón", () => {
    expect(scoreEvent(byKey(dec, "100m"), 10.395)).toBe(1000);
    expect(scoreEvent(byKey(dec, "LJ"), 7.76)).toBe(1000);
    expect(scoreEvent(byKey(dec, "SP"), 18.4)).toBe(1000);
    expect(scoreEvent(byKey(dec, "HJ"), 2.21)).toBe(1002);
    expect(scoreEvent(byKey(dec, "400m"), 46.17)).toBe(1000);
    expect(scoreEvent(byKey(dec, "110mH"), 13.8)).toBe(1000);
    expect(scoreEvent(byKey(dec, "DT"), 56.17)).toBe(1000);
    expect(scoreEvent(byKey(dec, "PV"), 5.29)).toBe(1001);
    expect(scoreEvent(byKey(dec, "JT"), 77.19)).toBe(1000);
    expect(scoreEvent(byKey(dec, "1500m"), 233.79)).toBe(1000);
  });

  it("reproduce el récord del mundo de decatlón de Kevin Mayer (9126)", () => {
    const perf = { "100m": 10.55, LJ: 7.8, SP: 16.0, HJ: 2.05, "400m": 48.42, "110mH": 13.75, DT: 50.54, PV: 5.45, JT: 71.9, "1500m": 276.11 };
    const res = scoreCompetition(dec, Object.fromEntries(Object.entries(perf).map(([k, v]) => [k, { value: v }])));
    expect(res.total).toBe(9126);
  });

  it("reproduce el récord del mundo de heptatlón de Jackie Joyner-Kersee (7291)", () => {
    const perf = { "100mH": 12.69, HJ: 1.86, SP: 15.8, "200m": 22.56, LJ: 7.27, JT: 45.66, "800m": 128.51 };
    const res = scoreCompetition(hep, Object.fromEntries(Object.entries(perf).map(([k, v]) => [k, { value: v }])));
    expect(res.total).toBe(7291);
  });

  it("la inversa devuelve la marca mínima para los puntos objetivo", () => {
    for (const c of Object.values(COMPETITIONS)) {
      for (const e of c.events) {
        for (const pts of [500, 800, 1000]) {
          const perf = performanceForPoints(e, pts);
          expect(scoreEvent(e, perf)).toBeGreaterThanOrEqual(pts);
          const worse = e.kind === "track" ? perf + 0.01 : perf - 0.01;
          expect(scoreEvent(e, worse)).toBeLessThan(pts);
        }
      }
    }
  });

  it("valida el viento", () => {
    const res = scoreCompetition(dec, { "100m": { value: 10.8, wind: 2.5 }, LJ: { value: 7.2, wind: 1.0 }, "110mH": { value: 14.5, wind: 1.5 } });
    expect(res.wind.eventsOverLimit).toEqual(["100 m"]);
    expect(res.wind.recordLegal).toBe(true);
    const bad = scoreCompetition(dec, { "100m": { value: 10.8, wind: 3.5 }, LJ: { value: 7.2, wind: 2.5 }, "110mH": { value: 14.5, wind: 1.5 } });
    expect(bad.wind.recordLegal).toBe(false);
  });
});

describe("gimnasio", () => {
  it("calcula el 1RM", () => {
    expect(epley(100, 5)).toBeCloseTo(116.67, 2);
    expect(brzycki(100, 5)).toBeCloseTo(112.5, 2);
    expect(lombardi(100, 5)).toBeCloseTo(117.46, 2);
    expect(epley(100, 1)).toBe(100);
    const table = percentTable(200);
    expect(table[0]).toMatchObject({ pct: 100, weight: 200, reps: 1 });
    expect(table[table.length - 1]).toMatchObject({ pct: 50, weight: 100 });
    expect(table).toHaveLength(11);
  });

  it("calcula los discos por lado", () => {
    expect(calculatePlates(100, 20).perSide).toEqual([25, 15]);
    expect(calculatePlates(142.5, 20).perSide).toEqual([25, 25, 10, 1.25]);
    expect(calculatePlates(60, 15).perSide).toEqual([20, 2.5]);
    expect(calculatePlates(20, 20).perSide).toEqual([]);
    expect(calculatePlates(100.3, 20).remainder).toBeCloseTo(0.3, 3);
  });
});

describe("lanzamientos", () => {
  it("pesos oficiales y porcentaje", () => {
    expect(officialWeight("JAVELIN", "M")).toBe(800);
    expect(officialWeight("JAVELIN", "F")).toBe(600);
    expect(officialWeight("JAVELIN", "M", "U18")).toBe(700);
    expect(officialWeight("JAVELIN", "F", "U18")).toBe(500);
    expect(officialWeight("SHOT", "M")).toBe(7260);
    expect(officialWeight("DISCUS", "F")).toBe(1000);
    expect(weightPercent(900, 800)).toBe(112.5);
    expect(weightPercent(600, 800)).toBe(75);
  });
  it("semáforo articular", () => {
    const ok = jointLoad([{ event: "JAVELIN", count: 40, intensityPct: 80, weightG: 800, officialWeightG: 800 }]);
    expect(ok.elbow).toBe("green");
    const bad = jointLoad([{ event: "JAVELIN", count: 80, intensityPct: 95, weightG: 700, officialWeightG: 800 }]);
    expect(bad.elbow).toBe("red");
  });
});

describe("carreras", () => {
  it("modelo de sprint coherente", () => {
    const m = sprintModel(100, 10.5);
    expect(m.splits).toHaveLength(10);
    expect(m.splits[9].cumulative).toBeCloseTo(10.5, 5);
    expect(m.splits[0].segment).toBeGreaterThan(m.splits[5].segment);
    expect(sprintModel(400, 48).splits[7].cumulative).toBeCloseTo(48, 5);
    expect(sprintModel(200, 21).hundreds).toHaveLength(2);
  });
  it("vallas reglamentarias", () => {
    const s = (k: string) => HURDLE_SPECS.find((x) => x.key === k)!;
    expect(s("110mH_M").runIn).toBeCloseTo(14.02, 2);
    expect(s("100mH_F").runIn).toBeCloseTo(10.5, 2);
    expect(s("400mH_M").runIn).toBeCloseTo(40, 2);
  });
  it("ritmos, Riegel y VDOT", () => {
    expect(pace(10000, 2400).secPerKm).toBeCloseTo(240, 5);
    expect(pace(10000, 2400).lap400).toBeCloseTo(96, 5);
    expect(riegel(1200, 5000, 10000)).toBeCloseTo(1200 * Math.pow(2, 1.06), 5);
    expect(vdot(5000, 1200)).toBeCloseTo(49.8, 0);
    const v = vdot(5000, 1200);
    expect(timeForVdot(v, 5000)).toBeCloseTo(1200, 1);
    expect(timeForVdot(v, 10000) / 60).toBeGreaterThan(41);
    expect(timeForVdot(v, 10000) / 60).toBeLessThan(42);
  });
  it("zonas de FC y ACWR", () => {
    const z = hrZones(190, 50);
    expect(z[1].maxLo).toBe(114);
    expect(z[1].karvonenLo).toBe(134);
    const now = new Date("2026-03-29T00:00:00Z");
    const entries = Array.from({ length: 28 }, (_, i) => ({ date: new Date(now.getTime() - i * 86_400_000), load: i < 7 ? 200 : 100 }));
    expect(acwr(entries, now).ratio).toBeCloseTo(1400 / (3500 / 4), 5);
    expect(acwr(entries, now).status).toBe("riesgo alto");
  });
  it("tiempos", () => {
    expect(parseTime("1:52.30")).toBeCloseTo(112.3, 5);
    expect(parseTime("10,45")).toBeCloseTo(10.45, 5);
    expect(formatTime(112.3)).toBe("1:52.30");
    expect(formatTime(9.58)).toBe("9.58");
    expect(formatTime(3725, 0)).toBe("1:02:05");
  });
});

describe("marcas", () => {
  it("PB reglamentario frente a viento ilegal", () => {
    const s = summarizeMarks(
      [
        { id: "a", event: "100m", value: 10.9, wind: 1.2, date: "2026-05-01" },
        { id: "b", event: "100m", value: 10.7, wind: 3.1, date: "2026-06-01" },
        { id: "c", event: "100m", value: 10.8, wind: 2.0, date: "2025-06-01" },
      ],
      2026,
    );
    expect(s[0].pb?.id).toBe("c");
    expect(s[0].sb?.id).toBe("a");
    expect(s[0].windAided?.id).toBe("b");
  });
});

describe("semáforo de fatiga", () => {
  const ex = (over: Record<string, unknown>) => ({ name: "x", sets: 1, reps: 1, intensityType: "PCT", intensityValue: 97, sprintMeters: 0, hurdles: 0, plyoContacts: 0, throwsCount: 0, distanceM: 0, ...over });
  const day = (d: string, over: Record<string, unknown>) => ({ date: `2026-03-${d}T00:00:00Z`, title: "S", blocks: [{ type: "TECHNIQUE", exercises: [ex(over)] }] });
  it("alerta con días neurales consecutivos", () => {
    // 2026-03-02 es lunes
    const w = analyzeWeek([day("02", { sprintMeters: 300 }), day("03", { sprintMeters: 300 }), day("04", { sprintMeters: 300 })]);
    expect(w.neuralLight).toBe("red");
    expect(w.alerts.some((a) => a.kind === "neural")).toBe(true);
    const ok = analyzeWeek([day("02", { sprintMeters: 250 }), day("04", { sprintMeters: 250 })]);
    expect(ok.overall).toBe("green");
  });
  it("detecta bloques desordenados", () => {
    expect(validateBlockOrder([{ type: "STRENGTH" }, { type: "TECHNIQUE" }])).toHaveLength(1);
    expect(validateBlockOrder([{ type: "MOBILITY" }, { type: "TECHNIQUE" }, { type: "JUMPS_THROWS" }, { type: "STRENGTH" }, { type: "METABOLIC" }])).toHaveLength(0);
  });
});

describe("generador", () => {
  const all = EQUIPMENT.map((e) => e.key);
  const inputs: GeneratorInput[] = [];
  for (const s of SPECIALTIES) for (const p of PHASES) for (const l of LEVELS) for (let d = 2; d <= 6; d++) for (const eq of [all, []]) inputs.push({ specialty: s.key, phase: p.key, level: l.key, daysPerWeek: d, equipment: eq, weeks: 4, sex: d % 2 ? "M" : "F", oneRm: { SQUAT: 160, BENCH: 110, DEADLIFT: 190, CLEAN: 100, SNATCH: 75 } });

  it("genera todas las combinaciones con bloques ordenados y sin días neurales consecutivos", () => {
    for (const input of inputs) {
      const plan = generatePlan(input);
      const expectedDays = input.specialty === "COMBINED" ? Math.max(4, input.daysPerWeek) : input.daysPerWeek;
      expect(plan.weeks).toHaveLength(4);
      for (const w of plan.weeks) {
        expect(w.sessions).toHaveLength(expectedDays);
        expect(new Set(w.sessions.map((s) => s.dayOffset)).size).toBe(expectedDays);
        for (const s of w.sessions) {
          expect(s.blocks.length).toBeGreaterThan(0);
          expect(validateBlockOrder(s.blocks)).toEqual([]);
          for (const b of s.blocks) {
            expect(b.exercises.length).toBeGreaterThan(0);
            for (const e of b.exercises) {
              expect(e.sets).toBeGreaterThan(0);
              expect(e.reps).toBeGreaterThan(0);
            }
          }
        }
        const athletics = !["HYPERTROPHY", "MAX_STRENGTH"].includes(input.specialty);
        if (athletics) {
          const sorted = [...w.sessions].sort((a, b) => a.dayOffset - b.dayOffset);
          for (let i = 1; i < sorted.length; i++) {
            const consecutive = sorted[i].dayOffset - sorted[i - 1].dayOffset === 1;
            expect(consecutive && sorted[i].demand === "high" && sorted[i - 1].demand === "high").toBe(false);
          }
        }
      }
    }
  }, 120_000);

  it("es determinista", () => {
    expect(generatePlan(inputs[7])).toEqual(generatePlan(inputs[7]));
  });

  it("jabalina incluye cruzados, nockenball, implementos y prehab", () => {
    const plan = generatePlan({ specialty: "JAVELIN", phase: "SPP", level: "ADVANCED", daysPerWeek: 5, equipment: all, weeks: 2, sex: "M" });
    const names = plan.weeks[0].sessions.flatMap((s) => s.blocks.flatMap((b) => b.exercises.map((e) => `${e.name} ${e.implement ?? ""}`))).join(" | ");
    for (const k of ["cruzados", "Nockenball", "Jabalina 900 g", "Jabalina 700 g", "Jabalina 800 g", "Rotación externa", "overhead", "Arrancada", "Pullover", "Sentadilla", "bloqueo"]) expect(names).toContain(k);
    const highThrowSessions = plan.weeks[0].sessions.filter((s) => s.blocks.some((b) => b.exercises.some((e) => e.throwsCount > 0 && e.implement?.startsWith("Jabalina"))));
    for (const s of highThrowSessions) expect(s.blocks[0].type).toBe("MOBILITY");
  });

  it("la descarga reduce el volumen", () => {
    const plan = generatePlan({ specialty: "JAVELIN", phase: "GPP", level: "INTERMEDIATE", daysPerWeek: 4, equipment: all, weeks: 4, sex: "M" });
    const throwsIn = (i: number) => plan.weeks[i].sessions.flatMap((s) => s.blocks.flatMap((b) => b.exercises)).reduce((a, e) => a + e.throwsCount, 0);
    expect(throwsIn(3)).toBeLessThan(throwsIn(2));
  });
});
