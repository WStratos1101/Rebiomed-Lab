import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { numericFeedback, type NumericFeedbackRules } from '@/lib/numericFeedback';
/** Presentation validation only; scientific validation remains in the existing calculators. */
export function ScientificField({ label, help, value, onChange, unit, units, onUnitChange, computed = false, optional = false, minimum, exclusiveMinimum, integer, placeholder, showErrors = false }: {
  label: string; help: string; value: string; onChange: (value: string) => void;
  unit: string; units?: readonly string[]; onUnitChange?: (unit: string) => void;
  computed?: boolean; placeholder?: string; showErrors?: boolean;
} & NumericFeedbackRules) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const error = !computed && (touched || showErrors) ? numericFeedback(value, { optional, minimum, exclusiveMinimum, integer }) : null;
  return <div className={`scientific-field ${computed ? 'computed' : ''}`}>
    <label htmlFor={id}>{label}</label><span className="scientific-field-help" id={`${id}-help`}>{help}</span>
    <div className={`scientific-input ${error ? 'invalid' : ''}`}>
      <Input id={id} value={value} inputMode="decimal" onChange={event => { setTouched(true); onChange(event.target.value); }} onBlur={() => setTouched(true)} readOnly={computed} aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} placeholder={computed ? 'Tự tính' : placeholder}/>
      {units && onUnitChange ? <select value={unit} onChange={event => onUnitChange(event.target.value)} aria-label={`Đơn vị ${label}`}>{units.map(option => <option key={option}>{option}</option>)}</select> : <span className="scientific-unit">{unit}</span>}
    </div>
    {error && <span className="scientific-field-error" id={`${id}-error`} role="status">{error}</span>}
  </div>;
}
