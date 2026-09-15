import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { LocaleProvider } from "@/i18n/locale-provider";
import { shellCopy } from "@/i18n/messages/shell";
import { getLocale } from "@/i18n/server";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { metadata } = shellCopy[await getLocale()];
  return { description: metadata.description, title: metadata.title };
}

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

// The language needs no such script: it is read from the cookie on the server, so the
// HTML, <html lang> and the title already arrive in it.
export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
