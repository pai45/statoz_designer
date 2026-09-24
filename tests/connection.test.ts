import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateLoopbackApi } from "../src/shared/api";

const pageOrigin = "https://pai45.github.io";
const localOrigin = "http://127.0.0.1:3000";

function request(pathname: string, init: RequestInit = {}) {
  return new Request(`${localOrigin}${pathname}`, {
    ...init,
    headers: { host: "127.0.0.1:3000", ...Object.fromEntries(new Headers(init.headers)) },
  });
}

test("the Pages companion pairs once and enforces session and media scopes", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "statoz-connection-test-"));
  process.env.STUDIO_DATA_DIR = folder;
  const connection = await import("../src/server/connection");
  try {
    const nonce = connection.createPairingNonce();
    connection.consumePairingNonce(nonce);
    assert.throws(() => connection.consumePairingNonce(nonce), /expired/i);
    const expiredNonce = connection.createPairingNonce(1);
    assert.throws(() => connection.consumePairingNonce(expiredNonce, 2 * 60 * 1000 + 2), /expired/i);

    const session = await connection.issueSessionToken();
    await connection.authorizeApiRequest(request("/api/projects", {
      headers: { origin: pageOrigin, authorization: `Bearer ${session.token}` },
    }), "/api/projects");
    await assert.rejects(() => connection.authorizeApiRequest(request("/api/projects", {
      headers: { origin: pageOrigin, authorization: "Bearer invalid" },
    }), "/api/projects"), /Reconnect/i);

    const expiredSession = await connection.issueSessionToken(1);
    await assert.rejects(() => connection.authorizeApiRequest(request("/api/projects", {
      headers: { origin: pageOrigin, authorization: `Bearer ${expiredSession.token}` },
    }), "/api/projects"), /Reconnect/i);

    const media = await connection.issueMediaToken();
    await connection.authorizeApiRequest(request(`/api/assets/example?media_token=${media.token}`, {
      headers: { "sec-fetch-site": "cross-site" },
    }), "/api/assets/example");
    await assert.rejects(() => connection.authorizeApiRequest(request(`/api/projects?media_token=${media.token}`, {
      method: "POST", headers: { origin: pageOrigin },
    }), "/api/projects"), /Reconnect/i);
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});

test("the companion rejects non-loopback hosts and unapproved origins", async () => {
  const connection = await import("../src/server/connection");
  await assert.rejects(() => connection.authorizeApiRequest(new Request("http://192.168.1.2/api/projects", {
    headers: { host: "192.168.1.2", origin: pageOrigin },
  }), "/api/projects"), /loopback/i);
  await assert.rejects(() => connection.authorizeApiRequest(request("/api/projects", {
    headers: { origin: "https://example.com" },
  }), "/api/projects"), /origin/i);
  await assert.rejects(() => connection.authorizeApiRequest(request("/api/projects", {
    method: "POST",
  }), "/api/projects"), /Origin header/i);
  await connection.authorizeApiRequest(request("/api/projects", {
    method: "POST", headers: { origin: localOrigin },
  }), "/api/projects");
});

test("private-network preflights expose only the exact Pages origin", async () => {
  const connection = await import("../src/server/connection");
  const response = connection.preflight(request("/api/projects", { method: "OPTIONS", headers: {
    origin: pageOrigin,
    "access-control-request-private-network": "true",
  } }));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), pageOrigin);
  assert.equal(response.headers.get("access-control-allow-private-network"), "true");
  assert.throws(() => connection.preflight(request("/api/projects", { method: "OPTIONS", headers: {
    origin: "https://example.com",
  } })), /origin/i);
});

test("client companion addresses must be plain HTTP loopback origins", () => {
  assert.equal(validateLoopbackApi("http://127.0.0.1:4312"), "http://127.0.0.1:4312");
  assert.equal(validateLoopbackApi("http://localhost:3000"), "http://localhost:3000");
  assert.throws(() => validateLoopbackApi("https://127.0.0.1:3000"), /loopback/i);
  assert.throws(() => validateLoopbackApi("http://192.168.1.2:3000"), /loopback/i);
  assert.throws(() => validateLoopbackApi("http://127.0.0.1:3000/path"), /invalid/i);
});
