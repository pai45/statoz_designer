import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { resolveFFmpeg } from "../../vendor/statoz-video/core.mjs";
const exec = promisify(execFile);
export function ffmpegPath(): string { return resolveFFmpeg(); }
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
  return checks;
}
