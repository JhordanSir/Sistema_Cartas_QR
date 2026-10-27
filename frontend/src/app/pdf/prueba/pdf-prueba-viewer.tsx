'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface MenuItem {
  name: string;
  description?: string;
  price: string;
  badge?: string;
}

interface MenuSection {
  title: string;
  subtitle?: string;
  items: MenuItem[];
}

const MENU_DATA: MenuSection[] = [
  {
    title: 'ENTRADAS',
    items: [
      {
        name: 'Sakana tzusumiage',
        description: '12 und de wantanes rellenos de pescado marinado con salsa de ostión.',
        price: 'S/ 26.00',
      },
      {
        name: 'Gyozas',
        description: '12 und de empanadas japonesas rellenas de cerdo y salsa ponzu.',
        price: 'S/ 28.00',
      },
      {
        name: 'Tequeños de mariscos',
        description: '12 und de tequeños rellenos de mariscos, acompañados de salsa tártara especial.',
        price: 'S/ 28.00',
      },
      {
        name: 'Tori no karage',
        description: 'Chicharrón de pollo al estilo japonés, acompañado de papas fritas y ensalada kai.',
        price: 'S/ 34.00',
      },
    ],
  },
  {
    title: 'AGEMONOS (FRITURAS)',
    subtitle: 'Acompañados con ensalada kai y papas fritas',
    items: [
      {
        name: 'Langostinos furai (12 piezas)',
        price: 'S/ 36.00',
      },
      {
        name: 'Pescado furai (12 piezas)',
        price: 'S/ 35.00',
      },
      {
        name: 'Furai mixto (pescados y mariscos)',
        price: 'S/ 35.00',
      },
      {
        name: 'Langostino tempura (12 piezas)',
        price: 'S/ 36.00',
      },
      {
        name: 'Pescado tempura (12 piezas)',
        price: 'S/ 35.00',
      },
      {
        name: 'Tempura mixto (pescado y mariscos)',
        price: 'S/ 35.00',
      },
    ],
  },
  {
    title: 'SASHIMI',
    items: [
      { name: 'Salmon', price: 'S/ 21.00' },
      { name: 'Pescado blanco', price: 'S/ 20.00' },
      { name: 'Pulpo', price: 'S/ 20.00' },
      { name: 'Bonito', price: 'S/ 18.00' },
      { name: 'Langostino', price: 'S/ 19.00' },
    ],
  },
  {
    title: 'NIGIRIS',
    items: [
      { name: 'Salmon', price: 'S/ 12.00' },
      { name: 'Bonito', price: 'S/ 10.00' },
      { name: 'Pescado blanco', price: 'S/ 11.00' },
      { name: 'Pulpo', price: 'S/ 11.00' },
      { name: 'Langostino', price: 'S/ 11.00' },
    ],
  },
  {
    title: 'GUNKAN',
    items: [
      { name: 'Cangrejo', price: 'S/ 11.00' },
      { name: 'Pulpo', price: 'S/ 11.00' },
      { name: 'Langostino', price: 'S/ 11.00' },
      { name: 'Pescado', price: 'S/ 11.00' },
    ],
  },
  {
    title: 'MORIAWASE KAI',
    items: [
      {
        name: 'Moriawase Kai',
        description: 'Sashimi y sushi variado (16 piezas + ½ maki)',
        price: 'S/ 70.00',
        badge: 'Especialidad',
      },
    ],
  },
  {
    title: 'NIGIRIS ESPECIALES',
    items: [
      {
        name: 'SALMON KAI',
        description: '3 und de nigiris de salmón, salsa huancaína con chalaquita.',
        price: 'S/ 21.00',
        badge: 'Destacado',
      },
      {
        name: 'PULPO PARRILLERO',
        description: '3 und de nigiris de pulpo flameados con chimichurri y salsa ponzu.',
        price: 'S/ 20.00',
      },
      {
        name: 'BONITO ACEVICHADO',
        description: '3 und de nigiris de bonito en espejo de salsa acevichada, chimichurri y chalaquita.',
        price: 'S/ 20.00',
      },
      {
        name: 'GUNKAN CEVICHERO',
        description: '3 und de gunkans con relleno de ceviche, chalaquita frito.',
        price: 'S/ 21.00',
      },
    ],
  },
];

