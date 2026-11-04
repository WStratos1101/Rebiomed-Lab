/** Navigation metadata only. Never store experiment inputs, results, or credentials. */
export function readStoredIds(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length < 200))].slice(0, 100) : [];
  } catch { return []; }
}
export function writeStoredIds(key: string, ids: string[]): void {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* Navigation remains usable without browser storage. */ }
}
export function normalizeToolSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi').trim();
}
