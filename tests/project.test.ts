import assert from "node:assert/strict";
import test from "node:test";
import { projectSchema, durationOf, sceneAt } from "../src/domain/project";
import { createProject, templates } from "../src/features/templates/registry";

test("all twelve template families create valid projects in every format", () => {
  assert.equal(templates.length, 12);
  for (const template of templates) for (const format of template.formats) {
    const p = createProject(template.id, format, "football", template.kind === "video" ? 13 : undefined);
    assert.equal(projectSchema.safeParse(p).success, true, template.id);
    if (p.kind === "video") assert.equal(durationOf(p), 13);
  }
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
