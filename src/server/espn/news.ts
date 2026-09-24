import fs from "node:fs/promises";
import path from "node:path";
import type { Asset } from "@/domain/project";
import type { NewsArticle } from "@/domain/espn";
import { assetPath, atomicWrite, listAssets, location, StudioError } from "@/server/storage";
import { isEspnImage } from "@/server/espn/adapters";

const mimes: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

/**
 * A story's header photo, downloaded once and registered like a crest: the export
 * renderer runs offline, so a hot-linked photo would render blank.
 *
 * The photo is held by its agency, never by StatOz, so it registers as `reference`
 * with the image, the credit and the story kept as provenance.
 */
export async function importNewsPhoto(article: NewsArticle): Promise<string> {
  const image = article.image;
  if (!image || !isEspnImage(image.url)) throw new StudioError("This story has no photo to import.", 404);
  const extension = path.extname(new URL(image.url).pathname).toLowerCase() || ".jpg";
  const id = `espn-news-${article.id}`;

  const existing = (await listAssets()).find(a => a.id === id);
  if (existing && await assetPath(existing).then(() => true, () => false)) return id;

  const response = await fetch(image.url, { signal: AbortSignal.timeout(20000), headers: { "user-agent": "StatOz Designer (local studio)" } }).catch(() => null);
  if (!response?.ok) throw new StudioError("ESPN did not return the story's photo. Try again, or import it yourself.", 502);
  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim();
  const mime = Object.values(mimes).includes(type) ? type : mimes[extension];
  if (!mime) throw new StudioError("The story's photo is not a supported image type.", 415);
  const body = Buffer.from(await response.arrayBuffer());
  if (!body.length || body.length > 25 * 1024 * 1024) throw new StudioError("The story's photo could not be imported.", 502);
  const suffix = Object.entries(mimes).find(([, value]) => value === mime)![0];
  const target = location("assets", id, suffix);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body);
  const asset: Asset = {
    schemaVersion: 1, id, name: `ESPN news · ${article.headline.slice(0, 80)}`, file: path.relative(process.cwd(), target),
    mime, bytes: body.length,
    ...(image.width && image.height ? { width: image.width, height: image.height } : {}),
    source: `ESPN: ${image.url} · Photo: ${image.credit || "uncredited"} · Story: ${article.link || article.id}`,
    category: "news-photo",
    approval: "reference",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await atomicWrite(location("assets", id), asset);
  return id;
}
