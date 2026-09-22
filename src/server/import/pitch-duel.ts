import fs from "node:fs/promises";
import path from "node:path";
import type { PlayerInput } from "@/domain/player";

// Reads the Pitch Duel (card_game) Dart roster as data. The studio never needs that
// checkout at runtime: `npm run import:players` copies what it finds into storage.
export type ImportedPlayer = PlayerInput & { sourceId: string; sourceSport: string; portraitFile: string | null; portraitRelative: string | null };

const readFile = (root: string, relative: string) => fs.readFile(path.join(root, relative), "utf8");
const QUOTED = "'((?:\\\\'|[^'])*)'";

/** Constructor bodies for `Name(...)`, counting nested parentheses. */
export function constructorBodies(source: string, name: string): string[] {
  const bodies: string[] = [];
  const needle = `${name}(`;
  for (let at = source.indexOf(needle); at >= 0; at = source.indexOf(needle, at + 1)) {
    const before = source[at - 1];
    if (before && /[A-Za-z0-9_$]/.test(before)) continue;
    let depth = 0;
    for (let i = at + name.length; i < source.length; i++) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")" && --depth === 0) { bodies.push(source.slice(at + name.length + 1, i)); at = i; break; }
    }
  }
  return bodies;
}
/** Dart uses double quotes when a value contains an apostrophe (`"N'Golo Kanté"`). */
const text = (body: string, key: string) =>
  new RegExp(`${key}:\\s*${QUOTED}`).exec(body)?.[1]?.replace(/\\'/g, "'")
  ?? new RegExp(`${key}:\\s*"((?:\\\\"|[^"])*)"`).exec(body)?.[1]?.replace(/\\"/g, '"')
  ?? null;
const ident = (body: string, key: string) => new RegExp(`${key}:\\s*([A-Za-z0-9_.]+)`).exec(body)?.[1] ?? null;
const int = (body: string, key: string) => Number(new RegExp(`${key}:\\s*(\\d+)`).exec(body)?.[1] ?? 0);
const after = (value: string | null) => value?.split(".").pop() ?? "";

/**
 * Index of the `{` that opens `name = <...>{`. Anchoring on the assignment matters:
 * `_teamNames` is read on an earlier line than the line that declares it.
 */
function declarationBrace(source: string, name: string): number {
  const declaration = new RegExp(`\\b${name}\\b\\s*=\\s*(?:const\\s*)?(?:<[^>]*>\\s*)?\\{`).exec(source);
  return declaration ? declaration.index + declaration[0].length - 1 : -1;
}

/** `const x = <String, String>{ 'a': 'b', ... };` — Dart wraps long entries across lines. */
export function stringMap(source: string, name: string): Record<string, string> {
  const open = declarationBrace(source, name);
  if (open < 0) return {};
  const close = source.indexOf("};", open);
  if (close < 0) return {};
  const entries: Record<string, string> = {};
  for (const m of source.slice(open, close).matchAll(new RegExp(`${QUOTED}\\s*:\\s*${QUOTED}`, "g"))) entries[m[1]] = m[2];
  return entries;
}
function idSet(source: string, name: string): Set<string> {
  const open = declarationBrace(source, name);
  if (open < 0) return new Set();
  const close = source.indexOf("};", open);
  if (close < 0) return new Set();
  return new Set([...source.slice(open, close).matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1]));
}
const words = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toUpperCase();
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const cricketSlug = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const flat = (rating: number) => ({ pace: rating, skill: rating, form: rating });
const bounded = (value: number, fallback: number) => (Number.isFinite(value) && value > 0 ? Math.max(0, Math.min(100, value)) : fallback);

export async function readPitchDuelRoster(root: string): Promise<ImportedPlayer[]> {
  const [cards, basketball, tennis, racing, racingArt, basketballArt, tennisArt, countries] = await Promise.all([
    readFile(root, "lib/models/cards.dart"),
    readFile(root, "lib/data/basketball_athletes.dart"),
    readFile(root, "lib/data/tennis_athletes.dart"),
    readFile(root, "lib/data/racing_drivers.dart"),
    readFile(root, "lib/data/racing_portraits.dart"),
    readFile(root, "lib/data/basketball_portraits.dart"),
    readFile(root, "lib/data/tennis_portraits.dart"),
    readFile(root, "lib/utils/tennis_country_map.dart").catch(() => ""),
  ]);
  const footballPortraits = stringMap(cards, "playerPortraitAssets");
  const cricketAliases = stringMap(cards, "cricketPortraitAliases");
  const basketballPortraits = stringMap(basketballArt, "basketballPortraitAssets");
  const tennisPortraits = stringMap(tennisArt, "tennisPortraitAssets");
  const racingWebp = idSet(racingArt, "kRacingWebpPortraitArtIds");
  const teamNames = stringMap(basketball, "_teamNames");
  // TennisCountryMap matches the LONGEST player-name fragment contained in the name,
  // then the code is expanded to the country's full name.
  const playerCountries = Object.entries(stringMap(countries, "_playerCountries"));
  const countryNames = stringMap(countries, "_countryNames");
  const tennisNation = (name: string) => {
    const lower = name.toLowerCase();
    let best = "", code = "";
    for (const [fragment, value] of playerCountries) if (fragment.length > best.length && lower.includes(fragment)) { best = fragment; code = value; }
    return code ? countryNames[code] ?? code : "";
  };

  const players: ImportedPlayer[] = [];
  const add = (row: Omit<ImportedPlayer, "portraitFile" | "portraitRelative" | "portraitAssetId">, candidate: string | null) =>
    players.push({ ...row, portraitAssetId: "", portraitRelative: candidate, portraitFile: candidate ? path.join(root, candidate) : null });

  for (const body of constructorBodies(cards, "PlayerCard")) {
    const role = after(ident(body, "role")), name = text(body, "name"), id = text(body, "id");
    if (!name || !id) continue;
    const rating = int(body, "rating"), explicit = text(body, "portraitAsset");
    if (["attacker", "defender", "goalkeeper"].includes(role)) {
      const short = text(body, "shortName") ?? "";
      add({ sourceId: id, sourceSport: "football", name: name.toUpperCase(), sport: "football", position: text(body, "position") ?? "", club: "", nation: text(body, "country") ?? "", rating, metrics: flat(rating) },
        explicit ?? footballPortraits[short] ?? null);
    } else if (["batsman", "bowler"].includes(role)) {
      const key = cricketSlug(name);
      add({ sourceId: id, sourceSport: "cricket", name: name.toUpperCase(), sport: "cricket", position: text(body, "position") ?? "", club: text(body, "country") ?? "", nation: "", rating, metrics: flat(rating) },
        explicit ?? `assets/cricketer_images/${cricketAliases[key] ?? `${key}.webp`}`);
    }
  }
  for (const m of basketball.matchAll(/_Seed\(\s*'([^']+)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*BasketballCardRole\.\w+\s*,\s*(\d+)\s*\)/g)) {
    const [, team, name, position, ovr] = m, rating = Number(ovr);
    const id = `${team.toLowerCase()}-${slug(name)}`;
    add({ sourceId: id, sourceSport: "basketball", name: name.toUpperCase(), sport: "basketball", position, club: teamNames[team] ?? team, nation: "", rating, metrics: flat(rating) }, basketballPortraits[id] ?? null);
  }
  for (const body of constructorBodies(tennis, "TennisPlayer")) {
    const name = text(body, "name"), id = text(body, "id");
    if (!name || !id) continue;
    const rating = int(body, "overallRating");
    add({ sourceId: id, sourceSport: "tennis", name: name.toUpperCase(), sport: "tennis", position: words(after(ident(body, "archetype"))), club: "", nation: tennisNation(name), rating,
      metrics: { pace: bounded(int(body, "speed"), rating), skill: bounded(int(body, "control"), rating), form: bounded(int(body, "stamina"), rating) } }, tennisPortraits[id] ?? null);
  }
  for (const body of constructorBodies(racing, "RacingDriver")) {
    const name = text(body, "name"), id = text(body, "id");
    if (!name || !id) continue;
    const rating = int(body, "overallRating");
    add({ sourceId: id, sourceSport: "racing", name: name.toUpperCase(), sport: "motorsport", position: `${after(ident(body, "series")).toUpperCase()} DRIVER`, club: text(body, "team") ?? "", nation: text(body, "country") ?? "", rating,
      metrics: { pace: bounded(int(body, "pace"), rating), skill: bounded(int(body, "racecraft"), rating), form: bounded(int(body, "consistency"), rating) } },
      `assets/racing_driver_images/${id}.${racingWebp.has(id) ? "webp" : "png"}`);
  }
  // A declared portrait path is only kept when the file is really on disk.
  await Promise.all(players.map(async player => {
    if (!player.portraitFile) return;
    const real = await fs.stat(player.portraitFile).then(s => s.isFile()).catch(() => false);
    if (!real) { player.portraitFile = null; player.portraitRelative = null; }
  }));
  return players;
}
