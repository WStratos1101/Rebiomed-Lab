import { Copy } from 'lucide-react';
import { toast } from 'sonner';
export function CopyResultButton({ text, disabled = false }: { text: string | (() => string); disabled?: boolean }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(typeof text === "function" ? text() : text); toast.success('Đã sao chép kết quả kèm đơn vị.'); }
    catch { toast.error('Không thể sao chép. Hãy chọn kết quả và dùng lệnh sao chép của trình duyệt.'); }
  };
  return <button type="button" className="copy-result-button" onClick={copy} disabled={disabled}><Copy size={15}/> Sao chép</button>;
}
