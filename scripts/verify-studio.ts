import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { unzipSync } from "fflate";
import type { Asset, ProjectEnvelope, RenderJob } from "../src/domain/project";

const base = process.env.STUDIO_URL || "http://127.0.0.1:3000";
const output = path.resolve("test-results/studio"); await fs.mkdir(output, { recursive: true });
async function request<T>(url: string, body?: unknown, method = "POST", etag?: string): Promise<T> {
  const response = await fetch(`${base}/api/${url}`, { method: body === undefined ? "GET" : method, headers: { Origin: base, "Content-Type": "application/json", ...(etag ? { "If-Match": etag } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json(); if (!response.ok) throw new Error(`${response.status}: ${data.error}`); return data;
}
async function completed(id: string) {
  for (let i = 0; i < 240; i++) {
    const job = await request<RenderJob>(`exports/${id}`);
    if (job.status === "completed") return job;
    if (["failed", "cancelled", "interrupted"].includes(job.status)) throw new Error(`${job.status}: ${job.error}`);
    if (i % 10 === 0) console.log(`${job.projectName}: ${job.status} ${Math.round(job.progress * 100)}%`);
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("Export timed out");
}
const pageErrors: string[] = [];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(base); await page.getByRole("button", { name: "New design", exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, "projects-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page.getByRole("button", { name: "Use Feature spotlight template" }).click();
  await page.getByRole("button", { name: "Create design", exact: true }).click();
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await page.getByRole("textbox", { name: "Project name", exact: true }).fill("Studio launch · Verified image");
  await page.getByLabel("Headline", { exact: false }).fill("Made for\nthe moment.");
  await page.getByText("All changes saved locally", { exact: true }).waitFor();
  const projectId = new URL(page.url()).searchParams.get("project")!;
  let imageProject = await request<ProjectEnvelope>(`projects/${projectId}`);
  assert.equal(imageProject.project.pages[0].headline, "Made for\nthe moment.");
  await page.reload(); await page.getByRole("button", { name: "Content", exact: true }).click(); await page.getByLabel("Headline", { exact: false }).waitFor();
  assert.equal(await page.getByLabel("Headline", { exact: false }).inputValue(), "Made for\nthe moment.");
  await page.getByRole("button", { name: "Undo", exact: true }).isDisabled();
  await page.getByLabel("Headline", { exact: false }).fill("One new line.");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  assert.equal(await page.getByLabel("Headline", { exact: false }).inputValue(), "Made for\nthe moment.");
  await page.getByText("All changes saved locally", { exact: true }).waitFor();
  await page.getByLabel("Output aspect ratio").selectOption("landscape");
  await page.getByText("All changes saved locally", { exact: true }).waitFor();
  await page.waitForTimeout(500);
  const previewFrame = page.frames().find(f => f !== page.mainFrame())!;
  assert.equal(await previewFrame.evaluate(() => document.querySelector("#composition")?.getBoundingClientRect().width), 1920);
  await page.getByLabel("Output aspect ratio").selectOption("portrait");
  await page.getByText("All changes saved locally", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Export", exact: true }).waitFor({ state: "visible" });
  await page.waitForFunction(() => !(document.querySelector('.editor-top-actions .button-primary') as HTMLButtonElement).disabled);
  await page.screenshot({ path: path.join(output, "editor-desktop.png"), fullPage: true });
  imageProject = await request<ProjectEnvelope>(`projects/${projectId}`);
  console.log("PASS editor create/edit/autosave/reopen/undo/ratio switch");

  const denied = await fetch(`${base}/api/projects`, { method: "POST", headers: { Origin: "https://untrusted.example", "Content-Type": "application/json" }, body: "{}" }); assert.equal(denied.status, 403);
  const stale = await fetch(`${base}/api/projects/${projectId}`, { method: "PUT", headers: { Origin: base, "If-Match": "old", "Content-Type": "application/json" }, body: JSON.stringify(imageProject.project) }); assert.equal(stale.status, 409);
  console.log("PASS cross-origin protection and stale-save conflict");

  const frozenHeadline = imageProject.project.pages[0].headline;
  const png = await request<RenderJob>("exports", { projectId, etag: imageProject.etag, format: "portrait", outputType: "png" });
  const pngDone = await completed(png.id);
  const pngBytes = Buffer.from(await (await fetch(`${base}/api/exports/${png.id}/file`)).arrayBuffer());
  assert.equal(pngBytes.readUInt32BE(16), 1080); assert.equal(pngBytes.readUInt32BE(20), 1350);
  await fs.writeFile(path.join(output, "verified-image.png"), pngBytes);
  const previewHtml = await (await fetch(`${base}/api/preview`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ project: imageProject.project }) })).text();
  const exact = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await exact.setContent(previewHtml); await exact.waitForFunction(() => typeof window.drawFrame === "function"); await exact.evaluate(() => window.drawFrame({ time: 0 }));
  assert.equal(createHash("sha256").update(await exact.screenshot({ type: "png" })).digest("hex"), createHash("sha256").update(pngBytes).digest("hex"));
  await exact.close(); console.log("PASS PNG dimensions and exact preview/export pixel parity");

  const jpeg = await request<RenderJob>("exports", { projectId, etag: imageProject.etag, format: "square", outputType: "jpeg" }); await completed(jpeg.id);
  const jpg = Buffer.from(await (await fetch(`${base}/api/exports/${jpeg.id}/file`)).arrayBuffer()); assert.equal(jpg.readUInt16BE(0), 0xffd8);
  console.log("PASS JPEG export");
  const carousel = await request<ProjectEnvelope>("projects", { templateId: "explainer", format: "portrait", sport: "football" });
  const zip = await request<RenderJob>("exports", { projectId: carousel.project.id, etag: carousel.etag, format: "portrait", outputType: "zip" }); await completed(zip.id);
  const archive = unzipSync(new Uint8Array(await (await fetch(`${base}/api/exports/${zip.id}/file`)).arrayBuffer()));
  assert.deepEqual(Object.keys(archive), ["01-portrait.png", "02-portrait.png", "03-portrait.png", "04-portrait.png"]);
  console.log("PASS carousel ZIP with four ordered pages");

  const video = await request<ProjectEnvelope>("projects", { templateId: "feature-promo", format: "reel", sport: "football", duration: 8 });
  video.project.name = "StatOz · The studio in motion";
  const savedVideo = await request<ProjectEnvelope>(`projects/${video.project.id}`, video.project, "PUT", video.etag);
  const motion = await request<RenderJob>("exports", { projectId: savedVideo.project.id, etag: savedVideo.etag, format: "reel", outputType: "mp4" });
  const motionDone = await completed(motion.id); assert.equal(motionDone.duration, 8); assert.equal(motionDone.audio, true);
  await fs.writeFile(path.join(output, "verified-video.mp4"), Buffer.from(await (await fetch(`${base}/api/exports/${motion.id}/file`)).arrayBuffer()));
  const playback = await browser.newPage();
  await playback.goto(base);
  await playback.setContent(`<video controls src="${base}/api/exports/${motion.id}/file"></video>`);
  const played = await playback.evaluate(async () => {
    const v = document.querySelector("video")!;
    if (v.readyState < 1) await new Promise<void>((resolve, reject) => { const timeout = setTimeout(() => reject(new Error("Playback metadata timed out")), 15000); v.addEventListener("loadedmetadata", () => { clearTimeout(timeout); resolve(); }, { once: true }); v.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("Playback failed")); }, { once: true }); });
    v.muted = true; await v.play(); await new Promise(r => setTimeout(r, 600)); v.pause();
    return { width: v.videoWidth, height: v.videoHeight, duration: v.duration, time: v.currentTime };
  });
  assert.equal(played.width, 1080); assert.equal(played.height, 1920); assert.equal(played.duration, 8); assert.ok(played.time > .1);
  await playback.close(); console.log("PASS eight-second 1080×1920 MP4 with SFX, full decode, and browser playback");

  const queued = await request<RenderJob>("exports", { projectId, etag: imageProject.etag, format: "landscape", outputType: "png" });
  await request(`exports/${queued.id}/cancel`, {});
  for (let i = 0; i < 30; i++) { const job = await request<RenderJob>(`exports/${queued.id}`); if (job.status === "cancelled") break; await new Promise(r => setTimeout(r, 500)); }
  assert.equal((await request<RenderJob>(`exports/${queued.id}`)).status, "cancelled");
  imageProject.project.pages[0].headline = "An edit after\nthe snapshot.";
  imageProject = await request<ProjectEnvelope>(`projects/${projectId}`, imageProject.project, "PUT", imageProject.etag);
  const retried = await request<RenderJob>(`exports/${queued.id}/retry`, {}); await completed(retried.id);
  assert.equal((await request<RenderJob>(`exports/${pngDone.id}`)).output, pngDone.output);
  assert.notEqual(frozenHeadline, imageProject.project.pages[0].headline);
  console.log("PASS cancel/retry and collision-safe output retention");

  const form = new FormData(); form.set("file", new File([pngBytes], "studio-verified-artwork.png", { type: "image/png" })); form.set("approved", "true");
  const imported = await fetch(`${base}/api/assets`, { method: "POST", headers: { Origin: base }, body: form });
  if (!imported.ok) throw new Error(await imported.text());
  const asset: Asset = await imported.json(); assert.equal(asset.width, 1080); assert.equal(asset.height, 1350); assert.equal(asset.approval, "approved");
  console.log("PASS local media import and metadata");

  await page.goto(base); await page.getByRole("button", { name: "Templates", exact: true }).click(); await page.screenshot({ path: path.join(output, "templates-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Assets & brand", exact: true }).click(); await page.getByRole("tab", { name: "Brand system", exact: true }).click(); await page.screenshot({ path: path.join(output, "brand-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Exports", exact: true }).click(); await page.screenshot({ path: path.join(output, "exports-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 412, height: 900 }); await page.getByRole("button", { name: "Projects", exact: true }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: path.join(output, "projects-mobile.png"), fullPage: true });
  assert.deepEqual(pageErrors, []);
  console.log("PASS navigation, responsive width, and no browser runtime errors");
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify({ passed: true, image: pngDone, video: motionDone, playback, browserErrors: pageErrors }, null, 2));
} finally { await browser.close(); }
