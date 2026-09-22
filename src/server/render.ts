import fs from "node:fs/promises";
import path from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Page } from "playwright";
import { zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import PptxGenJS from "pptxgenjs";
import { durationOf, type Project, type RenderJob } from "@/domain/project";
import { opaquePngFormats } from "@/domain/app-creatives";
import { location, updateJob } from "./storage";
import { ffmpegPath, launchBrowser, pngMetadata } from "./runtime";
import { soundtrackSfx } from "./audio";

const exec = promisify(execFile);
export class Cancelled extends Error { constructor() { super("Export cancelled."); } }
async function convertPng(bytes: Buffer, pixelFormat: "rgb24" | "rgba") {
  const child = spawn(ffmpegPath(), ["-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-vcodec", "png", "-i", "pipe:0", "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-pix_fmt", pixelFormat, "pipe:1"], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
  const chunks: Buffer[] = []; let stderr = "";
  child.stdout!.on("data", chunk => chunks.push(Buffer.from(chunk)));
  child.stderr!.on("data", chunk => { stderr = (stderr + chunk).slice(-3000); });
  const completed = new Promise<void>((resolve, reject) => { child.on("error", reject); child.on("close", code => code === 0 ? resolve() : reject(new Error(`PNG normalization failed: ${stderr}`))); });
  child.stdin!.end(bytes); await completed;
  return Buffer.concat(chunks);
}
async function storeReadyPng(bytes: Buffer, job: RenderJob) {
  const normalized = opaquePngFormats.has(job.format) ? await convertPng(bytes, "rgb24") : job.format === "playIcon" ? await convertPng(bytes, "rgba") : bytes;
  const metadata = pngMetadata(normalized);
  if (metadata.width !== job.width || metadata.height !== job.height) throw new Error(`Rendered PNG is ${metadata.width} × ${metadata.height}; expected ${job.width} × ${job.height}.`);
  if (opaquePngFormats.has(job.format) && metadata.hasAlpha) throw new Error("Store PNG unexpectedly contains an alpha channel.");
  if (job.format === "playIcon" && !metadata.hasAlpha) throw new Error("Google Play icon must be a 32-bit PNG with an alpha channel.");
  return normalized;
}
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
      if (job.outputType === "png") await fs.writeFile(temporary, await storeReadyPng(await page.screenshot({ type: "png" }), job), { flag: "wx" });
      else await page.screenshot({ path: temporary, type: "jpeg", quality: 95 });
    } else if (["zip", "pdf", "pptx"].includes(job.outputType)) {
      const slides: Buffer[] = [];
      for (let index = 0; index < project.pages.length; index++) {
        await draw(page, 0, index); await checkFrame();
        slides.push(await storeReadyPng(await page.screenshot({ type: "png" }), job));
        await updateJob(job.id, { progress: (index + 1) / project.pages.length * .95 });
      }
      if (job.outputType === "zip") {
        const files = Object.fromEntries(slides.map((slide, index) => [`${String(index + 1).padStart(2, "0")}-${project.format}.png`, slide]));
        await fs.writeFile(temporary, zipSync(files, { level: 0 }), { flag: "wx" });
      } else if (job.outputType === "pdf") {
        const pdf = await PDFDocument.create();
        pdf.setTitle(project.name); pdf.setAuthor("StatOz Designer"); pdf.setCreator("StatOz Designer");
        for (const bytes of slides) {
          const image = await pdf.embedPng(bytes), slide = pdf.addPage([960, 540]);
          slide.drawImage(image, { x: 0, y: 0, width: 960, height: 540 });
        }
        await fs.writeFile(temporary, await pdf.save({ useObjectStreams: false }), { flag: "wx" });
      } else {
        const pptx = new PptxGenJS();
        pptx.layout = "LAYOUT_WIDE"; pptx.author = "StatOz Designer"; pptx.company = "StatOz"; pptx.subject = "StatOz pitch deck"; pptx.title = project.name;
        for (const bytes of slides) {
          const slide = pptx.addSlide();
          slide.background = { color: "0D111A" };
          slide.addImage({ data: `data:image/png;base64,${bytes.toString("base64")}`, x: 0, y: 0, w: 13.333, h: 7.5 });
        }
        await pptx.writeFile({ fileName: temporary, compression: true });
      }
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
