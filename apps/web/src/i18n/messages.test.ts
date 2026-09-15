import { backofficeCopy } from './messages/backoffice';
import { landingCopy } from './messages/landing';
import { loginCopy } from './messages/login';
import { ownerHelpCopy } from './messages/owner-help';
import { ownerMenuCopy } from './messages/owner-menu';
import { ownerPanelCopy } from './messages/owner-panel';
import { ownerProfileCopy } from './messages/owner-profile';
import { ownerQrCopy } from './messages/owner-qr';
import { publicMenuCopy } from './messages/public-menu';
import { shellCopy } from './messages/shell';
import { statisticsCopy } from './messages/statistics';

const TABLES = {
  backoffice: backofficeCopy,
  landing: landingCopy,
  login: loginCopy,
  ownerHelp: ownerHelpCopy,
  ownerMenu: ownerMenuCopy,
  ownerPanel: ownerPanelCopy,
  ownerProfile: ownerProfileCopy,
  ownerQr: ownerQrCopy,
  publicMenu: publicMenuCopy,
  shell: shellCopy,
  statistics: statisticsCopy,
};

// Names that legitimately read the same in both languages.
const SAME_IN_BOTH = new Set(['Casual', 'Original', 'Premium', 'QR']);

/** Flattens a message table into [path, text] pairs; message functions are called. */
function entries(value: unknown, path = ''): Array<[string, unknown]> {
  if (typeof value === 'function') return [[path, (value as (arg: string) => string)('X')]];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => entries(item, `${path}[${index}]`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      entries(child, path ? `${path}.${key}` : key),
    );
  }
  return [[path, value]];
}

describe.each(Object.entries(TABLES))('%s messages', (_name, table) => {
  it('have the same entries in Spanish and English', () => {
    expect(entries(table.en).map(([path]) => path)).toEqual(
      entries(table.es).map(([path]) => path),
    );
  });

  it('never leave an entry empty', () => {
    const empty = [...entries(table.es), ...entries(table.en)].filter(
      ([, text]) => typeof text !== 'string' || text.trim() === '',
    );
    expect(empty).toEqual([]);
  });

  it('do not leave Spanish copy behind in the English table', () => {
    const spanish = entries(table.en).filter(([, text]) => /[áéíóúñ¿¡]/i.test(String(text)));
    expect(spanish).toEqual([]);
  });

  it('actually translate: no English entry is a copy of the Spanish one', () => {
    const spanish = new Map(entries(table.es));
    // Brand names are the only text allowed to read the same in both languages.
    const untranslated = entries(table.en).filter(
      ([path, text]) =>
        spanish.get(path) === text && !/^Sirio/.test(String(text)) && !SAME_IN_BOTH.has(String(text)),
    );
    expect(untranslated).toEqual([]);
  });
});
