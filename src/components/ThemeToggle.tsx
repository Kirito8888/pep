"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("athlos-theme", next ? "dark" : "light");
    } catch {
      /* almacenamiento no disponible: el tema solo dura esta sesión */
    }
  };

  return (
    <button type="button" onClick={toggle} className="btn btn-sm" aria-label="Cambiar entre modo claro y oscuro">
      {dark ? "☀ Modo claro" : "☾ Modo oscuro"}
    </button>
  );
}
