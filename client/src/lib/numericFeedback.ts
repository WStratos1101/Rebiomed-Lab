import { parseLocaleNumber } from './numberInput';
export type NumericFeedbackRules = { optional?: boolean; minimum?: number; exclusiveMinimum?: number; integer?: boolean };
/** Explains existing input rules; never alters or substitutes a calculator's value. */
export function numericFeedback(value: string, rules: NumericFeedbackRules = {}): string | null {
  if (!value.trim()) return rules.optional ? null : 'Nhập giá trị cho đại lượng này.';
  const number = parseLocaleNumber(value);
  if (!Number.isFinite(number)) return 'Nhập số hợp lệ; dùng dấu phẩy hoặc dấu chấm cho phần thập phân.';
  if (rules.integer && !Number.isInteger(number)) return 'Nhập số nguyên theo yêu cầu của trường này.';
  if (rules.exclusiveMinimum !== undefined && number <= rules.exclusiveMinimum) return `Giá trị phải lớn hơn ${rules.exclusiveMinimum.toLocaleString('vi-VN')}.`;
  if (rules.minimum !== undefined && number < rules.minimum) return `Giá trị phải từ ${rules.minimum.toLocaleString('vi-VN')} trở lên.`;
  return null;
}
