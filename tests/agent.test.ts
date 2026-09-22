import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { createProject } from "../src/features/templates/registry";
import { agentRequestSchema, defaultAgentSettings, type AgentRun } from "../src/domain/agent";
import { assertAssistantAssetChoices, revisionRouting } from "../src/server/agents/revision";
import { codexFromVsCode, planFor } from "../src/server/agents/providers";

const runFile = (folder: string, id: string, suffix = ".json") => path.join(folder, "runs", `${id}${suffix}`);

async function studioFolder(prefix: string) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  for (const group of ["projects", "runs", "assets", "reviews"]) await fs.mkdir(path.join(folder, group), { recursive: true });
  return folder;
}
function startAgent(folder: string, env: Record<string, string> = {}) {
  const child = spawn(process.execPath, ["--import", "tsx", "src/server/agent.ts"], { env: { ...process.env, STUDIO_DATA_DIR: folder, ...env }, windowsHide: true, stdio: "pipe" });
  let log = "";
  child.stdout.on("data", chunk => { log += chunk; });
  child.stderr.on("data", chunk => { log += chunk; });
  return { child, read: () => log };
}
async function waitFor(check: () => boolean | Promise<boolean>, attempts = 120) {
  for (let i = 0; i < attempts; i++) { if (await check()) return true; await new Promise(r => setTimeout(r, 100)); }
  return false;
}

test("Codex runs ignore incompatible personal config and parse current JSONL events", () => {
  const plan = planFor("codex", process.cwd(), defaultAgentSettings(), "gpt-5.3-codex");
  assert.ok(plan.args.includes("--ignore-user-config"));
  assert.ok(plan.args.includes("--ephemeral"));
  assert.deepEqual(plan.args.slice(plan.args.indexOf("--model"), plan.args.indexOf("--model") + 2), ["--model", "gpt-5.3-codex"]);
  assert.deepEqual(plan.parse(JSON.stringify({ type: "thread.started", thread_id: "thread-1" }))?.kind, "note");
  const message = plan.parse(JSON.stringify({ type: "item.completed", item: { id: "item-1", type: "agent_message", text: "Done." } }));
  assert.equal(message?.kind, "message");
  assert.equal(message?.text, "Done.");
  assert.match(message?.at ?? "", /^\d{4}-\d{2}-\d{2}T/);
  const command = plan.parse(JSON.stringify({ type: "item.completed", item: { id: "item-2", type: "command_execution", command: "Get-Content project.json" } }));
  assert.equal(command?.kind, "tool");
  assert.equal(command?.text, "Get-Content project.json");
  assert.equal(plan.parse(JSON.stringify({ type: "item.started", item: { id: "item-2", type: "command_execution", command: "Get-Content project.json" } })), null);
  assert.equal(plan.parse(JSON.stringify({ type: "error", message: "Connection failed." }))?.text, "Connection failed.");
});

test("assistant requests accept safe Codex model ids and reject shell-shaped values", () => {
  const base = { provider: "codex", prompt: "Revise the headline", projectId: "project-1" } as const;
  assert.equal(agentRequestSchema.parse({ ...base, model: "gpt-5.3-codex" }).model, "gpt-5.3-codex");
  assert.equal(agentRequestSchema.parse({ ...base, focusPageId: "page-1" }).focusPageId, "page-1");
  assert.equal(agentRequestSchema.safeParse({ ...base, model: "gpt-5.3-codex & whoami" }).success, false);
  assert.equal(agentRequestSchema.safeParse({ ...base, provider: "claude", model: "gpt-5.3-codex" }).success, false);
  assert.equal(agentRequestSchema.safeParse({ provider: "codex", prompt: "Create a post", templateId: "feature-promo", format: "portrait", focusPageId: "page-1" }).success, false);
});

