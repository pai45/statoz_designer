/**
 * Imports the curated StatOz line-art set into the studio asset library.
 *
 *   npm run import:line-art -- --from "C:\path\to\statoz_web" [--dry-run]
 *
 * The statoz_web checkout is read only. Each drawing is copied into
 * `storage/assets` with its provenance, so the studio needs no checkout at
 * runtime. Ids are stable, so re-running refreshes in place and never duplicates.
 */
import path from "node:path";
import { initialize } from "../src/server/storage";
import { checkLineArtSource, importLineArt, lineArtManifest } from "../src/server/import/line-art";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const root = value("from") ?? process.env.STATOZ_WEB_DIR;
if (!root) {
  console.error('Pass the statoz_web folder: npm run import:line-art -- --from "C:\\...\\statoz_web"');
  process.exit(2);
}

const resolved = path.resolve(root);
await checkLineArtSource(resolved);
console.log(`Reading ${lineArtManifest.length} drawings from ${resolved}`);
if (flag("dry-run")) {
  for (const entry of lineArtManifest) console.log(`  ${entry.sport ?? "any sport"} · ${entry.name} (${entry.file})`);
  console.log("Dry run: nothing was written.");
  process.exit(0);
}

await initialize();
let written = 0, failed = 0;
for (const entry of lineArtManifest) {
  try {
    const result = await importLineArt(resolved, entry);
    const size = result.width ? `${result.width} × ${result.height}` : "scales to fit";
    console.log(`  ${result.name} · ${size}`);
    written++;
  } catch (error) {
    failed++;
    console.error(`  skipped ${entry.file}: ${(error as Error).message}`);
  }
}
console.log(`Imported ${written} drawings into the studio line-art library.`);
if (failed) console.log(`${failed} drawing(s) were skipped; see the messages above.`);
console.log("They are registered as brand assets. Pick one in an editor scene under Visual media.");
