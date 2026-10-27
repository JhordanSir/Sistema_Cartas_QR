'use client';

import { useRouter } from 'next/navigation';
import { type ChangeEvent, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AppShell, PageTitle, SupportingCopy, Workspace, WorkspaceHeader } from '@/components/app-shell';
import { Button, ButtonLink } from '@/components/button';
import { Field, fieldControl } from '@/components/field';
import { RestaurantSwitcher } from '@/components/restaurant-switcher';
import { Card, ErrorBanner, Kicker, Skeleton, StatusPill } from '@/components/surfaces';
import { formatCount, formatCurrency, formatNumber } from '@/i18n/format';
import type { Locale } from '@/i18n/locale';
import { useCopy, useCopyRef, useLocale } from '@/i18n/locale-provider';
import { ownerPanelCopy } from '@/i18n/messages/owner-panel';
import { ownerStreamCopy } from '@/i18n/messages/owner-stream';
import { readNdjson } from '@/lib/ndjson';
import type { RestaurantProfile } from '@/lib/restaurant-types';

import { OwnerNavigation } from '../owner-navigation';

/** One line of the API's product stream (see ProductStreamItem in the API). */
interface StreamedProduct {
  basePrice: string;
  category: { id: string; name: string };
  hasImage: boolean;
  id: string;
  isAvailable: boolean;
  name: string;
  position: number;
  updatedAt: string;
  variants: unknown[];
}

interface ReceivedProduct {
  line: string;
  product: StreamedProduct;
}

type StreamStatus = 'cancelled' | 'done' | 'failed' | 'idle' | 'streaming';

const DELAY_OPTIONS = [0, 100, 250, 500];
const DEFAULT_DELAY_MS = 250;

/** Stops whatever download the ref holds; kept outside so effects read no ref directly. */
function abortDownload(controllerRef: RefObject<AbortController | null>) {
  controllerRef.current?.abort();
}

function formatElapsed(milliseconds: number | null, locale: Locale): string {
  if (milliseconds === null) return '—';
  if (milliseconds < 1000) return `${formatNumber(Math.round(milliseconds), locale)} ms`;
  return `${formatNumber(Math.round(milliseconds / 100) / 10, locale)} s`;
}

