import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { durationOf, formats, type Format, type Project, type RenderJob } from "@/domain/project";
import { compositionHtml } from "./composition-html";
import { assetPath, atomicWrite, dataRoot, listAssets, location, readJob, StudioError, updateJob } from "./storage";

export async function enqueue(project: Project, format: Format, outputType: RenderJob["outputType"]) {
  if (!formats[format]) throw new StudioError("Unknown output format.");
  const allowed = project.kind === "video" ? ["mp4"] : project.kind === "carousel" ? ["zip"] : ["png", "jpeg"];
  if (!allowed.includes(outputType)) throw new StudioError("Output type does not match this project.");
  const snapshot = structuredClone(project); snapshot.format = format;
  const id = randomUUID();
  const folder = location("renders", id, "");
  await fs.mkdir(folder, { recursive: true });
  try {
    const html = await compositionHtml(snapshot);
    await fs.writeFile(path.join(folder, "scene.html"), html);
    await atomicWrite(path.join(folder, "project.json"), snapshot);
    if (snapshot.audio.assetId && !snapshot.audio.silent) {
      const asset = (await listAssets()).find(a => a.id === snapshot.audio.assetId);
      if (!asset || !asset.mime.startsWith("audio/")) throw new StudioError("Choose a valid audio asset.");
      await fs.copyFile(await assetPath(asset), path.join(folder, "audio" + path.extname(asset.file)));
    }
    const now = new Date().toISOString();
    const job: RenderJob = { schemaVersion: 1, id, projectId: project.id, projectName: project.name, revision: project.revision, format, outputType, status: "queued", progress: 0, createdAt: now, updatedAt: now, width: formats[format].width, height: formats[format].height, duration: project.kind === "video" ? durationOf(project) : undefined };
    await atomicWrite(location("jobs", id), job);
    return job;
  } catch (e) { await fs.rm(folder, { recursive: true, force: true }); throw e; }
}
export async function cancelJob(id: string) {
  const job = await readJob(id);
  if (!["queued", "running"].includes(job.status)) throw new StudioError("Only queued or running exports can be cancelled.");
  await fs.writeFile(path.join(dataRoot, "renders", job.id, "cancel"), "cancel");
  if (job.status === "queued") return updateJob(id, { status: "cancelled" });
  return job;
}
export async function retryJob(id: string) {
  const previous = await readJob(id);
  if (!["failed", "cancelled", "interrupted"].includes(previous.status)) throw new StudioError("This export does not need a retry.");
  const nextId = randomUUID(), now = new Date().toISOString();
  const folder = location("renders", nextId, ""); await fs.mkdir(folder);
  const oldFolder = location("renders", id, "");
  for (const filename of await fs.readdir(oldFolder)) if (["scene.html", "project.json"].includes(filename) || filename.startsWith("audio.")) await fs.copyFile(path.join(oldFolder, filename), path.join(folder, filename));
  const job: RenderJob = { ...previous, id: nextId, status: "queued", progress: 0, error: undefined, output: undefined, bytes: undefined, createdAt: now, updatedAt: now };
  await atomicWrite(location("jobs", nextId), job); return job;
}
