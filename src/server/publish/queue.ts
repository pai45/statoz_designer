import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { unzipSync } from "fflate";
import type { z } from "zod";
import type { Project } from "@/domain/project";
import { compatibility, defaultCaption, markPostedSchema, openStatuses, platformIds, platforms, publishRequestSchema, publishSettingsSchema, tabStatuses, type Platform, type PublisherStatus, type PublishOptions, type PublishRecord, type PublishSettings } from "@/domain/publish";
import { atomicWrite, dataRoot, listPublish, location, readJob, readPublish, StudioError, updatePublish } from "@/server/storage";

// The sign-in profile holds live session cookies. Keep it outside the project folder so
// cloud-synced folders (this project may live in OneDrive) never upload or lock it.
const profileRoot = process.env.LOCALAPPDATA ? path.join(/* turbopackIgnore: true */ process.env.LOCALAPPDATA, "StatOz Designer") : path.join(/* turbopackIgnore: true */ os.homedir(), ".statoz-designer");
export const publishPaths = {
  heartbeat: path.join(/* turbopackIgnore: true */ dataRoot, "publisher.json"),
  signIn: path.join(/* turbopackIgnore: true */ dataRoot, "publish-login.json"),
  settings: path.join(/* turbopackIgnore: true */ dataRoot, "publish-settings.json"),
  profile: process.env.PUBLISH_PROFILE_DIR || path.join(/* turbopackIgnore: true */ profileRoot, "browser-profile"),
};
function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new StudioError(result.error.issues.map(issue => issue.message).join(" "));
  return result.data;
}
async function frozenProject(jobId: string): Promise<Project> {
  return JSON.parse(await fs.readFile(path.join(location("renders", jobId, ""), "project.json"), "utf8"));
}
export async function publishOptions(jobId: string): Promise<PublishOptions> {
  const job = await readJob(jobId), project = await frozenProject(job.id);
  const checks = Object.fromEntries(platformIds.map(platform => [platform, compatibility(job, project.pages.length, platform)])) as PublishOptions["platforms"];
  return { jobId: job.id, caption: defaultCaption(project), title: project.name.slice(0, 100), platforms: checks };
}
async function exportFile(jobId: string, output: string) {
  const renders = await fs.realpath(path.join(dataRoot, "renders"));
  const real = await fs.realpath(path.join(location("renders", jobId, ""), output));
  if (!real.toLowerCase().startsWith(renders.toLowerCase() + path.sep)) throw new StudioError("Export file is outside the managed render folder.");
  return real;
}
async function assertNotOpen(record: Pick<PublishRecord, "jobId" | "platform">, except?: string) {
  if ((await listPublish()).some(r => r.id !== except && r.jobId === record.jobId && r.platform === record.platform && openStatuses.includes(r.status)))
    throw new StudioError(`This export is already open for ${platforms[record.platform].label}. Finish or close that tab first.`, 409);
}
export async function createPublish(input: unknown): Promise<PublishRecord> {
  const request = parse(publishRequestSchema, input);
  const job = await readJob(request.jobId);
  if (!job.output || job.status !== "completed" || path.basename(job.output) !== job.output) throw new StudioError("Export is not ready.", 404);
  const project = await frozenProject(job.id), check = compatibility(job, project.pages.length, request.platform);
  if (!check.ok) throw new StudioError(check.reason || `This export cannot be posted to ${platforms[request.platform].label}.`);
  await assertNotOpen({ jobId: job.id, platform: request.platform });
  const file = await exportFile(job.id, job.output);
  const id = randomUUID(), folder = location("publish", id, "");
  try {
    let files = [file];
    if (job.outputType === "zip") {
      // Sites take carousel pages as separate files, in page order.
      const pages = unzipSync(await fs.readFile(file), { filter: entry => /^\d{2}-[a-z]+\.png$/.test(entry.name) });
      const names = Object.keys(pages).sort();
      if (!names.length) throw new StudioError("This carousel ZIP contains no pages.");
      await fs.mkdir(folder, { recursive: true });
      files = [];
      for (const name of names) { const target = path.join(folder, name); await fs.writeFile(target, pages[name], { flag: "wx" }); files.push(target); }
    }
    const now = new Date().toISOString();
    const record: PublishRecord = { schemaVersion: 1, id, jobId: job.id, projectName: job.projectName, platform: request.platform, caption: request.caption, ...(request.platform === "youtube" ? { title: request.title?.trim() } : {}), status: "queued", files, createdAt: now, updatedAt: now };
    await atomicWrite(location("publish", id), record);
    return record;
  } catch (e) { await fs.rm(folder, { recursive: true, force: true }); throw e; }
}
export async function retryPublish(id: string) {
  const record = await readPublish(id);
  if (!["failed", "closed"].includes(record.status)) throw new StudioError("Only closed or failed posts can be opened again.");
  await assertNotOpen(record, id);
  await fs.unlink(location("publish", id, ".close")).catch(() => {});
  return updatePublish(id, { status: "queued", message: undefined, postUrl: undefined });
}
export async function closePublish(id: string) {
  const record = await readPublish(id);
  if (record.status === "queued") return updatePublish(id, { status: "closed", message: "Cancelled before the tab opened." });
  if (!tabStatuses.includes(record.status)) throw new StudioError("This posting tab is not open.");
  // The posting window owns the tab; it closes it when it sees this marker.
  await fs.writeFile(location("publish", id, ".close"), "close");
  return record;
}
export async function markPosted(id: string, input: unknown) {
  const { postUrl } = parse(markPostedSchema, input ?? {});
  const record = await readPublish(id);
  if (!["ready", "closed", "failed"].includes(record.status)) throw new StudioError("Open the post and finish it on the site before marking it as posted.");
  await fs.unlink(location("publish", id, ".close")).catch(() => {});
  return updatePublish(id, { status: "posted", message: undefined, ...(postUrl ? { postUrl } : {}) });
}
const defaultSettings = (): PublishSettings => ({ schemaVersion: 1, linkedinCompanyId: "", browserChannel: process.platform === "win32" ? "msedge" : "chrome" });
export async function readPublishSettings(): Promise<PublishSettings> {
  try { return publishSettingsSchema.parse(JSON.parse(await fs.readFile(publishPaths.settings, "utf8"))); }
  catch { return defaultSettings(); }
}
export async function savePublishSettings(input: unknown) {
  const settings = parse(publishSettingsSchema, { ...defaultSettings(), ...(input && typeof input === "object" ? input : {}), schemaVersion: 1 });
  await atomicWrite(publishPaths.settings, settings);
  return settings;
}
export async function publisherStatus(): Promise<PublisherStatus> {
  try {
    const beat = JSON.parse(await fs.readFile(publishPaths.heartbeat, "utf8"));
    return { running: Date.now() - Date.parse(beat.time) < 10000, browserOpen: !!beat.browserOpen, signIn: beat.signIn ?? null };
  } catch { return { running: false, browserOpen: false, signIn: null }; }
}
export async function requestSignIn(platform: string) {
  if (!(platformIds as string[]).includes(platform)) throw new StudioError("Unknown social platform.", 404);
  const status = await publisherStatus();
  if (!status.running) throw new StudioError("The posting window is not running. Restart the studio with npm run dev.", 503);
  if (status.signIn) throw new StudioError(`Close the ${platforms[status.signIn].label} sign-in window first.`, 409);
  if ((await listPublish()).some(r => tabStatuses.includes(r.status))) throw new StudioError("Finish or close the open posting tabs before signing in.", 409);
  await atomicWrite(publishPaths.signIn, { platform, requestedAt: new Date().toISOString() });
  return { platform: platform as Platform };
}
