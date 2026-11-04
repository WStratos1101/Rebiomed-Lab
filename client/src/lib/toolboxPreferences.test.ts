import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeToolSearch, readStoredIds, writeStoredIds } from './toolboxPreferences';
afterEach(() => vi.unstubAllGlobals());
describe('browser navigation metadata resilience', () => {
  it('searches Vietnamese names independent of accents, case, and đ', () => {
    expect(normalizeToolSearch('  ĐỊNH lượng TẾ BÀO  ')).toBe('dinh luong te bao');
  });
  it('rejects malformed or wrong-shape local data', () => {
    for (const raw of ['{', '{}', 'null', '"oops"']) {
      vi.stubGlobal('localStorage', { getItem: () => raw });
      expect(readStoredIds('favorites')).toEqual([]);
    }
  });
  it('keeps only bounded unique IDs', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(['calculator:dilution', 4, 'calculator:dilution', 'x'.repeat(201)]) });
    expect(readStoredIds('favorites')).toEqual(['calculator:dilution']);
  });
  it('does not crash when storage access is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } });
    expect(readStoredIds('favorites')).toEqual([]);
    expect(() => writeStoredIds('favorites', ['calculator:dilution'])).not.toThrow();
  });
});
