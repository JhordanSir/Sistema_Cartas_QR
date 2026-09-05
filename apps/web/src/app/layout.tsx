import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sirio Automatiza | Cartas QR",
  description: "Cartas digitales para restaurantes, siempre actualizadas.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  initialScale: 1,
  themeColor: [
    { color: "#f7f1e7", media: "(prefers-color-scheme: light)" },
    { color: "#141310", media: "(prefers-color-scheme: dark)" },
  ],
  width: "device-width",
};

// Applies the stored theme before first paint so the panel never flashes the wrong
// palette. Kept inline and tiny on purpose; it must run before the body renders.
const THEME_BOOTSTRAP = `try{var t=localStorage.getItem('sirio-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
