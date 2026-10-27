'use client';

import { UPLOAD_LIMITS, toMegabytes } from '@sirio/shared';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, type RefObject, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { AppShell, PageTitle, SupportingCopy, Workspace, WorkspaceHeader } from '@/components/app-shell';
import { Button, ButtonLink } from '@/components/button';
import { Field, fieldControl } from '@/components/field';
import { RestaurantSwitcher } from '@/components/restaurant-switcher';
import { Card, ErrorBanner, Kicker, Notice, Skeleton } from '@/components/surfaces';
import { useDialog } from '@/components/use-dialog';
import { describeApiError } from '@/i18n/api-errors';
import { formatCount, formatDate, formatNumber } from '@/i18n/format';
import type { Locale } from '@/i18n/locale';
import { useCopy, useCopyRef, useLocale } from '@/i18n/locale-provider';
import { apiErrorCopy } from '@/i18n/messages/api-errors';
import { ownerCsvCopy } from '@/i18n/messages/owner-csv';
import { ownerPanelCopy } from '@/i18n/messages/owner-panel';
import type { CsvEncoding } from '@/lib/csv/detect';
import type { CsvDelimiter } from '@/lib/csv/parser';
import type { CsvPage, CsvSort } from '@/lib/csv/query';
import type { RestaurantProfile } from '@/lib/restaurant-types';

import { OwnerNavigation } from '../owner-navigation';

import { createCsvWorker } from './create-csv-worker';
import type { CsvFailure, CsvOptions, CsvSource, CsvWorkerRequest, CsvWorkerResponse } from './csv-protocol';

