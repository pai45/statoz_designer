/**
 * The curated line-art set, sourced from the StatOz web app (`statoz_web`).
 *
 * That checkout is READ ONLY and is never a runtime dependency: the import copies
 * each drawing into `storage/assets`, so the studio works without it afterwards.
 * Every piece is StatOz's own artwork, so it registers as a brand asset.
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { Asset, Sport } from "@/domain/project";
import { atomicWrite, location, safeId } from "@/server/storage";
import { svgDimensions } from "@/server/runtime";

export type LineArtEntry = {
  /** Path inside the statoz_web checkout, below `public/assets`. */
  file: string;
  /** Stable asset id, so re-running refreshes in place instead of duplicating. */
  id: string;
  name: string;
  /** Omitted where the drawing suits any sport. */
  sport?: Sport;
};

export const SOURCE = "statoz_web";

/**
 * Drawings large and simple enough to carry a whole composition. The 20px UI
 * glyphs (coin, streak, match, pick) and the ad-space wireframes are left out on
 * purpose — they are interface furniture, not artwork.
 */
export const lineArtManifest: LineArtEntry[] = [
  { file: "games/pitch-duel.svg", id: "line-art-tactics-board", name: "Tactics board with a passing route", sport: "football" },
  { file: "games/penalty-shootout.svg", id: "line-art-goal-and-target", name: "Goal, target, and ball", sport: "football" },
  { file: "games/football-chess.svg", id: "line-art-duel-board", name: "Five-by-five board mid-duel", sport: "football" },
  { file: "games/final-over.svg", id: "line-art-cricket-strip", name: "Cricket strip with stumps and a ball in flight", sport: "cricket" },
  { file: "games/hoop-duel.svg", id: "line-art-street-court", name: "Street basketball court in perspective", sport: "basketball" },
  { file: "games/tennis-rally.svg", id: "line-art-tennis-court", name: "Tennis court in perspective", sport: "tennis" },
  { file: "games/grand-prix-dash.svg", id: "line-art-racing-line", name: "Circuit telemetry with a car on the racing line", sport: "motorsport" },
  { file: "games/guess-driver.svg", id: "line-art-driver-helmet", name: "Redacted driver helmet", sport: "motorsport" },
  { file: "motorsport/monza-circuit.svg", id: "line-art-monza-circuit", name: "Monza circuit map", sport: "motorsport" },
  { file: "games/guess-player.svg", id: "line-art-player-silhouette", name: "Redacted player silhouette" },
  { file: "games/guess-winner.svg", id: "line-art-trophy", name: "Redacted trophy" },
  { file: "games/quiz.svg", id: "line-art-answer-tiles", name: "Four answer options with one chosen" },
  { file: "games/bingo.svg", id: "line-art-bingo-card", name: "Bingo card with a winning line daubed" },
];

export type ImportResult = { id: string; name: string; bytes: number; width?: number; height?: number };

async function readJson<T>(file: string): Promise<T | null> {
  return fs.readFile(file, "utf8").then(raw => JSON.parse(raw) as T).catch(() => null);
}

/** Copies one drawing into storage/assets and registers it. */
export async function importLineArt(root: string, entry: LineArtEntry): Promise<ImportResult> {
  const source = path.join(root, "public", "assets", entry.file);
  const markup = await fs.readFile(source, "utf8");
  const id = safeId(entry.id), target = location("assets", id, ".svg");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, markup, "utf8");
  const current = await readJson<Asset>(location("assets", id));
  const asset: Asset = {
    schemaVersion: 1, id, name: entry.name, file: path.relative(process.cwd(), target),
    mime: "image/svg+xml", bytes: Buffer.byteLength(markup), ...svgDimensions(markup),
    category: "line-art", ...(entry.sport ? { sport: entry.sport } : {}),
    source: `${SOURCE}: public/assets/${entry.file}`,
    approval: "brand", createdAt: current?.createdAt ?? new Date().toISOString(),
  };
  await atomicWrite(location("assets", id), asset);
  return { id, name: entry.name, bytes: asset.bytes, width: asset.width, height: asset.height };
}

/** Fails early with a readable message when the checkout is missing or wrong. */
export async function checkLineArtSource(root: string) {
  const games = path.join(root, "public", "assets", "games");
  const reachable = await fs.stat(games).then(s => s.isDirectory()).catch(() => false);
  if (!reachable) throw new Error(`No line art at ${games}. Pass the statoz_web folder with --from.`);
}
