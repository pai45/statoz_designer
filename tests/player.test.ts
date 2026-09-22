import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { playerMatches, playerSchema, samplePlayers } from "../src/domain/player";
import { pageSchema, projectSchema } from "../src/domain/project";
import { createProject } from "../src/features/templates/registry";

const record = (index: number) => playerSchema.parse({ schemaVersion: 1, ...samplePlayers[index], source: "test", sample: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });

test("every sample player is a complete record and search covers each printed field", () => {
  for (let i = 0; i < samplePlayers.length; i++) assert.doesNotThrow(() => record(i), samplePlayers[i].id);
  const player = record(0);
  for (const query of ["", "  ", "ari", "MIDFIELDER", "north", "atlantia", "vance north"]) assert.equal(playerMatches(player, query), true, query);
  for (const query of ["goalkeeper", "ari goalkeeper"]) assert.equal(playerMatches(player, query), false, query);
});

test("card scenes default to no linked player, accept a snapshot, and reject unsafe player IDs", () => {
  const card = createProject("reward-card", "portrait");
  assert.equal(card.pages[0].playerCard, null);
  const legacy: Record<string, unknown> = { ...card.pages[0] };
  delete legacy.playerCard;
  assert.equal(pageSchema.parse(legacy).playerCard, null, "projects written before the player library still load");
  card.pages[0].playerCard = { playerId: "sample-ari-vance", position: "MIDFIELDER", club: "NORTH FC", nation: "ATLANTIA" };
  assert.equal(projectSchema.safeParse(card).success, true);
  card.pages[0].playerCard = { playerId: "", position: "STRIKER", club: "", nation: "" };
  assert.equal(projectSchema.safeParse(card).success, true, "details typed by hand need no library entry");
  card.pages[0].playerCard = { playerId: "../escape", position: "", club: "", nation: "" };
  assert.equal(projectSchema.safeParse(card).success, false);
});

test("the player library seeds locally, searches, and accepts new and edited cards", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "statoz-players-test-"));
  process.env.STUDIO_DATA_DIR = folder;
  const store = await import("../src/server/storage");
  try {
    await store.initialize();
    assert.equal((await store.listPlayers()).length, samplePlayers.length);
    const football = await store.listPlayers("", "football");
    assert.ok(football.length > 0 && football.every(p => p.sport === "football"));
    assert.deepEqual(football.map(p => p.rating), [...football.map(p => p.rating)].sort((a, b) => b - a), "results lead with the highest rating");
    assert.deepEqual((await store.listPlayers("harbour")).map(p => p.name), ["KAI OSEI"]);
    assert.equal((await store.listPlayers("nobody at all")).length, 0);
    assert.equal((await store.listPlayers("ari vance", "cricket")).length, 0, "the sport filter and the query both apply");

    const created = await store.addPlayer({ name: "TAMSIN REED", position: "STRIKER", club: "OXBOW CITY", nation: "SOLARA", sport: "football", rating: 77, metrics: { pace: 70, skill: 71, form: 72 }, portraitAssetId: "" });
    assert.equal(created.sample, false);
    assert.deepEqual((await store.listPlayers("oxbow")).map(p => p.id), [created.id]);
    const updated = await store.savePlayer(created.id, { ...created, rating: 80, portraitAssetId: "stadium" });
    assert.equal(updated.rating, 80); assert.equal(updated.id, created.id); assert.equal(updated.createdAt, created.createdAt);
    assert.equal((await store.listPlayers("oxbow"))[0].portraitAssetId, "stadium");
    await assert.rejects(() => store.savePlayer(created.id, { ...created, portraitAssetId: "does-not-exist" }), /not in the media library/);
    await assert.rejects(() => store.addPlayer({ ...created, name: "" }), /name/);
    await assert.rejects(() => store.addPlayer({ ...created, rating: 140 }), /rating/);
    assert.throws(() => store.location("players", "../outside"), /Invalid local/);

    await fs.writeFile(path.join(folder, "players", "broken.json"), "{broken");
    assert.equal((await store.listPlayers()).length, samplePlayers.length + 1, "a damaged record does not hide the library");
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
});
