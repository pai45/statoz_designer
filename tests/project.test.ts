import assert from "node:assert/strict";
import test from "node:test";
import { projectSchema, durationOf, formats, launchGames, maxPitchPages, sceneAt } from "../src/domain/project";
import { appCreativePlaceholders, appCreativeReadiness, appShowcaseFormats, fitsPhoneCapture, iconMasterIssues } from "../src/domain/app-creatives";
import { appGameplayFor, appScreenGroups, appScreenPrefill, appScreens, appScreenTheme, appScreenThemes } from "../src/domain/app-screens";
import { gameplayRecipes } from "../src/server/capture/gameplay-recipes";
import { createProject, studioTemplates, templateFor, templates } from "../src/features/templates/registry";
import { pitchVariantFrom, validateProject } from "../src/server/storage";
import { fitHeadline, headlineBudget, headlineRuns } from "../src/features/compositions/news";
import { beatOf, contrast, countUp, graphOf, numericValue, readableColor, shareOf, teamColors } from "../src/domain/match-story";

test("all public template families create valid projects in every supported format", () => {
  assert.equal(studioTemplates.length, 21);
  assert.equal(templates.length, 22);
  for (const template of templates) for (const format of template.formats) {
    const p = createProject(template.id, format, "football", template.kind === "video" ? 13 : undefined);
    assert.equal(projectSchema.safeParse(p).success, true, template.id);
    if (p.kind === "video") assert.equal(durationOf(p), 13);
  }
});
test("gameplay demos open on four beats, lock their sport and name their own game", () => {
  const demos = { "penalty-shootout-demo": ["penalty-shootout", "football"], "final-over-demo": ["final-over", "cricket"], "hoop-duel-demo": ["hoop-duel", "basketball"], "tennis-rally-demo": ["tennis-rally", "tennis"] } as const;
  for (const [id, [game, sport]] of Object.entries(demos)) {
    const demo = createProject(id, "reel", "motorsport", 16);
    assert.equal(projectSchema.safeParse(demo).success, true, id);
    assert.equal(templateFor(id).visual, "gameplay");
    // The requested sport is ignored: a demo of one game always carries that game's sport.
    assert.equal(demo.sport, sport);
    assert.equal(demo.pages.length, 4);
    assert.equal(demo.pages.every(page => page.game === game), true, id);
    assert.deepEqual(demo.pages.map(page => page.showCta), [false, false, false, true]);
    assert.equal(durationOf(demo), 16);
  }
  assert.equal(createProject("grand-prix-demo", "reel", "tennis", 12).sport, "motorsport");
  assert.equal(createProject("feature-promo", "reel", "tennis", 12).sport, "tennis");
});
test("launch scenes carry a known game, and older launch pages load without one", () => {
  const launch = createProject("game-launch", "portrait");
  assert.equal(launch.pages[0].game, "pitch-duel");
  assert.equal(launch.pages[0].assetId, "");
  const legacyPage: Record<string, unknown> = { ...launch.pages[0], assetId: "arena" };
  delete legacyPage.game;
  const legacy = projectSchema.parse({ ...launch, pages: [legacyPage] });
  assert.equal(legacy.pages[0].game, "");
  for (const game of Object.keys(launchGames)) assert.equal(projectSchema.safeParse({ ...launch, pages: [{ ...launch.pages[0], game }] }).success, true, game);
  assert.equal(projectSchema.safeParse({ ...launch, pages: [{ ...launch.pages[0], game: "table-tennis" }] }).success, false);
});
test("app creative templates expose exact placements and one blank starting page", () => {
  assert.deepEqual(appShowcaseFormats.map(id => [id, formats[id].width, formats[id].height]), [
    ["instagramPortrait", 1080, 1350], ["playPhonePortrait", 1080, 1920], ["appStoreIphone69", 1320, 2868],
    ["playTabletLandscape", 1920, 1080], ["appStoreIpad13", 2064, 2752],
  ]);
  const showcase = createProject("app-showcase", "instagramPortrait");
  assert.equal(showcase.pages.length, 1);
  assert.equal(showcase.pages[0].headline, appCreativePlaceholders.headline);
  assert.equal(showcase.pages[0].tabletAssetId, "");
  assert.deepEqual(templateFor("play-feature-graphic").formats, ["playFeatureGraphic"]);
  assert.deepEqual(templateFor("store-icon").formats, ["playIcon", "appStoreIcon"]);
  assert.throws(() => createProject("app-showcase", "portrait"));
});
test("app creative readiness separates phone, tablet, copy, and icon requirements", () => {
  const project = createProject("app-showcase", "instagramPortrait");
  assert.match(appCreativeReadiness(project, "instagramPortrait", []).join(" "), /phone capture/);
  project.pages[0].assetId = "phone"; project.pages[0].tabletAssetId = "tablet";
  const assets = [
    { schemaVersion: 1 as const, id: "phone", name: "Phone", file: "phone.png", mime: "image/png", bytes: 1, width: 1080, height: 1920, hasAlpha: false, source: "test", approval: "approved" as const, createdAt: "now" },
    { schemaVersion: 1 as const, id: "tablet", name: "Tablet", file: "tablet.png", mime: "image/png", bytes: 1, width: 1920, height: 1080, hasAlpha: false, source: "test", approval: "approved" as const, createdAt: "now" },
  ];
  assert.match(appCreativeReadiness(project, "instagramPortrait", assets).join(" "), /headline prompt/);
  assert.deepEqual(appCreativeReadiness(project, "playTabletLandscape", assets), []);
  assert.match(iconMasterIssues().join(" "), /Choose a PNG/);
  assert.deepEqual(iconMasterIssues({ ...assets[0], id: "icon", width: 1024, height: 1024 }), []);
});
test("the app showcase phone picker accepts only phone-shaped stills", () => {
  const image = (width?: number, height?: number, mime = "image/png") => ({ schemaVersion: 1 as const, id: "a", name: "A", file: "a", mime, bytes: 1, width, height, source: "test", approval: "approved" as const, createdAt: "now" });
  assert.equal(fitsPhoneCapture(image(393, 852)), true);
  assert.equal(fitsPhoneCapture(image(1080, 1920)), true);
  for (const asset of [image(1080, 1350), image(1120, 750), image(1920, 1080), image(), image(393, 852, "video/mp4"), undefined]) assert.equal(fitsPhoneCapture(asset), false);
  const project = createProject("app-showcase", "instagramPortrait");
  project.pages[0].assetId = "a";
  assert.match(appCreativeReadiness(project, "instagramPortrait", [image(1080, 1350)]).join(" "), /not phone-shaped/);
});
test("curated app screens carry unique ids and real copy, and prefill never overwrites edits", () => {
  assert.equal(new Set(appScreens.map(screen => screen.id)).size, appScreens.length);
  for (const screen of appScreens) {
    assert.ok(appScreenGroups.includes(screen.group));
    for (const key of ["eyebrow", "headline", "body"] as const) {
      assert.ok(screen.copy[key].trim(), `${screen.id} ${key}`);
      assert.notEqual(screen.copy[key], appCreativePlaceholders[key]);
    }
  }
  const [first, second] = appScreens;
  assert.deepEqual(appScreenPrefill({ ...appCreativePlaceholders }, "", first.id), first.copy);
  assert.deepEqual(appScreenPrefill(first.copy, first.id, second.id), second.copy);
  assert.deepEqual(appScreenPrefill({ ...first.copy, headline: "My own line." }, first.id, second.id), { eyebrow: second.copy.eyebrow, body: second.copy.body });
  assert.deepEqual(appScreenPrefill(first.copy, first.id, "unknown"), {});
  assert.equal(new Set(appScreenGroups.map(group => appScreenThemes[group])).size, appScreenGroups.length, "each screen group draws its own background");
  assert.equal(appScreenTheme(first.id), appScreenThemes[first.group]);
  assert.equal(appScreenTheme("unknown"), undefined);
});
test("every game start screen pairs with exactly one gameplay capture that a recipe produces", () => {
  const starts = appScreens.filter(screen => screen.group === "Games" && screen.game);
  assert.ok(starts.length >= 12);
  for (const start of starts) {
    const partners = appScreens.filter(screen => screen.group === "Gameplay" && screen.game === start.game);
    assert.equal(partners.length, 1, `${start.game} needs one gameplay screen`);
    assert.equal(appGameplayFor(start.id)?.id, partners[0].id);
  }
  assert.equal(appGameplayFor("app-screen-match-hub"), undefined);
  const captured = new Set(gameplayRecipes.flatMap(recipe => recipe.steps.flatMap(step => "capture" in step ? [step.capture] : [])));
  for (const screen of appScreens.filter(screen => screen.capture === "gameplay")) {
    assert.ok(captured.has(screen.id), `${screen.id} has no capture recipe`);
    assert.equal(screen.file, undefined);
  }
  for (const id of captured) assert.equal(appScreens.find(screen => screen.id === id)?.capture, "gameplay", `${id} is captured but not declared`);
});
test("the hidden investor pitch seeds twelve evidence-aware landscape slides", () => {
  const pitch = createProject("investor-pitch", "landscape");
  assert.equal(projectSchema.safeParse(pitch).success, true);
  assert.equal(pitch.pitchDeck?.role, "master");
  assert.equal(pitch.pitchDeck?.familyId, pitch.id);
  assert.equal(pitch.pages.length, 12);
  assert.equal(new Set(pitch.pages.map(page => page.id)).size, 12);
  assert.deepEqual(new Set(pitch.pages.map(page => page.presentation?.evidenceStatus)), new Set(["repo-backed", "source-backed", "illustrative", "proposed"]));
  assert.equal(pitch.pages[1].headline, "India's next wave\nof sports gaming");
  assert.deepEqual(pitch.pages[1].presentation?.metrics.map(metric => metric.value), ["600M", "$1.5B", "$2.4B"]);
  assert.equal(pitch.pages[2].presentation?.visual, "trending-games");
  assert.equal(pitch.pages[3].presentation?.layout, "convergence");
  assert.equal(pitch.pages[3].presentation?.bullets[3], "STATOZ / Free-to-play sports gaming");
  assert.equal(pitch.pages[4].presentation?.visual, "game-library");
  assert.equal(pitch.pages[6].presentation?.layout, "seasonality");
  assert.equal(pitch.pages[7].presentation?.visual, "storefront");
  assert.equal(pitch.pages[11].presentation?.metrics[0]?.value, "₹1 Cr");
  assert.throws(() => createProject("investor-pitch", "portrait"));
});
test("pitch decks can add missing pages without increasing ordinary project limits", () => {
  const pitch = createProject("investor-pitch", "landscape");
  pitch.pages = Array.from({ length: maxPitchPages }, (_, i) => ({ ...pitch.pages[0], id: `pitch-page-${i}` }));
  assert.equal(validateProject(pitch).pages.length, maxPitchPages);
  assert.equal(templateFor("investor-pitch").maxPages, maxPitchPages);
  assert.throws(() => validateProject({ ...pitch, pages: [...pitch.pages, { ...pitch.pages[0], id: "one-too-many" }] }));
  const ordinary = createProject("explainer", "landscape");
  ordinary.pages = pitch.pages.slice(0, 13);
  assert.equal(projectSchema.safeParse(ordinary).success, false);
  assert.equal(projectSchema.safeParse({ ...pitch, pitchDeck: null }).success, false);
});

