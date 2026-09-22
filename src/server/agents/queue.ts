import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { activeRunStatuses, agentRequestSchema, agentSettingsSchema, defaultAgentSettings, providerIds, retryableRunStatuses, type AgentRun, type AgentSettings, type AgentStatus, type RunEvent } from "@/domain/agent";
import { providerReady } from "@/server/agents/providers";
import { createProject } from "@/features/templates/registry";
import { addProject, atomicWrite, dataRoot, listRuns, location, readProject, readRun, StudioError, updateRun } from "@/server/storage";


export const agentPaths = {
  heartbeat: path.join(/* turbopackIgnore: true */ dataRoot, "agent.json"),
  settings: path.join(/* turbopackIgnore: true */ dataRoot, "agent-settings.json"),
  lock: path.join(/* turbopackIgnore: true */ dataRoot, "agent.lock"),
};

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new StudioError(result.error.issues.map(issue => issue.message).join(" "));
  return result.data;
}

export async function readAgentSettings(): Promise<AgentSettings> {
  try { return agentSettingsSchema.parse(JSON.parse(await fs.readFile(agentPaths.settings, "utf8"))); }
  catch { return defaultAgentSettings(); }
}
export async function saveAgentSettings(input: unknown): Promise<AgentSettings> {
  const settings = parse(agentSettingsSchema, { ...defaultAgentSettings(), ...(input as object), schemaVersion: 1 });
  await atomicWrite(agentPaths.settings, settings);
  return settings;
}

export async function agentStatus(): Promise<AgentStatus> {
  let heartbeat: { time: string; pid: number; activeRunId?: string } | null = null;
  try { heartbeat = JSON.parse(await fs.readFile(agentPaths.heartbeat, "utf8")); } catch {}
  const running = !!heartbeat && Date.now() - Date.parse(heartbeat.time) < 10000;
  return {
    running, ...(running && heartbeat ? { pid: heartbeat.pid, ...(heartbeat.activeRunId ? { activeRunId: heartbeat.activeRunId } : {}) } : {}),
    providers: Object.fromEntries(providerIds.map(p => [p, providerReady(p)])) as AgentStatus["providers"],
  };
}

/** One run at a time keeps token spend, and the project file, predictable. */
export async function assertIdle() {
  const busy = (await listRuns()).find(run => activeRunStatuses.includes(run.status));
  if (busy) throw new StudioError("An assistant run is already in progress. Wait for it to finish or cancel it.", 409);
}

export async function createRun(input: unknown): Promise<AgentRun> {
  const request = parse(agentRequestSchema, input);
  await assertIdle();
  const ready = providerReady(request.provider);
  if (!ready.ready) throw new StudioError(ready.detail);

  // The studio owns the project shell so the assistant never invents an id, schema
  // version or revision, and a failed run still leaves a valid project behind.
  let projectId = request.projectId, projectName = "", mode: AgentRun["mode"] = "revise";
  if (projectId) {
    const project = (await readProject(projectId)).project;
    if (request.focusPageId && !project.pages.some(page => page.id === request.focusPageId))
      throw new StudioError("The selected scene is no longer part of this project. Choose it again and retry.");
    projectName = project.name;
  } else {
    let project;
    try { project = createProject(request.templateId!, request.format!, request.sport ?? "football", request.duration); }
    catch (error) { throw new StudioError((error as Error).message); }
    await addProject(project);
    projectId = project.id; projectName = project.name; mode = "create";
  }

  const id = randomUUID();
  const run: AgentRun = {
    schemaVersion: 1, id, provider: request.provider, prompt: request.prompt, ...(request.model ? { model: request.model } : {}),
    projectId, projectName, mode, ...(request.focusPageId ? { focusPageId: request.focusPageId } : {}), status: "queued",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  await atomicWrite(location("runs", id), run);
  return run;
}

export async function cancelRun(id: string): Promise<AgentRun> {
  const run = await readRun(id);
  if (!activeRunStatuses.includes(run.status)) return run;
  if (run.status === "queued") return updateRun(id, { status: "cancelled", error: "Cancelled before it started." });
  // The owner process watches for this marker and kills the CLI.
  await atomicWrite(location("runs", id, ".cancel"), "cancel");
  return run;
}

export async function retryRun(id: string): Promise<AgentRun> {
  const previous = await readRun(id);
  if (!retryableRunStatuses.includes(previous.status)) throw new StudioError("Only a finished or stopped run can be retried.");
  await assertIdle();
  if (previous.focusPageId) {
    const project = (await readProject(previous.projectId)).project;
    if (!project.pages.some(page => page.id === previous.focusPageId))
      throw new StudioError("The selected scene is no longer part of this project. Choose it again before retrying.");
  }
  const runId = randomUUID();
  const run: AgentRun = {
    schemaVersion: 1, id: runId, provider: previous.provider, prompt: previous.prompt, ...(previous.model ? { model: previous.model } : {}),
    projectId: previous.projectId, projectName: previous.projectName, mode: "revise", ...(previous.focusPageId ? { focusPageId: previous.focusPageId } : {}), status: "queued",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  await atomicWrite(location("runs", runId), run);
  return run;
}

export async function readRunLog(id: string): Promise<RunEvent[]> {
  const raw = await fs.readFile(location("runs", id, ".log"), "utf8").catch(() => "");
  return raw.split("\n").filter(Boolean).flatMap(line => { try { return [JSON.parse(line) as RunEvent]; } catch { return []; } });
}
