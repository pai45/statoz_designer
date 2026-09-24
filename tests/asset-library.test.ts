import assert from "node:assert/strict";
import test from "node:test";
import { assetCategoryOf, normalizeAssetCategory, sortAssetsForCategory } from "../src/domain/asset-library";
import type { Asset } from "../src/domain/project";

const asset = (change: Partial<Asset>): Asset => ({
  schemaVersion: 1, id: "asset", name: "Asset", file: "storage/assets/asset.png",
  mime: "image/png", bytes: 1, source: "Local capture", approval: "reference",
  createdAt: "2026-01-01T00:00:00.000Z", ...change,
});

test("legacy assets normalize into stable purpose categories", () => {
  assert.equal(assetCategoryOf(asset({ id: "pitch-duel-football-player", source: "Pitch Duel card roster (card_game). Real athletes" })), "player-portrait");
  assert.equal(assetCategoryOf(asset({ id: "espn-football-1", source: "ESPN: https://example.test/crest.png" })), "team-crest");
  assert.equal(assetCategoryOf(asset({ id: "line-art-board", mime: "image/svg+xml", source: "statoz_web: public/assets/games/board.svg", approval: "brand" })), "line-art");
  assert.equal(assetCategoryOf(asset({ id: "soundtrack", mime: "audio/wav", source: "User import: soundtrack.wav", approval: "approved" })), "audio-video");
  assert.equal(assetCategoryOf(asset({ id: "upload", source: "User import: artwork.png", approval: "approved" })), "uploads");
  assert.equal(assetCategoryOf(asset({ id: "brand", source: "Generated artwork", approval: "brand" })), "brand-artwork");
  assert.equal(assetCategoryOf(asset({ id: "capture", source: "card_game/output/screenshot.png" })), "product-capture");
});

test("explicit categories win and normalization does not mutate legacy records", () => {
  const legacy = asset({ id: "espn-audio", mime: "audio/wav", source: "ESPN: example" });
  assert.equal(assetCategoryOf({ ...legacy, category: "uploads" }), "uploads");
  const normalized = normalizeAssetCategory(legacy);
  assert.equal(normalized.category, "team-crest");
  assert.equal(legacy.category, undefined);
});

test("managed categories sort alphabetically while working media sorts newest first", () => {
  const alpha = [asset({ id: "b", name: "Zulu" }), asset({ id: "a", name: "Alpha" })];
  assert.deepEqual(sortAssetsForCategory(alpha, "player-portrait").map(value => value.name), ["Alpha", "Zulu"]);
  const recent = [asset({ id: "old", createdAt: "2025-01-01T00:00:00.000Z" }), asset({ id: "new", createdAt: "2026-01-01T00:00:00.000Z" })];
  assert.deepEqual(sortAssetsForCategory(recent, "uploads").map(value => value.id), ["new", "old"]);
});
