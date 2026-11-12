/**
 * Template merge fields (COMMS-1).
 *
 * Only variables the product can always supply are documented. An unknown
 * placeholder is left visible rather than replaced with an empty string: a
 * message that says `{{amount}}` is a bug somebody can see, while a blank is a
 * message the agency believes is complete.
 */
export const TEMPLATE_VARIABLES = ['recipient_name', 'organisation_name', 'date'] as const;

export type TemplateVariables = Partial<Record<(typeof TEMPLATE_VARIABLES)[number], string>>;

export const renderTemplate = (body: string, variables: TemplateVariables): string =>
  body.replace(
    /\{\{\s*([a-z0-9_]+)\s*\}\}/g,
    (match, key: string) => variables[key as keyof TemplateVariables] ?? match,
  );

export const templatePlaceholders = (body: string): readonly string[] =>
  [
    ...new Set([...body.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/g)].map((match) => match[1] ?? '')),
  ].filter((key) => key !== '');
