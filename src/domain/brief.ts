import { formats, sports, type Asset, type Project, type Scene } from "./project";

/**
 * The creative brief handed to Codex or Claude — the studio's long-standing contract
 * with an assistant. The editor copies it to the clipboard; assistant runs send the
 * same text, so the two never drift apart.
 */
export function briefFor(project: Project, assets: Asset[], projectFolder: string, scene?: Scene) {
  const focus = scene ?? project.pages[0];
  const focusIndex = project.pages.findIndex(page => page.id === focus.id);
  const isVideo = project.kind === "video";
  const total = project.pages.reduce((sum, page) => sum + page.duration, 0);
  const used = assets.filter(a => project.pages.some(s => s.assetId === a.id || s.tabletAssetId === a.id));
  return `# StatOz creative brief

Project: ${project.name}
File: ${projectFolder}\\${project.id}.json
Template: ${project.templateId} v${project.templateVersion}
Objective: ${project.brief.objective}
Audience: ${project.brief.audience}
Sport: ${sports[project.sport].label}
Formats: ${project.outputVariants.map(v => `${formats[v].label} (${formats[v].width}×${formats[v].height})`).join(", ")}
${isVideo ? `Duration: ${total.toFixed(2)} seconds at 30 fps\n` : ""}Selected ${isVideo ? "scene" : "page"}: ${Math.max(0, focusIndex) + 1} (${focus.id})
Selected headline: ${focus.headline.replace(/\n/g, " / ")}
CTA: ${focus.cta}
Assets: ${used.map(a => `${a.id}: ${a.name} [${a.approval}]`).join(", ") || "None selected"}

Read AGENTS.md and docs/brand-guide.md. Preserve the project schema and template contract. Use deterministic frame time. Update this project's JSON or add a registered template; do not overwrite exports. Run validation and inspect the result.
`;
}
