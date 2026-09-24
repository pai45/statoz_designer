import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { colorGroups, safeAreas, shapes, socialScaleFormats, socialScaleVars, tracking, typeFamilies, uiTypeScale, useCases } from "../src/domain/brand-guide";
import { formats, sports } from "../src/domain/project";
import { colors } from "../src/design-system/tokens/colors";
import { normalizeColor, parseRuleVars, parseTokenCss, resolveToken } from "../src/design-system/tokens/parse-css";
import { templates } from "../src/features/templates/registry";
import { claudeSkillDir, designSkillDir, generatedSkillReferences, loadDesignSources, tokensCssPath } from "../src/server/design-guide";

const kebab = (key: string) => key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
const tokens = async () => parseTokenCss(await fs.readFile(tokensCssPath, "utf8"));
const sameColor = (tokenMap: Record<string, string>, name: string, expected: string) => {
  const value = resolveToken(tokenMap, name);
  assert.ok(value, `${name} is missing from tokens.css`);
  assert.equal(normalizeColor(value), normalizeColor(expected), `${name} is ${value} in tokens.css but ${expected} in colors.ts`);
};

test("the token parser reads multi-line values, comments, and nested references", () => {
  const parsed = parseTokenCss(":root {\n  /* note; with a semicolon */\n  --a: #fff;\n  --b: polygon(\n    0 0,\n    100% 0\n  );\n  --c: var(--a);\n}");
  assert.deepEqual(parsed, { "--a": "#fff", "--b": "polygon(0 0, 100% 0)", "--c": "var(--a)" });
  assert.equal(resolveToken(parsed, "--c"), "#fff");
  assert.deepEqual(parseRuleVars(".x{--a:1px}.format-y{--a:2px;color:red}", ".format-y"), { "--a": "2px" });
  assert.equal(normalizeColor("rgba(173, 70, 255, 0.5)"), normalizeColor("rgb(173 70 255 / 50%)"));
  assert.equal(normalizeColor("#FFF"), normalizeColor("rgb(255 255 255)"));
});

test("the TypeScript colour mirror matches tokens.css", async () => {
  const tokenMap = await tokens();
  for (const [group, values] of Object.entries(colors)) {
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "string") sameColor(tokenMap, group === "feedback" ? `--ds-color-${kebab(key)}` : `--ds-color-${group}-${kebab(key)}`, value);
      else for (const [step, shade] of Object.entries(value as Record<string, string>)) sameColor(tokenMap, `--ds-color-${group}-${key}-${step}`, shade);
    }
  }
});

test("sport accents are the accent tokens the guide names for them", async () => {
  const tokenMap = await tokens();
  const sportTokens = colorGroups.find(group => group.id === "sports")!.tokens;
  assert.deepEqual(sportTokens.map(entry => entry.role).sort(), Object.keys(sports).sort());
  for (const entry of sportTokens) sameColor(tokenMap, entry.token, sports[entry.role as keyof typeof sports].accent);
});

test("every token the guide names exists in the stylesheets", async () => {
  const tokenMap = await tokens();
  const named = [...colorGroups.flatMap(group => group.tokens), ...typeFamilies, ...uiTypeScale, ...tracking].map(entry => entry.token)
    .concat(shapes.flatMap(shape => [shape.clip, ...(shape.cut ? [shape.cut] : [])]));
  for (const name of named) assert.ok(tokenMap[name], `${name} is not declared in tokens.css`);
  const { social } = await loadDesignSources();
  for (const { format } of socialScaleFormats) for (const name of socialScaleVars) assert.match(social[format][name] ?? "", /^\d+px$/, `${name} is not set for ${format}`);
});

test("use cases point at real templates and formats", () => {
  const ids = new Set(templates.map(template => template.id));
  assert.equal(new Set(useCases.map(useCase => useCase.id)).size, useCases.length);
  for (const useCase of useCases) {
    for (const id of useCase.startTemplates) assert.ok(ids.has(id), `${useCase.id} starts from unknown template ${id}`);
    for (const format of useCase.formats) assert.ok(format in formats, `${useCase.id} lists unknown format ${format}`);
    for (const id of useCase.startTemplates) {
      const template = templates.find(item => item.id === id)!;
      assert.ok(template.formats.some(format => useCase.formats.includes(format)), `${id} delivers none of ${useCase.id}'s formats`);
    }
    assert.ok(useCase.checklist.length, `${useCase.id} needs a checklist`);
  }
  for (const area of safeAreas) assert.ok(area.box.every(inset => inset >= 8 && inset < 50));
});

async function filesIn(dir: string, base = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? filesIn(path.join(dir, entry.name), base) : [path.relative(base, path.join(dir, entry.name))]))).flat().sort();
}
const text = (value: string | Buffer) => value.toString().replace(/\r\n/g, "\n");

test("the design-system skill references are current (run npm run design:sync)", async () => {
  for (const [file, content] of Object.entries(generatedSkillReferences(await loadDesignSources()))) {
    assert.equal(text(await fs.readFile(path.join(designSkillDir, file), "utf8")), content, `${file} is stale: run npm run design:sync`);
  }
});

test("the Claude Code copy of the skill mirrors the Codex copy (run npm run design:sync)", async () => {
  const files = await filesIn(designSkillDir);
  assert.ok(files.includes("SKILL.md"));
  assert.deepEqual(await filesIn(claudeSkillDir), files, "the .claude skill has different files: run npm run design:sync");
  for (const file of files) {
    const [source, mirror] = await Promise.all([fs.readFile(path.join(designSkillDir, file)), fs.readFile(path.join(claudeSkillDir, file))]);
    if (/\.(md|ya?ml)$/.test(file)) assert.equal(text(mirror), text(source), `${file} differs: run npm run design:sync`);
    else assert.ok(mirror.equals(source), `${file} differs: run npm run design:sync`);
  }
});
