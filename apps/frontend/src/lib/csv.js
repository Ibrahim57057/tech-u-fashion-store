/**
 * CSV cell encoding for the admin exports.
 *
 * Two failure modes in one field:
 *  - a `"` or comma inside a value shifts every following column, so the
 *    sheet silently reads the wrong data;
 *  - a value starting with `=`, `+`, `-` or `@` is parsed by Excel and
 *    Google Sheets as a formula, and customer-controlled text (a name, an
 *    email, an order number) would then execute in the admin's spreadsheet.
 *    The leading apostrophe is the standard way to force literal text.
 */
export function csvCell(value) {
  const raw = value == null ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/** header + rows -> a CSV document. BOM omitted so callers can add it. */
export function toCsv(header, rows) {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