export function PdfPruebaViewer() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<'interactive' | 'pdf' | 'menu'>('interactive');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerAreaRef = useRef<HTMLDivElement | null>(null);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.35, 3.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(prev - 0.35, 0.85);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleToggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Ignorar si el navegador restringe fullscreen
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe catch
      }
    }
  };

  const handleDoubleTap = () => {
    if (zoom > 1.2) {
      handleResetZoom();
    } else {
      setZoom(2);
      setPan({ x: 0, y: 0 });
    }
  };

  const handleCopyLink = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex min-h-dvh flex-col bg-[#0b0c10] text-[#eaeaea] transition-colors ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      {/* Barra superior de navegación / Branding */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#12141a]/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-900 font-extrabold tracking-wider text-white shadow-lg shadow-red-950/40">
            <span>KAI</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                KAI Sushi & Bar
              </h1>
              <span className="hidden items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400 ring-1 ring-red-500/20 sm:inline-flex">
                Carta Activa
              </span>
            </div>
            <p className="text-xs text-neutral-400">Menú digital oficial · Formato PDF</p>
          </div>
        </div>

        {/* Acciones principales superiores */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Copiar enlace de la carta"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-neutral-200 transition-all hover:bg-white/10 active:scale-95"
          >
            {copied ? (
              <>
                <svg className="size-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span className="hidden sm:inline">Compartir</span>
              </>
            )}
          </button>

          <a
            href="/pdf/prueba.pdf"
            download="Carta-KAI-Sushi.pdf"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-red-900/30 transition-all hover:bg-red-500 active:scale-95"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Descargar PDF</span>
          </a>
        </div>
      </header>

      {/* Barra de pestañas de visualización */}
      <div className="z-20 border-b border-white/5 bg-[#171922] px-4 py-2 sm:px-6">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 rounded-xl bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('interactive')}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'interactive'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>Visor HD</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pdf')}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'pdf'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Lector PDF Nativo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'menu'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>Lista de Platos</span>
            </button>
          </div>

          {activeTab === 'interactive' && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="hidden lg:inline">Doble clic / arrastrar para mover</span>
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal según la pestaña activa */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {activeTab === 'interactive' && (
          <div className="relative flex flex-1 flex-col">
            {/* Barra flotante de controles de zoom y pantalla completa */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-2xl border border-white/10 bg-black/75 p-1.5 shadow-2xl backdrop-blur-md">
              <button
                type="button"
                onClick={handleZoomOut}
                aria-label="Reducir zoom"
                title="Alejar"
                className="flex size-9 items-center justify-center rounded-xl text-neutral-300 transition-colors hover:bg-white/15 hover:text-white active:scale-95"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                aria-label="Restablecer zoom"
                title="Ajustar al 100%"
                className="px-2 text-xs font-semibold tabular-nums text-neutral-300 transition-colors hover:text-white"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                aria-label="Aumentar zoom"
                title="Acercar"
                className="flex size-9 items-center justify-center rounded-xl text-neutral-300 transition-colors hover:bg-white/15 hover:text-white active:scale-95"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </button>

              <div className="mx-0.5 h-4 w-px bg-white/20" />

              <button
                type="button"
                onClick={handleToggleFullscreen}
                aria-label="Pantalla completa"
                title={isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
                className="flex size-9 items-center justify-center rounded-xl text-neutral-300 transition-colors hover:bg-white/15 hover:text-white active:scale-95"
              >
                {isFullscreen ? (
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                )}
              </button>
            </div>

            {/* Lienzo del visor con pan & zoom */}
            <div
              ref={viewerAreaRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onDoubleClick={handleDoubleTap}
              className={`relative flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-6 ${
                zoom > 1 ? 'cursor-grab active:cursor-grabbing select-none' : 'cursor-zoom-in'
              }`}
              style={{ touchAction: zoom > 1 ? 'none' : 'pan-y' }}
            >
              <div
                className="transition-transform duration-75 ease-out will-change-transform"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/pdf/carta-prueba.jpg"
                  alt="Carta KAI Sushi & Bar - Entradas, Agemonos, Sashimi, Nigiris y Especialidades"
                  className="max-h-[82dvh] w-auto max-w-full rounded-xl object-contain shadow-[0_20px_50px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
                  draggable={false}
                />
              </div>

              {/* Indicador de ayuda en móvil */}
              {zoom <= 1 && (
                <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-3.5 py-1.5 text-[11px] font-medium text-neutral-300 backdrop-blur-md">
                  💡 Toca dos veces o usa los botones de zoom para ampliar
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pdf' && (
          <div className="relative flex flex-1 flex-col items-center justify-center p-4">
            <div className="flex h-full w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#161821] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 bg-[#1e202c] px-4 py-2.5">
                <span className="text-xs font-semibold text-neutral-300">
                  Documento PDF Oficial: Carta-KAI.pdf
                </span>
                <a
                  href="/pdf/prueba.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 hover:underline"
                >
                  Abrir en pestaña nueva ↗
                </a>
              </div>
              <iframe
                src="/pdf/prueba.pdf#toolbar=1&navpanes=0"
                title="Lector PDF Carta KAI"
                className="h-full min-h-[650px] w-full flex-1 border-0"
              />
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
            <div className="mx-auto max-w-4xl space-y-10">
              <div className="text-center">
                <span className="text-xs font-bold tracking-widest text-red-500 uppercase">
                  Carta Digital Transcrita
                </span>
                <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  KAI Sushi & Bar
                </h2>
                <p className="mt-2 text-sm text-neutral-400">
                  Precios en Soles (S/). Todos nuestros platos se preparan al momento con insumos frescos.
                </p>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                {MENU_DATA.map((section) => (
                  <div
                    key={section.title}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="border-b border-white/10 pb-3">
                      <h3 className="text-lg font-bold tracking-tight text-red-400">
                        {section.title}
                      </h3>
                      {section.subtitle && (
                        <p className="mt-0.5 text-xs text-neutral-400">{section.subtitle}</p>
                      )}
                    </div>

                    <ul className="mt-4 divide-y divide-white/5 space-y-3">
                      {section.items.map((item, idx) => (
                        <li key={idx} className="flex items-start justify-between gap-4 pt-3 first:pt-0">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-neutral-200">
                                {item.name}
                              </span>
                              {item.badge && (
                                <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400 uppercase">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs leading-relaxed text-neutral-400">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-sm font-bold tabular-nums text-amber-400">
                            {item.price}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Pie de página con información y accesos rápidos */}
      <footer className="border-t border-white/10 bg-[#0e1015] px-4 py-3 text-center text-xs text-neutral-400 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-300">KAI Sushi</span>
            <span>·</span>
            <span>Sirio Cartas QR</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/pdf/prueba.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 transition-colors hover:text-white hover:underline"
            >
              Ver PDF original
            </a>
            <span>·</span>
            <a
              href="/pdf/carta-prueba.jpg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 transition-colors hover:text-white hover:underline"
            >
              Ver imagen HD
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
