import { addDays, mondayOf, toDateInput, toUtcMidnight } from "@/lib/dates";
import { analyzeWeek, type WeekFatigue } from "@/lib/load/fatigue";
import { friendIds } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

export interface UpcomingSession {
  id: string;
  planId: string;
  planTitle: string;
  title: string;
  date: string;
  completed: boolean;
  /** "own": plan propio; "assigned": me lo asignó un amigo; "friend": plan de un amigo. */
  scope: "own" | "assigned" | "friend";
  person: string;
}

export interface TrendPoint {
  week: string;
  tonnage: number;
  throws: number;
  contacts: number;
  km: number;
}

export interface DashboardData {
  user: { name: string; specialty: string; sex: "M" | "F" };
  weekStart: string;
  planned: WeekFatigue;
  plannedSessions: number;
  completedSessions: number;
  logged: {
    throwsTotal: number;
    throwsHigh: number;
    throwsByImplement: { implement: string; count: number }[];
    plyoContacts: number;
    km: number;
    tonnage: number;
    liftSets: number;
  };
  trend: TrendPoint[];
  combined: { date: string; label: string; competition: string; total: number }[];
  upcoming: UpcomingSession[];
  pendingRequests: number;
}

const sessionInclude = { blocks: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } } } as const;

export async function buildDashboard(user: SessionUser): Promise<DashboardData> {
  const today = toUtcMidnight(new Date());
  const weekStart = mondayOf(today);
  const weekEnd = addDays(weekStart, 7);
  const trendStart = addDays(weekStart, -7 * 7);
  const friends = await friendIds(user.id);
  // "Mi entrenamiento": planes que me han asignado o planes propios sin asignar a otra persona.
  const mine = { OR: [{ assigneeId: user.id }, { ownerId: user.id, assigneeId: null }] };

  const [weekSessions, upcomingMine, upcomingFriends, throwLogs, plyoLogs, enduranceLogs, liftLogs, combined, pendingRequests] = await Promise.all([
    prisma.trainingSession.findMany({ where: { date: { gte: weekStart, lt: weekEnd }, plan: mine }, include: sessionInclude, orderBy: { date: "asc" } }),
    prisma.trainingSession.findMany({
      where: { date: { gte: today, lt: addDays(today, 8) }, completed: false, plan: mine },
      select: { id: true, title: true, date: true, completed: true, plan: { select: { id: true, title: true, ownerId: true, owner: { select: { name: true } } } } },
      orderBy: { date: "asc" },
      take: 8,
    }),
    prisma.trainingSession.findMany({
      where: {
        date: { gte: today, lt: addDays(today, 8) },
        plan: { ownerId: { not: user.id }, AND: [{ OR: [{ assigneeId: null }, { assigneeId: { not: user.id } }] }, { OR: [{ ownerId: { in: friends } }, { assigneeId: { in: friends } }] }] },
      },
      select: {
        id: true,
        title: true,
        date: true,
        completed: true,
        plan: { select: { id: true, title: true, owner: { select: { name: true } }, assignee: { select: { name: true } } } },
      },
      orderBy: { date: "asc" },
      take: 8,
    }),
    prisma.throwLog.findMany({ where: { userId: user.id, date: { gte: trendStart, lt: weekEnd } }, select: { date: true, count: true, intensityPct: true, implementName: true } }),
    prisma.plyoLog.findMany({ where: { userId: user.id, date: { gte: trendStart, lt: weekEnd } }, select: { date: true, contacts: true } }),
    prisma.enduranceLog.findMany({ where: { userId: user.id, date: { gte: trendStart, lt: weekEnd } }, select: { date: true, distanceKm: true } }),
    prisma.liftLog.findMany({ where: { userId: user.id, date: { gte: trendStart, lt: weekEnd } }, select: { date: true, sets: true, reps: true, weightKg: true } }),
    prisma.combinedResult.findMany({ where: { userId: user.id }, orderBy: { date: "asc" }, take: 30 }),
    prisma.friendship.count({ where: { addresseeId: user.id, status: "PENDING" } }),
  ]);

  const inWeek = (d: Date) => d >= weekStart && d < weekEnd;
  const byImplement = new Map<string, number>();
  let throwsTotal = 0;
  let throwsHigh = 0;
  for (const t of throwLogs.filter((x) => inWeek(x.date))) {
    throwsTotal += t.count;
    if (t.intensityPct >= 90) throwsHigh += t.count;
    byImplement.set(t.implementName, (byImplement.get(t.implementName) ?? 0) + t.count);
  }
  const weekLifts = liftLogs.filter((x) => inWeek(x.date));

  const trend: TrendPoint[] = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(trendStart, i * 7);
    const end = addDays(start, 7);
    const within = <T extends { date: Date }>(arr: T[]) => arr.filter((x) => x.date >= start && x.date < end);
    return {
      week: toDateInput(start).slice(5),
      tonnage: Math.round(within(liftLogs).reduce((a, l) => a + l.sets * l.reps * l.weightKg, 0)),
      throws: within(throwLogs).reduce((a, t) => a + t.count, 0),
      contacts: within(plyoLogs).reduce((a, p) => a + p.contacts, 0),
      km: Math.round(within(enduranceLogs).reduce((a, e) => a + e.distanceKm, 0) * 10) / 10,
    };
  });

  const upcoming: UpcomingSession[] = [
    ...upcomingMine.map((s) => ({
      id: s.id,
      planId: s.plan.id,
      planTitle: s.plan.title,
      title: s.title,
      date: s.date.toISOString(),
      completed: s.completed,
      scope: s.plan.ownerId === user.id ? ("own" as const) : ("assigned" as const),
      person: s.plan.owner.name,
    })),
    ...upcomingFriends.map((s) => ({
      id: s.id,
      planId: s.plan.id,
      planTitle: s.plan.title,
      title: s.title,
      date: s.date.toISOString(),
      completed: s.completed,
      scope: "friend" as const,
      person: s.plan.assignee?.name ?? s.plan.owner.name,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return {
    user: { name: user.name, specialty: user.specialty, sex: user.sex },
    weekStart: weekStart.toISOString(),
    planned: analyzeWeek(weekSessions),
    plannedSessions: weekSessions.length,
    completedSessions: weekSessions.filter((s) => s.completed).length,
    logged: {
      throwsTotal,
      throwsHigh,
      throwsByImplement: [...byImplement.entries()].map(([implement, count]) => ({ implement, count })).sort((a, b) => b.count - a.count),
      plyoContacts: plyoLogs.filter((x) => inWeek(x.date)).reduce((a, p) => a + p.contacts, 0),
      km: Math.round(enduranceLogs.filter((x) => inWeek(x.date)).reduce((a, e) => a + e.distanceKm, 0) * 10) / 10,
      tonnage: Math.round(weekLifts.reduce((a, l) => a + l.sets * l.reps * l.weightKg, 0)),
      liftSets: weekLifts.reduce((a, l) => a + l.sets, 0),
    },
    trend,
    combined: combined.map((c) => ({ date: c.date.toISOString(), label: c.label, competition: c.competition, total: c.totalPoints })),
    upcoming,
    pendingRequests,
  };
}
