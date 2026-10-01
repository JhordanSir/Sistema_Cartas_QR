import type { MenuExtractor } from './extractor';
import { createFakeExtractor } from './fake-extractor';
import { createGeminiExtractor } from './gemini-extractor';

export type ExtractorSettings = {
  /** SIRIO_GEMINI_API_KEY. Without it every job ends with MODEL_CONFIGURATION_ERROR. */
  apiKey: string | undefined;
  /** DIGITIZATION_FAKE: '1' selects the simulated extractor of the end-to-end tests. */
  fake: string | undefined;
  /** True under `netlify dev`: the simulated extractor never runs in Netlify. */
  local: boolean;
  /** GEMINI_MODEL, optional. */
  model: string | undefined;
};

export function chooseExtractor(settings: ExtractorSettings): MenuExtractor {
  if (settings.local && settings.fake === '1') return createFakeExtractor();
  return createGeminiExtractor({ apiKey: settings.apiKey, model: settings.model });
}