test("editor brief routing starts with the focused scene while style and audio are template-wide", () => {
  const project = createProject("feature-promo", "reel", "football", 12);
  const run: AgentRun = { schemaVersion: 1, id: "brief-run", provider: "codex", prompt: "Refine it", projectId: project.id, projectName: project.name, mode: "revise", focusPageId: project.pages[1].id, status: "queued", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
  const routing = revisionRouting(run, project);
  assert.match(routing, new RegExp(project.pages[1].id));
  assert.match(routing, /Content requests.*focused scene\/page only/);
  assert.match(routing, /Style requests.*whole template/);
  assert.match(routing, /Audio requests.*whole video/);
});

test("Codex may select only approved registered audio", () => {
  const project = createProject("match-preview", "portrait");
  const audio = (id: string, approval: "reference" | "approved") => ({ schemaVersion: 1 as const, id, name: id, file: `${id}.mp3`, mime: "audio/mpeg", bytes: 12, source: "test", approval, createdAt: "2026-01-01T00:00:00.000Z" });
  const reference = audio("reference-track", "reference"), approved = audio("approved-track", "approved");
  const candidate = structuredClone(project);
  candidate.audio.assetId = reference.id;
  assert.throws(() => assertAssistantAssetChoices(candidate, project, [reference, approved]), /approved/);
  candidate.audio.assetId = approved.id;
  assert.doesNotThrow(() => assertAssistantAssetChoices(candidate, project, [reference, approved]));
});

test("Codex resolution selects the newest compatible VS Code extension binary", async () => {
  if (process.platform !== "win32") return;
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "statoz-codex-resolution-"));
  try {
    const older = path.join(folder, "openai.chatgpt-25.1.9-win32-x64", "bin", "windows-x86_64", "codex.exe");
    const newer = path.join(folder, "openai.chatgpt-26.10.2-win32-x64", "bin", "windows-x86_64", "codex.exe");
    await fs.mkdir(path.dirname(older), { recursive: true });
    await fs.mkdir(path.dirname(newer), { recursive: true });
    await fs.writeFile(older, "old");
    await fs.writeFile(newer, "new");
    assert.equal(codexFromVsCode([folder]), newer);
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});

