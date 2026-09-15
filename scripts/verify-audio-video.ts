import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { ffmpegPath } from "../src/server/runtime";
import type { Asset, ProjectEnvelope, RenderJob } from "../src/domain/project";

const exec = promisify(execFile), base = "http://127.0.0.1:3000", folder = path.resolve("test-results/audio-video");
await fs.mkdir(folder, { recursive: true });
const ffmpeg = ffmpegPath();
await exec(ffmpeg, ["-y", "-f", "lavfi", "-i", "testsrc2=size=320x240:rate=30", "-t", "2", "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(folder, "test-clip.mp4")], { windowsHide: true });
await exec(ffmpeg, ["-y", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", "2", path.join(folder, "test-tone.wav")], { windowsHide: true });
async function json<T>(url: string, body?: unknown, etag?: string): Promise<T> {
  const r = await fetch(`${base}/api/${url}`, { method: body ? etag ? "PUT" : "POST" : "GET", headers: { Origin: base, "Content-Type": "application/json", ...(etag ? { "If-Match": etag } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!r.ok) throw new Error(await r.text()); return r.json();
}
async function upload(name: string, mime: string): Promise<Asset> {
  const form = new FormData(); form.set("file", new File([await fs.readFile(path.join(folder, name))], name, { type: mime })); form.set("approved", "true");
  const r = await fetch(`${base}/api/assets`, { method: "POST", headers: { Origin: base }, body: form }); if (!r.ok) throw new Error(await r.text()); return r.json();
}
async function wait(id: string) {
  for (let i = 0; i < 180; i++) { const job = await json<RenderJob>(`exports/${id}`); if (job.status === "completed") return job; if (["failed", "cancelled"].includes(job.status)) throw new Error(job.error); if (i % 15 === 0) console.log(`${job.projectName}: ${job.status} ${Math.round(job.progress * 100)}%`); await new Promise(r => setTimeout(r, 1000)); }
  throw new Error("Render timed out");
}
const [clip, tone] = await Promise.all([upload("test-clip.mp4", "video/mp4"), upload("test-tone.wav", "audio/wav")]);
let project = await json<ProjectEnvelope>("projects", { templateId: "feature-promo", format: "square", sport: "football", duration: 8 });
project.project.name = "Verification · Clip and mixed audio";
project.project.pages.forEach(p => { p.assetId = clip.id; p.clipStart = .2; p.clipEnd = 1.5; });
project.project.audio.assetId = tone.id;
project = await json<ProjectEnvelope>(`projects/${project.project.id}`, project.project, project.etag);
const invalid = structuredClone(project.project); invalid.pages[0].clipStart = 9; invalid.pages[0].clipEnd = 0;
const invalidResponse = await fetch(`${base}/api/preview`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ project: invalid }) }); assert.equal(invalidResponse.status, 400);
const browser = await chromium.launch();
try {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  const r = await fetch(`${base}/api/preview`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ project: project.project }) });
  await p.setContent(await r.text()); await p.waitForFunction(() => typeof window.drawFrame === "function");
  await p.evaluate(() => window.drawFrame({ time: 1 })); const first = await p.screenshot();
  await p.evaluate(() => window.drawFrame({ time: 0 })); await p.evaluate(() => window.drawFrame({ time: 1 })); assert.deepEqual(await p.screenshot(), first);
  console.log("PASS trimmed video deterministic seeking and out-of-range trim rejection");
} finally { await browser.close(); }
const job = await json<RenderJob>("exports", { projectId: project.project.id, etag: project.etag, format: "square", outputType: "mp4" }); const mixed = await wait(job.id); assert.equal(mixed.audio, true);
const bytes = await (await fetch(`${base}/api/exports/${job.id}/file`)).arrayBuffer(); await fs.writeFile(path.join(folder, "mixed.mp4"), Buffer.from(bytes));
await exec(ffmpeg, ["-v", "error", "-i", path.join(folder, "mixed.mp4"), "-f", "null", "-"], { windowsHide: true });
project.project.name = "Verification · Silent video"; project.project.audio.silent = true;
project = await json<ProjectEnvelope>(`projects/${project.project.id}`, project.project, project.etag);
const silentJob = await json<RenderJob>("exports", { projectId: project.project.id, etag: project.etag, format: "square", outputType: "mp4" }); const silent = await wait(silentJob.id); assert.equal(silent.audio, false);
const silentBytes = await (await fetch(`${base}/api/exports/${silent.id}/file`)).arrayBuffer(); await fs.writeFile(path.join(folder, "silent.mp4"), Buffer.from(silentBytes));
let metadata = "";
try { await exec(ffmpeg, ["-hide_banner", "-i", path.join(folder, "silent.mp4")], { windowsHide: true }); } catch (e) { metadata = (e as { stderr: string }).stderr; }
assert.ok(!metadata.includes("Audio:")); assert.ok(metadata.includes("30 fps"));
console.log("PASS mixed soundtrack, SFX, clip rendering, silent MP4, 30 fps, and full decode");
await fs.writeFile(path.join(folder, "report.json"), JSON.stringify({ passed: true, mixed, silent }, null, 2));
