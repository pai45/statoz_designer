import fs from "node:fs/promises";
import path from "node:path";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import type { AgentRun, RunEvent } from "@/domain/agent";
import { investorAssessmentJsonSchema, investorAssessmentSchema } from "@/domain/investor-review";
import { briefFor } from "@/domain/brief";
import type { Asset, Project } from "@/domain/project";
import { addProject, atomicWrite, dataRoot, initialize, listAssets, listRuns, location, readInvestorReview, readProject, readRun, root, updateInvestorReview, updateRun, validateProject } from "./storage";
import { agentPaths, readAgentSettings } from "./agents/queue";
import { assertAssistantAssetChoices, revisionRouting } from "./agents/revision";
import { AgentError, launch, planFor, resolveProvider } from "./agents/providers";
import { markInvestorRunState, queueFollowUpInvestorReview } from "./investor/queue";
import { investorReviewPrompt, investorRevisionPrompt } from "./investor/prompt";

// Assistant runs: Claude edits one project without a shell tool; Codex returns one
// structured project document without touching the filesystem. The owner validates
// every result and restores its snapshot before a run can finish.
await initialize();
try {
  const old = JSON.parse(await fs.readFile(agentPaths.lock, "utf8"));
  try { process.kill(old.pid, 0); console.error("An assistant process is already running."); process.exit(1); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ESRCH") throw e; }
  await fs.unlink(agentPaths.lock);
} catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
await fs.writeFile(agentPaths.lock, JSON.stringify({ pid: process.pid }), { flag: "wx" });
// Only a run that was mid-flight is lost; a queued one is still waiting its turn.
for (const run of await listRuns()) if (run.status === "running") {
  const error = "The studio restarted before this run finished.";
  await updateRun(run.id, { status: "interrupted", error });
  await markInvestorRunState(run, "interrupted", error).catch(() => {});
}

const exec = promisify(execFile);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const exists = (file: string) => fs.stat(file).then(() => true, () => false);
const state: { child?: ChildProcess; activeId?: string; stopping?: boolean } = {};
process.on("SIGINT", () => { state.stopping = true; }); process.on("SIGTERM", () => { state.stopping = true; });
const beat = () => atomicWrite(agentPaths.heartbeat, { pid: process.pid, time: new Date().toISOString(), activeRunId: state.activeId ?? null }).catch(() => {});
await beat();
const heartbeat = setInterval(() => void beat(), 2000);
console.log("StatOz assistant ready.");

/** Uncommitted paths, so out-of-scope edits can be reported. Best effort. */
async function tracked(): Promise<string[]> {
  try { const { stdout } = await exec("git", ["status", "--porcelain"], { cwd: root, windowsHide: true, timeout: 20000, maxBuffer: 8 * 1024 * 1024 }); return stdout.split("\n").map(l => l.slice(3).trim()).filter(Boolean).sort(); }
  catch { return []; }
}

/** The first line that reads like a cause, not the tail of a flood of output. */
function firstFault(head: string, tail: string) {
  const lines = head.split("\n").map(line => line.trim()).filter(Boolean);
  const fault = lines.find(line => /\b(error|fatal|failed|refused|denied|not found)\b/i.test(line));
  return (fault ?? lines[0] ?? tail.split("\n").filter(Boolean).pop() ?? "").slice(0, 400);
}

const codexResultSchema = {
  type: "object",
  properties: { projectJson: { type: "string", description: "The complete revised StatOz project as valid JSON." } },
  required: ["projectJson"],
  additionalProperties: false,
};

function codexAssets(project: Project, assets: Asset[]) {
  const used = new Set([
    ...project.pages.flatMap(page => [page.assetId, page.tabletAssetId, page.emblemA, page.emblemB]),
    project.audio.assetId,
  ].filter(Boolean));
  return assets.filter(asset =>
    used.has(asset.id) ||
    asset.approval === "approved" ||
    (asset.approval === "brand" && (!asset.sport || asset.sport === project.sport)) ||
    (!asset.id.startsWith("pitch-duel-") && !asset.sport && asset.approval === "reference")
  ).slice(0, 120).map(asset => ({
    id: asset.id, name: asset.name, mime: asset.mime, approval: asset.approval,
    ...(asset.category ? { category: asset.category } : {}),
    ...(asset.sport ? { sport: asset.sport } : {}),
  }));
}

function protectedProjectFields(revised: Project, original: Project) {
  for (const key of ["id", "schemaVersion", "templateVersion", "revision", "createdAt"] as const) {
    if (revised[key] !== original[key]) throw new AgentError(`The assistant changed protected project field: ${key}.`);
  }
  if (JSON.stringify(revised.pitchDeck) !== JSON.stringify(original.pitchDeck)) throw new AgentError("The assistant changed protected pitch-deck provenance.");
}

export function parseCodexProjectResult(raw: string, original: Project, assets: Asset[]): Project {
  let envelope: { projectJson?: unknown };
  try { envelope = JSON.parse(raw) as { projectJson?: unknown }; }
  catch { throw new AgentError("Codex returned an unreadable project result."); }
  if (typeof envelope.projectJson !== "string") throw new AgentError("Codex did not return the revised project JSON.");
  let candidate: unknown;
  try { candidate = JSON.parse(envelope.projectJson); }
  catch { throw new AgentError("Codex returned malformed project JSON."); }
  const revised = validateProject(candidate);
  protectedProjectFields(revised, original);
  assertAssistantAssetChoices(revised, original, assets);
  const before = { ...original, updatedAt: "" }, after = { ...revised, updatedAt: "" };
  if (JSON.stringify(before) === JSON.stringify(after)) throw new AgentError("Codex returned the project without making the requested change.");
  return { ...revised, updatedAt: new Date().toISOString() };
}

function instructions(run: AgentRun, brief: string, projectFile: string, project: Project, assets: Asset[], designDocs = "") {
  if (run.provider === "codex") return `${brief}
# Your task

${run.prompt}

# Safe structured-edit mode

Do not call shell commands or any other tools. The studio has supplied every file and value you need below.
Return the complete revised project through the required projectJson response field. Its value must be a JSON string containing the whole project object, not a patch or explanation.
- Change only values needed for the requested revision.
- Keep id, schemaVersion, templateVersion, revision, and createdAt exactly unchanged.
- Use only asset IDs from the registered asset catalog below, or an empty string. Never invent an asset ID.
- If selecting a new audio asset, it must be an audio item marked "approved" in the catalog.
- The owner process will set updatedAt, validate the schema, and write the single project file after your response.
- Do not export, render, or claim that the filesystem is unavailable; no filesystem access is needed.

# Revision routing

${revisionRouting(run, project)}

# Current project JSON

${JSON.stringify(project, null, 2)}

# Registered asset catalog

${JSON.stringify(codexAssets(project, assets), null, 2)}

# Required StatOz references

${designDocs}`;

  return `${brief}
# Your task

${run.prompt}

# How to work

Develop the project at ${projectFile}. It already exists with a valid structure — edit it in place.
- Change only that file. Do not edit anything under storage/renders or storage/assets, and do not touch other projects.
- Keep "id", "schemaVersion", "templateVersion" and "revision" exactly as they are. The studio owns them.
- Set "updatedAt" to the current time in ISO 8601.
- "assetId" and "tabletAssetId" may only be ids that already exist in storage/assets, or "". Never invent one.
- A new audio.assetId must refer to an audio item marked approved in storage/assets.
- You may change templateId, format, pages, copy, layout, motion and transition, as long as the project still validates. templateId must name a template in src/features/templates/registry.ts whose kind matches the project's kind.
${revisionRouting(run, project)}
${run.mode === "create" ? "- This project was just created from a template with placeholder copy. Replace all of it so it matches the task above.\n" : ""}- For video: scene durations must total 8 to 60 seconds and every total must land on the 30 fps grid, so each duration should be a whole number of frames divided by 30.
- Do not run the renderer or export anything. Finish when the JSON is right.`;
}

async function work(queued: AgentRun) {
  const run = await readRun(queued.id);
  if (run.status !== "queued") return;
  const settings = await readAgentSettings();
  const workflow = run.workflow ?? "creative";
  const investorReview = workflow.startsWith("investor-") && run.reviewId ? await readInvestorReview(run.reviewId) : null;
  const projectFile = workflow === "investor-revision" && run.reviewId ? location("reviews", run.reviewId, ".candidate.json") : location("projects", run.projectId);
  const logFile = location("runs", run.id, ".log");
  const cancelMarker = location("runs", run.id, ".cancel");
  const resultFile = location("runs", run.id, ".result");
  const schemaFile = location("runs", run.id, ".schema");
  const events: RunEvent[] = [];
  const append = async (entry: RunEvent) => { events.push(entry); await fs.appendFile(logFile, `${JSON.stringify(entry)}\n`).catch(() => {}); };

  let snapshot: string;
  try { snapshot = await fs.readFile(projectFile, "utf8"); }
  catch { await updateRun(run.id, { status: "failed", error: "The project for this run is missing." }); return; }
  const before = await tracked();

  let child: ChildProcess | undefined;
  try {
    await updateRun(run.id, { status: "running", startedAt: new Date().toISOString() });
    await markInvestorRunState(run, "running");
    await fs.writeFile(logFile, "");
    const binary = resolveProvider(run.provider);
    const project = workflow === "investor-revision" ? validateProject(JSON.parse(snapshot)) : (await readProject(run.projectId)).project;
    const assets = await listAssets();
    const focusedScene = run.focusPageId ? project.pages.find(page => page.id === run.focusPageId) : undefined;
    const brief = briefFor(project, assets, path.join(dataRoot, "projects"), focusedScene);
    const resultFiles = run.provider === "codex" ? { schema: schemaFile, result: resultFile } : undefined;
    if (resultFiles) {
      await fs.writeFile(schemaFile, JSON.stringify(workflow === "investor-review" ? investorAssessmentJsonSchema : codexResultSchema));
      await fs.unlink(resultFile).catch(() => {});
    }
    const designDocs = run.provider === "codex" ? (await Promise.all([
      "brand-guide.md", "template-contract.md", "architecture.md",
    ].map(file => fs.readFile(path.join(root, "docs", file), "utf8")))).join("\n\n---\n\n") : "";
    const rubric = investorReview ? await fs.readFile(path.join(root, ".agents", "skills", "investor-deck-advisor", "references", "rubric.md"), "utf8") : "";
    const assistantWorkdir = workflow === "investor-revision" ? path.dirname(projectFile) : root;
    const plan = planFor(run.provider, assistantWorkdir, settings, run.model, resultFiles, { readOnly: workflow === "investor-review" });
    await append({ at: new Date().toISOString(), kind: "note", text: `Starting ${run.provider} in ${assistantWorkdir}` });

    // The prompt goes down stdin: it is far past a Windows command line's length
    // limit, and keeping it off argv means no quoting or escaping to get wrong.
    const spawned = launch(binary, plan.args);
    child = spawn(spawned.file, spawned.args, { cwd: assistantWorkdir, stdio: ["pipe", "pipe", "pipe"], windowsHide: true, shell: spawned.shell });
    state.child = child;
    child.stdin?.on("error", () => {});
    const prompt = workflow === "investor-review" && investorReview
      ? investorReviewPrompt(investorReview, project, rubric)
      : workflow === "investor-revision" && investorReview
        ? investorRevisionPrompt(investorReview, project, rubric, projectFile, run.provider === "codex")
        : instructions(run, brief, projectFile, project, assets, designDocs);
    child.stdin?.end(prompt);
    let stderr = "", stderrHead = "", buffer = "", spawnError: Error | undefined;
    const finished = new Promise<number | null>(resolve => {
      child!.on("error", error => { spawnError = error as Error; resolve(null); });
      child!.on("close", code => resolve(code));
    });
    // Keep both ends: a CLI usually reports the real cause first, then floods.
    child.stderr?.on("data", chunk => { stderr = (stderr + chunk).slice(-6000); if (stderrHead.length < 4000) stderrHead += chunk; });
    child.stdout?.on("data", chunk => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try { const entry = plan.parse(line); if (entry) void append(entry); }
        catch { /* A CLI may interleave plain text; the transcript keeps only what parses. */ }
      }
    });

    // Bounded by the person (cancel), by settings (deadline), and by studio shutdown.
    const deadline = Date.now() + settings.timeoutMinutes * 60_000;
    let stopped = "";
    while (child.exitCode === null && !spawnError) {
      if (await exists(cancelMarker)) { stopped = "cancelled"; break; }
      if (state.stopping) { stopped = "interrupted"; break; }
      if (Date.now() > deadline) { stopped = "timeout"; break; }
      await Promise.race([finished, sleep(500)]);
    }
    if (stopped) { child.kill(); }
    const code = await finished;
    if (spawnError) throw new AgentError(`${run.provider} could not start: ${spawnError.message.split("\n")[0]}`);

    if (workflow === "investor-review" && investorReview && code === 0 && !stopped) {
      const rawResult = run.provider === "codex" ? await fs.readFile(resultFile, "utf8").catch(() => "") : plan.final(events);
      let assessment;
      try { assessment = investorAssessmentSchema.parse(JSON.parse(rawResult)); }
      catch (error) { throw new AgentError(`The investor review did not return valid structured feedback: ${(error as Error).message.split("\n")[0]}`); }
      const pageIds = new Set(project.pages.map(page => page.id));
      const unknownPage = assessment.recommendations.flatMap(item => item.pageIds).find(pageId => !pageIds.has(pageId));
      if (unknownPage) throw new AgentError(`The investor review referenced an unknown page: ${unknownPage}.`);
      if ((await fs.readFile(projectFile, "utf8")) !== snapshot) {
        await fs.writeFile(projectFile, snapshot);
        throw new AgentError("The read-only investor review changed the source deck, so the source was restored.");
      }
      await updateInvestorReview(investorReview.id, { status: "completed", assessment, error: undefined });
      const summary = `${assessment.signal.toUpperCase()} · ${Object.values(assessment.scores).reduce((sum, score) => sum + score, 0)}/100`;
      await updateRun(run.id, { status: "completed", summary, turns: events.length, changedFiles: [], outsideScope: [], finishedAt: new Date().toISOString(), error: undefined });
      return;
    }

    // Codex runs in structured-edit mode: it needs no nested shell sandbox. The
    // owner process validates and applies exactly one returned project document.
    if (run.provider === "codex" && code === 0 && !stopped) {
      const rawResult = await fs.readFile(resultFile, "utf8").catch(() => "");
      const revised = parseCodexProjectResult(rawResult, project, assets);
      await fs.writeFile(projectFile, JSON.stringify(revised, null, 2));
    }

    // Whatever the CLI did, the project must still be a valid project.
    let invalid = "";
    try {
      const revised = validateProject(JSON.parse(await fs.readFile(projectFile, "utf8")));
      assertAssistantAssetChoices(revised, project, assets);
      if (workflow === "investor-revision") protectedProjectFields(revised, project);
    }
    catch (error) { invalid = (error as Error).message.split("\n")[0]; }
    const changed = (await fs.readFile(projectFile, "utf8")) !== snapshot;
    if (invalid) {
      await fs.writeFile(projectFile, snapshot);
      await append({ at: new Date().toISOString(), kind: "error", text: `Project restored: ${invalid}` });
    }

    const after = await tracked();
    const outsideScope = after.filter(p => !before.includes(p) && !p.replace(/\\/g, "/").startsWith("storage/"));
    const changedFiles = changed && !invalid ? [path.relative(root, projectFile).replace(/\\/g, "/")] : [];
    const summary = (run.provider === "codex" && changed ? "Applied the requested revision." : plan.final(events)).slice(0, 400);

    if (stopped === "cancelled") { const error = "Stopped from the studio."; await fs.unlink(cancelMarker).catch(() => {}); await updateRun(run.id, { status: "cancelled", error, turns: events.length, changedFiles, outsideScope }); await markInvestorRunState(run, "cancelled", error); return; }
    if (stopped === "interrupted") { const error = "The studio shut down during this run."; await updateRun(run.id, { status: "interrupted", error, turns: events.length, changedFiles, outsideScope }); await markInvestorRunState(run, "interrupted", error); return; }
    if (stopped === "timeout") { const error = `The run passed its ${settings.timeoutMinutes}-minute limit and was stopped.`; await updateRun(run.id, { status: "failed", error, turns: events.length, changedFiles, outsideScope }); await markInvestorRunState(run, "failed", error); return; }
    if (invalid) { const error = `The assistant left the project invalid, so it was restored. ${invalid}`; await updateRun(run.id, { status: "failed", error, turns: events.length, changedFiles: [], outsideScope }); await markInvestorRunState(run, "failed", error); return; }
    if (code !== 0) { const error = `${run.provider} exited with code ${code}. ${firstFault(stderrHead, stderr)}`.trim(); await updateRun(run.id, { status: "failed", error, turns: events.length, changedFiles, outsideScope }); await markInvestorRunState(run, "failed", error); return; }
    if (!changed) { const error = "The assistant finished without changing the project."; await updateRun(run.id, { status: "failed", error, summary, turns: events.length, changedFiles, outsideScope }); await markInvestorRunState(run, "failed", error); return; }

    if (workflow === "investor-revision" && investorReview?.application) {
      const candidate = validateProject(JSON.parse(await fs.readFile(projectFile, "utf8")));
      const published = await addProject(candidate);
      await updateInvestorReview(investorReview.id, { application: { ...investorReview.application, status: "completed", variantProjectId: published.project.id, error: undefined } });
      await updateRun(run.id, { status: "completed", projectName: published.project.name, summary: "Created the approved investor-focused variant.", turns: events.length, changedFiles: [path.relative(root, location("projects", published.project.id)).replace(/\\/g, "/")], outsideScope, finishedAt: new Date().toISOString(), error: undefined });
      await queueFollowUpInvestorReview(investorReview.id, published.project.id);
      return;
    }
    // The assistant may have renamed the project; keep the run card honest.
    const finalName = await readProject(run.projectId).then(p => p.project.name).catch(() => run.projectName);
    await updateRun(run.id, { status: "completed", projectName: finalName, summary, turns: events.length, changedFiles, outsideScope, finishedAt: new Date().toISOString(), error: undefined });
  } catch (error) {
    await fs.writeFile(projectFile, snapshot).catch(() => {});
    const reason = error instanceof AgentError ? error.message : `The run did not finish: ${(error as Error).message.split("\n")[0]}`;
    await append({ at: new Date().toISOString(), kind: "error", text: reason });
    await updateRun(run.id, { status: "failed", error: reason, turns: events.length });
    await markInvestorRunState(run, "failed", reason).catch(() => {});
  } finally {
    if (child && child.exitCode === null) child.kill();
    state.child = undefined;
    await fs.unlink(cancelMarker).catch(() => {});
    await fs.unlink(resultFile).catch(() => {});
    await fs.unlink(schemaFile).catch(() => {});
    if (workflow === "investor-revision") await fs.unlink(projectFile).catch(() => {});
  }
}

try {
  while (!state.stopping) {
    if (!state.activeId) {
      const next = (await listRuns()).filter(r => r.status === "queued").sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      if (next) { state.activeId = next.id; void beat(); void work(next).catch(() => {}).finally(() => { state.activeId = undefined; void beat(); }); }
    }
    await sleep(750);
  }
} finally {
  clearInterval(heartbeat);
  if (state.child && state.child.exitCode === null) state.child.kill();
  await fs.unlink(agentPaths.lock).catch(() => {});
  await fs.unlink(agentPaths.heartbeat).catch(() => {});
}
