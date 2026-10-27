import type { Locale } from '../locale';

/** The owner's CSV viewer: a file read by a Web Worker and shown as a table. */
interface OwnerCsvCopy {
  back: string;
  cancel: string;
  cancelled: string;
  choose: string;
  chooseHint: string;
  confirm: { body: (name: string) => string; keep: string; replace: string; title: string };
  delimiter: { auto: (detected: string) => string; label: string; names: { comma: string; semicolon: string; tab: string } };
  empty: string;
  encoding: { auto: (detected: string) => string; label: string };
  failed: { empty: string; 'not-found': string; unreadable: string };
  header: string;
  kicker: string;
  lede: string;
  loadError: string;
  loading: string;
  matches: (shown: string, total: string) => string;
  next: string;
  pageOf: (page: string, pages: string) => string;
  pageSize: string;
  previous: string;
  progressLabel: string;
  readForms: { one: string; other: string };
  rowForms: { one: string; other: string };
  rowNumber: string;
  save: string;
  saved: (name: string) => string;
  savedFile: (name: string, size: string, date: string) => string;
  saving: string;
  search: string;
  sortBy: (column: string) => string;
  table: string;
  title: string;
  tooLarge: (maxMb: number) => string;
  unsavedFile: (name: string, size: string) => string;
  warnings: (rows: string) => string;
  warningRow: (found: string, expected: string) => string;
}

export const ownerCsvCopy: Record<Locale, OwnerCsvCopy> = {
  en: {
    back: 'Back to Menu',
    cancel: 'Cancel',
    cancelled: 'Reading cancelled. Choose the file again to show it.',
    choose: 'Choose CSV',
    chooseHint: 'Comma, semicolon or tab separated, up to 20 MB. Nothing is saved until you press Save.',
    confirm: {
      body: (name) => `The saved file «${name}» will be replaced by the one on screen. This can't be undone.`,
      keep: 'Keep the saved one',
      replace: 'Replace',
      title: 'Replace the saved CSV?',
    },
    delimiter: {
      auto: (detected) => `Automatic (${detected})`,
      label: 'Separator',
      names: { comma: 'comma', semicolon: 'semicolon', tab: 'tab' },
    },
    empty: 'Choose a CSV to see it here. A Web Worker reads it, so the page stays responsive even with large files.',
    encoding: { auto: (detected) => `Automatic (${detected})`, label: 'Encoding' },
    failed: {
      empty: 'The file is empty.',
      'not-found': "The saved CSV couldn't be found.",
      unreadable: "We couldn't read the file. Try again.",
    },
    header: 'The first row holds the column names',
    kicker: 'Web Workers',
    lede: 'A Web Worker reads the file in pieces, outside the page, and sends back only the rows on screen: sorting and searching happen there too.',
    loadError: "We couldn't load your restaurants. Refresh the page.",
    loading: 'Loading your restaurants',
    matches: (shown, total) => `${shown} of ${total} rows match`,
    next: 'Next',
    pageOf: (page, pages) => `Page ${page} of ${pages}`,
    pageSize: 'Rows per page',
    previous: 'Previous',
    progressLabel: 'Reading the file',
    readForms: { one: 'row read', other: 'rows read' },
    rowForms: { one: 'row', other: 'rows' },
    rowNumber: 'Row',
    save: 'Save',
    saved: (name) => `Saved: «${name}» is now your restaurant's CSV.`,
    savedFile: (name, size, date) => `Saved: ${name} · ${size} · ${date}`,
    saving: 'Saving…',
    search: 'Search in every column',
    sortBy: (column) => `Sort by ${column}`,
    table: 'CSV content',
    title: 'Your CSV, as a table',
    tooLarge: (maxMb) => `The CSV can weigh up to ${maxMb} MB.`,
    unsavedFile: (name, size) => `Not saved: ${name} · ${size}`,
    warnings: (rows) => `Warnings: ${rows} with a different number of columns, highlighted in the table.`,
    warningRow: (found, expected) => `${found} columns, ${expected} expected`,
  },
  es: {
    back: 'Volver a Carta',
    cancel: 'Cancelar',
    cancelled: 'Lectura cancelada. Vuelve a elegir el archivo para verlo.',
    choose: 'Elegir CSV',
    chooseHint: 'Separado por comas, punto y coma o tabulador, hasta 20 MB. Nada se guarda hasta que pulses Guardar.',
    confirm: {
      body: (name) => `El archivo guardado «${name}» se reemplazará por el que ves en pantalla. No se puede deshacer.`,
      keep: 'Conservar el guardado',
      replace: 'Reemplazar',
      title: '¿Reemplazar el CSV guardado?',
    },
    delimiter: {
      auto: (detected) => `Automático (${detected})`,
      label: 'Separador',
      names: { comma: 'coma', semicolon: 'punto y coma', tab: 'tabulador' },
    },
    empty: 'Elige un CSV para verlo aquí. Lo lee un Web Worker, así que la página no se congela aunque el archivo sea grande.',
    encoding: { auto: (detected) => `Automática (${detected})`, label: 'Codificación' },
    failed: {
      empty: 'El archivo está vacío.',
      'not-found': 'No encontramos el CSV guardado.',
      unreadable: 'No pudimos leer el archivo. Vuelve a intentarlo.',
    },
    header: 'La primera fila tiene los nombres de las columnas',
    kicker: 'Web Workers',
    lede: 'Un Web Worker lee el archivo por partes, fuera de la página, y solo le devuelve las filas que se ven: también ordena y busca allí.',
    loadError: 'No pudimos cargar tus restaurantes. Recarga la página.',
    loading: 'Cargando tus restaurantes',
    matches: (shown, total) => `${shown} de ${total} filas coinciden`,
    next: 'Siguiente',
    pageOf: (page, pages) => `Página ${page} de ${pages}`,
    pageSize: 'Filas por página',
    previous: 'Anterior',
    progressLabel: 'Leyendo el archivo',
    readForms: { one: 'fila leída', other: 'filas leídas' },
    rowForms: { one: 'fila', other: 'filas' },
    rowNumber: 'Fila',
    save: 'Guardar',
    saved: (name) => `Guardado: «${name}» es ahora el CSV de tu restaurante.`,
    savedFile: (name, size, date) => `Guardado: ${name} · ${size} · ${date}`,
    saving: 'Guardando…',
    search: 'Buscar en todas las columnas',
    sortBy: (column) => `Ordenar por ${column}`,
    table: 'Contenido del CSV',
    title: 'Tu CSV, en una tabla',
    tooLarge: (maxMb) => `El CSV puede pesar hasta ${maxMb} MB.`,
    unsavedFile: (name, size) => `Sin guardar: ${name} · ${size}`,
    warnings: (rows) => `Avisos: ${rows} con otra cantidad de columnas, resaltado en la tabla.`,
    warningRow: (found, expected) => `${found} columnas, se esperaban ${expected}`,
  },
};