interface SavedCsv {
  originalName: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface ReadyFile {
  columns: string[];
  delimiter: CsvDelimiter;
  encoding: CsvEncoding;
  rowCount: number;
  warningCount: number;
}

interface Progress {
  bytesRead: number;
  rows: number;
  totalBytes: number | null;
}

interface View {
  page: number;
  pageSize: number;
  sort: CsvSort | null;
}

type Status = 'cancelled' | 'failed' | 'idle' | 'loading' | 'ready';

const DEFAULT_OPTIONS: CsvOptions = { delimiter: 'auto', encoding: 'auto', header: true };
const PAGE_SIZES = [25, 50, 100];
const MAXIMUM_BYTES = UPLOAD_LIMITS.csvFile.maximumBytes;

function contentUrl(restaurantId: string): string {
  return `/api/owner/restaurants/${restaurantId}/csv/content`;
}

function formatSize(bytes: number, locale: Locale): string {
  if (bytes < 1024 * 1024) return `${formatNumber(Math.max(1, Math.round(bytes / 1024)), locale)} KB`;
  return `${formatNumber(Math.round((bytes / 1024 / 1024) * 10) / 10, locale)} MB`;
}

/** Ends the worker the ref holds; kept outside so effects read no ref directly. */
function stopWorker(workerRef: RefObject<Worker | null>): void {
  workerRef.current?.terminate();
  workerRef.current = null;
}

export function CsvViewer() {
  const router = useRouter();
  const locale = useLocale();
  const copy = useCopy(ownerCsvCopy);
  const latestCopy = useCopyRef(ownerCsvCopy);
  const panelCopy = useCopy(ownerPanelCopy);
  const errorCopy = useCopy(apiErrorCopy);
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedCsv | null>(null);
  const [source, setSource] = useState<CsvSource | null>(null);
  const [options, setOptions] = useState<CsvOptions>(DEFAULT_OPTIONS);
  const [status, setStatus] = useState<Status>('idle');
  const [failure, setFailure] = useState<CsvFailure | null>(null);
  const [progress, setProgress] = useState<Progress>({ bytesRead: 0, rows: 0, totalBytes: null });
  const [ready, setReady] = useState<ReadyFile | null>(null);
  const [view, setView] = useState<View>({ page: 1, pageSize: 50, sort: null });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState<CsvPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const confirmTitle = useId();
  useDialog(confirmDialog, confirming, setConfirming);
  const selected = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedId) ?? restaurants[0],
    [restaurants, selectedId],
  );
  const selectedRestaurantId = selected?.id;

  /** The worker answers on its own schedule; each answer only updates state. */
  const startWorker = useCallback((): Worker => {
    const worker = createCsvWorker();
    worker.addEventListener('message', (event: MessageEvent<CsvWorkerResponse>) => {
      const message = event.data;
      if (message.type === 'progress') {
        setProgress({ bytesRead: message.bytesRead, rows: message.rows, totalBytes: message.totalBytes });
      } else if (message.type === 'ready') {
        setReady(message);
        setStatus('ready');
      } else if (message.type === 'page') {
        // Only the answer to the latest question counts; older ones are stale.
        if (message.requestId === requestRef.current) setPage(message.page);
      } else {
        setFailure(message.reason);
        setStatus('failed');
      }
    });
    worker.addEventListener('error', () => {
      setFailure('unreadable');
      setStatus('failed');
    });
    workerRef.current = worker;
    return worker;
  }, []);

  const open = useCallback(
    (nextSource: CsvSource, nextOptions: CsvOptions) => {
      const worker = workerRef.current ?? startWorker();
      setStatus('loading');
      setFailure(null);
      setReady(null);
      setPage(null);
      setProgress({ bytesRead: 0, rows: 0, totalBytes: nextSource.kind === 'file' ? nextSource.file.size : null });
      setView((current) => ({ ...current, page: 1 }));
      worker.postMessage({ options: nextOptions, source: nextSource, type: 'open' } satisfies CsvWorkerRequest);
    },
    [startWorker],
  );

  const loadRestaurants = useCallback(async () => {
    const response = await fetch('/api/owner/restaurants', { cache: 'no-store' });
    if (response.status === 401 || response.status === 403) {
      router.replace('/admin/login');
      return;
    }
    if (!response.ok) {
      setError(latestCopy.current.loadError);
      setLoadingRestaurants(false);
      return;
    }
    const profiles = (await response.json()) as RestaurantProfile[];
    setRestaurants(profiles);
    setSelectedId((current) => current || profiles[0]?.id || '');
    setLoadingRestaurants(false);
  }, [latestCopy, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRestaurants(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadRestaurants]);

  // The restaurant's saved CSV, if any, opens on its own.
  useEffect(() => {
    if (!selectedRestaurantId) return undefined;
    let active = true;
    void fetch(`/api/owner/restaurants/${selectedRestaurantId}/csv`, { cache: 'no-store' }).then(async (response) => {
      if (!active) return;
      if (response.status === 401 || response.status === 403) {
        router.replace('/admin/login');
        return;
      }
      if (response.status === 404) return;
      if (!response.ok) {
        setError(latestCopy.current.failed.unreadable);
        return;
      }
      const info = (await response.json()) as SavedCsv;
      if (!active) return;
      setSaved(info);
      const savedSource: CsvSource = { kind: 'saved', url: contentUrl(selectedRestaurantId) };
      setSource(savedSource);
      open(savedSource, DEFAULT_OPTIONS);
    });
    return () => {
      active = false;
    };
  }, [latestCopy, open, router, selectedRestaurantId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput);
      setView((current) => (current.page === 1 ? current : { ...current, page: 1 }));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  // Asks the worker for the page on screen whenever it, the search or the order change.
  useEffect(() => {
    const worker = workerRef.current;
    if (status !== 'ready' || !worker) return;
    requestRef.current += 1;
    worker.postMessage({
      query: { page: view.page, pageSize: view.pageSize, search, sort: view.sort },
      requestId: requestRef.current,
      type: 'query',
    } satisfies CsvWorkerRequest);
  }, [ready, search, status, view]);

  useEffect(() => () => stopWorker(workerRef), []);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared so picking the same file again still counts as a change.
    event.target.value = '';
    if (!file) return;
    setError(null);
    setNotice(null);
    if (file.size > MAXIMUM_BYTES) {
      setError(copy.tooLarge(toMegabytes(MAXIMUM_BYTES)));
      return;
    }
    const fileSource: CsvSource = { file, kind: 'file' };
    setSource(fileSource);
    setOptions(DEFAULT_OPTIONS);
    setSearchInput('');
    setSearch('');
    setView((current) => ({ ...current, page: 1, sort: null }));
    open(fileSource, DEFAULT_OPTIONS);
  }

  function changeOptions(next: CsvOptions) {
    setOptions(next);
    if (source) open(source, next);
  }

  function cancel() {
    stopWorker(workerRef);
    setStatus('cancelled');
    setReady(null);
    setPage(null);
  }

  function toggleSort(column: number) {
    setView((current) => {
      const direction = current.sort?.column === column ? current.sort.direction : null;
      const sort: CsvSort | null =
        direction === null ? { column, direction: 'asc' } : direction === 'asc' ? { column, direction: 'desc' } : null;
      return { ...current, page: 1, sort };
    });
  }

  function switchRestaurant(event: ChangeEvent<HTMLSelectElement>) {
    stopWorker(workerRef);
    setSaved(null);
    setSource(null);
    setReady(null);
    setPage(null);
    setStatus('idle');
    setSelectedId(event.target.value);
  }

  function requestSave() {
    if (saved) setConfirming(true);
    else void save();
  }

  async function save() {
    if (source?.kind !== 'file' || !selected) return;
    setConfirming(false);
    setSaving(true);
    setError(null);
    setNotice(null);
    const body = new FormData();
    body.set('file', source.file, source.file.name);
    try {
      const response = await fetch(`/api/owner/restaurants/${selected.id}/csv`, { body, method: 'PUT' });
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(describeApiError(result, response.status, errorCopy));
        return;
      }
      const info = result as SavedCsv;
      setSaved(info);
      // What is on screen is now the saved file: new settings re-read it from the server.
      setSource({ kind: 'saved', url: contentUrl(selected.id) });
      setNotice(copy.saved(info.originalName));
    } catch {
      setError(copy.failed.unreadable);
    } finally {
      setSaving(false);
    }
  }

  const delimiterName = (delimiter: CsvDelimiter): string =>
    delimiter === ',' ? copy.delimiter.names.comma : delimiter === ';' ? copy.delimiter.names.semicolon : copy.delimiter.names.tab;
  const encodingName = (encoding: CsvEncoding): string => (encoding === 'utf-8' ? 'UTF-8' : 'Windows-1252');
  const percent =
    progress.totalBytes && progress.totalBytes > 0
      ? Math.min(100, Math.round((progress.bytesRead / progress.totalBytes) * 100))
      : null;
  const pages = page ? Math.max(1, Math.ceil(page.matchCount / view.pageSize)) : 1;
  const unsaved = source?.kind === 'file';
  const sourceLabel =
    source?.kind === 'file'
      ? copy.unsavedFile(source.file.name, formatSize(source.file.size, locale))
      : source?.kind === 'saved' && saved
        ? copy.savedFile(saved.originalName, formatSize(saved.sizeBytes, locale), formatDate(saved.uploadedAt, locale))
        : null;

  return (
    <AppShell navigation={<OwnerNavigation active="menu" />}>
      <Workspace className="max-w-[94rem]">
        <WorkspaceHeader
          actions={
            <>
              <ButtonLink href="/admin/menu" tone="quiet">
                {copy.back}
              </ButtonLink>
              <RestaurantSwitcher onChange={switchRestaurant} restaurants={restaurants} selectedId={selected?.id} />
            </>
          }
        >
          <Kicker tone="teal">{copy.kicker}</Kicker>
          <PageTitle>{copy.title}</PageTitle>
          <SupportingCopy>{copy.lede}</SupportingCopy>
        </WorkspaceHeader>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {notice ? <Notice onDismiss={() => setNotice(null)}>{notice}</Notice> : null}
        {loadingRestaurants ? (
          <div aria-label={copy.loading} className="grid gap-4" role="status">
            <Skeleton className="min-h-40" />
            <Skeleton className="min-h-96" />
          </div>
        ) : null}
        {!loadingRestaurants && !selected ? (
          <Card className="grid min-h-64 place-items-center p-10 text-center">
            <h2 className="m-0 font-display text-2xl tracking-tight">{panelCopy.noRestaurant}</h2>
          </Card>
        ) : null}

        {selected ? (
          <div className="grid gap-4">
            <Card accent="teal" className="grid gap-4 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="m-0 font-bold break-words text-ink" data-testid="csv-source">
                    {sourceLabel ?? copy.choose}
                  </p>
                  <p className="m-0 mt-1 text-[13px] text-ink-muted">{copy.chooseHint}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <input
                    accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                    className="hidden"
                    data-testid="csv-file-input"
                    onChange={chooseFile}
                    ref={fileInput}
                    type="file"
                  />
                  <Button onClick={() => fileInput.current?.click()} tone="secondary">
                    {copy.choose}
                  </Button>
                  <Button disabled={!unsaved || status !== 'ready' || saving} onClick={requestSave}>
                    {saving ? copy.saving : copy.save}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <Field label={copy.delimiter.label}>
                  <select
                    className={fieldControl}
                    disabled={!source || status === 'loading'}
                    onChange={(event) => changeOptions({ ...options, delimiter: event.target.value as CsvOptions['delimiter'] })}
                    value={options.delimiter}
                  >
                    <option value="auto">
                      {copy.delimiter.auto(ready ? delimiterName(ready.delimiter) : '…')}
                    </option>
                    <option value=",">{copy.delimiter.names.comma}</option>
                    <option value=";">{copy.delimiter.names.semicolon}</option>
                    <option value={'\t'}>{copy.delimiter.names.tab}</option>
                  </select>
                </Field>
                <Field label={copy.encoding.label}>
                  <select
                    className={fieldControl}
                    disabled={!source || status === 'loading'}
                    onChange={(event) => changeOptions({ ...options, encoding: event.target.value as CsvOptions['encoding'] })}
                    value={options.encoding}
                  >
                    <option value="auto">{copy.encoding.auto(ready ? encodingName(ready.encoding) : '…')}</option>
                    <option value="utf-8">UTF-8</option>
                    <option value="windows-1252">Windows-1252</option>
                  </select>
                </Field>
                <label className="flex min-h-11 items-center gap-2 text-[13px] font-bold text-ink-soft sm:col-span-2 lg:col-span-1">
                  <input
                    checked={options.header}
                    className="size-5 accent-olive"
                    disabled={!source || status === 'loading'}
                    onChange={(event) => changeOptions({ ...options, header: event.target.checked })}
                    type="checkbox"
                  />
                  {copy.header}
                </label>
              </div>

              {status === 'loading' ? (
                <div className="grid gap-2">
                  <div
                    aria-label={copy.progressLabel}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={percent ?? undefined}
                    className="h-2 overflow-hidden rounded-full bg-control"
                    role="progressbar"
                  >
                    <div
                      className="h-full rounded-full bg-teal transition-[width] duration-150 motion-reduce:transition-none"
                      style={{ width: `${percent ?? 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-ink-muted tabular-nums" role="status">
                      {formatCount(progress.rows, locale, copy.readForms)}
                      {percent === null ? '' : ` · ${formatNumber(percent, locale)} %`}
                    </span>
                    <Button onClick={cancel} tone="quiet">
                      {copy.cancel}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>

            {status === 'cancelled' ? <ErrorBanner>{copy.cancelled}</ErrorBanner> : null}
            {status === 'failed' && failure ? <ErrorBanner>{copy.failed[failure]}</ErrorBanner> : null}
            {status === 'idle' && !source ? (
              <Card className="grid min-h-48 place-items-center p-8 text-center">
                <p className="m-0 max-w-md text-sm/relaxed text-ink-muted">{copy.empty}</p>
              </Card>
            ) : null}

            {status === 'ready' && ready ? (
              <Card className="grid gap-4 p-4 sm:p-5">
                {ready.warningCount > 0 ? (
                  <p className="m-0 rounded-lg bg-copper-wash px-3 py-2 text-[13px] font-semibold text-copper" role="status">
                    {copy.warnings(formatCount(ready.warningCount, locale, copy.rowForms))}
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-end">
                  <Field label={copy.search}>
                    <input
                      className={fieldControl}
                      onChange={(event) => setSearchInput(event.target.value)}
                      type="search"
                      value={searchInput}
                    />
                  </Field>
                  <Field label={copy.pageSize}>
                    <select
                      className={fieldControl}
                      onChange={(event) => setView((current) => ({ ...current, page: 1, pageSize: Number(event.target.value) }))}
                      value={view.pageSize}
                    >
                      {PAGE_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {formatNumber(size, locale)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="max-h-[70vh] overflow-auto rounded-xl border border-line">
                  <table aria-label={copy.table} className="w-full border-separate border-spacing-0 text-left text-[13px]">
                    <thead>
                      <tr>
                        <th
                          className="sticky top-0 left-0 z-20 border-b border-line bg-control px-3 py-2 text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase"
                          scope="col"
                        >
                          {copy.rowNumber}
                        </th>
                        {ready.columns.map((name, index) => {
                          const direction = view.sort?.column === index ? view.sort.direction : null;
                          return (
                            <th
                              aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
                              className="sticky top-0 z-10 border-b border-line bg-control p-0"
                              key={index}
                              scope="col"
                            >
                              <button
                                aria-label={copy.sortBy(name)}
                                className="flex min-h-11 w-full items-center gap-1.5 px-3 text-left font-bold whitespace-nowrap text-ink hover:text-teal"
                                onClick={() => toggleSort(index)}
                                type="button"
                              >
                                <span>{name}</span>
                                <span aria-hidden="true" className="text-ink-muted">
                                  {direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : '↕'}
                                </span>
                              </button>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {(page?.rows ?? []).map((row) => (
                        <tr className={row.found === null ? '' : 'bg-copper-wash'} key={row.line}>
                          <th
                            className="sticky left-0 border-b border-line bg-paper px-3 py-2 text-left font-semibold text-ink-muted tabular-nums"
                            scope="row"
                          >
                            {formatNumber(row.line, locale)}
                            {row.found === null ? null : (
                              <span
                                aria-label={copy.warningRow(formatNumber(row.found, locale), formatNumber(ready.columns.length, locale))}
                                className="ml-1.5 inline-grid size-4 place-items-center rounded-full bg-copper text-[10px] font-bold text-white"
                                role="img"
                                title={copy.warningRow(formatNumber(row.found, locale), formatNumber(ready.columns.length, locale))}
                              >
                                !
                              </span>
                            )}
                          </th>
                          {row.cells.map((cell, index) => (
                            <td className="min-w-24 border-b border-line px-3 py-2 align-top break-words whitespace-pre-wrap text-ink" key={index}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="m-0 text-[13px] text-ink-muted tabular-nums">
                    {search.trim() !== '' && page
                      ? copy.matches(formatNumber(page.matchCount, locale), formatNumber(ready.rowCount, locale))
                      : formatCount(ready.rowCount, locale, copy.rowForms)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={!page || page.page <= 1}
                      onClick={() => setView((current) => ({ ...current, page: (page?.page ?? 1) - 1 }))}
                      tone="quiet"
                    >
                      {copy.previous}
                    </Button>
                    <span className="min-w-28 text-center text-[13px] font-bold text-ink-soft tabular-nums">
                      {copy.pageOf(formatNumber(page?.page ?? 1, locale), formatNumber(pages, locale))}
                    </span>
                    <Button
                      disabled={!page || page.page >= pages}
                      onClick={() => setView((current) => ({ ...current, page: (page?.page ?? 1) + 1 }))}
                      tone="quiet"
                    >
                      {copy.next}
                    </Button>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>
        ) : null}

        <dialog
          aria-labelledby={confirmTitle}
          className="w-[min(calc(100%-2rem),32.5rem)] rounded-2xl bg-paper-raised p-0 shadow-raised backdrop:bg-ink/55 backdrop:backdrop-blur-[3px]"
          onClose={() => setConfirming(false)}
          ref={confirmDialog}
        >
          <form className="grid gap-4 p-6 sm:p-8" method="dialog">
            <h2 className="m-0 font-display text-2xl tracking-[-0.03em]" id={confirmTitle}>
              {copy.confirm.title}
            </h2>
            <p className="m-0 text-[13px]/relaxed text-ink-soft">{copy.confirm.body(saved?.originalName ?? '')}</p>
            <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button tone="secondary" type="submit">
                {copy.confirm.keep}
              </Button>
              <Button onClick={() => void save()} tone="danger">
                {copy.confirm.replace}
              </Button>
            </div>
          </form>
        </dialog>
      </Workspace>
    </AppShell>
  );
}
