import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getUser()) redirect("/dashboard");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <div className="text-4xl font-black tracking-tight">
          Athlos<span className="text-brand-600">Pro</span>
        </div>
        <p className="ink-2 mt-2 text-sm">Gimnasio, atletismo por sectores y planificación compartida.</p>
      </div>
      <div className="card w-full max-w-md">{children}</div>
      <div className="mt-4">
        <ThemeToggle />
      </div>
    </div>
  );
}
