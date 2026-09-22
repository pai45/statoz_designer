import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Composition, type Media } from "./composition";
import { formats, sceneAt, type Project } from "@/domain/project";

declare global {
  interface Window {
    STUDIO: { project: Project; media: Record<string, Media>; logo: string; pageIndex?: number };
    ready: Promise<void>;
    drawFrame: (context: { time: number; pageIndex?: number; guides?: boolean }) => Promise<void>;
    overflowReport: () => string[];
  }
}
const root = createRoot(document.getElementById("root")!);
let current = window.STUDIO;
window.overflowReport = () => [...document.querySelectorAll<HTMLElement>("[data-overflow]")].filter(el => el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2).map(el => `${el.tagName === "H1" ? "Headline" : "Body copy"} exceeds its layout. Shorten the text or choose another layout.`);
window.drawFrame = async ({ time, pageIndex = current.pageIndex ?? 0, guides = false }) => {
  const dimensions = formats[current.project.format];
  for (const el of [document.documentElement, document.body]) { el.style.width = `${dimensions.width}px`; el.style.height = `${dimensions.height}px`; }
  flushSync(() => root.render(<Composition {...current} time={time} pageIndex={pageIndex} guides={guides}/>));
  await document.fonts.ready;
  await Promise.all([...document.images].map(img => img.decode()));
  const scene = current.project.kind === "video" ? sceneAt(current.project, time) : { scene: current.project.pages[pageIndex], localTime: 0 };
  await Promise.all([...document.querySelectorAll<HTMLVideoElement>("video[data-scene-video]")].map(async video => {
    if (video.readyState < 1) await new Promise<void>((resolve, reject) => { video.addEventListener("loadedmetadata", () => resolve(), { once: true }); video.addEventListener("error", () => reject(new Error("Video failed to load")), { once: true }); });
    const end = scene.scene.clipEnd || video.duration;
    const target = Math.max(0, Math.min(scene.scene.clipStart + scene.localTime, end - 1 / 30, video.duration - 1 / 30));
    if (Math.abs(video.currentTime - target) > .001 || video.readyState < 2) await new Promise<void>((resolve, reject) => { video.addEventListener("seeked", () => resolve(), { once: true }); video.addEventListener("error", () => reject(new Error("Video seek failed")), { once: true }); video.currentTime = target; });
    video.pause();
  }));
  // Let the browser commit this deterministic frame before capture or display.
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
};
let active = false;
let pending: { time: number; pageIndex?: number; guides?: boolean; requestId?: number } | null = null;
async function drain() {
  if (active || !pending) return;
  active = true; const frame = pending; pending = null;
  try { await window.drawFrame(frame); parent.postMessage({ type: "studio:drawn", requestId: frame.requestId, overflow: window.overflowReport() }, "*"); }
  catch (error) { parent.postMessage({ type: "studio:error", message: String(error) }, "*"); }
  finally { active = false; void drain(); }
}
window.addEventListener("message", event => {
  if (event.source !== parent || event.data?.type !== "studio:frame") return;
  if (event.data.project) current = { ...current, project: event.data.project };
  pending = event.data; void drain();
});
window.ready = window.drawFrame({ time: 0 }).then(() => { parent.postMessage({ type: "studio:ready", overflow: window.overflowReport() }, "*"); });
