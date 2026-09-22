import type { AgentRun } from "@/domain/agent";
import type { Asset, Project } from "@/domain/project";
import { AgentError } from "./providers";

/** The assistant may use registered visuals, but music always needs explicit approval. */
export function assertAssistantAssetChoices(revised: Project, original: Project, assets: Asset[]) {
  const registered = new Set(assets.map(asset => asset.id));
  const referenced = [...revised.pages.flatMap(page => [page.assetId, page.tabletAssetId, page.emblemA, page.emblemB]), revised.audio.assetId].filter(Boolean);
  if (referenced.some(id => !registered.has(id))) throw new AgentError("The assistant selected an asset that is not registered in the studio.");
  if (revised.audio.assetId && revised.audio.assetId !== original.audio.assetId) {
    const audio = assets.find(asset => asset.id === revised.audio.assetId);
    if (!audio?.mime.startsWith("audio/") || audio.approval !== "approved")
      throw new AgentError("The assistant may only select audio marked approved in the media library.");
  }
}

export function revisionRouting(run: AgentRun, project: Project) {
  const focus = run.focusPageId ? project.pages.find(page => page.id === run.focusPageId) : undefined;
  if (!focus) return run.mode === "create" ? "This is a new project. Design the full template from the brief." : "No scene is focused. Apply the request only where its wording makes the intended scope clear.";
  return `The editor focused ${project.kind === "video" ? "scene" : "page"} ${project.pages.indexOf(focus) + 1} (${focus.id}). Infer the request type from the user's wording:
- Content requests (copy, stats, people, match facts, selected visual media) change this focused scene/page only.
- Style requests (art direction, layout, visual hierarchy, logo treatment, motion, transitions) apply consistently across the whole template.
- Audio requests apply only to project.audio across the whole video. You may select only an approved audio asset, or use silence and the built-in SFX settings.
- An explicit scope in the user's command, such as "all scenes", "whole template", or "only this page", always overrides these defaults.
- Do not alter unrelated content, styling, or audio.`;
}
