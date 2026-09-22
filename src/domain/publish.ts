import { z } from "zod";
import type { Project, RenderJob } from "./project";

export const platforms = {
  linkedin: { label: "LinkedIn", captionLimit: 3000, maxImages: 20, loginUrl: "https://www.linkedin.com/login", summary: "Images, multi-image posts up to 20 pages, and video on the StatOz company page." },
  youtube: { label: "YouTube", captionLimit: 5000, maxImages: 0, loginUrl: "https://accounts.google.com/ServiceLogin?service=youtube&continue=https%3A%2F%2Fstudio.youtube.com%2F", summary: "Video exports. You choose the channel, audience, and visibility in YouTube Studio." },
  instagram: { label: "Instagram", captionLimit: 2200, maxImages: 10, loginUrl: "https://www.instagram.com/accounts/login/", summary: "Images, carousels up to 10 pages, and Reels. You adjust the crop before the caption fills in." },
  x: { label: "X", captionLimit: 280, maxImages: 4, loginUrl: "https://x.com/i/flow/login", summary: "Images, carousels up to 4 pages, and video. Captions up to 280 characters." },
} as const;
export type Platform = keyof typeof platforms;
export const platformIds = Object.keys(platforms) as Platform[];

export type PublishStatus = "queued" | "opening" | "needs-login" | "ready" | "posted" | "closed" | "failed";
/** Statuses with a tab in the posting window. */
export const tabStatuses: readonly PublishStatus[] = ["opening", "needs-login", "ready"];
export const openStatuses: readonly PublishStatus[] = ["queued", ...tabStatuses];

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const publishRequestSchema = z.object({
  jobId: id, platform: z.enum(["linkedin", "youtube", "instagram", "x"]),
  caption: z.string().max(5000), title: z.string().max(100).optional(),
}).superRefine((request, ctx) => {
  const { label, captionLimit } = platforms[request.platform];
  if (request.caption.length > captionLimit) ctx.addIssue({ code: "custom", message: `${label} captions can be up to ${captionLimit} characters.`, path: ["caption"] });
  if (request.platform === "youtube" && !request.title?.trim()) ctx.addIssue({ code: "custom", message: "Add a YouTube title.", path: ["title"] });
});
export const markPostedSchema = z.object({
  postUrl: z.string().max(500).refine(value => { try { return new URL(value).protocol === "https:"; } catch { return false; } }, "Use the https link to the post.").optional(),
});
export const publishSettingsSchema = z.object({
  schemaVersion: z.literal(1),
  linkedinCompanyId: z.string().regex(/^[a-zA-Z0-9-]{0,100}$/, "Use the company ID or page name from your LinkedIn admin link."),
  browserChannel: z.enum(["msedge", "chrome", "chromium"]),
});
export type PublishSettings = z.infer<typeof publishSettingsSchema>;

export type PublishRecord = {
  schemaVersion: 1; id: string; jobId: string; projectName: string; platform: Platform;
  caption: string; title?: string; status: PublishStatus; message?: string; postUrl?: string;
  files: string[]; createdAt: string; updatedAt: string;
};
export type Compatibility = { ok: boolean; reason?: string; warnings: string[] };
export type PublishOptions = { jobId: string; caption: string; title: string; platforms: Record<Platform, Compatibility> };
export type PublisherStatus = { running: boolean; browserOpen: boolean; signIn: Platform | null };
export type PublishList = { records: PublishRecord[]; publisher: PublisherStatus };

export function compatibility(job: Pick<RenderJob, "status" | "outputType" | "format" | "output">, pageCount: number, platform: Platform): Compatibility {
  const { label, maxImages } = platforms[platform], warnings: string[] = [];
  if (job.status !== "completed" || !job.output) return { ok: false, reason: "Finish this export before posting.", warnings };
  if (job.outputType === "mp4") {
    if (platform === "youtube" && (job.format === "reel" || job.format === "square")) warnings.push("Square or vertical, so YouTube may publish it as a Short.");
    if (platform === "instagram" && job.format !== "reel") warnings.push("Instagram shares videos as Reels, where 9:16 fills the screen.");
    return { ok: true, warnings };
  }
  if (maxImages === 0) return { ok: false, reason: `${label} accepts video exports only.`, warnings };
  if (job.outputType === "zip" && pageCount > maxImages) return { ok: false, reason: `${label} posts hold up to ${maxImages} images; this carousel has ${pageCount}.`, warnings };
  if (platform === "instagram" && (job.format === "landscape" || job.format === "reel")) warnings.push("Instagram crops feed images to between 1.91:1 and 4:5. Check its crop step.");
  return { ok: true, warnings };
}
export function defaultCaption(project: Project) {
  const page = project.pages[0], line = (text: string) => text.replace(/\s*\n\s*/g, " ").trim();
  return [line(page.headline), page.body.trim(), page.showCta ? line(page.cta) : ""].filter(Boolean).join("\n\n").slice(0, 2200);
}
