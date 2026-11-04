import { Search } from 'lucide-react';
export function ResourceSearch({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="reference-search"><Search size={16} aria-hidden="true"/><span className="sr-only">{label}</span><input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder ?? label}/></label>;
}