test("pitch variants snapshot the source with fresh IDs and provenance", () => {
  const master = createProject("investor-pitch", "landscape");
  master.revision = 7;
  const variant = pitchVariantFrom(master, "US angels", "US sports-tech angel investors");
  assert.equal(variant.pitchDeck?.familyId, master.id);
  assert.equal(variant.pitchDeck?.basedOnProjectId, master.id);
  assert.equal(variant.pitchDeck?.basedOnRevision, 7);
  assert.equal(variant.brief.audience, "US sports-tech angel investors");
  assert.notEqual(variant.id, master.id);
  assert.equal(variant.pages.some(page => master.pages.some(source => source.id === page.id)), false);
  variant.pages[0].headline = "Independent";
  assert.notEqual(variant.pages[0].headline, master.pages[0].headline);
});
test("pitch slides accept registered app-screen captures without a schema migration", () => {
  const pitch = createProject("investor-pitch", "landscape");
  pitch.pages[0].presentation = { ...pitch.pages[0].presentation!, visual: "app-screen" };
  pitch.pages[0].assetId = "registered-capture";
  const parsed = projectSchema.parse(pitch);
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.pages[0].presentation?.visual, "app-screen");
  assert.equal(parsed.pages[0].assetId, "registered-capture");
});
test("schema version one projects without pitch fields remain compatible", () => {
  const ordinary = createProject("feature-spotlight", "portrait") as Record<string, unknown>;
  delete ordinary.pitchDeck;
  const pages = ordinary.pages as Record<string, unknown>[];
  for (const page of pages) delete page.presentation;
  const parsed = projectSchema.parse(ordinary);
  assert.equal(parsed.pitchDeck, null);
  assert.equal(parsed.pages.every(page => page.presentation === null), true);
});
test("video duration is required, bounded, and frame aligned", () => {
  assert.throws(() => createProject("feature-promo", "reel"));
  assert.throws(() => createProject("feature-promo", "reel", "football", 7));
  assert.throws(() => createProject("feature-promo", "reel", "football", 61));
  for (const duration of [8, 13, 60]) assert.equal(durationOf(createProject("feature-promo", "reel", "football", duration)), duration);
  const p = createProject("feature-promo", "reel", "football", 12); p.pages[0].duration = 3.001;
  assert.equal(projectSchema.safeParse(p).success, false);
});
test("match stories start as four weighted beats that land exactly on the 30 fps grid", () => {
  for (const duration of [8, 13, 15, 60]) {
    const story = createProject("match-story", "reel", "football", duration);
    assert.equal(projectSchema.safeParse(story).success, true);
    assert.deepEqual(story.pages.map(page => page.beat), ["score", "stats", "graph", "pick"]);
    assert.equal(Math.round(durationOf(story) * 30), duration * 30);
    assert.ok(story.pages[1].duration > story.pages[0].duration, "stats get more time than the score");
    assert.equal(story.pages.every(page => page.matchStats.length === 5), true);
  }
  assert.deepEqual(createProject("match-story", "reel", "football", 15).pages.map(page => page.duration), [3, 4.5, 4.5, 3]);
  assert.equal(createProject("match-story", "square", "cricket", 15).pages[0].scoreA, "187/4");
  // Other video templates keep their even split.
  assert.deepEqual(createProject("feature-promo", "reel", "football", 12).pages.map(page => page.duration), [3, 3, 3, 3]);
});
test("match story fields default on older pages, and an unset beat follows scene order", () => {
  const story = createProject("match-story", "reel", "football", 12);
  const legacy = story.pages.map(page => {
    const copy: Record<string, unknown> = { ...page };
    for (const key of ["beat", "matchStats", "colorA", "colorB", "graph", "seriesA", "seriesB", "markers", "pickShare", "pickVotes"]) delete copy[key];
    return copy;
  });
  const parsed = projectSchema.parse({ ...story, pages: [...legacy, { ...legacy[1], id: "extra-scene" }] });
  assert.equal(parsed.pages[0].beat, ""); assert.deepEqual(parsed.pages[0].matchStats, []); assert.equal(parsed.pages[0].pickShare, null); assert.equal(parsed.pages[0].graph, "auto");
  assert.deepEqual(parsed.pages.map((page, i) => beatOf(page, i, parsed.pages.length)), ["score", "stats", "graph", "stats", "pick"]);
  assert.equal(beatOf({ ...parsed.pages[0], beat: "pick" }, 0, 5), "pick");
  assert.equal(graphOf(parsed.pages[0], "cricket"), "race");
  assert.equal(graphOf({ ...parsed.pages[0], graph: "lead" }, "cricket"), "lead");
  assert.equal(projectSchema.safeParse({ ...story, pages: [{ ...story.pages[0], colorA: "red" }, ...story.pages.slice(1)] }).success, false);
  assert.equal(projectSchema.safeParse({ ...story, pages: [{ ...story.pages[0], pickShare: 101 }, ...story.pages.slice(1)] }).success, false);
});
test("stat values count up in their own format and never animate two-part values", () => {
  assert.equal(countUp("54%", .5), "27%");
  assert.equal(countUp("1,204", .5), "602");
  assert.equal(countUp("12,480", 1), "12,480");
  assert.equal(countUp("12,480", .5), "6,240");
  assert.equal(countUp("3.5", .5), "1.8");
  assert.equal(countUp("48.9%", 0), "0.0%");
  assert.equal(countUp("187/4", .3), "187/4");
  assert.equal(countUp("1:32.4", .3), "1:32.4");
  assert.equal(numericValue("P1"), 1); assert.equal(numericValue("187/4"), undefined);
  assert.equal(shareOf("0", "0"), .5); assert.equal(shareOf("58%", "42%"), .58);
  assert.equal(shareOf("100", "0"), .995); assert.equal(shareOf("n/a", "4"), .5);
});
test("team colours are lifted until they read on the chart surface", () => {
  const dark = readableColor("#132257");
  assert.ok(contrast(dark, "#10192d") >= 4.5, dark);
  assert.equal(readableColor("#5cdfff"), "#5cdfff");
  assert.equal(readableColor("not-a-colour"), "");
  const page = createProject("match-story", "reel", "football", 12).pages[0];
  assert.deepEqual(teamColors(page, "football"), ["#5cdfff", "#ffffff"]);
  assert.deepEqual(teamColors(page, "cricket"), ["#ffffff", "#5cdfff"]);
  const [, clash] = teamColors({ ...page, colorA: "#e31f26", colorB: "#e0202a" }, "football");
  assert.notEqual(clash, readableColor("#e0202a"));
});
test("seek finds the same scene at arbitrary frame times and the final frame", () => {
  const p = createProject("feature-promo", "reel", "football", 12);
  assert.equal(sceneAt(p, 0).index, 0); assert.equal(sceneAt(p, 3).index, 1); assert.equal(sceneAt(p, 11.966).index, 3);
  assert.deepEqual(sceneAt(p, 4), sceneAt(p, 4));
});
test("schemas reject duplicate IDs, incompatible media trims, and unsafe identifiers", () => {
  const p = createProject("explainer", "portrait"); p.pages[1].id = p.pages[0].id;
  assert.equal(projectSchema.safeParse(p).success, false);
  const image = createProject("feature-spotlight", "portrait"); image.id = "../escape";
  assert.equal(projectSchema.safeParse(image).success, false);
  image.id = "safe-id"; image.pages[0].clipStart = 5; image.pages[0].clipEnd = 3;
  assert.equal(projectSchema.safeParse(image).success, false);
});

