import { formats, type Asset, type Format, type Project, type Sport } from "@/domain/project";
import type { Media } from "@/features/compositions/composition";
import { createProject, templateFor } from "@/features/templates/registry";
import { publicAsset } from "@/shared/api";

export const demoTimestamp = "2026-09-15T00:00:00.000Z";

export const demoAssets: Asset[] = [
  { schemaVersion: 1, id: "statoz-logo", name: "StatOz logo", file: "assets/brand/logo.png", mime: "image/png", bytes: 478_312, width: 1024, height: 1024, category: "brand-artwork", source: "StatOz repository brand artwork", approval: "brand", createdAt: demoTimestamp },
  { schemaVersion: 1, id: "stadium", name: "Stadium reference", file: "assets/library/stadium.png", mime: "image/png", bytes: 2_746_209, width: 1920, height: 1080, category: "product-capture", source: "Bundled StatOz sample artwork · reference only", approval: "reference", createdAt: demoTimestamp },
  { schemaVersion: 1, id: "arena", name: "Arena reference", file: "assets/library/arena.png", mime: "image/png", bytes: 1_629_229, width: 1920, height: 1080, category: "product-capture", source: "Bundled StatOz sample artwork · reference only", approval: "reference", createdAt: demoTimestamp },
];

export function demoAssetUrl(asset: Pick<Asset, "file">) {
  return publicAsset(`/${asset.file}`);
}

export function demoMedia(): Record<string, Media> {
  return Object.fromEntries(demoAssets.map(asset => [asset.id, { src: demoAssetUrl(asset), mime: asset.mime }]));
}

export function defaultDemoFormat(templateId: string): Format {
  const template = templateFor(templateId);
  if (template.defaultFormat) return template.defaultFormat;
  if (template.kind === "video" && template.formats.includes("reel")) return "reel";
  if (template.formats.includes("portrait")) return "portrait";
  return template.formats[0];
}

export function createDemoProject(templateId: string, format = defaultDemoFormat(templateId), sport: Sport = "football", duration = 12): Project {
  const template = templateFor(templateId);
  if (!template.formats.includes(format)) throw new Error(`${template.name} does not support ${formats[format].label}.`);
  const base = createProject(templateId, format, sport, template.kind === "video" ? duration : undefined);
  const id = `demo-${templateId}-${format}-${base.sport}`;
  return {
    ...base,
    id,
    revision: 1,
    pages: base.pages.map((page, index) => ({ ...page, id: `${id}-page-${String(index + 1).padStart(2, "0")}` })),
    pitchDeck: base.pitchDeck ? { ...base.pitchDeck, familyId: id } : null,
    sample: true,
    archived: false,
    createdAt: demoTimestamp,
    updatedAt: demoTimestamp,
  };
}
