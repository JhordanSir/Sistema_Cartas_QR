import { afterEach, describe, expect, it, vi } from 'vitest';

import { chooseExtractor } from './choose-extractor';
import { SAMPLE_EXTRACTED_MENU } from './fake-extractor';

describe('chooseExtractor', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('en local con DIGITIZATION_FAKE=1 usa el extractor simulado', async () => {
    vi.useFakeTimers();
    const extractor = chooseExtractor({ apiKey: undefined, fake: '1', local: true, model: undefined });

    const result = extractor.extractMenu([]);
    await vi.advanceTimersByTimeAsync(5000);

    await expect(result).resolves.toEqual(SAMPLE_EXTRACTED_MENU);
  });

  it.each([
    { fake: '1', local: false },
    { fake: undefined, local: true },
    { fake: 'true', local: true },
  ])('con %o usa Gemini, que sin clave termina con MODEL_CONFIGURATION_ERROR', async ({ fake, local }) => {
    const extractor = chooseExtractor({ apiKey: undefined, fake, local, model: undefined });

    await expect(extractor.extractMenu([])).rejects.toMatchObject({ code: 'MODEL_CONFIGURATION_ERROR' });
  });
});
