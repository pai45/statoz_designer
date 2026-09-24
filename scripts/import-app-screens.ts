/**
 * Imports the curated StatOz app screens into the studio asset library.
 *
 *   npm run import:app-screens -- --from "C:\path\to\card_game" [--dry-run]
 *
 * The card_game checkout is read only. Each screen is copied into `storage/assets`
 * with its provenance, so the studio needs no checkout at runtime. Ids are stable,
 * so re-running refreshes in place and never duplicates.
 */
import path from "node:path";
import { initialize } from "../src/server/storage";
import { appScreenManifest, checkAppScreenSource, importAppScreen } from "../src/server/import/app-screens";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const root = value("from") ?? process.env.CARD_GAME_DIR;
if (!root) {
  console.error('Pass the card_game folder: npm run import:app-screens -- --from "C:\\...\\card_game"');
  process.exit(2);
}

const resolved = path.resolve(root);
await checkAppScreenSource(resolved);
console.log(`Reading ${appScreenManifest.length} screens from ${resolved}`);
if (flag("dry-run")) {
  for (const entry of appScreenManifest) console.log(`  ${entry.group} · ${entry.name} (${entry.file})`);
  console.log("Dry run: nothing was written.");
  process.exit(0);
}

await initialize();
let written = 0, failed = 0;
for (const entry of appScreenManifest) {
  try {
    const result = await importAppScreen(resolved, entry);
    console.log(`  ${result.name} · ${result.width} × ${result.height}`);
    written++;
  } catch (error) {
    failed++;
    console.error(`  skipped ${entry.file}: ${(error as Error).message}`);
  }
}
console.log(`Imported ${written} app screens into the studio library.`);
if (failed) console.log(`${failed} screen(s) were skipped; see the messages above.`);
console.log("They are registered as reference product captures. Pick one in an App showcase page under Phone capture.");
