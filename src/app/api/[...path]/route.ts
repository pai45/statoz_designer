import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { formats, type Asset, type Format, type Sport } from "@/domain/project";
import { createProject, templates } from "@/features/templates/registry";
import { addPlayer, addProject, assetPath, atomicWrite, createPitchVariant, dataRoot, deleteProject, initialize, listAssets, listInvestorReviews, listJobs, listPlayers, listProjects, listPublish, listRuns, location, pitchVariantFrom, readInvestorReview, readJob, readProject, readRun, saveProject, savePlayer, StudioError, validateProject } from "@/server/storage";
import { closePublish, createPublish, markPosted, publisherStatus, publishOptions, readPublishSettings, requestSignIn, retryPublish, savePublishSettings } from "@/server/publish/queue";
import { agentStatus, cancelRun, createRun, readAgentSettings, readRunLog, retryRun, saveAgentSettings } from "@/server/agents/queue";
import { espnCatalogue, espnMatch, espnMatches, espnNews, espnNewsPhoto, espnPoster } from "@/server/espn/queue";
import { compositionHtml } from "@/server/composition-html";
import { cancelJob, enqueue, retryJob } from "@/server/jobs";
import { doctor, pngMetadata, probeMedia, svgDimensions } from "@/server/runtime";
import { soundtrackSfx } from "@/server/audio";
import { listBrandKit, readBrandKitFile } from "@/server/brand-kit";
import { applyInvestorReview, cancelInvestorReview, createInvestorReview, retryInvestorReview } from "@/server/investor/queue";

