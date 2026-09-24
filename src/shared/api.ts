export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

type ApiConnection = {
  baseUrl?: string;
  accessToken?: string;
  mediaToken?: string;
  onUnauthorized?: () => void;
};

let connection: ApiConnection = {};

export function configureApi(next: ApiConnection) { connection = { ...connection, ...next }; }
export function resetApi() { connection = {}; }

export function validateLoopbackApi(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]", "::1"].includes(url.hostname)) throw new Error("The companion address must use local loopback.");
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("The companion address is invalid.");
  return url.origin;
}

function endpoint(url: string) {
  const apiPath = `/api/${url.replace(/^\//, "")}`;
  return connection.baseUrl ? new URL(apiPath, `${connection.baseUrl}/`).toString() : apiPath;
}

function loopbackRequest(options: RequestInit) {
  return connection.baseUrl ? ({ ...options, targetAddressSpace: "loopback" } as RequestInit) : options;
}

export async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (connection.accessToken) headers.set("Authorization", `Bearer ${connection.accessToken}`);
  const response = await fetch(endpoint(url), loopbackRequest({ cache: "no-store", ...options, headers }));
  if (response.status === 401 && connection.baseUrl) connection.onUnauthorized?.();
  return response;
}

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(url, options);
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new ApiError(data.error || "The studio could not complete this request.", response.status);
  return data as T;
}

export function apiResource(url: string) {
  const target = new URL(endpoint(url), typeof window === "undefined" ? "http://127.0.0.1" : window.location.origin);
  if (connection.mediaToken) target.searchParams.set("media_token", connection.mediaToken);
  if (!connection.baseUrl) return `${target.pathname}${target.search}`;
  return target.toString();
}

export function publicAsset(assetPath: string) {
  const prefix = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${prefix}${assetPath.startsWith("/") ? assetPath : `/${assetPath}`}`;
}

export function currentPagePath() {
  return typeof window === "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "/") : window.location.pathname;
}

export const readableBytes = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
