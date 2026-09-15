export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/${url}`, { cache: "no-store", ...options, headers: { ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error || "The studio could not complete this request.", response.status);
  return data as T;
}
export const readableBytes = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
