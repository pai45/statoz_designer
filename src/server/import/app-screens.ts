/**
 * The curated app screens, sourced from the Pitch Duel (`card_game`) screenshot catalog.
 *
 * That checkout is READ ONLY and is never a runtime dependency: the import copies
 * each PNG into `storage/assets`, so the studio works without it afterwards. The
 * screens show illustrative product data, so they register as `reference` captures.
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { Asset } from "@/domain/project";
import { appScreens, type AppScreen } from "@/domain/app-screens";
import { atomicWrite, location, safeId } from "@/server/storage";
import { pngMetadata } from "@/server/runtime";

export const CATALOG = path.join("output", "screenshots", "statoz");

/** Screens with a catalog file; captures imported another way are left untouched. */
export const appScreenManifest = appScreens.filter((screen): screen is AppScreen & { file: string } => Boolean(screen.file));

export type ImportResult = { id: string; name: string; bytes: number; width: number; height: number };

async function readJson<T>(file: string): Promise<T | null> {
  return fs.readFile(file, "utf8").then(raw => JSON.parse(raw) as T).catch(() => null);
}

/** `009_games__games-hub__trending.png` → `games.games-hub.trending`. */
const catalogId = (file: string) => file.replace(/^\d+_/, "").replace(/\.png$/, "").split("__").join(".");

/**
 * Writes one app screen PNG into storage/assets under its stable id and registers it
 * as a `reference` product capture, keeping `createdAt` when refreshing in place.
 */
export async function registerAppScreen(bytes: Buffer, entry: AppScreen, source: (size: string) => string): Promise<ImportResult> {
  const { width, height, hasAlpha } = pngMetadata(bytes);
  const id = safeId(entry.id), target = location("assets", id, ".png");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
  const current = await readJson<Asset>(location("assets", id));
  const asset: Asset = {
    schemaVersion: 1, id, name: `StatOz Flutter · ${entry.name}`, file: path.relative(process.cwd(), target),
    mime: "image/png", bytes: bytes.length, width, height, hasAlpha, category: "product-capture",
    source: source(`${width}×${height}`), approval: "reference", createdAt: current?.createdAt ?? new Date().toISOString(),
  };
  await atomicWrite(location("assets", id), asset);
  return { id, name: asset.name, bytes: asset.bytes, width, height };
}

/** Copies one catalog screen into storage/assets and registers it. */
export async function importAppScreen(root: string, entry: AppScreen & { file: string }): Promise<ImportResult> {
  const bytes = await fs.readFile(path.join(root, CATALOG, entry.file));
  const today = new Date().toISOString().slice(0, 10);
  return registerAppScreen(bytes, entry, size => `card_game/${CATALOG.split(path.sep).join("/")}/${entry.file} · catalog ${catalogId(entry.file)} · Flutter repository capture · ${size} · imported ${today} · displayed names, scores and balances are illustrative product data.`);
}

/** Fails early with a readable message when the checkout is missing or wrong. */
export async function checkAppScreenSource(root: string) {
  const catalog = path.join(root, CATALOG);
  const reachable = await fs.stat(catalog).then(s => s.isDirectory()).catch(() => false);
  if (!reachable) throw new Error(`No screenshot catalog at ${catalog}. Pass the card_game folder with --from.`);
}
