import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { formats, launchGames, sports, type LaunchGame, type Sport } from "../src/domain/project";
import { createProject, templates } from "../src/features/templates/registry";
import { compositionHtml } from "../src/server/composition-html";
import { initialize } from "../src/server/storage";
import { launchBrowser } from "../src/server/runtime";
import { draw } from "../src/server/render";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

await initialize();
const directory = path.resolve("test-results/media"); await fs.mkdir(directory, { recursive: true });
const browser = await launchBrowser();
const results: { template: string; format: string; warnings: string[]; image: string }[] = [];
let failures = 0;
// Card templates render twice: the house card, and one linked to a player library entry
// whose position, club and nation print on the card.
const linkedPlayer = { playerId: "sample-ari-vance", position: "ATTACKING MIDFIELDER", club: "HARBOUR UNITED", nation: "ATLANTIA" };
// Tutorial templates render once per sport, since each sport draws its own board,
// launch templates once per game, since each game draws its own gameplay art, and
// news flashes once per layout.
const variantsFor = (visual: string) => visual === "card" ? ["", "player"] : visual === "match" ? ["", "crests"] : visual === "tutorial" || visual === "match-story" ? Object.keys(sports) : visual === "launch" ? Object.keys(launchGames) : visual === "news" ? ["", "split", "centered"] : [""];
try {
  for (const template of templates) for (const format of template.formats) for (const variant of variantsFor(template.visual)) {
    const name = `${template.id}${variant ? `-${variant}` : ""}`;
    const game = variant in launchGames ? variant as LaunchGame : undefined;
    const sport = variant in sports ? variant as Sport : game ? launchGames[game].sport : "football";
    const project = createProject(template.id, format, sport, template.kind === "video" ? 8 : undefined);
    if (game) for (const page of project.pages) page.game = game;
    // News flash renders each layout: full-bleed, framed and centred.
    if (template.visual === "news" && (variant === "split" || variant === "centered")) for (const page of project.pages) page.layout = variant;
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
      if (template.visual === "match-story") {
        // Every beat mid-animation and settled; the stats beat must settle with every row (five stats, or a race's classification).
        let start = 0;
        for (const [beat, scene] of project.pages.entries()) {
          for (const [frame, time] of [["mid", start + scene.duration * .35], ["settled", start + scene.duration - 2 / 30]] as const) {
            await draw(page, time); warnings.push(...await page.evaluate(() => window.overflowReport()));
            if (frame === "settled") {
              const rows = await page.evaluate(() => document.querySelectorAll(".ms-row").length);
              if (beat === 1 && rows !== scene.matchStats.length) warnings.push(`Stats beat settled with ${rows} of ${scene.matchStats.length} rows`);
            }
            await page.screenshot({ path: path.join(directory, `${name}-${format}-beat${beat + 1}-${frame}.png`) });
          }
          start += scene.duration;
        }
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
  const stackProject = createProject("investor-pitch", "landscape");
  const stackSlide = stackProject.pages[3];
  stackSlide.headline = "One sports universe.\nMultiple daily loops.";
  stackSlide.body = "Short games connect through shared coins, XP, cards and ranks.";
  stackSlide.assetId = "";
  stackSlide.presentation = { layout: "solution-stack", visual: "none", evidenceStatus: "repo-backed", metrics: [],
    bullets: ["DISCOVER / Find a fixture or challenge", "PLAY / Choose a short sports game", "EARN / Gain coins and XP", "BUILD / Collect cards and build decks", "COMPETE / Climb ranks and return for the next challenge"],
    sourceNote: "Illustrative player journey; retention outcomes remain unvalidated." };
  const stackPage = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await stackPage.route("**/*", route => route.abort());
  await stackPage.setContent(await compositionHtml(stackProject, 3), { waitUntil: "load" });
  await stackPage.evaluate(() => window.ready);
  assert.equal(await stackPage.locator(".solution-plate").count(), 5);
  assert.deepEqual(await stackPage.evaluate(() => window.overflowReport()), []);
  const stackImage = "investor-pitch-solution-stack-landscape.png";
  const stackFrame = await stackPage.screenshot({ path: path.join(directory, stackImage) });
  await draw(stackPage, 0, 0); await draw(stackPage, 50, 3);
  assert.deepEqual(await stackPage.screenshot(), stackFrame, "Stack rendering must be deterministic");
  // Exercise the same message bridge used by editable preview fields.
  const updateStack = async (bullets: string[]) => {
    stackSlide.presentation!.bullets = bullets;
    await stackPage.evaluate(project => new Promise<void>(resolve => {
      const controller = new AbortController();
      window.addEventListener("message", event => {
        if (event.data?.type !== "studio:drawn") return;
        controller.abort(); resolve();
      }, { signal: controller.signal });
      window.postMessage({ type: "studio:frame", project, time: 0, pageIndex: 3 }, "*");
    }), stackProject);
  };
  await updateStack(["EDITED", "", "DETAIL / One / two"]);
  assert.equal(await stackPage.locator(".solution-plate").count(), 2);
  assert.equal(await stackPage.locator(".solution-stack-labels strong").first().textContent(), "EDITED");
  assert.equal(await stackPage.locator(".solution-stack-labels p").count(), 1);
  assert.equal(await stackPage.locator(".solution-stack-labels p").textContent(), "One / two");
  await updateStack(Array.from({ length: 6 }, (_, index) => `STEP ${index + 1} / A supporting description for this layer`));
  assert.equal(await stackPage.locator(".solution-plate").count(), 6);
  assert.deepEqual(await stackPage.evaluate(() => window.overflowReport()), []);
  const labelBounds = await stackPage.locator(".solution-stack-labels li").evaluateAll(rows => rows.map(row => ({ top: row.getBoundingClientRect().top, bottom: row.getBoundingClientRect().bottom })));
  assert.ok(labelBounds.every((row, index) => index === 0 || labelBounds[index - 1].bottom <= row.top), "Stack labels must not overlap");
  await updateStack(["A deliberately overlong label that must be reported instead of overlapping adjacent content / Supporting detail"]);
  assert.ok((await stackPage.evaluate(() => window.overflowReport())).length > 0, "Overlong labels must warn the editor");
  await updateStack([]);
  assert.equal(await stackPage.locator(".solution-plate").count(), 0);
  assert.deepEqual(await stackPage.evaluate(() => window.overflowReport()), []);
  results.push({ template: "investor-pitch-solution-stack", format: "landscape", warnings: [], image: stackImage });
  console.log("PASS investor-pitch-solution-stack landscape, editable labels, missing descriptions, six layers, overflow warning and deterministic redraw");
  await stackPage.close();

  const marketProject = createProject("investor-pitch", "landscape");
  const marketSlide = marketProject.pages[1];
  marketSlide.headline = "India's game market\nreset to free-to-play";
  marketSlide.body = "India banned real-money games in August 2025. The market that remained still grew 17%, led by in-app purchases and ads.";
  marketSlide.presentation = { layout: "market", visual: "none", evidenceStatus: "source-backed", sourceNote: "Sources: example market report.",
    bullets: ["ONLINE GAMING ACT 2025 / Money games banned; e-sports and social games recognised", "STATOZ MODEL / Free-to-play with in-app purchases and ads"],
    metrics: [{ value: "555M", label: "Gamers in India", detail: "CY2025" }, { value: "25%", label: "Payer conversion", detail: "Held steady" },
      { value: "$15", label: "Mid-core ARPPU", detail: "vs $3 for casual games" }, { value: "$3.2B", label: "Games market, CY2030", detail: "Up from $1.5B in CY2025" }] };
  const marketPage = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await marketPage.route("**/*", route => route.abort());
  await marketPage.setContent(await compositionHtml(marketProject, 1), { waitUntil: "load" });
  await marketPage.evaluate(() => window.ready);
  assert.equal(await marketPage.locator(".market-bubble").count(), 3);
  assert.equal(await marketPage.locator(".market-bar").count(), 1, "The bar draws when the detail states a smaller starting amount");
  assert.deepEqual(await marketPage.evaluate(() => window.overflowReport()), []);
  const marketImage = "investor-pitch-market-landscape.png";
  const marketFrame = await marketPage.screenshot({ path: path.join(directory, marketImage) });
  await draw(marketPage, 0, 1);
  assert.deepEqual(await marketPage.screenshot(), marketFrame, "Market rendering must be deterministic");
  results.push({ template: "investor-pitch-market", format: "landscape", warnings: [], image: marketImage });
  console.log("PASS investor-pitch-market landscape, three bubbles, growth bar, no overflow and deterministic redraw");
  await marketPage.close();

  const coverProject = createProject("investor-pitch", "landscape");
  const coverSlide = coverProject.pages[0];
  coverSlide.headline = "Free-to-play sports\ngames for India";
  coverSlide.body = "Short games across five sports, connected by one progression system. No real-money wagering.";
  coverSlide.presentation = { ...coverSlide.presentation!, layout: "cover-frame" };
  const coverPage = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await coverPage.route("**/*", route => route.abort());
  await coverPage.setContent(await compositionHtml(coverProject, 0), { waitUntil: "load" });
  await coverPage.evaluate(() => window.ready);
  assert.equal(await coverPage.locator(".cover-frame-art").count(), 1);
  assert.equal(await coverPage.locator(".cover-frame-lockup img").count(), 1, "The cover carries the large logo lockup");
  assert.equal(await coverPage.locator(".pitch-evidence").count(), 0, "Covers carry no evidence chip");
  assert.deepEqual(await coverPage.evaluate(() => window.overflowReport()), []);
  const coverImage = "investor-pitch-cover-frame-landscape.png";
  await coverPage.screenshot({ path: path.join(directory, coverImage) });
  results.push({ template: "investor-pitch-cover-frame", format: "landscape", warnings: [], image: coverImage });
  console.log("PASS investor-pitch-cover-frame landscape, frame art, logo lockup, no evidence chip, no overflow");
  await coverPage.close();

  const fundsProject = createProject("investor-pitch", "landscape");
  const fundsSlide = fundsProject.pages[11];
  fundsSlide.headline = "Where the ₹1 Cr\nseed round goes";
  fundsSlide.body = "Seed equity for a 12-month runway, weighted toward reaching players.";
  fundsSlide.presentation = { ...fundsSlide.presentation!, layout: "funds", bullets: [],
    metrics: [{ value: "68%", label: "Marketing", detail: "₹68 L" }, { value: "32%", label: "Tech & product", detail: "₹32 L" },
      { value: "₹1 Cr", label: "Seed raise", detail: "" }, { value: "12 mo", label: "Runway", detail: "" }] };
  const fundsPage = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await fundsPage.route("**/*", route => route.abort());
  await fundsPage.setContent(await compositionHtml(fundsProject, 11), { waitUntil: "load" });
  await fundsPage.evaluate(() => window.ready);
  assert.deepEqual(await fundsPage.evaluate(() => [...document.querySelectorAll(".funds-group")].map(group => group.querySelectorAll("b").length)), [34, 16], "One tile is 2% of the round");
  assert.equal(await fundsPage.locator(".funds-terms > div").count(), 2);
  assert.deepEqual(await fundsPage.evaluate(() => window.overflowReport()), []);
  const fundsImage = "investor-pitch-funds-landscape.png";
  await fundsPage.screenshot({ path: path.join(directory, fundsImage) });
  results.push({ template: "investor-pitch-funds", format: "landscape", warnings: [], image: fundsImage });
  console.log("PASS investor-pitch-funds landscape, 34/16 tiles for 68/32, terms, no overflow");
  await fundsPage.close();

  const inviteProject = createProject("investor-pitch", "landscape");
  const inviteSlide = inviteProject.pages[11];
  inviteSlide.headline = "We're inviting investors\nand partners";
  inviteSlide.body = "Seed investors, sports partners and early players to build StatOz with us.";
  inviteSlide.presentation = { ...inviteSlide.presentation!, layout: "invite", metrics: [],
    bullets: ["Sport creates the moments. StatOz turns them into a game.", "EMAIL / founders@example.com", "WEB / example.com"] };
  const invitePage = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await invitePage.route("**/*", route => route.abort());
  await invitePage.setContent(await compositionHtml(inviteProject, 11), { waitUntil: "load" });
  await invitePage.evaluate(() => window.ready);
  assert.equal(await invitePage.locator(".invite-arc").count(), 1);
  assert.equal(await invitePage.locator(".invite-signoff").count(), 1);
  assert.equal(await invitePage.locator(".invite-contact").count(), 2, "Label / value bullets become contact lines");
  assert.deepEqual(await invitePage.evaluate(() => window.overflowReport()), []);
  const inviteImage = "investor-pitch-invite-landscape.png";
  await invitePage.screenshot({ path: path.join(directory, inviteImage) });
  results.push({ template: "investor-pitch-invite", format: "landscape", warnings: [], image: inviteImage });
  console.log("PASS investor-pitch-invite landscape, arc, sign-off, two contact lines, no overflow");
  await invitePage.close();

  const showcaseProject = createProject("investor-pitch", "landscape");
  const showcaseSlide = showcaseProject.pages[3];
  showcaseSlide.headline = "One sports universe.\nMultiple daily loops.";
  showcaseSlide.body = "Quick sessions feed persistent progress. Every game pays into the same coins, cards and ranks.";
  showcaseSlide.assetId = "";
  showcaseSlide.presentation = { ...showcaseSlide.presentation!, layout: "showcase", visual: "trending-games", metrics: [],
    bullets: ["OPEN / Find a fixture", "PLAY / Choose a mode", "EARN / Coins + XP", "BUILD / Cards + decks", "RANK / Compete", "RETURN / Next challenge"] };
  const showcasePage = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await showcasePage.route("**/*", route => route.abort());
  await showcasePage.setContent(await compositionHtml(showcaseProject, 3), { waitUntil: "load" });
  await showcasePage.evaluate(() => window.ready);
  assert.deepEqual(await showcasePage.evaluate(() => [...document.querySelectorAll(".showcase-column")].map(column => column.children.length)), [3, 3], "Six steps split three a side");
  assert.equal(await showcasePage.locator(".showcase-tag.is-primary").count(), 1);
  assert.equal(await showcasePage.locator(".iphone17-frame").count(), 1);
  assert.equal(await showcasePage.locator(".pitch-bullets").count(), 0, "Showcase steps never repeat as a bullet list");
  assert.deepEqual(await showcasePage.evaluate(() => window.overflowReport()), []);
  const showcaseImage = "investor-pitch-showcase-landscape.png";
  await showcasePage.screenshot({ path: path.join(directory, showcaseImage) });
  results.push({ template: "investor-pitch-showcase", format: "landscape", warnings: [], image: showcaseImage });
  console.log("PASS investor-pitch-showcase landscape, 3 + 3 tags, phone, no bullet list, no overflow");
  await showcasePage.close();

  const teamProject = createProject("investor-pitch", "landscape");
  const teamSlide = teamProject.pages[10];
  teamSlide.headline = "Two friends\nfrom college";
  teamSlide.body = "The founding team covers product design and technology.";
  teamSlide.assetId = "";
  teamSlide.presentation = { ...teamSlide.presentation!, layout: "team", visual: "none", metrics: [],
    bullets: ["Alex Sample / Product design / A sample bio long enough to wrap across two lines of the founder card.", "Sam Example / Technology / A second sample bio for the other founder card."] };
  const teamPage = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await teamPage.route("**/*", route => route.abort());
  await teamPage.setContent(await compositionHtml(teamProject, 10), { waitUntil: "load" });
  await teamPage.evaluate(() => window.ready);
  assert.equal(await teamPage.locator(".team-card").count(), 2);
  assert.deepEqual(await teamPage.locator(".team-portrait b").allTextContents(), ["AS", "SE"], "Placeholders carry each founder's initials");
  assert.equal(await teamPage.locator(".pitch-bullets").count(), 0, "Founders never repeat as a bullet list");
  assert.deepEqual(await teamPage.evaluate(() => window.overflowReport()), []);
  const teamImage = "investor-pitch-team-landscape.png";
  await teamPage.screenshot({ path: path.join(directory, teamImage) });
  results.push({ template: "investor-pitch-team", format: "landscape", warnings: [], image: teamImage });
  console.log("PASS investor-pitch-team landscape, two cards, placeholder initials, no bullet list, no overflow");
  await teamPage.close();

  const roadmapProject = createProject("investor-pitch", "landscape");
  const roadmapSlide = roadmapProject.pages[9];
  roadmapSlide.headline = "Prove repeatable growth\nand monetisation";
  roadmapSlide.body = "A focused sequence from foundations to scale readiness. Quarters are measured from funding; milestones are proposed outcomes.";
  roadmapSlide.assetId = "";
  roadmapSlide.presentation = { ...roadmapSlide.presentation!, layout: "timeline", visual: "none", metrics: [],
    bullets: ["Q1 / Retention foundation: live data, accounts, store relaunch, cohort tracking", "Q2 / Monetisation live: coin store, rewarded video, first tournament pass", "Q3 / Social growth loop: friend challenges, referrals, live-ops tools", "Q4 / Scale readiness: new sports, sponsorships, Series A preparation"] };
  const roadmapPage = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await roadmapPage.route("**/*", route => route.abort());
  await roadmapPage.setContent(await compositionHtml(roadmapProject, 9), { waitUntil: "load" });
  await roadmapPage.evaluate(() => window.ready);
  assert.deepEqual(await roadmapPage.locator(".roadmap-node").allTextContents(), ["Q1", "Q2", "Q3", "Q4"]);
  // Stations alternate above and below the track, and the last one is the destination.
  assert.equal(await roadmapPage.locator(".roadmap-station.is-above").count(), 2);
  assert.equal(await roadmapPage.locator(".roadmap-station.is-below.is-final").count(), 1);
  assert.deepEqual(await roadmapPage.locator(".roadmap-card-panel small").allTextContents(), ["M1-3", "M4-6", "M7-9", "M10-12"], "Quarters read as month ranges from funding");
  assert.equal(await roadmapPage.locator(".pitch-bullets").count(), 0, "Milestones never repeat as a bullet list");
  assert.deepEqual(await roadmapPage.evaluate(() => window.overflowReport()), []);
  const roadmapImage = "investor-pitch-timeline-landscape.png";
  await roadmapPage.screenshot({ path: path.join(directory, roadmapImage) });
  results.push({ template: "investor-pitch-timeline", format: "landscape", warnings: [], image: roadmapImage });
  console.log("PASS investor-pitch-timeline landscape, four stations, month ranges, no bullet list, no overflow");
  await roadmapPage.close();

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
  // The sheet loads the rendered PNGs from disk. Inlining them as data URLs crashed the
  // renderer once the template list grew, and every layout has already been checked here.
  const rows = results.map(r => `<div style="height:350px;display:flex;flex-direction:column;gap:7px;align-items:center"><img style="width:100%;height:310px;object-fit:contain" src="${encodeURIComponent(r.image)}"><b>${r.template} · ${r.format}</b><small>${r.warnings.join("; ")}</small></div>`);
  const sheet = path.join(directory, "contact-sheet.html");
  await fs.writeFile(sheet, `<html><body style="margin:0;padding:20px;background:#07101c;color:#adbed3;font:11px Arial"><main style="display:grid;grid-template-columns:repeat(8,1fr);gap:14px">${rows.join("")}</main></body></html>`);
  await contact.goto(pathToFileURL(sheet).href, { waitUntil: "load" });
  await contact.screenshot({ path: path.join(directory, "contact-sheet.png"), fullPage: true });
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(results, null, 2));
} finally { await browser.close(); }
console.log(`Media verification: ${results.length - failures}/${results.length} layouts passed. Artifacts: ${directory}`);
if (failures) process.exitCode = 1;
