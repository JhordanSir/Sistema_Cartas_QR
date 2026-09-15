/** The interface languages the confirmation phrase exists in. */
export type DeletionConfirmationLanguage = "en" | "es";

const VERBS: Record<DeletionConfirmationLanguage, string> = { en: "DELETE", es: "ELIMINAR" };

/** The exact text an administrator types to delete a restaurant for good. */
export function deletionConfirmationPhrase(
  slug: string,
  language: DeletionConfirmationLanguage
): string {
  return `${VERBS[language]} ${slug}`;
}

/**
 * Either language's phrase confirms the deletion: the API does not know which one the
 * screen asked for, and scripts written against the Spanish phrase keep working.
 */
export function isDeletionConfirmed(text: string, slug: string): boolean {
  return (Object.keys(VERBS) as DeletionConfirmationLanguage[]).some(
    (language) => text === deletionConfirmationPhrase(slug, language)
  );
}
