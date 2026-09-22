import { existsSync } from "node:fs";
import path from "node:path";
import type { PublishSettings } from "@/domain/publish";

/** Installed browser for the posting window; undefined means Playwright's bundled Chromium. */
export function browserExecutable(channel: PublishSettings["browserChannel"]) {
  if (process.env.PUBLISH_BROWSER_PATH) return process.env.PUBLISH_BROWSER_PATH;
  if (channel === "chromium") return process.env.CHROMIUM_PATH || undefined;
  const programs = process.env.PROGRAMFILES || "C:\\Program Files", programs86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", local = process.env.LOCALAPPDATA || "";
  const candidates = channel === "msedge"
    ? [path.join(programs86, "Microsoft", "Edge", "Application", "msedge.exe"), path.join(programs, "Microsoft", "Edge", "Application", "msedge.exe"), "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/usr/bin/microsoft-edge"]
    : [path.join(programs, "Google", "Chrome", "Application", "chrome.exe"), path.join(programs86, "Google", "Chrome", "Application", "chrome.exe"), path.join(local, "Google", "Chrome", "Application", "chrome.exe"), "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome"];
  return candidates.find(file => existsSync(file));
}
