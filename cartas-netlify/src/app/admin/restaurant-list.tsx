'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { sendJson } from '@/components/forms/send-json';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { ConfirmDialog, Dialog } from '@/components/ui/dialogs';
import { controlClasses, Field } from '@/components/ui/field';
import { Card, Notice, StatusPill } from '@/components/ui/surfaces';
import { DELETE_UNDERSTOOD_LABEL, deletePhrase, type BackofficeRestaurant } from '@/shared/backoffice';
import { GENERIC_ERROR_MESSAGE } from '@/shared/messages';

export type ListedRestaurant = BackofficeRestaurant & { createdLabel: string };

type ActionKind = 'delete' | 'password' | 'status';
type Pending = { kind: ActionKind; restaurant: ListedRestaurant } | null;
type Feedback = { tone: 'error' | 'success'; text: string } | null;
type TemporaryPassword = { email: string; password: string };

function isTemporaryPassword(value: unknown): value is TemporaryPassword {
  return (
    typeof value === 'object' &&
    value !== null &&
    'email' in value &&
    typeof value.email === 'string' &&
    'password' in value &&
    typeof value.password === 'string'
  );
}

/**
 * The restaurants of one page: a table on a computer and cards on a phone.
 * Both call the same actions, and there is a single set of dialogs.
 */
