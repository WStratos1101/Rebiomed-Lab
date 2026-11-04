import { describe, expect, it } from 'vitest';
import { numericFeedback } from './numericFeedback';
describe('numeric feedback without changing scientific inputs', () => {
  it('accepts both decimal separators and scientific notation', () => {
    for (const input of ['1,25', '1.25', '3.8e8', '0', '-10']) expect(numericFeedback(input)).toBeNull();
  });
  it('distinguishes an optional default from a required missing value', () => {
    expect(numericFeedback('', { optional: true })).toBeNull();
    expect(numericFeedback('')).toContain('Nhập giá trị');
  });
  it('rejects nonfinite and ambiguous formatted text', () => {
    for (const input of ['NaN', 'Infinity', 'abc', '1.2.3']) expect(numericFeedback(input)).not.toBeNull();
  });
  it('retains valid zero where the scientific rule permits it', () => {
    expect(numericFeedback('0', { minimum: 0 })).toBeNull();
    expect(numericFeedback('0', { exclusiveMinimum: 0 })).not.toBeNull();
  });
  it('only requires integers when the existing field rule requests it', () => {
    expect(numericFeedback('1.5')).toBeNull();
    expect(numericFeedback('1.5', { integer: true })).not.toBeNull();
    expect(numericFeedback('2', { integer: true })).toBeNull();
  });
});
