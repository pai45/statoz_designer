/**
 * Proves a line-art backdrop survives the export path, not just the preview.
 *
 *   npm run test:line-art
 *
 * The page is rendered with every network request aborted, so anything that
 * paints must have been inlined as a data URI and allowed by the export CSP —
 * which is the part an on-screen preview cannot demonstrate.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { formats, isLineArt, type Format } from "../src/domain/project";
import { createProject } from "../src/features/templates/registry";
import { compositionHtml } from "../src/server/composition-html";
import { initialize, listAssets } from "../src/server/storage";
import { launchBrowser } from "../src/server/runtime";
import { draw } from "../src/server/render";

await initialize();
const library = (await listAssets()).filter(isLineArt);
if (!library.length) {
  console.error('No line art found. Run: npm run import:line-art -- --from "C:\\...\\statoz_web"');
  process.exit(2);
}
console.log(`Line-art library: ${library.length} drawing(s).`);

const directory = path.resolve("test-results/line-art");
await fs.mkdir(directory, { recursive: true });
const browser = await launchBrowser();
let failures = 0;
try {
  for (const art of library) {
    const format: Format = "portrait";
    const project = createProject("feature-spotlight", format, art.sport ?? "football");
    for (const page of project.pages) { page.assetId = art.id; page.crop = "contain"; }
    const html = await compositionHtml(project);
    if (!html.includes("data:image/svg+xml;base64,")) {
      console.error(`  ${art.name}: not inlined as an SVG data URI`);
      failures++; continue;
    }
    const d = formats[format];
    const page = await browser.newPage({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: 1 });
    // Nothing may load over the network: whatever paints is already embedded.
    await page.route("**/*", route => route.abort());
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForFunction(() => typeof window.drawFrame === "function");
    await draw(page, 0);
    // naturalWidth is 0 when a browser refuses or fails to decode an image.
    const painted = await page.evaluate(() => {
      const img = document.querySelector(".feature-art img") as HTMLImageElement | null;
      return img ? { found: true, decoded: img.naturalWidth > 0, w: img.naturalWidth, h: img.naturalHeight } : { found: false, decoded: false, w: 0, h: 0 };
    });
    const file = `${art.id}.png`;
    await page.screenshot({ path: path.join(directory, file) });
    await page.close();
    if (!painted.found || !painted.decoded) {
      console.error(`  ${art.name}: ${painted.found ? "image did not decode" : "no <img> in the art slot"}`);
      failures++;
    } else {
      console.log(`  ${art.name} · decoded ${painted.w} × ${painted.h} · ${file}`);
    }
  }
} finally { await browser.close(); }

console.log(`\nWrote ${library.length - failures} render(s) to ${directory}`);
if (failures) { console.error(`${failures} drawing(s) failed to render in the export path.`); process.exit(1); }
console.log("Every drawing inlined and decoded with the network disabled.");