export function RestaurantList({ restaurants }: { restaurants: ListedRestaurant[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [temporary, setTemporary] = useState<TemporaryPassword | null>(null);

  function open(kind: ActionKind, restaurant: ListedRestaurant): void {
    setFeedback(null);
    setDeleteErrors({});
    setPending({ kind, restaurant });
  }

  function close(): void {
    if (!busy) setPending(null);
  }

  async function changeStatus(restaurant: ListedRestaurant): Promise<void> {
    const pausing = restaurant.status === 'ENABLED';
    setBusy(true);
    const result = await sendJson(`/api/admin/restaurantes/${restaurant.id}`, 'PATCH', {
      status: pausing ? 'DISABLED' : 'ENABLED',
    });
    setBusy(false);
    setPending(null);
    if (!result.ok) {
      setFeedback({ text: result.error.message, tone: 'error' });
      return;
    }
    setFeedback({
      text: pausing
        ? `Pausaste ${restaurant.name}: su carta ya no se puede ver.`
        : `Reactivaste ${restaurant.name}: su carta vuelve a verse.`,
      tone: 'success',
    });
    router.refresh();
  }

  async function createTemporaryPassword(restaurant: ListedRestaurant): Promise<void> {
    setBusy(true);
    const result = await sendJson(`/api/admin/restaurantes/${restaurant.id}/contrasena-temporal`, 'POST');
    setBusy(false);
    setPending(null);
    if (!result.ok) {
      setFeedback({ text: result.error.message, tone: 'error' });
      return;
    }
    if (!isTemporaryPassword(result.data)) {
      setFeedback({ text: GENERIC_ERROR_MESSAGE, tone: 'error' });
      return;
    }
    setTemporary(result.data);
  }

  async function remove(restaurant: ListedRestaurant, confirmation: string, understood: boolean): Promise<void> {
    setBusy(true);
    const result = await sendJson(`/api/admin/restaurantes/${restaurant.id}`, 'DELETE', { confirmation, understood });
    setBusy(false);
    if (!result.ok) {
      if (result.error.fields) {
        setDeleteErrors(result.error.fields);
        return;
      }
      setPending(null);
      setFeedback({ text: result.error.message, tone: 'error' });
      return;
    }
    setPending(null);
    setFeedback({ text: `Eliminaste ${restaurant.name} y la cuenta de su dueño.`, tone: 'success' });
    router.refresh();
  }

  const target = pending?.restaurant;
  const pausing = target?.status === 'ENABLED';

  return (
    <div className="grid gap-4">
      {feedback ? <Notice tone={feedback.tone}>{feedback.text}</Notice> : null}

      <Card className="hidden overflow-hidden lg:block">
        <table className="w-full border-collapse text-left text-[15px]">
          <caption className="sr-only">Restaurantes</caption>
          <thead>
            <tr className="border-b border-line text-sm text-ink-soft">
              <th className="px-5 py-3 font-semibold" scope="col">
                Restaurante
              </th>
              <th className="px-3 py-3 font-semibold" scope="col">
                Correo del dueño
              </th>
              <th className="px-3 py-3 font-semibold" scope="col">
                Estado
              </th>
              <th className="px-3 py-3 font-semibold" scope="col">
                Alta
              </th>
              <th className="px-5 py-3" scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((restaurant) => (
              <tr className="border-b border-line align-top last:border-b-0" key={restaurant.id}>
                <td className="px-5 py-4">
                  <RestaurantName restaurant={restaurant} />
                </td>
                <td className="px-3 py-4 break-words">{restaurant.ownerEmail}</td>
                <td className="px-3 py-4">
                  <StatusBadge restaurant={restaurant} />
                </td>
                <td className="px-3 py-4 whitespace-nowrap">{restaurant.createdLabel}</td>
                <td className="px-5 py-4">
                  <RowActions onAction={open} restaurant={restaurant} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ul className="m-0 grid list-none gap-3 p-0 lg:hidden">
        {restaurants.map((restaurant) => (
          <li key={restaurant.id}>
            <Card className="grid gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <RestaurantName restaurant={restaurant} />
                <StatusBadge restaurant={restaurant} />
              </div>
              <dl className="m-0 grid gap-1 text-sm">
                <div>
                  <dt className="inline text-ink-soft">Dueño: </dt>
                  <dd className="m-0 inline break-words">{restaurant.ownerEmail}</dd>
                </div>
                <div>
                  <dt className="inline text-ink-soft">Alta: </dt>
                  <dd className="m-0 inline">{restaurant.createdLabel}</dd>
                </div>
              </dl>
              <RowActions onAction={open} restaurant={restaurant} />
            </Card>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        confirmLabel={pausing ? 'Pausar' : 'Reactivar'}
        onCancel={close}
        onConfirm={() => target && void changeStatus(target)}
        open={pending?.kind === 'status'}
        pending={busy}
        title={pausing ? `¿Pausar ${target?.name ?? ''}?` : `¿Reactivar ${target?.name ?? ''}?`}
        tone={pausing ? 'danger' : 'primary'}
      >
        {pausing
          ? `Su carta dejará de verse en /${target?.slug ?? ''} hasta que la reactives. Su dueño podrá seguir entrando a su panel.`
          : `Su carta volverá a verse en /${target?.slug ?? ''}.`}
      </ConfirmDialog>

      <ConfirmDialog
        confirmLabel="Crear contraseña"
        onCancel={close}
        onConfirm={() => target && void createTemporaryPassword(target)}
        open={pending?.kind === 'password'}
        pending={busy}
        title="¿Crear una contraseña temporal?"
        tone="primary"
      >
        {`${target?.ownerEmail ?? ''} tendrá que cambiarla al entrar, y se cerrarán todas sus sesiones.`}
      </ConfirmDialog>

      <Dialog onClose={close} open={pending?.kind === 'delete'} title={`¿Eliminar ${target?.name ?? ''}?`}>
        {target ? (
          <DeleteForm
            busy={busy}
            errors={deleteErrors}
            onCancel={close}
            onConfirm={(confirmation, understood) => void remove(target, confirmation, understood)}
            restaurant={target}
          />
        ) : null}
      </Dialog>

      <Dialog onClose={() => setTemporary(null)} open={temporary !== null} title="Contraseña temporal">
        {temporary ? (
          <div className="grid gap-4">
            <p className="m-0 text-[15px] text-ink-soft">
              {`Compártela con ${temporary.email}. Solo se muestra esta vez: al cerrar, no podrás volver a verla.`}
            </p>
            <input
              aria-label="Contraseña temporal"
              className="min-h-11 w-full rounded-control border border-line bg-control px-4 py-3 text-center font-mono text-2xl tracking-wider text-ink"
              onFocus={(event) => event.target.select()}
              readOnly
              spellCheck={false}
              value={temporary.password}
            />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CopyButton
                copiedMessage="Contraseña copiada."
                failedMessage="No pudimos copiarla. Cópiala a mano."
                label="Copiar"
                text={temporary.password}
              />
              <Button onClick={() => setTemporary(null)}>Listo</Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function RestaurantName({ restaurant }: { restaurant: ListedRestaurant }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <span className="font-semibold break-words">{restaurant.name}</span>
      <a
        className="w-fit text-sm break-words text-ink-soft underline-offset-2 hover:underline"
        href={`/${restaurant.slug}`}
        rel="noopener"
        target="_blank"
      >
        /{restaurant.slug}
      </a>
    </div>
  );
}

function StatusBadge({ restaurant }: { restaurant: ListedRestaurant }) {
  return restaurant.status === 'ENABLED' ? (
    <StatusPill tone="success">Activa</StatusPill>
  ) : (
    <StatusPill tone="warning">Pausada</StatusPill>
  );
}

function RowActions({
  onAction,
  restaurant,
}: {
  onAction: (kind: ActionKind, restaurant: ListedRestaurant) => void;
  restaurant: ListedRestaurant;
}) {
  const statusLabel = restaurant.status === 'ENABLED' ? 'Pausar' : 'Reactivar';
  return (
    <div className="flex flex-wrap gap-2 lg:justify-end">
      <Button
        aria-label={`${statusLabel} ${restaurant.name}`}
        onClick={() => onAction('status', restaurant)}
        variant="secondary"
      >
        {statusLabel}
      </Button>
      <Button
        aria-label={`Contraseña temporal de ${restaurant.name}`}
        onClick={() => onAction('password', restaurant)}
        variant="secondary"
      >
        Contraseña temporal
      </Button>
      <Button aria-label={`Eliminar ${restaurant.name}`} onClick={() => onAction('delete', restaurant)} variant="danger">
        Eliminar
      </Button>
    </div>
  );
}

/** Rendered only while the dialog is open, so every opening starts empty. */
function DeleteForm({
  busy,
  errors,
  onCancel,
  onConfirm,
  restaurant,
}: {
  busy: boolean;
  errors: Record<string, string>;
  onCancel: () => void;
  onConfirm: (confirmation: string, understood: boolean) => void;
  restaurant: ListedRestaurant;
}) {
  const [confirmation, setConfirmation] = useState('');
  const [understood, setUnderstood] = useState(false);
  const checkboxId = useId();
  const phrase = deletePhrase(restaurant.slug);
  const ready = confirmation === phrase && understood;

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onConfirm(confirmation, understood);
      }}
    >
      <p className="m-0 text-[15px] text-ink-soft">
        {`Se borrarán para siempre su carta, sus imágenes, sus estadísticas y la cuenta de ${restaurant.ownerEmail}. No se puede deshacer.`}
      </p>
      <Field error={errors.confirmation} id={`${checkboxId}-phrase`} label={`Escribe ${phrase} para confirmar`}>
        {(control) => (
          <input
            {...control}
            autoComplete="off"
            className={controlClasses}
            onChange={(event) => setConfirmation(event.target.value)}
            spellCheck={false}
            value={confirmation}
          />
        )}
      </Field>
      <div className="grid gap-1.5">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]" htmlFor={checkboxId}>
          <input
            aria-describedby={errors.understood ? `${checkboxId}-error` : undefined}
            checked={understood}
            className="h-5 w-5 shrink-0 accent-wine"
            id={checkboxId}
            onChange={(event) => setUnderstood(event.target.checked)}
            type="checkbox"
          />
          {DELETE_UNDERSTOOD_LABEL}
        </label>
        {errors.understood ? (
          <p className="m-0 text-[13px] font-medium text-danger" id={`${checkboxId}-error`} role="alert">
            {errors.understood}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <Button disabled={busy} onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={!ready || busy} type="submit" variant="danger">
          Eliminar restaurante
        </Button>
      </div>
    </form>
  );
}
