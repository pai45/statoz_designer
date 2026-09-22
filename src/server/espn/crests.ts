import fs from "node:fs/promises";
import path from "node:path";
import type { Asset } from "@/domain/project";
import type { MatchSide } from "@/domain/espn";
import { atomicWrite, listAssets, location, safeId } from "@/server/storage";

const mimes: Record<string, string> = { ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

/**
 * Crests are downloaded once and registered like any other asset, because the export
 * renderer runs with the network disabled — a hot-linked logo renders blank.
 *
 * They are club and governing-body trademarks, so they register as `reference` with the
 * ESPN URL kept as provenance. They are never brand assets and never imply endorsement.
 */
export async function importCrest(side: MatchSide, sport: string): Promise<string> {
  if (!side.logo) return "";
  const extension = (path.extname(new URL(side.logo).pathname).toLowerCase() || ".png").split("?")[0];
  const mime = mimes[extension];
  if (!mime) return "";
  const id = safeId(`espn-${sport}-${side.id || side.abbreviation}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90));

  const existing = (await listAssets()).find(a => a.id === id);
  const target = location("assets", id, extension);
  const onDisk = await fs.stat(target).then(() => true).catch(() => false);
  if (existing && onDisk) return id;

  const response = await fetch(side.logo, { signal: AbortSignal.timeout(20000), headers: { "user-agent": "StatOz Designer (local studio)" } }).catch(() => null);
  if (!response?.ok) return "";
  const body = Buffer.from(await response.arrayBuffer());
  if (!body.length) return "";
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body);
  const asset: Asset = {
    schemaVersion: 1, id, name: `${side.name} crest`, file: path.relative(process.cwd(), target),
    mime, bytes: body.length,
    source: `ESPN: ${side.logo}`,
    approval: "reference",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await atomicWrite(location("assets", id), asset);
  return id;
}
