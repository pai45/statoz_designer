import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { constructorBodies, readPitchDuelRoster, stringMap } from "../src/server/import/pitch-duel";

/** A miniature card_game tree: the eight Dart files the reader touches, plus portraits. */
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "statoz-pitch-duel-"));
  const write = async (relative: string, body: string) => {
    await fs.mkdir(path.join(root, path.dirname(relative)), { recursive: true });
    await fs.writeFile(path.join(root, relative), body);
  };
  await write("lib/models/cards.dart", `
const Map<String, String> playerPortraitAssets = {
  'LEO 10': 'assets/player_images/LEO 10.webp',
  'GHOST': 'assets/player_images/MISSING.webp',
};
const cricketPortraitAliases = <String, String>{
  'tim_david': '10_Tim_David.webp',
};
const attackers = [
  PlayerCard(
    id: 'arg-lionel-messi', name: 'Lionel Messi', shortName: 'LEO 10',
    country: 'Argentina', countryCode: 'ARG', position: 'RW/CAM',
    role: PlayerRole.attacker, rating: 92, trait: 'Creator', tier: CardTier.platinum, icon: Icons.bolt,
  ),
  PlayerCard(
    id: 'fra-n-golo-kante', name: "N'Golo Kanté", shortName: 'GHOST',
    country: 'France', countryCode: 'FRA', position: 'CDM',
    role: PlayerRole.defender, rating: 87, trait: 'Engine', tier: CardTier.gold, icon: Icons.shield,
  ),
];
const cricketBattingCards = [
  PlayerCard(
    id: 'cricket-mi-tim-david', name: 'Tim David', shortName: 'T David',
    country: 'Mumbai Indians', countryCode: 'MI', position: 'BAT',
    role: PlayerRole.batsman, rating: 85, trait: 'Batsman', tier: CardTier.gold, icon: Icons.sports_cricket,
  ),
];
PlayerCard _basketballPlayerCard(BasketballAthlete athlete) => PlayerCard(id: athlete.id);
`);
  // _teamNames is READ on an earlier line than the one that declares it.
  await write("lib/data/basketball_athletes.dart", `
BasketballAthlete build(_Seed seed) => BasketballAthlete(teamName: _teamNames[seed.teamCode]!);
const roster = [
  _Seed('ATL', 'Trae Young', 'PG', BasketballCardRole.guard, 91),
];
const Map<String, String> _teamNames = {
  'ATL': 'Atlanta Hawks',
};
`);
  await write("lib/data/basketball_portraits.dart", `
const basketballPortraitAssets = <String, String>{
  'atl-trae-young': 'assets/basketball_player_images/trae_young.webp',
};
`);
  await write("lib/data/tennis_athletes.dart", `
const tennisTop100 = [
  TennisPlayer(
    id: 'jannik-sinner', name: 'Jannik Sinner', archetype: TennisArchetype.allCourtRival,
    ratings: TennisRatings(speed: 99, acceleration: 99, power: 97, control: 93, serve: 97, stamina: 96, volley: 93, spin: 94, reach: 96),
    signature: 'Flat depth', overallRating: 96,
  ),
];
`);
  await write("lib/data/tennis_portraits.dart", `
const tennisPortraitAssets = <String, String>{
  'jannik-sinner': 'assets/tennis_player_images/jannik-sinner.webp',
};
`);
  await write("lib/data/racing_drivers.dart", `
const allRacingDrivers = [
  RacingDriver(
    id: 'max-verstappen', name: 'Max Verstappen', series: RacingSeries.f1, team: 'Red Bull Racing',
    country: 'Netherlands', countryCode: 'NED', archetype: RacingArchetype.racecraftMaster,
    ratings: RacingRatings(pace: 96, racecraft: 99, consistency: 98, tyreManagement: 95),
    signature: 'Late brake', overallRating: 97,
  ),
  RacingDriver(
    id: 'pato-oward', name: "Pato O'Ward", series: RacingSeries.indycar, team: 'Arrow McLaren',
    country: 'Mexico', countryCode: 'MEX', archetype: RacingArchetype.qualifier,
    ratings: RacingRatings(pace: 90, racecraft: 88, consistency: 86, tyreManagement: 85),
    signature: 'Oval pace', overallRating: 89,
  ),
];
`);
  await write("lib/data/racing_portraits.dart", `
const Set<String> kRacingWebpPortraitArtIds = { 'max-verstappen' };
const Set<String> kRacingPortraitArtIds = { ...kRacingWebpPortraitArtIds };
`);
  await write("lib/utils/tennis_country_map.dart", `
class TennisCountryMap {
  static const _countryNames = <String, String>{ 'ITA': 'Italy' };
  static const _playerCountries = <String, String>{ 'sinner': 'ITA' };
}
`);
  for (const file of ["assets/player_images/LEO 10.webp", "assets/cricketer_images/10_Tim_David.webp",
    "assets/basketball_player_images/trae_young.webp", "assets/tennis_player_images/jannik-sinner.webp",
    "assets/racing_driver_images/max-verstappen.webp", "assets/racing_driver_images/pato-oward.png"]) await write(file, "binary");
  return root;
}

