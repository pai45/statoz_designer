import assert from "node:assert/strict";
import test from "node:test";
import { projectSchema } from "../src/domain/project";
import { createDemoProject, demoAssets, demoTimestamp } from "../src/features/studio/demo-data";
import { studioTemplates } from "../src/features/templates/registry";

test("demo projects are deterministic and schema-valid", () => {
  for (const template of studioTemplates) {
    const first = createDemoProject(template.id);
    const second = createDemoProject(template.id);
    assert.deepEqual(first, second, template.name);
    assert.equal(projectSchema.safeParse(first).success, true, template.name);
    assert.equal(first.createdAt, demoTimestamp);
    assert.equal(first.updatedAt, demoTimestamp);
    assert.equal(first.sample, true);
    assert.match(first.id, /^demo-/);
    assert.equal(new Set(first.pages.map(page => page.id)).size, first.pages.length);
  }
});

test("the public pitch demo includes all twelve checked-in slides", () => {
  const pitch = createDemoProject("investor-pitch", "landscape");
  assert.equal(pitch.pages.length, 12);
  assert.equal(pitch.pitchDeck?.familyId, pitch.id);
  assert.ok(pitch.pages.every(page => page.presentation));
});

test("demo data contains only the explicit public asset allowlist", () => {
  assert.deepEqual(demoAssets.map(asset => asset.file), [
    "assets/brand/logo.png",
    "assets/library/stadium.png",
    "assets/library/arena.png",
  ]);
  const serialized = JSON.stringify({ projects: studioTemplates.map(template => createDemoProject(template.id)), assets: demoAssets });
  assert.doesNotMatch(serialized, /storage[\\/]|127\.0\.0\.1|localhost|[A-Z]:\\/i);
});
