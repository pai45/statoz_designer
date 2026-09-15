import fs from "node:fs/promises";
import path from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Page } from "playwright";
import { zipSync } from "fflate";
import { durationOf, type Project, type RenderJob } from "@/domain/project";
import { location, updateJob } from "./storage";
import { ffmpegPath, launchBrowser } from "./runtime";
import { soundtrackSfx } from "./audio";

const exec = promisify(execFile);
export class Cancelled extends Error { constructor() { super("Export cancelled."); } }
export async function draw(page: Page, time: number, pageIndex = 0) {
  await page.evaluate(async ({ time, pageIndex }) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { await Promise.race([window.drawFrame({ time, pageIndex }), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Frame decoding timed out.")), 30000); })]); }
    finally { clearTimeout(timer); }
  }, { time, pageIndex });
}
export async function renderJob(job: RenderJob) {
  const folder = location("renders", job.id, "");
  const project: Project = JSON.parse(await fs.readFile(path.join(folder, "project.json"), "utf8"));
  const browser = await launchBrowser();
  let encoder: ReturnType<typeof spawn> | undefined;
  let encoded: Promise<{ code: number | null }> | undefined;
  const temporary = path.join(folder, `partial.${job.outputType === "jpeg" ? "jpg" : job.outputType}`);
  const checkCancel = async () => { if (await fs.stat(path.join(folder, "cancel")).catch(() => null)) throw new Cancelled(); };
  try {
    const page = await browser.newPage({ viewport: { width: job.width, height: job.height }, deviceScaleFactor: 1 });
    let sceneError: string | undefined;
    page.on("pageerror", e => { sceneError = e.message; });
    await page.route("**/*", route => route.abort());
    await page.setContent(await fs.readFile(path.join(folder, "scene.html"), "utf8"), { waitUntil: "load" });
    await page.waitForFunction(() => typeof window.drawFrame === "function", { timeout: 30000 });
    await draw(page, 0);
    const checkFrame = async () => {
      await checkCancel();
      if (sceneError) throw new Error(sceneError);
      const overflow = await page.evaluate(() => window.overflowReport());
      if (overflow.length) throw new Error(overflow.join(" "));
    };
    await checkFrame();
    await page.screenshot({ path: path.join(folder, "poster.png"), type: "png" });
    if (job.outputType === "png" || job.outputType === "jpeg") {
      await page.screenshot({ path: temporary, type: job.outputType, ...(job.outputType === "jpeg" ? { quality: 95 } : {}) });
    } else if (job.outputType === "zip") {
      const files: Record<string, Uint8Array> = {};
      for (let index = 0; index < project.pages.length; index++) {
        await draw(page, 0, index); await checkFrame();
        files[`${String(index + 1).padStart(2, "0")}-${project.format}.png`] = await page.screenshot({ type: "png" });
        await updateJob(job.id, { progress: (index + 1) / project.pages.length * .95 });
      }
      await fs.writeFile(temporary, zipSync(files, { level: 0 }), { flag: "wx" });
    } else {
      const duration = durationOf(project), fps = 30, frames = Math.round(duration * fps);
      const args = ["-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-vcodec", "png", "-framerate", String(fps), "-i", "pipe:0"];
      const tracks: { gain: number }[] = [];
      if (!project.audio.silent && project.audio.sfx) {
        const wav = path.join(folder, "sfx.wav");
        await fs.writeFile(wav, soundtrackSfx(project));
        args.push("-i", wav); tracks.push({ gain: 1 });
      }
      const audioFile = (await fs.readdir(folder)).find(f => f.startsWith("audio."));
      if (!project.audio.silent && audioFile) { args.push("-i", path.join(folder, audioFile)); tracks.push({ gain: project.audio.gain }); }
      args.push("-map", "0:v:0");
      if (tracks.length) {
        const filters = tracks.map((t, i) => `[${i + 1}:a:0]aresample=48000,asetpts=PTS-STARTPTS,volume=${t.gain},apad,atrim=duration=${duration}[a${i}]`);
        filters.push(`${tracks.map((_, i) => `[a${i}]`).join("")}amix=inputs=${tracks.length}:normalize=0,alimiter=limit=0.9:level=0:latency=1[outa]`);
        args.push("-filter_complex", filters.join(";"), "-map", "[outa]", "-c:a", "aac", "-b:a", "192k", "-ar", "48000");
      } else args.push("-an");
      args.push("-t", String(duration), "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-vf", "setsar=1", "-r", "30", "-threads", "4", "-movflags", "+faststart", "-y", temporary);
      encoder = spawn(ffmpegPath(), args, { stdio: ["pipe", "ignore", "pipe"], windowsHide: true });
      let stderr = "", encoderError: Error | undefined;
      encoder.stderr!.on("data", chunk => { stderr = (stderr + chunk).slice(-6000); });
      encoder.stdin!.on("error", e => { encoderError = e; });
      encoded = new Promise(resolve => { encoder!.on("error", e => { encoderError = e; resolve({ code: 1 }); }); encoder!.on("close", code => resolve({ code })); });
      for (let frame = 0; frame < frames; frame++) {
        await checkCancel();
        if (encoderError || encoder.exitCode !== null) throw new Error(`Encoder stopped: ${stderr || encoderError?.message}`);
        await draw(page, frame / fps); await checkFrame();
        const png = await page.screenshot({ type: "png" });
        await new Promise<void>((resolve, reject) => encoder!.stdin!.write(png, error => error ? reject(error) : resolve()));
        if (frame % 15 === 0) await updateJob(job.id, { progress: (frame + 1) / frames * .93 });
      }
      encoder.stdin!.end();
      const result = await encoded;
      if (result.code !== 0 || encoderError) throw new Error(`MP4 encoding failed: ${stderr || encoderError?.message}`);
      await updateJob(job.id, { progress: .96 });
      await exec(ffmpegPath(), ["-v", "error", "-i", temporary, "-f", "null", "-"], { windowsHide: true, timeout: 120000 });
      job.audio = tracks.length > 0;
    }
    await checkCancel();
    const extension = job.outputType === "jpeg" ? "jpg" : job.outputType;
    const output = `${job.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 70)}-${job.width}x${job.height}-${job.id.slice(0, 8)}.${extension}`;
    await fs.link(temporary, path.join(folder, output));
    const stat = await fs.stat(path.join(folder, output));
    await updateJob(job.id, { status: "completed", progress: 1, output, bytes: stat.size, audio: job.audio });
  } finally {
    if (encoder && encoder.exitCode === null) { encoder.kill(); await encoded; }
    await browser.close();
    await fs.unlink(temporary).catch(() => {});
    await fs.unlink(path.join(folder, "sfx.wav")).catch(() => {});
  }
}