type Context = { params: Promise<{ path: string[] }> };
function checkOrigin(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0];
  if (host !== "127.0.0.1" && host !== "localhost") throw new StudioError("This studio is available on localhost only.", 403);
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    if (!origin || new URL(origin).host !== req.headers.get("host")) throw new StudioError("Local same-origin requests are required.", 403);
  }
}
async function serveFile(req: NextRequest, file: string, mime: string, downloadName?: string, cacheControl = "no-store") {
  const data = await fs.readFile(file);
  const headers: Record<string, string> = { "Content-Type": mime, "Cache-Control": cacheControl, "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff" };
  if (mime === "image/svg+xml") headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  if (downloadName) headers["Content-Disposition"] = `attachment; filename="${downloadName.replace(/[^a-zA-Z0-9._-]/g, "-")}"`;
  const range = req.headers.get("range");
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) return new Response(null, { status: 416 });
    const start = +match[1], end = match[2] ? Math.min(+match[2], data.length - 1) : data.length - 1;
    if (start > end || start >= data.length) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${data.length}` } });
    return new Response(new Uint8Array(data.subarray(start, end + 1)), { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${data.length}`, "Content-Length": String(end - start + 1) } });
  }
  return new Response(new Uint8Array(data), { headers: { ...headers, "Content-Length": String(data.length) } });
}
async function handle(req: NextRequest, context: Context): Promise<Response> {
  try {
    checkOrigin(req); await initialize();
    const [resource, id, action] = (await context.params).path;
    const method = req.method;
    if (resource === "config" && method === "GET") return Response.json({ templates, formats, projectFolder: path.join(dataRoot, "projects") });
    if (resource === "doctor" && method === "GET") return Response.json(await doctor());
    if (resource === "audio-preview" && method === "POST") {
      const project = validateProject(await req.json());
      if (project.kind !== "video") throw new StudioError("Audio previews require a video project.");
      return new Response(new Uint8Array(soundtrackSfx(project)), { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
    }
    if (resource === "projects") {
      if (method === "GET") return Response.json(id ? await readProject(id) : await listProjects());
      if (method === "PUT" && id) { const body = await req.json(); if (body.id !== id) throw new StudioError("Project identifier does not match."); return Response.json(await saveProject(body, req.headers.get("if-match") || "")); }
      if (method === "DELETE" && id) { await deleteProject(id, req.headers.get("if-match") || ""); return Response.json({ deleted: true }); }
      if (method === "POST") {
        const body = await req.json();
        if (id && action === "variants") {
          const input = z.object({ name: z.string().trim().min(1).max(80), audience: z.string().trim().min(1).max(300) }).parse(body);
          return Response.json(await createPitchVariant(id, input.name, input.audience), { status: 201 });
        }
        if (body.copy) {
          const original = validateProject(body.copy), now = new Date().toISOString();
          if (original.pitchDeck) return Response.json(await addProject(pitchVariantFrom(original, `${original.pitchDeck.variantName} copy`.slice(0, 80), original.brief.audience)), { status: 201 });
          return Response.json(await addProject({ ...original, id: randomUUID(), name: `${original.name.slice(0, 110)} · Copy`, revision: 1, archived: false, createdAt: now, updatedAt: now }), { status: 201 });
        }
        const input = z.object({ templateId: z.string(), format: z.custom<Format>(value => typeof value === "string" && value in formats, "Unknown output format."), sport: z.enum(["football", "cricket", "basketball", "tennis", "motorsport"]), duration: z.number().optional() }).parse(body);
        const template = templates.find(t => t.id === input.templateId);
        if (!template) throw new StudioError("Unknown template.");
        if (template.kind === "video" && (!input.duration || input.duration < 8 || input.duration > 60)) throw new StudioError("Choose a video duration from 8 through 60 seconds.");
        return Response.json(await addProject(createProject(input.templateId, input.format, input.sport as Sport, input.duration)), { status: 201 });
      }
    }
    if (resource === "preview" && method === "POST") {
      const body = await req.json(); const project = validateProject(body.project);
      return new Response(await compositionHtml(project, body.pageIndex || 0), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }
    if (resource === "brand-kit" && method === "GET") {
      if (!id) return Response.json(await listBrandKit());
      const file = await readBrandKitFile(id); if (!file) throw new StudioError("Design kit file not found.", 404);
      return new Response(new Uint8Array(file.data), { headers: { "Content-Type": file.mime, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": `attachment; filename="${file.fileName}"`, "Content-Length": String(file.data.length) } });
    }
    if (resource === "assets") {
      if (method === "GET") {
        const assets = await listAssets(); if (!id) return Response.json(assets);
        const asset = assets.find(a => a.id === id); if (!asset) throw new StudioError("Asset not found.", 404);
        // Imported media is immutable, so cache its ID-addressed bytes across previews.
        return serveFile(req, await assetPath(asset), asset.mime, undefined, "public, max-age=31536000, immutable");
      }
      if (method === "PATCH" && id) {
        const asset = (await listAssets()).find(a => a.id === id); if (!asset) throw new StudioError("Asset not found.", 404);
        const input = z.object({ approval: z.enum(["reference", "approved"]), name: z.string().min(1).max(160).optional() }).parse(await req.json());
        const next = { ...asset, ...input }; await atomicWrite(location("assets", id), next); return Response.json(next);
      }
      if (method === "POST") {
        if (Number(req.headers.get("content-length")) > 150 * 1024 * 1024) throw new StudioError("Import files up to 150 MB.", 413);
        const form = await req.formData(), file = form.get("file");
        if (!(file instanceof File) || file.size > 150 * 1024 * 1024 || file.size === 0) throw new StudioError("Choose a non-empty media file up to 150 MB.");
        const ext = path.extname(file.name).toLowerCase();
        const mimes: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg" };
        if (!mimes[ext]) throw new StudioError("Use PNG, JPEG, WebP, SVG, MP4, WebM, MP3, WAV, M4A, or OGG.");
        const assetId = randomUUID(), target = location("assets", assetId, ext);
        try {
          const bytes = Buffer.from(await file.arrayBuffer());
          await fs.writeFile(target, bytes, { flag: "wx" });
          // ffmpeg cannot decode SVG, so vectors carry their own dimensions.
          const metadata = ext === ".svg" ? svgDimensions(await fs.readFile(target, "utf8")) : ext === ".png" ? { ...await probeMedia(target), ...pngMetadata(bytes) } : await probeMedia(target);
          if (mimes[ext].startsWith("image/") && ext !== ".svg" && !metadata.width) throw new StudioError("This image could not be decoded.");
          const mime = mimes[ext];
          const asset: Asset = { schemaVersion: 1, id: assetId, name: file.name, file: path.relative(process.cwd(), target), mime, bytes: file.size, category: mime.startsWith("audio/") || mime.startsWith("video/") ? "audio-video" : "uploads", source: `User import: ${file.name}`, approval: form.get("approved") === "true" ? "approved" : "reference", createdAt: new Date().toISOString(), ...metadata };
          await atomicWrite(location("assets", assetId), asset); return Response.json(asset, { status: 201 });
        } catch (e) { await fs.unlink(target).catch(() => {}); throw e; }
      }
    }
    if (resource === "players") {
      if (method === "GET") return Response.json(await listPlayers(req.nextUrl.searchParams.get("q") || "", req.nextUrl.searchParams.get("sport") || ""));
      if (method === "POST" && !id) return Response.json(await addPlayer(await req.json()), { status: 201 });
      if (method === "PUT" && id) return Response.json(await savePlayer(id, await req.json()));
    }
    if (resource === "exports") {
      if (method === "GET") {
        if (!id) return Response.json(await listJobs());
        const job = await readJob(id);
        if (action === "poster") return serveFile(req, path.join(location("renders", id, ""), "poster.png"), "image/png");
        if (action === "file") {
          if (!job.output || job.status !== "completed" || path.basename(job.output) !== job.output) throw new StudioError("Export is not ready.", 404);
          const mime = { mp4: "video/mp4", png: "image/png", jpeg: "image/jpeg", zip: "application/zip", pdf: "application/pdf", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }[job.outputType];
          return serveFile(req, path.join(location("renders", id, ""), job.output), mime, req.nextUrl.searchParams.has("download") ? job.output : undefined);
        }
        return Response.json(job);
      }
      if (method === "POST") {
        if (id && action === "cancel") return Response.json(await cancelJob(id));
        if (id && action === "retry") return Response.json(await retryJob(id));
        const body = z.object({ projectId: z.string(), etag: z.string(), format: z.custom<Format>(value => typeof value === "string" && value in formats, "Unknown output format."), outputType: z.enum(["png", "jpeg", "zip", "pdf", "pptx", "mp4"]) }).parse(await req.json());
        const current = await readProject(body.projectId);
        if (body.etag !== current.etag) throw new StudioError("Save or reload the latest project before exporting.", 409);
        return Response.json(await enqueue(current.project, body.format, body.outputType), { status: 202 });
      }
    }
    if (resource === "publish") {
      if (method === "GET" && !id) return Response.json({ records: await listPublish(), publisher: await publisherStatus() });
      if (method === "POST") {
        if (!id) return Response.json(await createPublish(await req.json()), { status: 202 });
        if (action === "retry") return Response.json(await retryPublish(id));
        if (action === "close") return Response.json(await closePublish(id));
        if (action === "posted") return Response.json(await markPosted(id, await req.json().catch(() => ({}))));
      }
    }
    if (resource === "publish-options" && method === "GET" && id) return Response.json(await publishOptions(id));
    if (resource === "publish-settings") {
      if (method === "GET") return Response.json(await readPublishSettings());
      if (method === "PUT") return Response.json(await savePublishSettings(await req.json()));
    }
    if (resource === "publish-login" && method === "POST" && id) return Response.json(await requestSignIn(id), { status: 202 });
    if (resource === "agents") {
      if (method === "GET" && !id) return Response.json({ runs: await listRuns(), assistant: await agentStatus() });
      if (method === "GET" && id) return Response.json(action === "log" ? await readRunLog(id) : await readRun(id));
      if (method === "POST") {
        if (!id) return Response.json(await createRun(await req.json()), { status: 202 });
        if (action === "cancel") return Response.json(await cancelRun(id));
        if (action === "retry") return Response.json(await retryRun(id), { status: 202 });
      }
    }
    if (resource === "investor-reviews") {
      if (method === "GET") return Response.json(id ? await readInvestorReview(id) : await listInvestorReviews(req.nextUrl.searchParams.get("projectId") || ""));
      if (method === "POST") {
        if (!id) return Response.json(await createInvestorReview(await req.json()), { status: 202 });
        if (action === "apply") return Response.json(await applyInvestorReview(id, await req.json()), { status: 202 });
        if (action === "cancel") return Response.json(await cancelInvestorReview(id));
        if (action === "retry") return Response.json(await retryInvestorReview(id), { status: 202 });
      }
    }
    if (resource === "espn") {
      if (method === "GET" && id === "leagues") return Response.json(espnCatalogue());
      if (method === "GET" && id === "matches") return Response.json(await espnMatches(Object.fromEntries(req.nextUrl.searchParams)));
      if (method === "GET" && id === "match" && action) return Response.json(await espnMatch(req.nextUrl.searchParams.get("leagueId") || "", action, req.nextUrl.searchParams.get("date") || undefined));
      if (method === "POST" && id === "poster") return Response.json(await espnPoster(await req.json()), { status: 201 });
      if (method === "GET" && id === "news") return Response.json(await espnNews(Object.fromEntries(req.nextUrl.searchParams)));
      if (method === "POST" && id === "news-photo") return Response.json(await espnNewsPhoto(await req.json()), { status: 201 });
    }
    if (resource === "agent-settings") {
      if (method === "GET") return Response.json(await readAgentSettings());
      if (method === "PUT") return Response.json(await saveAgentSettings(await req.json()));
    }
    throw new StudioError("Studio route not found.", 404);
  } catch (error) {
    const status = error instanceof StudioError ? error.status : error instanceof z.ZodError ? 400 : (error as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500;
    return Response.json({ error: (error as Error).message }, { status });
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