test("news flash starts on reel with an invented, credited sample story", () => {
  const project = createProject("news-flash", templateFor("news-flash").defaultFormat!);
  assert.equal(project.format, "reel");
  assert.equal(project.kind, "image");
  assert.deepEqual(templateFor("news-flash").formats, ["square", "portrait", "reel", "landscape"]);
  assert.equal(project.sample, true);
  assert.ok(project.pages[0].credit.length > 0);
  // Pages written before the credit field load with it empty.
  const legacy: Partial<typeof project.pages[0]> = { ...project.pages[0] };
  delete legacy.credit;
  assert.equal(projectSchema.parse({ ...project, pages: [legacy] }).pages[0].credit, "");
});

test("news headlines mark one highlight and fit their box by measured width", () => {
  assert.deepEqual(headlineRuns("Messi *retires* now"), [{ text: "Messi ", lit: false }, { text: "retires", lit: true }, { text: " now", lit: false }]);
  assert.deepEqual(headlineRuns("No * stray"), [{ text: "No * stray", lit: false }]);
  const box = { width: 842, height: 560, max: 112, min: 46 };
  const short = fitHeadline("Arteta commits", box), long = fitHeadline("Man United transfer strategy 'financial sustainable' as losses increase - CEO", box);
  assert.equal(short, 112);
  assert.ok(long < short && long >= box.min);
  // A single long word caps the size so it never breaks mid-word.
  assert.ok(fitHeadline("INTERNATIONALISATION", box) < fitHeadline("INTERNATIONAL", box));
  // Explicit breaks count as lines, so they shrink the size as well.
  assert.ok(fitHeadline("A\nB\nC\nD\nE\nF", box) < fitHeadline("A B C D E F", box));
  const scene = createProject("news-flash", "reel").pages[0];
  assert.ok(headlineBudget({ ...scene, body: "" }, "reel").height > headlineBudget(scene, "reel").height);
  assert.ok(headlineBudget({ ...scene, layout: "split" }, "reel").height < headlineBudget(scene, "reel").height);
});
