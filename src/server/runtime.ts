import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { resolveFFmpeg } from "../../vendor/statoz-video/core.mjs";
const exec = promisify(execFile);
export function ffmpegPath(): string { return resolveFFmpeg(); }
export function pngMetadata(bytes: Buffer) {
  const signature = "89504e470d0a1a0a";
  if (bytes.length < 33 || bytes.subarray(0, 8).toString("hex") !== signature) throw new Error("This PNG could not be decoded.");
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), colorType = bytes[25];
  let hasTransparencyChunk = false;
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset), type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "tRNS") hasTransparencyChunk = true;
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return { width, height, hasAlpha: colorType === 4 || colorType === 6 || hasTransparencyChunk };
}
export async function probeMedia(file: string) {
  let output = "";
  try { const result = await exec(ffmpegPath(), ["-hide_banner", "-i", file], { windowsHide: true, timeout: 15000 }); output = result.stderr; }
  catch (error) { output = (error as { stderr?: string }).stderr || ""; }
  const duration = output.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const videoLine = output.split("\n").find(l => l.includes("Video:"));
  const size = videoLine?.match(/\b(\d{2,5})x(\d{2,5})\b/);
  if (!output.includes("Stream #")) throw new Error("This file could not be decoded as supported media.");
  return { ...(duration ? { duration: +duration[1] * 3600 + +duration[2] * 60 + +duration[3] } : {}), ...(size ? { width: +size[1], height: +size[2] } : {}) };
}
/**
 * Vector dimensions, read from the markup. ffmpeg cannot decode SVG, so
 * `probeMedia` rejects it; the `viewBox` (or an explicit width/height) is the
 * only size an SVG carries. Returns {} when neither is present, which is legal
 * markup and simply means the art scales to whatever box it is given.
 */
export function svgDimensions(markup: string): { width?: number; height?: number } {
  const open = markup.slice(0, 4000);
  const box = open.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (box) return { width: Math.round(+box[1]), height: Math.round(+box[2]) };
  const width = open.match(/\bwidth\s*=\s*["']([\d.]+)/i), height = open.match(/\bheight\s*=\s*["']([\d.]+)/i);
  return width && height ? { width: Math.round(+width[1]), height: Math.round(+height[1]) } : {};
}
export async function launchBrowser() {
  const executablePath = process.env.CHROMIUM_PATH;
  return chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
}
export async function doctor() {
  const checks: { name: string; ok: boolean; detail: string }[] = [];
  try { checks.push({ name: "FFmpeg", ok: true, detail: ffmpegPath() }); } catch (e) { checks.push({ name: "FFmpeg", ok: false, detail: String(e) }); }
  try { const browser = await launchBrowser(); await browser.close(); checks.push({ name: "Chromium", ok: true, detail: process.env.CHROMIUM_PATH || chromium.executablePath() }); }
  catch (e) { checks.push({ name: "Chromium", ok: false, detail: `${String(e)} Install with npx playwright install chromium or set CHROMIUM_PATH.` }); }
  let heartbeat: { time: string; pid: number } | null = null;
  try { heartbeat = JSON.parse(await fs.readFile(path.resolve(process.env.STUDIO_DATA_DIR || "storage", "worker.json"), "utf8")); } catch {}
  checks.push({ name: "Render worker", ok: !!heartbeat && Date.now() - Date.parse(heartbeat.time) < 10000, detail: heartbeat ? `Process ${heartbeat.pid}` : "Start the studio with npm run dev or npm start." });
  let publisher: { time: string; pid: number } | null = null;
  try { publisher = JSON.parse(await fs.readFile(path.resolve(process.env.STUDIO_DATA_DIR || "storage", "publisher.json"), "utf8")); } catch {}
  checks.push({ name: "Posting window", ok: !!publisher && Date.now() - Date.parse(publisher.time) < 10000, detail: publisher ? `Process ${publisher.pid}. The browser opens only when you post.` : "Optional. Start the studio with npm run dev or npm start to post to social." });
  let assistant: { time: string; pid: number } | null = null;
  try { assistant = JSON.parse(await fs.readFile(path.resolve(process.env.STUDIO_DATA_DIR || "storage", "agent.json"), "utf8")); } catch {}
  checks.push({ name: "Assistant", ok: !!assistant && Date.now() - Date.parse(assistant.time) < 10000, detail: assistant ? `Process ${assistant.pid}. Runs start only when you ask for one.` : "Optional. Start the studio with npm run dev or npm start to run assistants." });
  const { providerIds, providers } = await import("@/domain/agent");
  const { providerReady } = await import("./agents/providers");
  for (const provider of providerIds) {
    const state = providerReady(provider);
    checks.push({ name: `${providers[provider].label} CLI`, ok: state.ready, detail: state.detail });
  }
  return checks;
}
