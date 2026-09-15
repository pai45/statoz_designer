import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { formats, type Format } from "../src/domain/project";
import { createProject, templates } from "../src/features/templates/registry";
import { compositionHtml } from "../src/server/composition-html";
import { initialize } from "../src/server/storage";
import { launchBrowser } from "../src/server/runtime";
import { draw } from "../src/server/render";

await initialize();
const directory = path.resolve("test-results/media"); await fs.mkdir(directory, { recursive: true });
const browser = await launchBrowser();
const results: { template: string; format: string; warnings: string[]; image: string }[] = [];
let failures = 0;
try {
  for (const template of templates) for (const format of Object.keys(formats) as Format[]) {
    const project = createProject(template.id, format, "football", template.kind === "video" ? 8 : undefined);
    const html = await compositionHtml(project);
    const d = formats[format];
    const page = await browser.newPage({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: 1 });
    await page.route("**/*", route => route.abort());
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForFunction(() => typeof window.drawFrame === "function");
    await draw(page, 0);
    const warnings = await page.evaluate(() => window.overflowReport());
    const areas = await page.evaluate(() => {
      const copy = document.querySelector(".composition-copy")!.getBoundingClientRect(), art = document.querySelector(".composition-art")!.getBoundingClientRect(), footer = document.querySelector(".composition-footer")!.getBoundingClientRect();
      return { overlap: copy.bottom > art.top + 3 && copy.right > art.left + 3, footerOverlap: Math.max(copy.bottom, art.bottom) > footer.top + 3 };
    });
    if (areas.overlap) warnings.push("Copy overlaps art");
    if (areas.footerOverlap) warnings.push("Content overlaps footer");
    const image = `${template.id}-${format}.png`; await page.screenshot({ path: path.join(directory, image) });
    if (template.kind === "video") {
      for (const [name, time] of [["middle", 4], ["transition", 2.2], ["final", 8 - 1 / 30]] as const) {
        await draw(page, time); warnings.push(...await page.evaluate(() => window.overflowReport()));
        await page.screenshot({ path: path.join(directory, `${template.id}-${format}-${name}.png`) });
      }
      await draw(page, 4); const first = createHash("sha256").update(await page.screenshot()).digest("hex");
      await draw(page, 1); await draw(page, 4); const repeat = createHash("sha256").update(await page.screenshot()).digest("hex");
      if (first !== repeat) warnings.push("Seeking is not deterministic");
    }
    if (warnings.length) failures++;
    results.push({ template: template.id, format, warnings: [...new Set(warnings)], image });
    console.log(`${warnings.length ? "FAIL" : "PASS"} ${template.id} ${format}${warnings.length ? ": " + warnings.join("; ") : ""}`);
    await page.close();
  }
  const contact = await browser.newPage({ viewport: { width: 1600, height: 2400 }, deviceScaleFactor: 1 });
  const rows = await Promise.all(results.map(async r => `<div><img src="data:image/png;base64,${(await fs.readFile(path.join(directory, r.image))).toString("base64")}"><b>${r.template} · ${r.format}</b><small>${r.warnings.join("; ")}</small></div>`));
  await contact.setContent(`<html><body style="margin:0;padding:20px;background:#07101c;color:#adbed3;font:11px Arial"><main style="display:grid;grid-template-columns:repeat(8,1fr);gap:14px">${rows.map(r => r.replace("<div>", '<div style="height:350px;display:flex;flex-direction:column;gap:7px;align-items:center">').replace('<img ', '<img style="width:100%;height:310px;object-fit:contain" ')).join("")}</main></body></html>`);
  await contact.screenshot({ path: path.join(directory, "contact-sheet.png"), fullPage: true });
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(results, null, 2));
} finally { await browser.close(); }
console.log(`Media verification: ${results.length - failures}/${results.length} layouts passed. Artifacts: ${directory}`);
if (failures) process.exitCode = 1;
