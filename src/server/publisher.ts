import fs from "node:fs/promises";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type BrowserContext, type Page } from "playwright";
import { platforms, tabStatuses, type Platform, type PublishRecord } from "@/domain/publish";
import { atomicWrite, dataRoot, initialize, listPublish, location, readPublish, updatePublish } from "./storage";
import { publishPaths, readPublishSettings } from "./publish/queue";
import { browserExecutable } from "./publish/browser";
import { adapters } from "./publish/adapters";
import { ComposerError } from "./publish/composer";

// Assisted posting: opens site composers in a visible, signed-in browser, attaches the export,
// and fills text. The person reviews and clicks Post; this process never publishes.
await initialize();
const lockPath = path.join(dataRoot, "publisher.lock");
try {
  const old = JSON.parse(await fs.readFile(lockPath, "utf8"));
  try { process.kill(old.pid, 0); console.error("A posting window process is already running."); process.exit(1); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ESRCH") throw e; }
  await fs.unlink(lockPath);
} catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
await fs.writeFile(lockPath, JSON.stringify({ pid: process.pid }), { flag: "wx" });
for (const record of await listPublish()) if (tabStatuses.includes(record.status)) await updatePublish(record.id, { status: "closed", message: "The studio restarted before this post was finished. Retry to open it again." });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const exists = (file: string) => fs.stat(file).then(() => true, () => false);
const tabs = new Map<string, Page>();
const state: { context?: BrowserContext; signIn?: { platform: Platform; child: ChildProcess }; openingId?: string; stopping?: boolean } = {};
process.on("SIGINT", () => { state.stopping = true; }); process.on("SIGTERM", () => { state.stopping = true; });
const beat = () => atomicWrite(publishPaths.heartbeat, { pid: process.pid, time: new Date().toISOString(), browserOpen: !!state.context, signIn: state.signIn?.platform ?? null }).catch(() => {});
await beat();
const heartbeat = setInterval(() => void beat(), 2000);
console.log("StatOz posting window ready.");

async function stillOpen(id: string) { const record = await readPublish(id).catch(() => null); return !!record && tabStatuses.includes(record.status); }
async function capture(id: string, page?: Page) { if (page && !page.isClosed()) await page.screenshot({ path: location("publish", id, ".png") }).catch(() => {}); }
async function signedIn(context: BrowserContext, platform: Platform) {
  const adapter = adapters[platform];
  return (await context.cookies(adapter.cookieUrl)).some(cookie => adapter.sessionCookies.includes(cookie.name) && !!cookie.value);
}
async function browser() {
  if (state.context) return state.context;
  const executablePath = browserExecutable((await readPublishSettings()).browserChannel);
  await fs.mkdir(publishPaths.profile, { recursive: true });
  try {
    const context = await chromium.launchPersistentContext(publishPaths.profile, { headless: false, viewport: null, ...(executablePath ? { executablePath } : {}), ignoreDefaultArgs: ["--enable-automation"], args: ["--no-first-run", "--no-default-browser-check"] });
    context.on("close", () => { if (state.context === context) { state.context = undefined; void beat(); } });
    state.context = context; void beat();
    return context;
  } catch (error) { throw new ComposerError(`The posting window could not start (${(error as Error).message.split("\n")[0]}). Close any sign-in window that uses the studio profile, then retry.`); }
}
async function open(queued: PublishRecord) {
  const record = await readPublish(queued.id);
  if (record.status !== "queued") return;
  const adapter = adapters[record.platform], label = platforms[record.platform].label;
  const update = async (change: Partial<PublishRecord>) => { if (await stillOpen(record.id)) await updatePublish(record.id, change); };
  let page: Page | undefined;
  try {
    await updatePublish(record.id, { status: "opening", message: `Opening ${label}…` });
    const start = adapter.startUrl(await readPublishSettings());
    const context = await browser();
    page = context.pages().find(p => p.url() === "about:blank" && ![...tabs.values()].includes(p)) ?? await context.newPage();
    tabs.set(record.id, page);
    await page.bringToFront();
    if (!(await signedIn(context, record.platform))) {
      await update({ status: "needs-login", message: `Sign in to the StatOz ${label} account in the posting window; the composer opens afterwards. If ${label} blocks sign-in there, close the tab and use Assets & brand → Social accounts → Sign in.` });
      await page.goto(platforms[record.platform].loginUrl, { waitUntil: "domcontentloaded" });
      const deadline = Date.now() + 10 * 60_000;
      while (!(await signedIn(context, record.platform))) {
        if (page.isClosed() || !(await stillOpen(record.id))) throw new ComposerError("The posting tab was closed.");
        if (Date.now() > deadline) throw new ComposerError(`Sign-in to ${label} timed out.`);
        await sleep(1500);
      }
      await update({ status: "opening", message: `Signed in. Opening the ${label} composer…` });
    }
    await page.goto(start, { waitUntil: "domcontentloaded" });
    const tab = page;
    await adapter.prepare(tab, record, { note: async message => { await update({ message }); await capture(record.id, tab); } });
    await update({ status: "ready", message: adapter.readyMessage });
    await capture(record.id, tab);
    await tab.bringToFront();
  } catch (error) {
    if (page && (page.isClosed() || !(await stillOpen(record.id)))) {
      if (page.isClosed()) { tabs.delete(record.id); await update({ status: "closed", message: "The posting tab was closed." }); }
      return;
    }
    await capture(record.id, page);
    tabs.delete(record.id);
    const reason = error instanceof ComposerError ? error.message : `${label} did not load as expected: ${(error as Error).message.split("\n")[0]}`;
    await updatePublish(record.id, { status: "failed", message: page ? `${reason} The tab stays open so you can finish by hand; the files are in ${path.dirname(record.files[0])}.` : reason });
  }
}
async function watch(records: PublishRecord[]) {
  for (const record of records) {
    const page = tabs.get(record.id);
    if (!tabStatuses.includes(record.status)) { if (page) tabs.delete(record.id); continue; }
    const marker = location("publish", record.id, ".close");
    if (await exists(marker)) {
      await fs.unlink(marker).catch(() => {});
      if (page && !page.isClosed()) await page.close().catch(() => {});
      tabs.delete(record.id);
      await updatePublish(record.id, { status: "closed", message: "Closed from the studio." });
      continue;
    }
    if (record.id === state.openingId) continue;
    if (!page || page.isClosed()) { tabs.delete(record.id); await updatePublish(record.id, { status: "closed", message: "The posting tab was closed." }); }
  }
}
// Sign-in runs the browser as a plain process (no automation), because Google and Meta may refuse
// sign-in inside automated browsers. It shares the profile, so the automated context closes first.
async function handleSignIn() {
  if (state.signIn || !(await exists(publishPaths.signIn))) return;
  const request = await fs.readFile(publishPaths.signIn, "utf8").then(text => JSON.parse(text) as { platform?: string }, () => ({} as { platform?: string }));
  await fs.unlink(publishPaths.signIn).catch(() => {});
  const platform = request.platform as Platform;
  if (!platform || !(platform in platforms) || state.openingId || tabs.size) return;
  if (state.context) { const context = state.context; state.context = undefined; await context.close().catch(() => {}); }
  await fs.mkdir(publishPaths.profile, { recursive: true });
  const executable = browserExecutable((await readPublishSettings()).browserChannel) ?? chromium.executablePath();
  const child = spawn(executable, [`--user-data-dir=${publishPaths.profile}`, "--no-first-run", "--no-default-browser-check", platforms[platform].loginUrl], { stdio: "ignore" });
  state.signIn = { platform, child };
  const done = () => { if (state.signIn?.child === child) { state.signIn = undefined; void beat(); } };
  child.on("exit", done); child.on("error", done);
  void beat();
}
try {
  while (!state.stopping) {
    await handleSignIn();
    const records = await listPublish();
    await watch(records);
    if (!state.openingId && !state.signIn) {
      const next = records.filter(r => r.status === "queued").sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      if (next) { state.openingId = next.id; void open(next).catch(() => {}).finally(() => { state.openingId = undefined; }); }
    }
    await sleep(750);
  }
} finally {
  clearInterval(heartbeat);
  await state.context?.close().catch(() => {});
  state.signIn?.child.kill();
  await fs.unlink(lockPath).catch(() => {});
  await fs.unlink(publishPaths.heartbeat).catch(() => {});
}
