/**
 * Turning a thrown validation error into field messages.
 *
 * The core use cases validate with zod and throw a `ZodError`, whose `issues`
 * carry the field path. Importing zod into the web app would add a direct
 * dependency for one shape, so this reads the documented structure instead:
 * an issue with a string first path segment becomes a message on that field.
 * Anything else (a database error, a thrown string) is not a field problem and
 * is returned as null so the caller can show it as a banner.
 */
export interface FieldIssue {
  readonly path?: readonly (string | number)[];
  readonly message?: string;
}

export const fieldErrorsFrom = (error: unknown): Record<string, string> | null => {
  const issues = (error as { issues?: unknown }).issues;
  if (!Array.isArray(issues) || issues.length === 0) return null;

  const fields: Record<string, string> = {};
  for (const issue of issues as readonly FieldIssue[]) {
    const key = issue.path?.[0];
    if (typeof key !== 'string') continue;
    if (fields[key] === undefined) {
      fields[key] = issue.message ?? 'That value is not valid';
    }
  }

  return Object.keys(fields).length === 0 ? null : fields;
};

export const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim() !== '' ? error.message : fallback;
