import { z } from "zod";

export const formats = {
  square: { label: "Square", ratio: "1:1", width: 1080, height: 1080 },
  portrait: { label: "Portrait feed", ratio: "4:5", width: 1080, height: 1350 },
  reel: { label: "Reels / Shorts", ratio: "9:16", width: 1080, height: 1920 },
  landscape: { label: "Landscape", ratio: "16:9", width: 1920, height: 1080 },
} as const;
export type Format = keyof typeof formats;
export const sports = {
  football: { label: "Football", accent: "#5cdfff", symbol: "01" },
  cricket: { label: "Cricket", accent: "#ffffff", symbol: "02" },
  basketball: { label: "Basketball", accent: "#fdc700", symbol: "03" },
  tennis: { label: "Tennis", accent: "#51ff94", symbol: "04" },
  motorsport: { label: "Motorsport", accent: "#f42d29", symbol: "05" },
} as const;
export type Sport = keyof typeof sports;
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const text = z.string().max(300);
export const pageSchema = z.object({
  id, eyebrow: text, headline: text, body: z.string().max(1200), cta: text,
  nameA: text, nameB: text, scoreA: z.string().max(30), scoreB: z.string().max(30),
  statLabel: text, statValue: z.string().max(40),
  chartValues: z.array(z.number().min(0).max(100)).min(2).max(12).default([37, 59, 48, 72, 61, 78, 54, 91, 74, 96]),
  cardMetrics: z.object({ pace: z.number().int().min(0).max(100), skill: z.number().int().min(0).max(100), form: z.number().int().min(0).max(100) }).default({ pace: 94, skill: 91, form: 89 }),
  assetId: id.or(z.literal("")), crop: z.enum(["cover", "contain"]),
  cropX: z.number().min(0).max(100), cropY: z.number().min(0).max(100),
  clipStart: z.number().min(0).max(36000), clipEnd: z.number().min(0).max(36000),
  duration: z.number().min(0.5).max(60),
  layout: z.enum(["editorial", "centered", "split"]),
  motion: z.enum(["rise", "slide", "zoom", "none"]),
  transition: z.enum(["cut", "fade"]), showLogo: z.boolean(), showCta: z.boolean(),
}).refine(p => p.clipEnd === 0 || p.clipEnd > p.clipStart, "Clip end must follow clip start.");
export const projectSchema = z.object({
  schemaVersion: z.literal(1), id, revision: z.number().int().min(1),
  name: z.string().min(1).max(120), templateId: id, templateVersion: z.literal(1),
  kind: z.enum(["image", "carousel", "video"]), sport: z.enum(["football", "cricket", "basketball", "tennis", "motorsport"]),
  format: z.enum(["square", "portrait", "reel", "landscape"]),
  outputVariants: z.array(z.enum(["square", "portrait", "reel", "landscape"])).min(1).max(4),
  pages: z.array(pageSchema).min(1).max(12),
  audio: z.object({ assetId: id.or(z.literal("")), gain: z.number().min(0).max(1), silent: z.boolean(), sfx: z.boolean() }),
  brief: z.object({ objective: z.string().max(1500), audience: text }),
  sample: z.boolean(), archived: z.boolean(), createdAt: z.string(), updatedAt: z.string(),
}).superRefine((p, ctx) => {
  const seconds = p.pages.reduce((sum, page) => sum + page.duration, 0);
  if (p.kind === "video" && (seconds < 8 || seconds > 60 || Math.abs(seconds * 30 - Math.round(seconds * 30)) > .001))
    ctx.addIssue({ code: "custom", message: "Video duration must be 8–60 seconds and align to 30 fps.", path: ["pages"] });
  if (p.kind === "image" && p.pages.length !== 1) ctx.addIssue({ code: "custom", message: "Image projects contain exactly one page.", path: ["pages"] });
  if (new Set(p.pages.map(s => s.id)).size !== p.pages.length) ctx.addIssue({ code: "custom", message: "Scene IDs must be unique.", path: ["pages"] });
});
export type Scene = z.infer<typeof pageSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Asset = {
  schemaVersion: 1; id: string; name: string; file: string; mime: string; bytes: number;
  width?: number; height?: number; duration?: number;
  source: string; approval: "brand" | "reference" | "approved"; createdAt: string;
};
export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted";
export type RenderJob = {
  schemaVersion: 1; id: string; projectId: string; projectName: string; revision: number;
  format: Format; outputType: "png" | "jpeg" | "zip" | "mp4"; status: JobStatus;
  progress: number; createdAt: string; updatedAt: string; error?: string; output?: string;
  bytes?: number; duration?: number; width: number; height: number; audio?: boolean;
};
export type ProjectEnvelope = { project: Project; etag: string };
export function durationOf(p: Project) { return p.pages.reduce((n, page) => n + page.duration, 0); }
export function sceneAt(p: Project, time: number) {
  let start = 0;
  for (let i = 0; i < p.pages.length; i++) {
    const scene = p.pages[i];
    if (time < start + scene.duration || i === p.pages.length - 1) return { scene, index: i, localTime: Math.max(0, time - start), start };
    start += scene.duration;
  }
  throw new Error("Project has no scenes");
}
