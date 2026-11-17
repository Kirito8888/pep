"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { Alert, Field } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (!res || res.error) {
      setError("Email o contraseña incorrectos.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-xl font-bold">Iniciar sesión</h1>
      {error ? <Alert kind="error">{error}</Alert> : null}
      <Field label="Email">
        <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Contraseña">
        <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
      <p className="ink-2 text-center text-sm">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:underline">
          Regístrate
        </Link>
      </p>
    </form>
  );
}
