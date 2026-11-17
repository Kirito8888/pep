import { buildDashboard } from "@/lib/dashboard";
import { requireUser, route } from "@/lib/session";

export const GET = route(async () => buildDashboard(await requireUser()));
