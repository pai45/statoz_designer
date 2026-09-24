import fs from "node:fs/promises";
import path from "node:path";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { dataRoot, StudioError } from "./storage";

export const pagesOrigin = process.env.STUDIO_PAGES_ORIGIN || "https://pai45.github.io";
export const pagesUrl = process.env.STUDIO_PAGES_URL || `${pagesOrigin}/statoz_designer/`;
const pairingLifetimeMs = 2 * 60 * 1000;
const sessionLifetimeMs = 12 * 60 * 60 * 1000;
// Media URLs are embedded in previews and export history. Give their read-only
// capability the same tab lifetime as the session so mounted media does not
// expire while a long edit or export is in progress.
const mediaLifetimeMs = sessionLifetimeMs;
const pairing = new Map<string, number>();

type TokenKind = "session" | "media";
type SignedToken = { kind: TokenKind; exp: number };

function loopbackName(value: string) {
  return value === "127.0.0.1" || value === "localhost" || value === "[::1]" || value === "::1";
}

export function assertLoopbackHost(host: string | null) {
  if (!host) throw new StudioError("A loopback Host header is required.", 403);
  let hostname = "";
  try { hostname = new URL(`http://${host}`).hostname; } catch {}
  if (!loopbackName(hostname)) throw new StudioError("The companion is available on loopback only.", 403);
  return host;
}

export function isLoopbackOrigin(value: string | null) {
  if (!value) return false;
  try { return loopbackName(new URL(value).hostname); } catch { return false; }
}

export function createPairingNonce(now = Date.now()) {
  for (const [nonce, expires] of pairing) if (expires <= now) pairing.delete(nonce);
  const nonce = randomBytes(32).toString("base64url");
  pairing.set(nonce, now + pairingLifetimeMs);
  return nonce;
}

export function consumePairingNonce(nonce: string, now = Date.now()) {
  const expires = pairing.get(nonce);
  pairing.delete(nonce);
  if (!expires || expires <= now) throw new StudioError("This companion link expired. Open /connect again.", 401);
}

let secretPromise: Promise<Buffer> | undefined;
async function signingSecret() {
  return secretPromise ??= (async () => {
    const file = path.join(dataRoot, ".connection-secret");
    const current = await fs.readFile(file).catch(() => null);
    if (current?.length === 32) return current;
    await fs.mkdir(dataRoot, { recursive: true });
    const created = randomBytes(32);
    try { await fs.writeFile(file, created, { flag: "wx" }); return created; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = await fs.readFile(file);
      if (existing.length !== 32) throw new Error("The local companion secret is invalid.");
      return existing;
    }
  })();
}

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
async function issueToken(kind: TokenKind, lifetime: number, now = Date.now()) {
  const payload = encode({ kind, exp: now + lifetime } satisfies SignedToken);
  const signature = createHmac("sha256", await signingSecret()).update(payload).digest("base64url");
  return { token: `${payload}.${signature}`, expiresAt: new Date(now + lifetime).toISOString() };
}

async function verifyToken(token: string, kind: TokenKind, now = Date.now()) {
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return false;
  const expected = createHmac("sha256", await signingSecret()).update(payload).digest();
  let signature: Buffer;
  try { signature = Buffer.from(supplied, "base64url"); } catch { return false; }
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SignedToken;
    return value.kind === kind && Number.isFinite(value.exp) && value.exp > now;
  } catch { return false; }
}

export const issueSessionToken = (now?: number) => issueToken("session", sessionLifetimeMs, now);
export const issueMediaToken = (now?: number) => issueToken("media", mediaLifetimeMs, now);

function bearer(req: Request) {
  const value = req.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

function mediaRoute(pathname: string) {
  return /^\/api\/(assets\/[^/]+|brand-kit\/[^/]+|exports\/[^/]+\/(poster|file))$/.test(pathname);
}

export async function requireSession(req: Request) {
  if (!await verifyToken(bearer(req), "session")) throw new StudioError("Reconnect this tab to the local companion.", 401);
}

export async function authorizeApiRequest(req: Request, pathname: string) {
  const host = assertLoopbackHost(req.headers.get("host"));
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  const url = new URL(req.url);
  const mediaToken = url.searchParams.get("media_token") || "";
  if (
    (!origin || origin === pagesOrigin) &&
    (req.method === "GET" || req.method === "HEAD") &&
    mediaRoute(pathname) &&
    await verifyToken(mediaToken, "media")
  ) return;
  if (origin === pagesOrigin) {
    if (pathname === "/api/connection" || pathname === "/api/session") return;
    await requireSession(req);
    return;
  }
  if (origin && !isLoopbackOrigin(origin)) throw new StudioError("This origin cannot use the local companion.", 403);
  if (fetchSite === "cross-site") throw new StudioError("Cross-site companion requests require pairing.", 403);
  if (!origin && req.method !== "GET" && req.method !== "HEAD") throw new StudioError("An Origin header is required for local changes.", 403);
  if (origin && new URL(origin).host !== host) throw new StudioError("Local same-origin requests are required.", 403);
}

export function corsHeaders(req: Request): Record<string, string> {
  if (req.headers.get("origin") !== pagesOrigin) return {};
  return {
    "Access-Control-Allow-Origin": pagesOrigin,
    "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, If-Match, Range",
    "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Content-Range, ETag",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
    ...(req.headers.get("access-control-request-private-network") === "true" ? { "Access-Control-Allow-Private-Network": "true" } : {}),
  };
}

export function withCors(req: Request, response: Response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders(req))) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function preflight(req: Request) {
  assertLoopbackHost(req.headers.get("host"));
  if (req.headers.get("origin") !== pagesOrigin) throw new StudioError("This origin cannot use the local companion.", 403);
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function connectionApi(req: Request, pathname: string) {
  if (pathname === "/api/connection" && req.method === "GET") {
    return Response.json({ name: "StatOz Designer local companion", ready: true, pairingRequired: true });
  }
  if (pathname === "/api/session" && req.method === "POST") {
    const body = await req.json() as { nonce?: unknown };
    if (typeof body.nonce !== "string") throw new StudioError("A pairing nonce is required.");
    consumePairingNonce(body.nonce);
    return Response.json(await issueSessionToken());
  }
  if (pathname === "/api/session/media-token" && req.method === "GET") {
    await requireSession(req);
    return Response.json(await issueMediaToken());
  }
  return null;
}

export function pairingRedirect(host: string | null) {
  const localHost = assertLoopbackHost(host);
  const fragment = new URLSearchParams({ pair: createPairingNonce(), api: `http://${localHost}` });
  return `${pagesUrl}#${fragment}`;
}
