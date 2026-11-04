import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { numericFeedback, type NumericFeedbackRules } from '@/lib/numericFeedback';
export function NumericTableInput({ label, value, onChange, className, placeholder, ...rules }: {
  label: string; value: string; onChange: (value: string) => void; className?: string; placeholder?: string;
} & NumericFeedbackRules) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const error = touched ? numericFeedback(value, rules) : null;
  return <div className="numeric-table-input"><Input aria-label={label} value={value} className={className} placeholder={placeholder} inputMode="decimal" onChange={event => { setTouched(true); onChange(event.target.value); }} onBlur={() => setTouched(true)} aria-invalid={Boolean(error)} aria-describedby={error ? id : undefined}/>{error && <span id={id} className="scientific-field-error" role="status">{error}</span>}</div>;
}
