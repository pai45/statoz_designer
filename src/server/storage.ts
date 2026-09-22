import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { projectSchema, type Asset, type Project, type ProjectEnvelope, type RenderJob } from "@/domain/project";
import { playerInputSchema, playerMatches, playerSchema, samplePlayers, sampleSource, type Player, type PlayerInput } from "@/domain/player";
import type { PublishRecord } from "@/domain/publish";
import type { AgentRun } from "@/domain/agent";
import { investorReviewSchema, type InvestorReview } from "@/domain/investor-review";
import { createProject, templateFor } from "@/features/templates/registry";

// Storage is runtime-owned and must never be copied into a Next.js server bundle.
export const dataRoot = path.resolve(/* turbopackIgnore: true */ process.env.STUDIO_DATA_DIR || "storage");
export const root = process.cwd();
export function safeId(value: string) { if (!/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new Error("Invalid local identifier."); return value; }
export function location(group: "projects" | "assets" | "jobs" | "renders" | "publish" | "players" | "runs" | "reviews", id: string, suffix = ".json") { return path.join(/* turbopackIgnore: true */ dataRoot, group, safeId(id) + suffix); }
export const hash = (text: string) => createHash("sha256").update(text).digest("hex");
export async function atomicWrite(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(tmp, typeof value === "string" ? value : JSON.stringify(value, null, 2), { flag: "wx" });
    // Windows indexing/OneDrive can briefly hold the destination open. Retry the
    // atomic rename; never delete the existing file to work around a sharing lock.
    for (let attempt = 0; ; attempt++) {
      try { await fs.rename(tmp, file); break; }
      catch (error) {
        if (attempt >= 8 || !["EPERM", "EACCES", "EBUSY"].includes((error as NodeJS.ErrnoException).code || "")) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.min(40 * 2 ** attempt, 500)));
      }
    }
  }
  finally { await fs.unlink(tmp).catch(() => {}); }
}
export class StudioError extends Error { constructor(message: string, public status = 400) { super(message); } }
export async function withLock<T>(name: string, run: () => Promise<T>): Promise<T> {
  await fs.mkdir(dataRoot, { recursive: true });
  const lockPath = path.join(dataRoot, `${safeId(name)}.lock`);
  let lock;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { lock = await fs.open(lockPath, "wx"); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const info = await fs.stat(lockPath).catch(() => null);
      if (info && Date.now() - info.mtimeMs > 60000) await fs.unlink(lockPath).catch(() => {});
      await new Promise(r => setTimeout(r, 30));
    }
  }
  if (!lock) throw new StudioError("This project is being saved. Try again.", 409);
  try { return await run(); } finally { await lock.close(); await fs.unlink(lockPath).catch(() => {}); }
}
async function jsonFiles(group: string) {
  return (await fs.readdir(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ dataRoot, group), { withFileTypes: true })).filter(f => f.isFile() && f.name.endsWith(".json")).map(f => path.join(/* turbopackIgnore: true */ dataRoot, group, f.name));
}
let initialization: Promise<void> | undefined;
export function initialize() {
  return initialization ??= (async () => {
    await Promise.all(["projects", "assets", "jobs", "renders", "publish", "players", "runs", "reviews"].map(g => fs.mkdir(path.join(/* turbopackIgnore: true */ dataRoot, g), { recursive: true })));
    await withLock("initialize", async () => {
      // The player library keeps its own marker so studios created before it gain the samples.
      if (!await fs.stat(path.join(dataRoot, ".players")).catch(() => null)) {
        const seeded = new Date().toISOString();
        for (const player of samplePlayers) await atomicWrite(location("players", player.id), { schemaVersion: 1, ...player, source: sampleSource, sample: true, createdAt: seeded, updatedAt: seeded } satisfies Player);
        await atomicWrite(path.join(dataRoot, ".players"), { schemaVersion: 1, seeded });
      }
      // Existing studios receive the investor master once without disturbing
      // their initialized projects or exports.
      if (!await fs.stat(path.join(dataRoot, ".pitch-decks")).catch(() => null)) {
        const hasPitchDeck = await Promise.all((await jsonFiles("projects")).map(async file => {
          try { return !!JSON.parse(await fs.readFile(file, "utf8")).pitchDeck; } catch { return false; }
        })).then(results => results.some(Boolean));
        if (!hasPitchDeck) {
          const pitch = createProject("investor-pitch", "landscape");
          await atomicWrite(location("projects", pitch.id), pitch);
        }
        await atomicWrite(path.join(dataRoot, ".pitch-decks"), { schemaVersion: 1, seededAt: new Date().toISOString() });
      }
      if (await fs.stat(path.join(dataRoot, ".initialized")).catch(() => null)) return;
      const builtins = [
        { id: "stadium", name: "Pitch Duel · Match arena", file: "public/assets/library/stadium.png", source: "statoz_web/public/assets/games/pitch-duel/match-stadium.png", approval: "reference" as const },
        { id: "arena", name: "Penalty arena", file: "public/assets/library/arena.png", source: "statoz_web/public/assets/backgrounds/penalty_arena.png", approval: "reference" as const },
        { id: "statoz-logo", name: "StatOz · Brand mark", file: "public/assets/brand/logo.png", source: "statoz_web/public/assets/icons/app_logo.png", approval: "brand" as const },
      ];
      for (const item of builtins) {
        const stat = await fs.stat(path.join(/* turbopackIgnore: true */ root, item.file));
        const asset: Asset = { schemaVersion: 1, ...item, mime: "image/png", bytes: stat.size, createdAt: new Date().toISOString() };
        await atomicWrite(location("assets", item.id), asset);
      }
      const hasOrdinaryProject = await Promise.all((await jsonFiles("projects")).map(async file => {
        try { return !JSON.parse(await fs.readFile(file, "utf8")).pitchDeck; } catch { return false; }
      })).then(results => results.some(Boolean));
      if (!hasOrdinaryProject) {
        const sample = createProject("feature-spotlight", "portrait"); sample.name = "Your instincts. Your arena.";
        const match = createProject("match-preview", "square"); match.name = "Matchday · The next chapter";
        const carousel = createProject("explainer", "portrait"); carousel.name = "The StatOz playbook";
        for (const p of [sample, match, carousel]) await atomicWrite(location("projects", p.id), p);
      }
      await atomicWrite(path.join(dataRoot, ".initialized"), { schemaVersion: 1 });
    });
  })().catch(error => { initialization = undefined; throw error; });
}
export function validateProject(value: unknown): Project {
  const result = projectSchema.safeParse(value);
  if (!result.success) throw new StudioError(result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("\n"));
  let template;
  try { template = templateFor(result.data.templateId); } catch { throw new StudioError(`Unknown template: ${result.data.templateId}`); }
  if (template.kind !== result.data.kind || template.version !== result.data.templateVersion) throw new StudioError("Template kind/version does not match this project.");
  if (!template.formats.includes(result.data.format) || result.data.outputVariants.some(format => !template.formats.includes(format)))
    throw new StudioError("Project output format is not supported by this template.");
  if (result.data.pages.length > (template.maxPages ?? 12)) throw new StudioError(`${template.name} supports up to ${template.maxPages ?? 12} pages.`);
  return result.data;
}
export async function readProject(id: string): Promise<ProjectEnvelope> {
  const raw = await fs.readFile(location("projects", id), "utf8");
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new StudioError(`Project ${id} has malformed JSON. Fix its file and reload.`, 422); }
  const project = validateProject(parsed);
  if (project.id !== id) throw new StudioError("Project filename and identifier do not match.", 422);
  return { project, etag: hash(raw) };
}
export async function listProjects() {
  await initialize();
  const projects: ProjectEnvelope[] = [], errors: string[] = [];
  for (const file of await jsonFiles("projects")) {
    try { projects.push(await readProject(path.basename(file, ".json"))); }
    catch (e) { errors.push(`${path.basename(file)}: ${(e as Error).message}`); }
  }
  return { projects: projects.sort((a, b) => b.project.updatedAt.localeCompare(a.project.updatedAt)), errors };
}
export async function saveProject(value: unknown, etag: string): Promise<ProjectEnvelope> {
  const project = validateProject(value);
  return withLock(`project-${project.id}`, async () => {
    const current = await readProject(project.id);
    if (etag !== current.etag) throw new StudioError("This project changed outside the editor. Reload it or save your edits as a copy.", 409);
    const next = { ...project, revision: current.project.revision + 1, updatedAt: new Date().toISOString() };
    await atomicWrite(location("projects", next.id), next);
    return readProject(next.id);
  });
}
export async function deleteProject(id: string, etag: string): Promise<void> {
  await withLock(`project-${id}`, async () => {
    const current = await readProject(id);
    if (etag !== current.etag) throw new StudioError("This project changed outside the studio. Reload before deleting it.", 409);
    const file = location("projects", id);
    for (let attempt = 0; ; attempt++) {
      try { await fs.unlink(file); break; }
      catch (error) {
        if (attempt >= 8 || !["EPERM", "EACCES", "EBUSY"].includes((error as NodeJS.ErrnoException).code || "")) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.min(40 * 2 ** attempt, 500)));
      }
    }
  });
}
export async function addProject(value: unknown) {
  const project = validateProject(value);
  await fs.writeFile(location("projects", project.id), JSON.stringify(project, null, 2), { flag: "wx" });
  return readProject(project.id);
}
export function pitchVariantFrom(source: Project, variantName: string, audience: string): Project {
  if (!source.pitchDeck) throw new StudioError("Only a pitch deck can create a pitch-deck variant.");
  const now = new Date().toISOString(), id = randomUUID();
  const name = `${source.name.replace(/ · [^·]+$/, "")} · ${variantName}`.slice(0, 120);
  return {
    ...structuredClone(source), id, name, revision: 1, archived: false,
    pages: source.pages.map(page => ({ ...page, id: randomUUID() })),
    pitchDeck: { familyId: source.pitchDeck.familyId, role: "variant", variantName, basedOnProjectId: source.id, basedOnRevision: source.revision },
    brief: { ...source.brief, audience }, createdAt: now, updatedAt: now,
  };
}
export async function createPitchVariant(sourceId: string, variantName: string, audience: string) {
  return addProject(pitchVariantFrom((await readProject(sourceId)).project, variantName, audience));
}
export async function listAssets(): Promise<Asset[]> {
  await initialize();
  return Promise.all((await jsonFiles("assets")).map(async file => JSON.parse(await fs.readFile(file, "utf8")) as Asset));
}
export async function assetPath(asset: Asset) {
  const candidate = path.resolve(/* turbopackIgnore: true */ root, asset.file);
  const approvedRoots = [path.join(root, "public", "assets"), path.join(dataRoot, "assets")];
  const real = await fs.realpath(candidate);
  if (!approvedRoots.some(base => real.toLowerCase().startsWith(base.toLowerCase() + path.sep))) throw new StudioError("Asset is outside the managed media folders.");
  return real;
}
export async function readJob(id: string): Promise<RenderJob> { return JSON.parse(await fs.readFile(location("jobs", id), "utf8")); }
export async function listJobs(): Promise<RenderJob[]> {
  await initialize();
  const jobs: RenderJob[] = [];
  for (const f of await jsonFiles("jobs")) { try { jobs.push(JSON.parse(await fs.readFile(f, "utf8"))); } catch { /* A damaged job must not hide the rest of the export gallery. */ } }
  return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function updateJob(id: string, update: Partial<RenderJob>) {
  return withLock(`job-${id}`, async () => { const job = { ...await readJob(id), ...update, updatedAt: new Date().toISOString() }; await atomicWrite(location("jobs", id), job); return job; });
}
export async function readPublish(id: string): Promise<PublishRecord> { return JSON.parse(await fs.readFile(location("publish", id), "utf8")); }
export async function listPublish(): Promise<PublishRecord[]> {
  await initialize();
  const records: PublishRecord[] = [];
  for (const f of await jsonFiles("publish")) { try { records.push(JSON.parse(await fs.readFile(f, "utf8"))); } catch { /* A damaged record must not hide the rest of the posting history. */ } }
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function updatePublish(id: string, update: Partial<PublishRecord>) {
  return withLock(`publish-${id}`, async () => { const record = { ...await readPublish(id), ...update, updatedAt: new Date().toISOString() }; await atomicWrite(location("publish", id), record); return record; });
}
export async function readRun(id: string): Promise<AgentRun> { return JSON.parse(await fs.readFile(location("runs", id), "utf8")); }
export async function listRuns(): Promise<AgentRun[]> {
  await initialize();
  const runs: AgentRun[] = [];
  for (const f of await jsonFiles("runs")) { try { runs.push(JSON.parse(await fs.readFile(f, "utf8"))); } catch { /* A damaged run must not hide the rest of the assistant history. */ } }
  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function updateRun(id: string, update: Partial<AgentRun>) {
  return withLock(`run-${id}`, async () => { const run = { ...await readRun(id), ...update, updatedAt: new Date().toISOString() }; await atomicWrite(location("runs", id), run); return run; });
}
export async function addInvestorReview(value: unknown): Promise<InvestorReview> {
  const review = investorReviewSchema.parse(value);
  await fs.writeFile(location("reviews", review.id), JSON.stringify(review, null, 2), { flag: "wx" });
  return review;
}
export async function readInvestorReview(id: string): Promise<InvestorReview> {
  return investorReviewSchema.parse(JSON.parse(await fs.readFile(location("reviews", id), "utf8")));
}
export async function listInvestorReviews(projectId = ""): Promise<InvestorReview[]> {
  await initialize();
  const reviews: InvestorReview[] = [];
  for (const file of await jsonFiles("reviews")) {
    try {
      const review = investorReviewSchema.parse(JSON.parse(await fs.readFile(file, "utf8")));
      if (!projectId || review.sourceProjectId === projectId) reviews.push(review);
    } catch { /* A damaged review must not hide the rest of the history. */ }
  }
  return reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function updateInvestorReview(id: string, update: Partial<InvestorReview>): Promise<InvestorReview> {
  return withLock(`review-${id}`, async () => {
    const review = investorReviewSchema.parse({ ...await readInvestorReview(id), ...update, updatedAt: new Date().toISOString() });
    await atomicWrite(location("reviews", id), review);
    return review;
  });
}
function validatePlayerInput(value: unknown): PlayerInput {
  const result = playerInputSchema.safeParse(value);
  if (!result.success) throw new StudioError(result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("\n"));
  return result.data;
}
async function checkPortrait(portraitAssetId: string) {
  if (!portraitAssetId) return;
  const asset = (await listAssets()).find(a => a.id === portraitAssetId);
  if (!asset) throw new StudioError("That portrait is not in the media library. Import it first.");
  if (!asset.mime.startsWith("image/")) throw new StudioError("Player portraits must be a still image.");
}
// An imported roster is hundreds of files, and the studio searches on every keystroke.
// The parsed library is cached against the folder's modification time, which every
// atomicWrite rename bumps; our own writes clear it outright.
let playerCache: { stamp: string; players: Player[] } | null = null;
export function forgetPlayers() { playerCache = null; }
async function loadPlayers(): Promise<Player[]> {
  const folder = path.join(/* turbopackIgnore: true */ dataRoot, "players");
  const files = await jsonFiles("players");
  const modified = await fs.stat(folder).then(s => String(s.mtimeMs)).catch(() => "");
  // Adding, replacing or removing a record changes one of these. Editing an existing
  // file in place changes neither, so such an edit appears after the next library
  // write or a studio restart.
  const stamp = `${modified}:${files.length}`;
  if (playerCache && playerCache.stamp === stamp) return playerCache.players;
  const players: Player[] = [];
  for (const file of files) {
    try { players.push(playerSchema.parse(JSON.parse(await fs.readFile(file, "utf8")))); }
    catch { /* A damaged record must not hide the rest of the player library. */ }
  }
  players.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  playerCache = { stamp, players };
  return players;
}
export async function listPlayers(query = "", sport = ""): Promise<Player[]> {
  await initialize();
  return (await loadPlayers()).filter(p => (!sport || p.sport === sport) && playerMatches(p, query));
}
export async function addPlayer(value: unknown): Promise<Player> {
  const input = validatePlayerInput(value);
  await checkPortrait(input.portraitAssetId);
  const now = new Date().toISOString();
  const player: Player = { schemaVersion: 1, id: randomUUID(), ...input, source: "Added from the StatOz Designer card editor.", sample: false, createdAt: now, updatedAt: now };
  await atomicWrite(location("players", player.id), player);
  forgetPlayers();
  return player;
}
export async function savePlayer(id: string, value: unknown): Promise<Player> {
  const input = validatePlayerInput(value);
  await checkPortrait(input.portraitAssetId);
  return withLock(`player-${safeId(id)}`, async () => {
    const current = playerSchema.parse(JSON.parse(await fs.readFile(location("players", id), "utf8")));
    const next: Player = { ...current, ...input, updatedAt: new Date().toISOString() };
    await atomicWrite(location("players", id), next);
    forgetPlayers();
    return next;
  });
}
