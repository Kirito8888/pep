"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { SPECIALTY_LABEL } from "@/lib/athletics/events";
import { ThemeToggle } from "./ThemeToggle";

const NAV: { title: string; items: { href: string; label: string }[] }[] = [
  { title: "General", items: [{ href: "/dashboard", label: "Panel principal" }] },
  {
    title: "Planificación",
    items: [
      { href: "/planner", label: "Planificador" },
      { href: "/generator", label: "Generador inteligente" },
      { href: "/shared", label: "Planes compartidos" },
    ],
  },
  { title: "Gimnasio", items: [{ href: "/gym", label: "Herramientas de fuerza" }] },
  {
    title: "Atletismo",
    items: [
      { href: "/athletics/throws", label: "A · Lanzamientos y jabalina" },
      { href: "/athletics/jumps", label: "B · Saltos" },
      { href: "/athletics/sprints", label: "C · Velocidad, vallas, relevos" },
      { href: "/athletics/endurance", label: "D · Fondo, obstáculos, marcha" },
      { href: "/athletics/combined", label: "E · Pruebas combinadas" },
      { href: "/athletics/marks", label: "Registro de marcas PB/SB" },
    ],
  },
  { title: "Social", items: [{ href: "/friends", label: "Amigos" }] },
];

export function Sidebar({ user }: { user: { name: string; specialty: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between border-b px-4 py-3 lg:hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <Link href="/dashboard" className="text-lg font-black tracking-tight">
          Athlos<span className="text-brand-600">Pro</span>
        </Link>
        <button type="button" className="btn btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="main-nav">
          {open ? "Cerrar" : "Menú"}
        </button>
      </header>
      <aside
        id="main-nav"
        className={`${open ? "block" : "hidden"} w-full shrink-0 border-b p-4 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-r`}
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <Link href="/dashboard" className="mb-5 hidden text-xl font-black tracking-tight lg:block">
          Athlos<span className="text-brand-600">Pro</span>
        </Link>
        <nav className="space-y-4">
          {NAV.map((group) => (
            <div key={group.title}>
              <div className="muted mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider">{group.title}</div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`block rounded-lg px-2 py-1.5 text-sm transition ${active ? "bg-brand-600 font-semibold text-white" : "hover:bg-[var(--surface-2)]"}`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="mt-6 space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <div className="px-2">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="muted truncate text-xs">{SPECIALTY_LABEL[user.specialty] ?? user.specialty}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ThemeToggle />
            <button type="button" className="btn btn-sm" onClick={() => signOut({ callbackUrl: "/login" })}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
