import fs from "node:fs/promises";
import path from "node:path";
import type { RenderJob } from "../src/domain/project";
import { platformIds, platforms, type Platform, type PublishList, type PublishOptions, type PublishRecord } from "../src/domain/publish";

// Opens each compatible composer through the running studio and keeps a screenshot of the review
// step. Nothing is posted: the posting window stops before every site's Post button, and each tab
// is closed afterwards. Sign in first (Assets & brand → Social accounts). Limit with --only=x,linkedin.
const base = process.env.STUDIO_URL || "http://127.0.0.1:3000";
const dataRoot = path.resolve(process.env.STUDIO_DATA_DIR || "storage");
const output = path.resolve("test-results/publish"); await fs.mkdir(output, { recursive: true });
const only = (process.argv.find(arg => arg.startsWith("--only="))?.slice(7).split(",") ?? platformIds) as Platform[];
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(`${base}/api/${url}`, { method: body === undefined ? "GET" : "POST", headers: { Origin: base, "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json(); if (!response.ok) throw new Error(`${response.status}: ${data.error}`); return data;
}
if (!(await request<PublishList>("publish")).publisher.running) throw new Error("Start the studio with npm run dev first.");
const jobs = (await request<RenderJob[]>("exports")).filter(job => job.status === "completed");
const samples = [jobs.find(job => job.outputType === "png" || job.outputType === "jpeg"), jobs.find(job => job.outputType === "zip"), jobs.find(job => job.outputType === "mp4")].filter((job): job is RenderJob => !!job);
if (!samples.length) throw new Error("Export an image, carousel, or video in the studio first.");
const report: { output: string; platform: Platform; result: string; detail?: string; screenshot?: string }[] = [];
for (const job of samples) {
  const options = await request<PublishOptions>(`publish-options/${job.id}`);
  for (const platform of only) {
    const check = options.platforms[platform];
    if (!check.ok) { report.push({ output: job.outputType, platform, result: "skipped", detail: check.reason }); continue; }
    const record = await request<PublishRecord>("publish", { jobId: job.id, platform, caption: `Verification only. Do not post.\n\n${options.caption}`.slice(0, platforms[platform].captionLimit), ...(platform === "youtube" ? { title: "Verification only. Do not post." } : {}) });
    let current = record;
    for (let second = 0; second < 180 && ["queued", "opening"].includes(current.status); second++) {
      await sleep(1000);
      current = (await request<PublishList>("publish")).records.find(r => r.id === record.id) ?? current;
    }
    const screenshot = path.join(output, `${platform}-${job.outputType}.png`);
    const saved = await fs.copyFile(path.join(dataRoot, "publish", `${record.id}.png`), screenshot).then(() => true, () => false);
    report.push({ output: job.outputType, platform, result: current.status, detail: current.message, ...(saved ? { screenshot } : {}) });
    console.log(`${platforms[platform].label} · ${job.outputType}: ${current.status}${current.message ? ` · ${current.message}` : ""}`);
    if (["queued", "opening", "needs-login", "ready"].includes(current.status)) await request(`publish/${record.id}/close`, {});
    await sleep(1500);
  }
}
await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
console.log(`Report: ${path.join(output, "report.json")}. Inspect each screenshot for attached media and the caption.`);
if (report.some(entry => entry.result === "failed")) process.exitCode = 1;
