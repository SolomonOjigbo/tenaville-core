/** One string field from a submitted form. Files are coerced to "". */
export const field = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
};

/** A trimmed optional field: blank becomes undefined. */
export const optionalField = (form: FormData, name: string): string | undefined => {
  const value = field(form, name).trim();
  return value === '' ? undefined : value;
};

/** A whole-number field, or undefined when blank or not a number. */
export const numberField = (form: FormData, name: string): number | undefined => {
  const value = field(form, name).trim();
  if (value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const checked = (form: FormData, name: string): boolean => field(form, name) === 'on';
