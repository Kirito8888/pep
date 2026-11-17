import { PlanWorkspace } from "@/components/planner/PlanWorkspace";

export default async function SharedPlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  return <PlanWorkspace planId={planId} backHref="/shared" />;
}
