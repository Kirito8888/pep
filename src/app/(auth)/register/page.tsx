"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { Alert, Field } from "@/components/ui";
import { SPECIALTIES } from "@/lib/athletics/events";
import { api, errorMessage } from "@/lib/client";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", sex: "M", specialty: "COMBINED" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/register", { body: form });
      const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (!res || res.error) throw new Error("Cuenta creada, pero no se pudo iniciar sesión. Inténtalo desde la pantalla de acceso.");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-xl font-bold">Crear cuenta</h1>
      {error ? <Alert kind="error">{error}</Alert> : null}
      <Field label="Nombre">
        <input className="input" required minLength={2} autoComplete="name" value={form.name} onChange={set("name")} />
      </Field>
      <Field label="Email">
        <input className="input" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
      </Field>
      <Field label="Contraseña" hint="Mínimo 8 caracteres.">
        <input className="input" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sexo (categoría de competición)">
          <select className="input" value={form.sex} onChange={set("sex")}>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </Field>
        <Field label="Especialidad principal">
          <select className="input" value={form.specialty} onChange={set("specialty")}>
            {SPECIALTIES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Creando…" : "Crear cuenta"}
      </button>
      <p className="ink-2 text-center text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
