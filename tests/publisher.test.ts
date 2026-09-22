import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { once } from "node:events";

test("posting window restart closes unfinished tabs and refuses a second publisher", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "statoz-publisher-test-"));
  await fs.mkdir(path.join(folder, "publish"), { recursive: true });
  const id = "unfinished-post";
  const file = path.join(folder, "publish", `${id}.json`);
  const now = new Date().toISOString();
  await fs.writeFile(file, JSON.stringify({ schemaVersion: 1, id, jobId: "example", projectName: "Unfinished post", platform: "x", caption: "", status: "ready", files: [], createdAt: now, updatedAt: now }));
  const options = { env: { ...process.env, STUDIO_DATA_DIR: folder, PUBLISH_PROFILE_DIR: path.join(folder, "profile") }, windowsHide: true, stdio: "pipe" as const };
  const publisher = spawn(process.execPath, ["--import", "tsx", "src/server/publisher.ts"], options);
  let log = ""; publisher.stdout.on("data", chunk => { log += chunk; }); publisher.stderr.on("data", chunk => { log += chunk; });
  try {
    for (let attempt = 0; attempt < 50 && !log.includes("posting window ready"); attempt++) await new Promise(r => setTimeout(r, 100));
    assert.match(log, /posting window ready/);
    assert.equal(JSON.parse(await fs.readFile(file, "utf8")).status, "closed");
    const second = spawn(process.execPath, ["--import", "tsx", "src/server/publisher.ts"], options);
    let secondError = ""; second.stderr.on("data", c => { secondError += c; });
    const [code] = await once(second, "exit"); assert.equal(code, 1); assert.match(secondError, /already running/);
  } finally {
    if (publisher.exitCode === null) { const exit = once(publisher, "exit"); publisher.kill(); await exit; }
    await fs.rm(folder, { recursive: true, force: true });
  }
});
