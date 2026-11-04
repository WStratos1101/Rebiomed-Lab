import { useRef, type ReactNode } from 'react';
import { CopyResultButton } from './CopyResultButton';
/** Copies the displayed, formatted output and its units, without recomputing numbers. */
export function CopyResultRegion({ children, label, available, hideUnavailable = false }: { children: ReactNode; label: string; available: boolean; hideUnavailable?: boolean }) {
  const output = useRef<HTMLDivElement>(null);
  return <div className="result-copy-region" hidden={hideUnavailable && !available}><div ref={output}>{children}</div><CopyResultButton disabled={!available} text={() => `${label}\n${output.current?.innerText ?? ''}`}/></div>;
}
