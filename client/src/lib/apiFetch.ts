/** Preserve the API request while identifying a common standalone Vite misconfiguration. */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await globalThis.fetch(input, { ...init, credentials: "include" });
  if (response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
    throw new Error("Máy chủ trả về trang web thay vì dữ liệu API. Kiểm tra kết nối máy chủ rồi tải lại.");
  }
  return response;
}