test("Codex structured results are validated and applied without filesystem tools", async () => {
  const folder = await studioFolder("statoz-codex-structured-");
  const stub = path.join(folder, "stub-codex.mjs");
  await fs.writeFile(stub, `import fs from "node:fs";
if (process.argv.includes("--version")) { console.log("codex-cli 1.0.0"); process.exit(0); }
let prompt = "";
for await (const chunk of process.stdin) prompt += chunk;
if (!prompt.includes("Do not call shell commands or any other tools")) process.exit(2);
const resultAt = process.argv.indexOf("--output-last-message");
const project = JSON.parse(fs.readFileSync(process.env.STUB_TARGET, "utf8"));
project.pages[0].headline = "Structured revision applied";
fs.writeFileSync(process.argv[resultAt + 1], JSON.stringify({ projectJson: JSON.stringify(project) }));
console.log(JSON.stringify({ type: "thread.started", thread_id: "structured-test" }));
console.log(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "Prepared the revised project." } }));
`);
  const stubCli = path.join(folder, process.platform === "win32" ? "codex-stub.cmd" : "codex-stub.sh");
  await fs.writeFile(stubCli, process.platform === "win32"
    ? `@echo off\r\n"${process.execPath}" "${stub}" %*\r\n`
    : `#!/bin/sh\nexec "${process.execPath}" "${stub}" "$@"\n`);
  if (process.platform !== "win32") await fs.chmod(stubCli, 0o755);

  const project = createProject("feature-promo", "portrait", "football", 12);
  project.pages[0].assetId = "";
  const projectFile = path.join(folder, "projects", `${project.id}.json`);
  await fs.writeFile(projectFile, JSON.stringify(project, null, 2));
  const id = "structured-codex-run";
  await fs.writeFile(runFile(folder, id), JSON.stringify({ schemaVersion: 1, id, provider: "codex", prompt: "Revise the headline", projectId: project.id, projectName: project.name, mode: "revise", status: "queued", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));

  const agent = startAgent(folder, { CODEX_CLI_PATH: stubCli, STUB_TARGET: projectFile });
  try {
    assert.ok(await waitFor(() => agent.read().includes("assistant ready")), `assistant did not start: ${agent.read()}`);
    assert.ok(await waitFor(async () => JSON.parse(await fs.readFile(runFile(folder, id), "utf8")).status === "completed"), `run did not complete: ${agent.read()}`);
    const revised = JSON.parse(await fs.readFile(projectFile, "utf8"));
    assert.equal(revised.pages[0].headline, "Structured revision applied");
    const run = JSON.parse(await fs.readFile(runFile(folder, id), "utf8"));
    assert.equal(run.summary, "Applied the requested revision.");
  } finally {
    if (agent.child.exitCode === null) { const exit = once(agent.child, "exit"); agent.child.kill(); await exit; }
    await fs.rm(folder, { recursive: true, force: true });
  }
});

test("Codex investor reviews return a validated read-only assessment without changing the master", async () => {
  const folder = await studioFolder("statoz-investor-codex-");
  const assessment = { signal: "maybe", summary: "Product clarity is ahead of proof.", scores: { clarity: 12, timing: 6, product: 12, market: 6, proof: 3, business: 4, team: 1, ask: 7 }, strengths: ["The product loop is visible."], objections: ["No retention evidence is shown."], recommendations: [{ id: "rec-proof", priority: "critical", pageIds: [], title: "Add proof", rationale: "The deck lacks measured behavior.", action: "Add a sourced proof slide or label the gap.", questionIds: ["q-proof"] }], questions: [{ id: "q-proof", prompt: "What measured retention exists?", why: "Retention is the largest gap." }] };
  const stub = path.join(folder, "stub-investor-codex.mjs");
  await fs.writeFile(stub, `import fs from "node:fs";
if (process.argv.includes("--version")) { console.log("codex-cli 1.0.0"); process.exit(0); }
let prompt = ""; for await (const chunk of process.stdin) prompt += chunk;
if (!prompt.includes("skeptical first-screening investor")) process.exit(2);
const resultAt = process.argv.indexOf("--output-last-message");
fs.writeFileSync(process.argv[resultAt + 1], JSON.stringify(${JSON.stringify(assessment)}));
console.log(JSON.stringify({ type: "thread.started" }));
console.log(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "Screened the deck." } }));
`);
  const stubCli = path.join(folder, process.platform === "win32" ? "codex-investor.cmd" : "codex-investor.sh");
  await fs.writeFile(stubCli, process.platform === "win32" ? `@echo off\r\n"${process.execPath}" "${stub}" %*\r\n` : `#!/bin/sh\nexec "${process.execPath}" "${stub}" "$@"\n`);
  if (process.platform !== "win32") await fs.chmod(stubCli, 0o755);
  const project = createProject("investor-pitch", "landscape");
  const raw = JSON.stringify(project, null, 2), projectFile = path.join(folder, "projects", `${project.id}.json`);
  await fs.writeFile(projectFile, raw);
  const reviewId = "investor-codex-review", runId = "investor-codex-run", now = new Date().toISOString();
  await fs.writeFile(path.join(folder, "reviews", `${reviewId}.json`), JSON.stringify({ schemaVersion: 1, id: reviewId, sourceProjectId: project.id, sourceProjectName: project.name, sourceRevision: project.revision, sourceEtag: createHash("sha256").update(raw).digest("hex"), provider: "codex", lens: "india-seed-vc", depth: "first-screening", context: "", phase: "initial", parentReviewId: null, runId, status: "queued", assessment: null, application: null, createdAt: now, updatedAt: now }));
  await fs.writeFile(runFile(folder, runId), JSON.stringify({ schemaVersion: 1, id: runId, provider: "codex", prompt: "screen", workflow: "investor-review", reviewId, projectId: project.id, projectName: project.name, mode: "revise", status: "queued", createdAt: now, updatedAt: now }));
  const agent = startAgent(folder, { CODEX_CLI_PATH: stubCli });
  try {
    assert.ok(await waitFor(async () => JSON.parse(await fs.readFile(path.join(folder, "reviews", `${reviewId}.json`), "utf8")).status === "completed"));
    const review = JSON.parse(await fs.readFile(path.join(folder, "reviews", `${reviewId}.json`), "utf8"));
    assert.equal(review.assessment.signal, "maybe");
    assert.equal(await fs.readFile(projectFile, "utf8"), raw);
  } finally {
    if (agent.child.exitCode === null) { const exit = once(agent.child, "exit"); agent.child.kill(); await exit; }
    await fs.rm(folder, { recursive: true, force: true });
  }
});

test("a malformed Claude investor assessment fails without changing the master", async () => {
  const folder = await studioFolder("statoz-investor-claude-");
  const stub = path.join(folder, "stub-investor-claude.mjs");
  await fs.writeFile(stub, `if (process.argv.includes("--version")) { console.log("claude 1.0.0"); process.exit(0); }
console.log(JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "I would pass on this deck." }] } }));
console.log(JSON.stringify({ type: "result", subtype: "success", result: "not valid json" }));
`);
  const stubCli = path.join(folder, process.platform === "win32" ? "claude-investor.cmd" : "claude-investor.sh");
  await fs.writeFile(stubCli, process.platform === "win32" ? `@echo off\r\n"${process.execPath}" "${stub}" %*\r\n` : `#!/bin/sh\nexec "${process.execPath}" "${stub}" "$@"\n`);
  if (process.platform !== "win32") await fs.chmod(stubCli, 0o755);
  const project = createProject("investor-pitch", "landscape");
  const raw = JSON.stringify(project, null, 2), projectFile = path.join(folder, "projects", `${project.id}.json`);
  await fs.writeFile(projectFile, raw);
  const reviewId = "investor-claude-review", runId = "investor-claude-run", now = new Date().toISOString();
  await fs.writeFile(path.join(folder, "reviews", `${reviewId}.json`), JSON.stringify({ schemaVersion: 1, id: reviewId, sourceProjectId: project.id, sourceProjectName: project.name, sourceRevision: project.revision, sourceEtag: createHash("sha256").update(raw).digest("hex"), provider: "claude", lens: "india-seed-vc", depth: "first-screening", context: "", phase: "initial", parentReviewId: null, runId, status: "queued", assessment: null, application: null, createdAt: now, updatedAt: now }));
  await fs.writeFile(runFile(folder, runId), JSON.stringify({ schemaVersion: 1, id: runId, provider: "claude", prompt: "screen", workflow: "investor-review", reviewId, projectId: project.id, projectName: project.name, mode: "revise", status: "queued", createdAt: now, updatedAt: now }));
  const agent = startAgent(folder, { CLAUDE_CLI_PATH: stubCli });
  try {
    assert.ok(await waitFor(async () => JSON.parse(await fs.readFile(path.join(folder, "reviews", `${reviewId}.json`), "utf8")).status === "failed"));
    const review = JSON.parse(await fs.readFile(path.join(folder, "reviews", `${reviewId}.json`), "utf8"));
    assert.match(review.error, /valid structured feedback/);
    assert.equal(await fs.readFile(projectFile, "utf8"), raw);
  } finally {
    if (agent.child.exitCode === null) { const exit = once(agent.child, "exit"); agent.child.kill(); await exit; }
    await fs.rm(folder, { recursive: true, force: true });
  }
});

test("an approved investor Codex revision publishes a variant and automatically re-screens it", async () => {
  const folder = await studioFolder("statoz-investor-revision-");
  const assessment = { signal: "advance", summary: "The revised deck is ready for a first meeting.", scores: { clarity: 14, timing: 8, product: 13, market: 8, proof: 12, business: 7, team: 7, ask: 8 }, strengths: ["The proof gap is stated honestly."], objections: ["Cohort evidence still needs to be collected."], recommendations: [], questions: [] };
  const stub = path.join(folder, "stub-investor-revision.mjs");
  await fs.writeFile(stub, `import fs from "node:fs";
if (process.argv.includes("--version")) { console.log("codex-cli 1.0.0"); process.exit(0); }
let prompt = ""; for await (const chunk of process.stdin) prompt += chunk;
const resultAt = process.argv.indexOf("--output-last-message");
if (prompt.includes("approved pitch-deck revision")) {
  const project = JSON.parse(fs.readFileSync(process.env.STUB_CANDIDATE, "utf8")); project.pages[0].headline = "Investor-ready opening";
  fs.writeFileSync(process.argv[resultAt + 1], JSON.stringify({ projectJson: JSON.stringify(project) }));
} else fs.writeFileSync(process.argv[resultAt + 1], JSON.stringify(${JSON.stringify(assessment)}));
console.log(JSON.stringify({ type: "thread.started" }));
console.log(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "Completed Investor Lens work." } }));
`);
  const stubCli = path.join(folder, process.platform === "win32" ? "codex-investor-revision.cmd" : "codex-investor-revision.sh");
  await fs.writeFile(stubCli, process.platform === "win32" ? `@echo off\r\n"${process.execPath}" "${stub}" %*\r\n` : `#!/bin/sh\nexec "${process.execPath}" "${stub}" "$@"\n`);
  if (process.platform !== "win32") await fs.chmod(stubCli, 0o755);
  const project = createProject("investor-pitch", "landscape"), sourceRaw = JSON.stringify(project, null, 2);
  await fs.writeFile(path.join(folder, "projects", `${project.id}.json`), sourceRaw);
  const now = new Date().toISOString(), reviewId = "approved-review", revisionRunId = "approved-revision-run";
  const candidate = { ...structuredClone(project), id: "investor-candidate", name: `${project.name} · India seed`, pages: project.pages.map((page, index) => ({ ...page, id: `candidate-page-${index}` })), pitchDeck: { familyId: project.id, role: "variant", variantName: "India seed", basedOnProjectId: project.id, basedOnRevision: project.revision }, brief: { ...project.brief, audience: "India seed VCs" }, createdAt: now, updatedAt: now };
  const candidateFile = path.join(folder, "reviews", `${reviewId}.candidate.json`);
  await fs.writeFile(candidateFile, JSON.stringify(candidate, null, 2));
  const baseline = { signal: "maybe", summary: "Proof is missing.", scores: { clarity: 11, timing: 6, product: 12, market: 6, proof: 3, business: 4, team: 1, ask: 7 }, strengths: ["Product is visible."], objections: ["No retention proof."], recommendations: [{ id: "rec-proof", priority: "critical", pageIds: [], title: "State the proof gap", rationale: "Unsupported retention language weakens trust.", action: "Qualify the retention claim.", questionIds: [] }], questions: [] };
  await fs.writeFile(path.join(folder, "reviews", `${reviewId}.json`), JSON.stringify({ schemaVersion: 1, id: reviewId, sourceProjectId: project.id, sourceProjectName: project.name, sourceRevision: project.revision, sourceEtag: createHash("sha256").update(sourceRaw).digest("hex"), provider: "codex", lens: "india-seed-vc", depth: "first-screening", context: "", phase: "initial", parentReviewId: null, runId: "baseline-run", status: "completed", assessment: baseline, application: { recommendationIds: ["rec-proof"], answers: [], variantName: "India seed", audience: "India seed VCs", revisionRunId, status: "queued", variantProjectId: null, followUpReviewId: null }, createdAt: now, updatedAt: now }));
  await fs.writeFile(runFile(folder, revisionRunId), JSON.stringify({ schemaVersion: 1, id: revisionRunId, provider: "codex", prompt: "revise", workflow: "investor-revision", reviewId, projectId: project.id, projectName: candidate.name, mode: "revise", status: "queued", createdAt: now, updatedAt: now }));
  const agent = startAgent(folder, { CODEX_CLI_PATH: stubCli, STUB_CANDIDATE: candidateFile });
  try {
    assert.ok(await waitFor(async () => {
      const parent = JSON.parse(await fs.readFile(path.join(folder, "reviews", `${reviewId}.json`), "utf8"));
      if (!parent.application.followUpReviewId) return false;
      const follow = JSON.parse(await fs.readFile(path.join(folder, "reviews", `${parent.application.followUpReviewId}.json`), "utf8"));
      return follow.status === "completed";
    }, 200), `investor revision did not finish: ${agent.read()}`);
    const parent = JSON.parse(await fs.readFile(path.join(folder, "reviews", `${reviewId}.json`), "utf8"));
    const variant = JSON.parse(await fs.readFile(path.join(folder, "projects", `${parent.application.variantProjectId}.json`), "utf8"));
    assert.equal(variant.pages[0].headline, "Investor-ready opening");
    assert.equal(await fs.readFile(path.join(folder, "projects", `${project.id}.json`), "utf8"), sourceRaw);
    const follow = JSON.parse(await fs.readFile(path.join(folder, "reviews", `${parent.application.followUpReviewId}.json`), "utf8"));
    assert.equal(follow.assessment.signal, "advance");
    assert.equal(await fs.stat(candidateFile).then(() => true, () => false), false);
  } finally {
    if (agent.child.exitCode === null) { const exit = once(agent.child, "exit"); agent.child.kill(); await exit; }
    await fs.rm(folder, { recursive: true, force: true });
  }
});

test("assistant restart recovers unfinished runs and refuses a second process", async () => {
  const folder = await studioFolder("statoz-agent-test-");
  const id = "interrupted-run";
  await fs.writeFile(runFile(folder, id), JSON.stringify({ schemaVersion: 1, id, provider: "claude", prompt: "test", projectId: "example", projectName: "Interrupted", mode: "revise", status: "running", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
  const agent = startAgent(folder);
  try {
    assert.ok(await waitFor(() => agent.read().includes("assistant ready")), `assistant did not start: ${agent.read()}`);
    const recovered = JSON.parse(await fs.readFile(runFile(folder, id), "utf8"));
    assert.equal(recovered.status, "interrupted");

    const second = startAgent(folder);
    const [code] = await once(second.child, "exit");
    assert.equal(code, 1);
    assert.match(second.read(), /already running/);
  } finally {
    if (agent.child.exitCode === null) { const exit = once(agent.child, "exit"); agent.child.kill(); await exit; }
    await fs.rm(folder, { recursive: true, force: true });
  }
});

test("a run that corrupts the project is failed and the project is restored", async () => {
  const folder = await studioFolder("statoz-agent-guard-");
  // A stand-in CLI: emits one stream-json line, then wrecks the project it was given.
  const stub = path.join(folder, "stub-cli.mjs");
  await fs.writeFile(stub, `import fs from "node:fs";
if (process.argv.includes("--version")) { console.log("stub 1.0.0"); process.exit(0); }
console.log(JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "Rewriting the project." }] } }));
const target = process.env.STUB_TARGET;
fs.writeFileSync(target, JSON.stringify({ schemaVersion: 1, id: "x", pages: [] }));
console.log(JSON.stringify({ type: "result", subtype: "success", result: "Done." }));
`);
  const stubCli = path.join(folder, process.platform === "win32" ? "stub.cmd" : "stub.sh");
  await fs.writeFile(stubCli, process.platform === "win32"
    ? `@echo off\r\n"${process.execPath}" "${stub}" %*\r\n`
    : `#!/bin/sh\nexec "${process.execPath}" "${stub}" "$@"\n`);
  if (process.platform !== "win32") await fs.chmod(stubCli, 0o755);

  const project = createProject("feature-promo", "reel", "football", 12);
  const projectFile = path.join(folder, "projects", `${project.id}.json`);
  const original = JSON.stringify(project, null, 2);
  await fs.writeFile(projectFile, original);

  const id = "guarded-run";
  await fs.writeFile(runFile(folder, id), JSON.stringify({ schemaVersion: 1, id, provider: "claude", prompt: "break it", projectId: project.id, projectName: project.name, mode: "revise", status: "queued", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));

  const agent = startAgent(folder, { CLAUDE_CLI_PATH: stubCli, STUB_TARGET: projectFile });
  try {
    assert.ok(await waitFor(() => agent.read().includes("assistant ready")), `assistant did not start: ${agent.read()}`);
    const finished = await waitFor(async () => {
      const run = JSON.parse(await fs.readFile(runFile(folder, id), "utf8"));
      return run.status !== "queued" && run.status !== "running";
    });
    assert.ok(finished, `run never finished: ${agent.read()}`);

    const run = JSON.parse(await fs.readFile(runFile(folder, id), "utf8"));
    assert.equal(run.status, "failed", `expected failed, got ${run.status}: ${run.error}`);
    assert.match(run.error, /restored/i);
    // The whole point: an invalid result never reaches the project on disk.
    assert.equal(await fs.readFile(projectFile, "utf8"), original);
    // The transcript captured what the CLI said before it was rejected.
    const log = await fs.readFile(runFile(folder, id, ".log"), "utf8");
    assert.match(log, /Rewriting the project/);
  } finally {
    if (agent.child.exitCode === null) { const exit = once(agent.child, "exit"); agent.child.kill(); await exit; }
    await fs.rm(folder, { recursive: true, force: true });
  }
});
