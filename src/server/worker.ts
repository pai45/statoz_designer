import fs from "node:fs/promises";
import path from "node:path";
import { atomicWrite, dataRoot, initialize, listJobs, updateJob } from "./storage";
import { Cancelled, renderJob } from "./render";

await initialize();
const lockPath = path.join(dataRoot, "worker.lock");
try {
  const old = JSON.parse(await fs.readFile(lockPath, "utf8"));
  try { process.kill(old.pid, 0); console.error("A render worker is already running."); process.exit(1); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ESRCH") throw e; }
  await fs.unlink(lockPath);
} catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
await fs.writeFile(lockPath, JSON.stringify({ pid: process.pid }), { flag: "wx" });
for (const job of await listJobs()) if (job.status === "running") await updateJob(job.id, { status: "interrupted", error: "The studio stopped during this export. Retry to render the saved snapshot." });
let stopping = false;
let activeId: string | null = null;
const stop = () => { stopping = true; if (activeId) void fs.writeFile(path.join(dataRoot, "renders", activeId, "cancel"), "shutdown"); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
const heartbeat = setInterval(() => { void atomicWrite(path.join(dataRoot, "worker.json"), { pid: process.pid, time: new Date().toISOString() }); }, 2000);
console.log("StatOz render worker ready.");
try {
  while (!stopping) {
    const job = (await listJobs()).reverse().find(j => j.status === "queued");
    if (!job) { await new Promise(r => setTimeout(r, 750)); continue; }
    activeId = job.id;
    await updateJob(job.id, { status: "running", progress: 0 });
    try { await renderJob(job); }
    catch (e) { await updateJob(job.id, { status: stopping ? "interrupted" : e instanceof Cancelled ? "cancelled" : "failed", error: (e as Error).message }); }
    activeId = null;
  }
} finally {
  clearInterval(heartbeat);
  await fs.unlink(lockPath).catch(() => {});
  await fs.unlink(path.join(dataRoot, "worker.json")).catch(() => {});
}
