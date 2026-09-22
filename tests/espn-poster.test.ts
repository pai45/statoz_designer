import assert from "node:assert/strict";
import test from "node:test";
import type { MatchFacts } from "../src/domain/espn";
import { sceneFieldsFor } from "../src/server/espn/poster";

const fixture: MatchFacts = {
  sport: "football", leagueId: "esp.1", leagueName: "LaLiga", eventId: "match-1",
  name: "Atlético Madrid v Real Madrid", shortName: "ATM v RMA", date: "2026-09-20T19:00:00Z",
  status: "STATUS_FULL_TIME", detail: "FT", completed: true,
  a: { id: "atm", name: "Atlético Madrid", shortName: "Atlético", abbreviation: "ATM", score: "2", winner: true },
  b: { id: "rma", name: "Real Madrid", shortName: "Real Madrid", abbreviation: "RMA", score: "1", winner: false },
  stats: [{ label: "POSSESSION", a: "60.9", b: "39.1" }], highlights: [],
};

test("match poster copy leaves the score to the scoreboard", () => {
  const result = sceneFieldsFor(fixture, fixture.stats[0], { a: "", b: "" });
  assert.equal(result.headline, "A finish\nto remember.");
  assert.equal(result.scoreA, "2");
  assert.equal(result.scoreB, "1");

  const preview = sceneFieldsFor({ ...fixture, completed: false }, fixture.stats[0], { a: "", b: "" });
  assert.equal(preview.headline, "Two sides.\nOne statement.");
});
