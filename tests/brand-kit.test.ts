import assert from "node:assert/strict";
import test from "node:test";
import { listBrandKit, readBrandKitFile, tokensJson } from "../src/server/brand-kit";

test("the design kit lists every file with its size", async () => {
  const items = await listBrandKit();
  assert.deepEqual(items.map(item => item.id), ["design-guide", "tokens-css", "tokens-json", "font-orbitron", "font-onest", "logo", "brand-guide"]);
  for (const item of items) assert.ok(item.bytes > 0, `${item.id} is empty`);
});

test("the design kit serves only whitelisted ids", async () => {
  for (const id of ["", "../package.json", "..\\package.json", "tokens-css/../../package.json", "logo.png", "constructor", "__proto__"]) {
    assert.equal(await readBrandKitFile(id), undefined, `${id} should not resolve`);
  }
});

test("generated kit files carry the live tokens", async () => {
  const json = JSON.parse((await readBrandKitFile("tokens-json"))!.data.toString());
  assert.equal(json.tokens["--ds-color-accent-cyan"], "#5cdfff");
  assert.equal(json.tokens["--ds-color-accent-white"], "#ffffff", "references are resolved");
  const guide = (await readBrandKitFile("design-guide"))!.data.toString();
  assert.match(guide, /^# StatOz design guide/);
  assert.match(guide, /`--ds-color-accent-cyan` \| Cyan \| `#5cdfff`/);
  assert.match(guide, /## Reels, Shorts & motion video/);
  assert.equal(tokensJson({ "--a": "#fff", "--b": "var(--a)" }).tokens["--b"], "#fff");
  const css = (await readBrandKitFile("tokens-css"))!;
  assert.equal(css.fileName, "statoz-tokens.css");
  assert.match(css.data.toString(), /--ds-color-accent-cyan/);
});
