import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { formats, sports, type Sport } from "../src/domain/project";
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
// Card templates render twice: the house card, and one linked to a player library entry
// whose position, club and nation print on the card.
const linkedPlayer = { playerId: "sample-ari-vance", position: "ATTACKING MIDFIELDER", club: "HARBOUR UNITED", nation: "ATLANTIA" };
// Tutorial templates render once per sport, since each sport draws its own board.
const variantsFor = (visual: string) => visual === "card" ? ["", "player"] : visual === "match" ? ["", "crests"] : visual === "tutorial" ? Object.keys(sports) : [""];
try {
  for (const template of templates) for (const format of template.formats) for (const variant of variantsFor(template.visual)) {
    const name = `${template.id}${variant ? `-${variant}` : ""}`;
    const sport = variant in sports ? variant as Sport : "football";
    const project = createProject(template.id, format, sport, template.kind === "video" ? 8 : undefined);
    if (variant === "player") for (const page of project.pages) { page.playerCard = { ...linkedPlayer }; page.nameA = "ARI VANCE"; }
    if (template.visual === "match") for (const scene of project.pages) {
      scene.nameA = "NORTHERN ATHLETIC CLUB"; scene.nameB = "SOUTHERN CITY UNITED";
      if (variant === "crests") {
        scene.emblemA = "statoz-logo"; scene.emblemB = "statoz-logo";
        scene.statLabel = "POSSESSION"; scene.statValue = "60.9 — 39.1"; scene.chartValues = [61, 39];
        if (template.id === "match-result") { scene.scoreA = "234/7"; scene.scoreB = "229"; }
      } else {
        scene.statLabel = "MATCH RATING"; scene.statValue = "78"; scene.chartValues = [78, 22];
        if (template.id === "match-result") { scene.scoreA = "128"; scene.scoreB = "121"; }
      }
    }
    const html = await compositionHtml(project);
    const d = formats[format];
    const page = await browser.newPage({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: 1 });
    await page.route("**/*", route => route.abort());
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForFunction(() => typeof window.drawFrame === "function");
    await draw(page, 0);
    const warnings = await page.evaluate(() => window.overflowReport());
    const areas = await page.evaluate(() => {
      const copy = document.querySelector(".composition-copy")?.getBoundingClientRect(), art = document.querySelector(".composition-art")?.getBoundingClientRect(), footer = document.querySelector(".composition-footer")?.getBoundingClientRect();
      if (!copy || !art || !footer) return { overlap: false, footerOverlap: false };
      return { overlap: copy.bottom > art.top + 3 && copy.right > art.left + 3, footerOverlap: Math.max(copy.bottom, art.bottom) > footer.top + 3 };
    });
    if (areas.overlap) warnings.push("Copy overlaps art");
    if (areas.footerOverlap) warnings.push("Content overlaps footer");
    if (template.visual === "match") {
      const match = await page.evaluate(() => ({
        stat: !!document.querySelector(".match-stat"), paired: !!document.querySelector(".match-stat.is-paired"),
        crests: document.querySelectorAll(".team-emblem.has-crest img").length,
        initials: document.querySelectorAll(".team-emblem.is-fallback span").length,
        transparent: [...document.querySelectorAll<HTMLElement>(".team-emblem")].every(element => getComputedStyle(element).backgroundColor === "rgba(0, 0, 0, 0)"),
      }));
      if (!match.stat) warnings.push("Featured match stat is missing");
      if (!match.transparent) warnings.push("Team crest container is not transparent");
      if (variant === "crests" && (match.crests !== 2 || !match.paired)) warnings.push("Crest or paired-stat treatment is missing");
      if (!variant && (match.initials !== 2 || match.paired)) warnings.push("Initials or single-stat fallback is missing");
    }
    const image = `${name}-${format}.png`; await page.screenshot({ path: path.join(directory, image) });
    if (template.visual === "pitch") {
      const cover = createHash("sha256").update(await page.screenshot()).digest("hex");
      for (let slide = 0; slide < project.pages.length; slide++) {
        await draw(page, 0, slide);
        warnings.push(...await page.evaluate(() => window.overflowReport()));
        await page.screenshot({ path: path.join(directory, `${name}-${format}-slide-${String(slide + 1).padStart(2, "0")}.png`) });
      }
      await draw(page, 0, 0);
      const repeatedCover = createHash("sha256").update(await page.screenshot()).digest("hex");
      if (cover !== repeatedCover) warnings.push("Pitch slide redraw is not deterministic");
    }
    if (template.kind === "video") {
      for (const [frame, time] of [["middle", 4], ["transition", 2.2], ["final", 8 - 1 / 30]] as const) {
        await draw(page, time); warnings.push(...await page.evaluate(() => window.overflowReport()));
        await page.screenshot({ path: path.join(directory, `${name}-${format}-${frame}.png`) });
      }
      await draw(page, 4); const first = createHash("sha256").update(await page.screenshot()).digest("hex");
      await draw(page, 1); await draw(page, 4); const repeat = createHash("sha256").update(await page.screenshot()).digest("hex");
      if (first !== repeat) warnings.push("Seeking is not deterministic");
    }
    if (warnings.length) failures++;
    results.push({ template: name, format, warnings: [...new Set(warnings)], image });
    console.log(`${warnings.length ? "FAIL" : "PASS"} ${name} ${format}${warnings.length ? ": " + warnings.join("; ") : ""}`);
    await page.close();
  }
  const investorStress = createProject("investor-pitch", "landscape");
  investorStress.pages = [0, 2, 1, 4, 5, 3, 7, 8, 10, 11].map(index => investorStress.pages[index]);
  const stressSlide = investorStress.pages[1];
  stressSlide.headline = "What we know, what we do not, and what this round must prove";
  stressSlide.body = "The product systems exist, but repeat behavior and paid conversion still need measured cohorts. This round funds instrumentation and controlled acquisition tests.";
  stressSlide.assetId = "";
  stressSlide.presentation = {
    layout: "statement", visual: "none", evidenceStatus: "input-needed",
    bullets: ["KNOWN / The playable product spans five sports", "KNOWN / Progression, cards and the coin economy exist", "UNKNOWN / Cohort retention has not been supplied", "UNKNOWN / Paid conversion has not been supplied", "TEST / Instrument the complete player funnel", "TEST / Measure repeat play before scaling acquisition"],
    metrics: [], sourceNote: "Founder input required: measured retention, acquisition and conversion cohorts have not been supplied.",
  };
  const stressHtml = await compositionHtml(investorStress);
  const stressPage = await browser.newPage({ viewport: { width: formats.landscape.width, height: formats.landscape.height }, deviceScaleFactor: 1 });
  await stressPage.route("**/*", route => route.abort()); await stressPage.setContent(stressHtml, { waitUntil: "load" }); await stressPage.waitForFunction(() => typeof window.drawFrame === "function");
  const stressWarnings: string[] = [];
  for (let slide = 0; slide < investorStress.pages.length; slide++) { await draw(stressPage, 0, slide); stressWarnings.push(...await stressPage.evaluate(() => window.overflowReport())); }
  await draw(stressPage, 0, 1);
  const stressImage = "investor-pitch-restructured-landscape.png"; await stressPage.screenshot({ path: path.join(directory, stressImage) });
  if (stressWarnings.length) failures++;
  results.push({ template: "investor-pitch-restructured", format: "landscape", warnings: [...new Set(stressWarnings)], image: stressImage });
  console.log(`${stressWarnings.length ? "FAIL" : "PASS"} investor-pitch-restructured landscape${stressWarnings.length ? ": " + stressWarnings.join("; ") : ""}`);
  await stressPage.close();
  const contact = await browser.newPage({ viewport: { width: 1600, height: 2400 }, deviceScaleFactor: 1 });
  const rows = await Promise.all(results.map(async r => `<div><img src="data:image/png;base64,${(await fs.readFile(path.join(directory, r.image))).toString("base64")}"><b>${r.template} · ${r.format}</b><small>${r.warnings.join("; ")}</small></div>`));
  await contact.setContent(`<html><body style="margin:0;padding:20px;background:#07101c;color:#adbed3;font:11px Arial"><main style="display:grid;grid-template-columns:repeat(8,1fr);gap:14px">${rows.map(r => r.replace("<div>", '<div style="height:350px;display:flex;flex-direction:column;gap:7px;align-items:center">').replace('<img ', '<img style="width:100%;height:310px;object-fit:contain" ')).join("")}</main></body></html>`);
  await contact.screenshot({ path: path.join(directory, "contact-sheet.png"), fullPage: true });
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(results, null, 2));
} finally { await browser.close(); }
console.log(`Media verification: ${results.length - failures}/${results.length} layouts passed. Artifacts: ${directory}`);
if (failures) process.exitCode = 1;
