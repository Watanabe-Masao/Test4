export function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const asExcel = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!Number.isNaN(asExcel.getTime())) return asExcel;
  }
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;

  const normalized = v
    .replace(/[年月]/g, '/')
    .replace(/日/g, '')
    .replace(/\./g, '/');

  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}
