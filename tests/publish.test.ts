import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { zipSync } from "fflate";
import type { RenderJob } from "../src/domain/project";
import { compatibility, defaultCaption, publishRequestSchema } from "../src/domain/publish";
import { createProject } from "../src/features/templates/registry";

const finished = (outputType: RenderJob["outputType"], format: RenderJob["format"] = "portrait") => ({ status: "completed" as const, outputType, format, output: "export" });

test("platform compatibility follows each site's media rules", () => {
  assert.equal(compatibility(finished("png"), 1, "youtube").ok, false);
  for (const platform of ["linkedin", "instagram", "x"] as const) assert.equal(compatibility(finished("jpeg"), 1, platform).ok, true);
  for (const platform of ["linkedin", "youtube", "instagram", "x"] as const) assert.equal(compatibility(finished("mp4", "reel"), 1, platform).ok, true);
  assert.equal(compatibility(finished("zip"), 4, "x").ok, true);
  assert.match(compatibility(finished("zip"), 5, "x").reason!, /up to 4/);
  assert.equal(compatibility(finished("zip"), 11, "instagram").ok, false);
  assert.equal(compatibility(finished("zip"), 12, "linkedin").ok, true);
  assert.equal(compatibility({ ...finished("png"), status: "running" }, 1, "x").ok, false);
  assert.ok(compatibility(finished("png", "landscape"), 1, "instagram").warnings.length);
});
test("post requests enforce caption limits and a YouTube title", () => {
  const jobId = "job-1";
  assert.equal(publishRequestSchema.safeParse({ jobId, platform: "x", caption: "a".repeat(280) }).success, true);
  assert.equal(publishRequestSchema.safeParse({ jobId, platform: "x", caption: "a".repeat(281) }).success, false);
  assert.equal(publishRequestSchema.safeParse({ jobId, platform: "linkedin", caption: "a".repeat(281) }).success, true);
  assert.equal(publishRequestSchema.safeParse({ jobId, platform: "youtube", caption: "" }).success, false);
  assert.equal(publishRequestSchema.safeParse({ jobId, platform: "youtube", caption: "", title: "Matchday" }).success, true);
  assert.equal(publishRequestSchema.safeParse({ jobId: "../escape", platform: "x", caption: "" }).success, false);
  const project = createProject("feature-spotlight", "portrait");
  const caption = defaultCaption(project);
  assert.ok(caption.length > 0 && caption.length <= 2200);
  assert.ok(caption.startsWith(project.pages[0].headline.replace(/\s*\n\s*/g, " ").trim()));
});
test("queue extracts carousel pages, blocks duplicates and escapes, and tracks post status", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "statoz-publish-test-"));
  process.env.STUDIO_DATA_DIR = folder;
  const store = await import("../src/server/storage");
  const queue = await import("../src/server/publish/queue");
  try {
    await store.initialize();
    const project = createProject("explainer", "portrait"), now = new Date().toISOString();
    const addJob = async (id: string, outputType: RenderJob["outputType"], output: string) => {
      const dir = store.location("renders", id, ""); await fs.mkdir(dir, { recursive: true });
      await store.atomicWrite(path.join(dir, "project.json"), project);
      const job: RenderJob = { schemaVersion: 1, id, projectId: project.id, projectName: project.name, revision: 1, format: "portrait", outputType, status: "completed", progress: 1, createdAt: now, updatedAt: now, width: 1080, height: 1350, output };
      await store.atomicWrite(store.location("jobs", id), job);
      return dir;
    };
    const pages = Object.fromEntries(project.pages.map((_, index) => [`${String(index + 1).padStart(2, "0")}-portrait.png`, new Uint8Array([index])]));
    const dir = await addJob("carousel-job", "zip", "carousel.zip");
    await fs.writeFile(path.join(dir, "carousel.zip"), zipSync({ ...pages, "notes.txt": new Uint8Array([9]) }));

    const options = await queue.publishOptions("carousel-job");
    assert.equal(options.platforms.youtube.ok, false); assert.equal(options.platforms.linkedin.ok, true);
    const record = await queue.createPublish({ jobId: "carousel-job", platform: "instagram", caption: "Matchday" });
    assert.equal(record.status, "queued");
    assert.deepEqual(record.files.map(file => path.basename(file)), Object.keys(pages).sort());
    for (const [index, file] of record.files.entries()) assert.deepEqual([...await fs.readFile(file)], [index]);
    await assert.rejects(() => queue.createPublish({ jobId: "carousel-job", platform: "instagram", caption: "Again" }), /already open/);
    await assert.rejects(() => queue.createPublish({ jobId: "carousel-job", platform: "youtube", caption: "", title: "Title" }), /video/);
    await assert.rejects(() => queue.createPublish({ jobId: "carousel-job", platform: "x", caption: "a".repeat(281) }), /280/);
    await addJob("escape-job", "png", "../escape.png");
    await assert.rejects(() => queue.createPublish({ jobId: "escape-job", platform: "x", caption: "" }), /not ready/);

    assert.equal((await queue.closePublish(record.id)).status, "closed");
    await assert.rejects(() => queue.closePublish(record.id), /not open/);
    assert.equal((await queue.retryPublish(record.id)).status, "queued");
    await store.updatePublish(record.id, { status: "ready" });
    await queue.closePublish(record.id);
    assert.ok(await fs.stat(store.location("publish", record.id, ".close")));
    await assert.rejects(() => queue.markPosted(record.id, { postUrl: "javascript:alert(1)" }), /https/);
    const posted = await queue.markPosted(record.id, { postUrl: "https://www.instagram.com/p/example/" });
    assert.equal(posted.status, "posted"); assert.equal(posted.postUrl, "https://www.instagram.com/p/example/");
    await assert.rejects(() => fs.stat(store.location("publish", record.id, ".close")));
    await assert.rejects(() => queue.requestSignIn("instagram"), /not running/);
    await assert.rejects(() => queue.requestSignIn("myspace"), /Unknown/);

    assert.equal((await queue.readPublishSettings()).linkedinCompanyId, "");
    await assert.rejects(() => queue.savePublishSettings({ linkedinCompanyId: "../admin", browserChannel: "msedge" }), /LinkedIn/);
    await queue.savePublishSettings({ linkedinCompanyId: "12345678", browserChannel: "chrome" });
    assert.deepEqual(await queue.readPublishSettings(), { schemaVersion: 1, linkedinCompanyId: "12345678", browserChannel: "chrome" });
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
});
