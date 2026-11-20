/**
 * Fills `{name}` placeholders in a translated string:
 * `fillTemplate('{rate}% per month', { rate: '2.5' })` -> `'2.5% per month'`.
 * Unknown placeholders are left as they are. Keeps word order translatable.
 */
export function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? values[name] : match,
  );
}
