import type { Locale } from '../locale';

/** The owner's product stream: the menu arriving as a stream of objects. */
interface OwnerStreamCopy {
  back: string;
  controls: {
    delay: string;
    delayHint: string;
    noDelay: string;
    restart: string;
    start: string;
    stop: string;
  };
  empty: string;
  failedNotice: string;
  item: {
    available: string;
    optionForms: { one: string; other: string };
    position: (position: number) => string;
    raw: string;
    unavailable: string;
  };
  kicker: string;
  lede: string;
  list: string;
  loadError: string;
  loading: string;
  metrics: {
    firstObject: string;
    label: string;
    received: string;
    total: string;
  };
  status: {
    cancelled: string;
    done: string;
    failed: string;
    idle: string;
    streaming: string;
  };
  title: string;
}

export const ownerStreamCopy: Record<Locale, OwnerStreamCopy> = {
  en: {
    back: 'Back to Menu',
    controls: {
      delay: 'Pause between objects',
      delayHint: 'The server waits this long before each product, so you can watch them arrive.',
      noDelay: 'No pause',
      restart: 'Stream again',
      start: 'Start stream',
      stop: 'Stop',
    },
    empty: 'Press Start stream and your products will arrive one at a time.',
    failedNotice: 'The stream was cut off before the end. Try again.',
    item: {
      available: 'Available',
      optionForms: { one: 'option', other: 'options' },
      position: (position) => `Object ${position}`,
      raw: 'NDJSON line as received',
      unavailable: 'Hidden from diners',
    },
    kicker: 'Stream of objects',
    lede: 'Each product travels as one line of JSON the moment the server reads it from the database, and shows up here before the next one is sent.',
    list: 'Products received',
    loadError: "We couldn't load your restaurants. Refresh the page.",
    loading: 'Loading your restaurants',
    metrics: {
      firstObject: 'First object',
      label: 'Stream metrics',
      received: 'Objects received',
      total: 'Total time',
    },
    status: {
      cancelled: 'Stopped',
      done: 'Complete',
      failed: 'Interrupted',
      idle: 'Ready',
      streaming: 'Receiving…',
    },
    title: 'Products, one at a time',
  },
  es: {
    back: 'Volver a Carta',
    controls: {
      delay: 'Pausa entre objetos',
      delayHint: 'El servidor espera este tiempo antes de cada producto, para que puedas verlos llegar.',
      noDelay: 'Sin pausa',
      restart: 'Repetir stream',
      start: 'Iniciar stream',
      stop: 'Detener',
    },
    empty: 'Pulsa «Iniciar stream» y tus productos llegarán uno a uno.',
    failedNotice: 'El stream se cortó antes de terminar. Vuelve a intentarlo.',
    item: {
      available: 'Disponible',
      optionForms: { one: 'opción', other: 'opciones' },
      position: (position) => `Objeto ${position}`,
      raw: 'Línea NDJSON tal como llegó',
      unavailable: 'Oculto al comensal',
    },
    kicker: 'Stream de objetos',
    lede: 'Cada producto viaja como una línea JSON apenas el servidor lo lee de la base de datos, y aparece aquí antes de que se envíe el siguiente.',
    list: 'Productos recibidos',
    loadError: 'No pudimos cargar tus restaurantes. Recarga la página.',
    loading: 'Cargando tus restaurantes',
    metrics: {
      firstObject: 'Primer objeto',
      label: 'Métricas del stream',
      received: 'Objetos recibidos',
      total: 'Tiempo total',
    },
    status: {
      cancelled: 'Detenido',
      done: 'Completo',
      failed: 'Interrumpido',
      idle: 'Listo',
      streaming: 'Recibiendo…',
    },
    title: 'Productos, uno a uno',
  },
};
