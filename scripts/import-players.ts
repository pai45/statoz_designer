/**
 * Imports the Pitch Duel (card_game) roster into the studio player library.
 *
 *   npm run import:players -- --from "C:\path\to\card_game" [--dry-run] [--no-portraits]
 *
 * The card_game checkout is read only. Players and portraits are copied into
 * `storage/players` and `storage/assets`, so the studio needs no checkout at runtime.
 * Re-running refreshes in place: ids are derived from the source card ids.
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { Asset } from "../src/domain/project";
import type { Player } from "../src/domain/player";
import { playerSchema } from "../src/domain/player";
import { atomicWrite, initialize, location, safeId } from "../src/server/storage";
import { readPitchDuelRoster, type ImportedPlayer } from "../src/server/import/pitch-duel";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const root = value("from") ?? process.env.CARD_GAME_DIR;
const dryRun = flag("dry-run"), skipPortraits = flag("no-portraits");
if (!root) {
  console.error('Pass the card_game folder: npm run import:players -- --from "C:\\...\\card_game"');
  process.exit(2);
}
const mimes: Record<string, string> = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const key = (value: string) => safeId(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "item");
const trim = (value: string, max = 60) => value.slice(0, max);
const SOURCE = "Pitch Duel card roster (card_game). Real athletes; imported as product reference.";

async function existing<T>(file: string): Promise<T | null> {
  return fs.readFile(file, "utf8").then(raw => JSON.parse(raw) as T).catch(() => null);
}

/** Copies one portrait into storage/assets and registers it. Returns the asset id. */
async function importPortrait(player: ImportedPlayer): Promise<string> {
  const extension = path.extname(player.portraitFile!).toLowerCase();
  const mime = mimes[extension];
  if (!mime) throw new Error(`Unsupported portrait type: ${player.portraitFile}`);
  const assetId = key(`pitch-duel-${player.sourceSport}-${player.sourceId}`);
  const target = location("assets", assetId, extension);
  const stat = await fs.stat(player.portraitFile!);
  const current = await existing<Asset>(location("assets", assetId));
  if (!current || current.bytes !== stat.size || !(await fs.stat(target).then(() => true).catch(() => false))) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(player.portraitFile!, target);
  }
  const asset: Asset = {
    schemaVersion: 1, id: assetId, name: `${player.name} · portrait`, file: path.relative(process.cwd(), target),
    mime, bytes: stat.size, source: `${SOURCE} ${player.portraitRelative}`,
    approval: current?.approval ?? "reference", createdAt: current?.createdAt ?? new Date().toISOString(),
  };
  await atomicWrite(location("assets", assetId), asset);
  return assetId;
}

const roster = await readPitchDuelRoster(path.resolve(root));
const withArt = roster.filter(p => p.portraitFile).length;
const bySport = roster.reduce<Record<string, number>>((m, p) => ((m[p.sport] = (m[p.sport] ?? 0) + 1), m), {});
console.log(`Found ${roster.length} players in ${path.resolve(root)}`);
console.log(`  by sport: ${Object.entries(bySport).map(([s, n]) => `${s} ${n}`).join(", ")}`);
console.log(`  portraits on disk: ${withArt}${skipPortraits ? " (skipped by --no-portraits)" : ""}`);
if (dryRun) { console.log("Dry run: nothing was written."); process.exit(0); }

await initialize();
let written = 0, portraits = 0, failed = 0;
for (const player of roster) {
  const id = key(`pitch-duel-${player.sourceSport}-${player.sourceId}`);
  try {
    const portraitAssetId = !skipPortraits && player.portraitFile ? await importPortrait(player) : "";
    if (portraitAssetId) portraits++;
    const file = location("players", id);
    const current = await existing<Player>(file);
    const record = playerSchema.parse({
      schemaVersion: 1, id,
      name: trim(player.name), position: trim(player.position), club: trim(player.club), nation: trim(player.nation),
      sport: player.sport, rating: player.rating, metrics: player.metrics,
      portraitAssetId: portraitAssetId || (skipPortraits ? current?.portraitAssetId ?? "" : ""),
      source: `${SOURCE} ${player.sourceSport}/${player.sourceId}`, sample: false,
      createdAt: current?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(),
    } satisfies Player);
    await atomicWrite(file, record);
    written++;
  } catch (error) {
    failed++;
    console.error(`  skipped ${player.sourceSport}/${player.sourceId}: ${(error as Error).message}`);
  }
}
console.log(`Imported ${written} players and ${portraits} portraits into the studio library.`);
if (failed) console.log(`${failed} record(s) were skipped; see the messages above.`);
console.log("Portraits are marked product reference. Record campaign approval per asset in Assets & brand.");
