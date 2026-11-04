import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
// In-memory UI drafts only. A new account key recreates this store; nothing is persisted here.
const SessionDraftContext = createContext<Map<string, unknown> | null>(null);
export function SessionDraftProvider({ children }: { children: ReactNode }) {
  const store = useRef(new Map<string, unknown>());
  return <SessionDraftContext.Provider value={store.current}>{children}</SessionDraftContext.Provider>;
}
export function useSessionDraftPresent(key: string): boolean {
  const store = useContext(SessionDraftContext);
  return useRef(store?.has(key) ?? false).current;
}
export function useSessionState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const store = useContext(SessionDraftContext);
  const [value, setValue] = useState<T>(() => store?.has(key) ? store.get(key) as T : typeof initial === 'function' ? (initial as () => T)() : initial);
  useEffect(() => { store?.set(key, value); }, [store, key, value]);
  return [value, setValue];
}
