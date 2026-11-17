import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AthlosPro",
  description: "Suite integral para entrenadores y atletas: gimnasio, atletismo por sectores, planificación periodizada y planes compartidos.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Aplica el tema guardado antes de pintar para evitar el parpadeo claro/oscuro.
const themeScript = `(function(){try{var t=localStorage.getItem("athlos-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