export function ProductStreamViewer() {
  const router = useRouter();
  const locale = useLocale();
  const copy = useCopy(ownerStreamCopy);
  const latestCopy = useCopyRef(ownerStreamCopy);
  const panelCopy = useCopy(ownerPanelCopy);
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [delayMs, setDelayMs] = useState(DEFAULT_DELAY_MS);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [received, setReceived] = useState<ReceivedProduct[]>([]);
  const [firstObjectMs, setFirstObjectMs] = useState<number | null>(null);
  const [totalMs, setTotalMs] = useState<number | null>(null);
  // Each run gets a number; a stopped or replaced run can no longer touch the state.
  const runRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const selected = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedId) ?? restaurants[0],
    [restaurants, selectedId],
  );

  const loadRestaurants = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/owner/restaurants', { cache: 'no-store' });
    if (response.status === 401 || response.status === 403) {
      router.replace('/admin/login');
      return;
    }
    if (!response.ok) {
      setLoadError(latestCopy.current.loadError);
      setLoading(false);
      return;
    }
    const profiles = (await response.json()) as RestaurantProfile[];
    setRestaurants(profiles);
    setSelectedId((current) => current || profiles[0]?.id || '');
    setLoading(false);
  }, [latestCopy, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRestaurants(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadRestaurants]);

  // Leaving the page cuts the download, and with it the API's database reads.
  useEffect(() => () => abortDownload(controllerRef), []);

  function reset() {
    runRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setReceived([]);
    setFirstObjectMs(null);
    setTotalMs(null);
  }

  async function start() {
    if (!selected) return;
    reset();
    const run = runRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('streaming');
    const startedAt = performance.now();
    const current = () => runRef.current === run;

    try {
      const response = await fetch(
        `/api/owner/restaurants/${selected.id}/menu/products/stream?delayMs=${delayMs}`,
        { cache: 'no-store', signal: controller.signal },
      );
      if (response.status === 401 || response.status === 403) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok || !response.body) throw new Error('The product stream did not start');

      for await (const { line, value } of readNdjson<StreamedProduct>(response.body)) {
        if (!current()) return;
        if (value.position === 1) setFirstObjectMs(performance.now() - startedAt);
        setReceived((items) => [...items, { line, product: value }]);
      }
      if (!current()) return;
      setTotalMs(performance.now() - startedAt);
      setStatus('done');
    } catch {
      if (!current()) return;
      setTotalMs(performance.now() - startedAt);
      setStatus(controller.signal.aborted ? 'cancelled' : 'failed');
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  function stop() {
    abortDownload(controllerRef);
  }

  function switchRestaurant(event: ChangeEvent<HTMLSelectElement>) {
    reset();
    setStatus('idle');
    setSelectedId(event.target.value);
  }

  const streaming = status === 'streaming';
  const statusPill = {
    cancelled: <StatusPill tone="muted">{copy.status.cancelled}</StatusPill>,
    done: <StatusPill tone="positive">{copy.status.done}</StatusPill>,
    failed: <StatusPill tone="muted">{copy.status.failed}</StatusPill>,
    idle: <StatusPill tone="muted">{copy.status.idle}</StatusPill>,
    streaming: <StatusPill tone="draft">{copy.status.streaming}</StatusPill>,
  }[status];

  return (
    <AppShell navigation={<OwnerNavigation active="menu" />}>
      <Workspace className="max-w-[74rem]">
        <WorkspaceHeader
          actions={
            <>
              <ButtonLink href="/admin/menu" tone="quiet">
                {copy.back}
              </ButtonLink>
              <RestaurantSwitcher
                onChange={switchRestaurant}
                restaurants={restaurants}
                selectedId={selected?.id}
              />
            </>
          }
        >
          <Kicker tone="teal">{copy.kicker}</Kicker>
          <PageTitle>{copy.title}</PageTitle>
          <SupportingCopy>{copy.lede}</SupportingCopy>
        </WorkspaceHeader>

        {loadError ? <ErrorBanner>{loadError}</ErrorBanner> : null}
        {status === 'failed' ? <ErrorBanner>{copy.failedNotice}</ErrorBanner> : null}
        {loading ? (
          <div aria-label={copy.loading} className="grid gap-6 lg:grid-cols-[20rem_1fr]" role="status">
            <Skeleton className="min-h-72" />
            <Skeleton className="min-h-96" />
          </div>
        ) : null}
        {!loading && !selected && !loadError ? (
          <Card className="grid min-h-64 place-items-center p-10 text-center">
            <h2 className="m-0 font-display text-2xl tracking-tight">{panelCopy.noRestaurant}</h2>
          </Card>
        ) : null}

        {!loading && selected ? (
          <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-8">
            <div className="grid gap-4 lg:sticky lg:top-6">
              <Card accent="teal" className="grid gap-4 p-5">
                <Field hint={copy.controls.delayHint} label={copy.controls.delay}>
                  <select
                    className={fieldControl}
                    disabled={streaming}
                    onChange={(event) => setDelayMs(Number(event.target.value))}
                    value={delayMs}
                  >
                    {DELAY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option === 0 ? copy.controls.noDelay : `${option} ms`}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Button disabled={streaming} onClick={() => void start()}>
                    {status === 'idle' || streaming ? copy.controls.start : copy.controls.restart}
                  </Button>
                  <Button disabled={!streaming} onClick={stop} tone="quiet">
                    {copy.controls.stop}
                  </Button>
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <Kicker tone="muted">{copy.metrics.label}</Kicker>
                  <span role="status">{statusPill}</span>
                </div>
                <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="col-span-2">
                    <dt className="text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase">
                      {copy.metrics.received}
                    </dt>
                    <dd
                      className="m-0 font-display text-5xl/none tracking-tight text-ink tabular-nums"
                      data-testid="stream-received"
                    >
                      {formatNumber(received.length, locale)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase">
                      {copy.metrics.firstObject}
                    </dt>
                    <dd className="m-0 text-lg font-bold text-ink-soft tabular-nums">
                      {formatElapsed(firstObjectMs, locale)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase">
                      {copy.metrics.total}
                    </dt>
                    <dd className="m-0 text-lg font-bold text-ink-soft tabular-nums">
                      {formatElapsed(totalMs, locale)}
                    </dd>
                  </div>
                </dl>
              </Card>
            </div>

            {received.length === 0 ? (
              <Card className="grid min-h-48 place-items-center p-8 text-center">
                <p className="m-0 max-w-sm text-sm/relaxed text-ink-muted">{copy.empty}</p>
              </Card>
            ) : (
              <ol aria-label={copy.list} className="m-0 grid list-none gap-3 p-0">
                {received.map(({ line, product }) => (
                  <li
                    className="grid gap-3 rounded-xl bg-paper p-4 shadow-soft transition-[opacity,translate] duration-300 ease-soft starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none"
                    key={`${product.position}-${product.id}`}
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                      {product.hasImage ? (
                        // The image comes from the authenticated local BFF endpoint.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt=""
                          className="block size-12 rounded-lg bg-control object-cover"
                          loading="lazy"
                          src={`/api/owner/restaurants/${selected.id}/menu/products/${product.id}/image?v=${encodeURIComponent(product.updatedAt)}`}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="grid size-12 place-items-center rounded-lg bg-control text-copper"
                        >
                          ✦
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="m-0 text-[11px] font-bold tracking-[0.08em] text-teal uppercase">
                          {copy.item.position(product.position)}
                        </p>
                        <strong className="block text-base/snug break-words">{product.name}</strong>
                        <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
                          <span>{product.category.name}</span>
                          {product.variants.length > 0 ? (
                            <span>
                              · {formatCount(product.variants.length, locale, copy.item.optionForms)}
                            </span>
                          ) : null}
                          <StatusPill tone={product.isAvailable ? 'positive' : 'muted'}>
                            {product.isAvailable ? copy.item.available : copy.item.unavailable}
                          </StatusPill>
                        </p>
                      </div>
                      <span className="text-sm font-bold whitespace-nowrap text-ink tabular-nums">
                        {formatCurrency(product.basePrice, locale)}
                      </span>
                    </div>
                    <pre
                      aria-label={copy.item.raw}
                      className="m-0 rounded-lg bg-control px-3 py-2 font-mono text-[11px]/relaxed break-all whitespace-pre-wrap text-ink-soft"
                    >
                      {line}
                    </pre>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </Workspace>
    </AppShell>
  );
}