test("constructor bodies ignore names that only end with the target", () => {
  const source = "PlayerCard(id: 'a') _basketballPlayerCard(x) PlayerCard(id: 'b', nested: Inner(1))";
  const bodies = constructorBodies(source, "PlayerCard");
  assert.equal(bodies.length, 2);
  assert.ok(bodies[1].includes("Inner(1)"), "nested parentheses are balanced, not truncated");
});

test("string maps anchor on the declaration, not an earlier use of the name", () => {
  const source = "teamName: _teamNames[code]!,\nconst Map<String, String> _teamNames = {\n  'ATL': 'Atlanta Hawks',\n};";
  assert.deepEqual(stringMap(source, "_teamNames"), { ATL: "Atlanta Hawks" });
  assert.deepEqual(stringMap(source, "_absent"), {});
});

test("the Pitch Duel roster reads every sport, both quote styles, and only real portraits", async () => {
  const root = await fixture();
  try {
    const roster = await readPitchDuelRoster(root);
    const find = (id: string) => roster.find(p => p.sourceId === id)!;
    assert.deepEqual(roster.map(p => p.sport).sort(), ["basketball", "cricket", "football", "football", "motorsport", "motorsport", "tennis"]);

    const messi = find("arg-lionel-messi");
    assert.equal(messi.name, "LIONEL MESSI");
    assert.equal(messi.nation, "Argentina");
    assert.equal(messi.club, "", "the football roster is national teams, so there is no club");
    assert.deepEqual(messi.metrics, { pace: 92, skill: 92, form: 92 }, "one overall rating is all the card data carries");
    assert.ok(messi.portraitFile?.endsWith("LEO 10.webp"));

    // Dart switches to double quotes when the value contains an apostrophe.
    assert.equal(find("fra-n-golo-kante").name, "N'GOLO KANTÉ");
    assert.equal(find("pato-oward").name, "PATO O'WARD");
    assert.equal(find("fra-n-golo-kante").portraitFile, null, "a mapped portrait that is not on disk is dropped");

    assert.equal(find("cricket-mi-tim-david").club, "Mumbai Indians");
    assert.ok(find("cricket-mi-tim-david").portraitFile?.endsWith("10_Tim_David.webp"), "alias filenames resolve");
    assert.equal(find("atl-trae-young").club, "Atlanta Hawks");

    const sinner = find("jannik-sinner");
    assert.equal(sinner.nation, "Italy");
    assert.equal(sinner.position, "ALL COURT RIVAL");
    assert.deepEqual(sinner.metrics, { pace: 99, skill: 93, form: 96 }, "tennis carries real sub-ratings");

    const verstappen = find("max-verstappen");
    assert.equal(verstappen.sport, "motorsport");
    assert.equal(verstappen.position, "F1 DRIVER");
    assert.equal(verstappen.club, "Red Bull Racing");
    assert.deepEqual(verstappen.metrics, { pace: 96, skill: 99, form: 98 });
    assert.ok(verstappen.portraitFile?.endsWith("max-verstappen.webp"), "the webp id set picks the extension");
    assert.ok(find("pato-oward").portraitFile?.endsWith("pato-oward.png"));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
