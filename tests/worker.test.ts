import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { once } from "node:events";

test("worker restart recovers interrupted jobs and refuses a second worker", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "statoz-worker-test-"));
  await fs.mkdir(path.join(folder, "jobs"), { recursive: true });
  const id = "interrupted-export";
  const file = path.join(folder, "jobs", `${id}.json`);
  await fs.writeFile(file, JSON.stringify({ schemaVersion: 1, id, projectId: "example", projectName: "Interrupted test", revision: 1, format: "square", outputType: "png", status: "running", progress: .4, width: 1080, height: 1080, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
  const options = { env: { ...process.env, STUDIO_DATA_DIR: folder }, windowsHide: true, stdio: "pipe" as const };
  const worker = spawn(process.execPath, ["--import", "tsx", "src/server/worker.ts"], options);
  let log = ""; worker.stdout.on("data", chunk => { log += chunk; }); worker.stderr.on("data", chunk => { log += chunk; });
  try {
    for (let attempt = 0; attempt < 50 && !log.includes("worker ready"); attempt++) await new Promise(r => setTimeout(r, 100));
    assert.match(log, /worker ready/);
    const recovered = JSON.parse(await fs.readFile(file, "utf8")); assert.equal(recovered.status, "interrupted");
    const second = spawn(process.execPath, ["--import", "tsx", "src/server/worker.ts"], options);
    let secondError = ""; second.stderr.on("data", c => { secondError += c; });
    const [code] = await once(second, "exit"); assert.equal(code, 1); assert.match(secondError, /already running/);
  } finally {
    if (worker.exitCode === null) { const exit = once(worker, "exit"); worker.kill(); await exit; }
    await fs.rm(folder, { recursive: true, force: true });
  }
});
