import { PlanWorkspace } from "@/components/planner/PlanWorkspace";

export default async function PlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  return <PlanWorkspace planId={planId} backHref="/planner" />;
}
