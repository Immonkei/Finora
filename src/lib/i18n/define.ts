/**
 * Declares one message namespace. English is the source of truth; the
 * Khmer table must provide every English key, so a missing translation
 * is a type error rather than a blank label at runtime.
 *
 * Values may contain `{name}` placeholders, filled by `t(key, { name })`.
 */
export function defineMessages<T extends Record<string, string>>(messages: {
  en: T;
  km: { [K in keyof T]: string };
}) {
  return messages;
}

export function interpolate(
  template: string,
  values?: Record<string, string | number>
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match
  );
}
