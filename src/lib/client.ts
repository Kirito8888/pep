"use client";

import { useCallback, useEffect, useState } from "react";

/** Llamada a la API propia; lanza Error con el mensaje del servidor. */
export async function api<T = unknown>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : `Error ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export interface FetchState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

export function useFetch<T>(url: string | null): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(url !== null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    setLoading(true);
    api<T>(url)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Error de red");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [url, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}

/** Convierte el valor de un input numérico en número o null. */
export function num(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Ha ocurrido un error";
}
