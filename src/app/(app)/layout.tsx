import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { getUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <div className="lg:flex">
      <Sidebar user={{ name: user.name, specialty: user.specialty }} />
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
