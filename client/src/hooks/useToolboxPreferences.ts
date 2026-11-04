import { useCallback, useMemo, useState } from 'react';
import { readStoredIds, writeStoredIds } from '@/lib/toolboxPreferences';
export function useToolboxPreferences(scope: string) {
  const [records, setRecords] = useState<Record<string, { favorites: string[]; recent: string[] }>>({});
  const preferences = useMemo(() => records[scope] ?? { favorites: readStoredIds(`rebiomed:toolbox:${scope}:favorites`), recent: readStoredIds(`rebiomed:toolbox:${scope}:recent`) }, [records, scope]);
  const update = useCallback((kind: 'favorites' | 'recent', id: string) => {
    setRecords(current => {
      const record = current[scope] ?? { favorites: readStoredIds(`rebiomed:toolbox:${scope}:favorites`), recent: readStoredIds(`rebiomed:toolbox:${scope}:recent`) };
      if (kind === 'recent' && record.recent[0] === id) return current;
      const ids = kind === 'recent' ? [id, ...record.recent.filter(value => value !== id)].slice(0, 12) : record.favorites.includes(id) ? record.favorites.filter(value => value !== id) : [...record.favorites, id].slice(-100);
      writeStoredIds(`rebiomed:toolbox:${scope}:${kind}`, ids);
      return { ...current, [scope]: { ...record, [kind]: ids } };
    });
  }, [scope]);
  return { ...preferences, toggleFavorite: (id: string) => update('favorites', id), recordOpen: (id: string) => update('recent', id) };
}
