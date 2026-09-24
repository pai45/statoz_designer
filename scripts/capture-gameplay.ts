/**
 * Captures live gameplay for each StatOz game from the unchanged card_game web build.
 *
 *   npm run capture:gameplay -- --from "C:\path\to\card_game" [--only pitch-duel,hoop-duel] [--dry-run]
 *
 * The card_game checkout is read only: its existing `build/web` is served as it is and
 * never rebuilt or written. Each game runs in a fresh browser profile that goes through
 * the app's local preview onboarding, so storage changes stay in that throwaway browser.
 * Frames land in `output/app-gameplay` and register as `reference` product captures
 * under stable ids, so re-running refreshes in place and never duplicates.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { appScreenFor } from "../src/domain/app-screens";
import { initialize } from "../src/server/storage";
import { launchBrowser } from "../src/server/runtime";
import { registerAppScreen } from "../src/server/import/app-screens";
import { buildFingerprint, checkGameplaySource, onboard, openApp, runRecipe, serveBuild, unlockAll } from "../src/server/capture/gameplay";
import { gameplayRecipes } from "../src/server/capture/gameplay-recipes";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const root = value("from") ?? process.env.CARD_GAME_DIR;
if (!root) {
  console.error('Pass the card_game folder: npm run capture:gameplay -- --from "C:\\...\\card_game"');
  process.exit(2);
}

const resolved = path.resolve(root);
await checkGameplaySource(resolved);
const only = value("only")?.split(",").map(game => game.trim()).filter(Boolean);
const unknown = only?.filter(game => !gameplayRecipes.some(recipe => recipe.game === game)) ?? [];
if (unknown.length) {
  console.error(`Unknown game(s): ${unknown.join(", ")}. Choose from ${gameplayRecipes.map(recipe => recipe.game).join(", ")}.`);
  process.exit(2);
}
const recipes = gameplayRecipes.filter(recipe => !only || only.includes(recipe.game));
for (const recipe of recipes) for (const step of recipe.steps)
  if ("capture" in step && !appScreenFor(step.capture)) throw new Error(`${recipe.name} captures ${step.capture}, which is not in src/domain/app-screens.ts.`);

const fingerprint = await buildFingerprint(resolved);
console.log(`Driving ${recipes.length} game(s) in ${path.join(resolved, "build", "web")} (${fingerprint})`);
if (flag("dry-run")) {
  for (const recipe of recipes) console.log(`  ${recipe.name}: ${recipe.steps.filter(step => "capture" in step).map(step => "capture" in step && step.capture).join(", ")}`);
  console.log("Dry run: nothing was written.");
  process.exit(0);
}

await initialize();
const outDir = path.resolve("output", "app-gameplay");
await fs.mkdir(outDir, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const server = await serveBuild(resolved);
const browser = await launchBrowser();
const failures: string[] = [];
let written = 0;
try {
  for (const recipe of recipes) {
    const page = await openApp(browser, resolved, server.url);
    try {
      await onboard(page);
      await unlockAll(page);
      await runRecipe(page, recipe, async (assetId, png) => {
        const entry = appScreenFor(assetId)!;
        await fs.writeFile(path.join(outDir, `${assetId}.png`), png);
        const result = await registerAppScreen(png, entry, size =>
          `card_game/build/web (unchanged ${fingerprint}) · ${entry.name} · driven by scripts/capture-gameplay.ts · ${size} · captured ${today} · names, scores, athletes and balances are illustrative product data.`);
        console.log(`  ${result.name} · ${result.width} × ${result.height}`);
        written++;
      });
    } catch (error) {
      failures.push(recipe.name);
      await page.screenshot({ path: path.join(outDir, `failed-${recipe.game}.png`) }).catch(() => undefined);
      console.error(`  ${recipe.name} stopped: ${(error as Error).message} (frame saved as failed-${recipe.game}.png)`);
    } finally {
      await page.context().close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`Captured ${written} screen(s) into the studio library. Frames are in ${outDir}.`);
if (failures.length) {
  console.log(`Could not reach play in: ${failures.join(", ")}. Re-run them with --only.`);
  process.exit(1);
}
console.log("They are registered as reference product captures. Pick one in an App showcase page under Phone capture.");
