import assert from "node:assert/strict";
import test from "node:test";
import { projectSchema, durationOf, formats, sceneAt } from "../src/domain/project";
import { appCreativePlaceholders, appCreativeReadiness, appShowcaseFormats, iconMasterIssues } from "../src/domain/app-creatives";
import { createProject, studioTemplates, templateFor, templates } from "../src/features/templates/registry";
import { pitchVariantFrom } from "../src/server/storage";

test("all public template families create valid projects in every supported format", () => {
  assert.equal(studioTemplates.length, 16);
  assert.equal(templates.length, 17);
  for (const template of templates) for (const format of template.formats) {
    const p = createProject(template.id, format, "football", template.kind === "video" ? 13 : undefined);
    assert.equal(projectSchema.safeParse(p).success, true, template.id);
    if (p.kind === "video") assert.equal(durationOf(p), 13);
  }
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
