import { finishedStatuses, type EspnLeague, type MatchFacts, type MatchHighlight, type MatchListing, type MatchSide, type MatchStat } from "@/domain/espn";
import { StudioError } from "@/server/storage";

/* ESPN's payloads are loosely typed and vary by sport, so everything below reads
 * defensively: a missing branch yields an empty string rather than throwing. */
type Json = Record<string, unknown>;
const obj = (value: unknown): Json => (value && typeof value === "object" ? value as Json : {});
const arr = (value: unknown): Json[] => (Array.isArray(value) ? value as Json[] : []);
const str = (value: unknown): string => (typeof value === "string" ? value : typeof value === "number" ? String(value) : "");

const statusOf = (competition: Json) => obj(obj(competition.status).type);
/**
 * A race weekend carries FP1-FP3, qualifying and the race as sibling competitions, in
 * that order, so the first one is practice. Pick the race.
 */
export function mainCompetition(event: Json): Json {
  const all = arr(event.competitions);
  const race = all.find(c => str(obj(c.type).abbreviation).toLowerCase() === "race") ?? all.find(c => str(obj(c.type).id) === "3");
  return obj(race ?? all[all.length - 1] ?? all[0]);
}
const isFinished = (competition: Json) => {
  const type = statusOf(competition);
  // Cricket reports neither a status name nor a completed flag, but every sport
  // sets state to pre | in | post.
  return str(type.state) === "post" || type.completed === true || finishedStatuses.includes(str(type.name));
};

function logoOf(team: Json) {
  const many = arr(team.logos);
  return str(many[0]?.href) || str(team.logo) || undefined;
}

function sideOf(competitor: Json): MatchSide {
  const team = obj(competitor.team);
  const name = str(team.displayName) || str(team.name) || str(obj(competitor.athlete).displayName) || "Unknown";
  return {
    id: str(team.id) || str(competitor.id),
    name,
    shortName: str(team.shortDisplayName) || str(team.abbreviation) || name,
    abbreviation: str(team.abbreviation) || str(team.shortDisplayName) || name.slice(0, 3).toUpperCase(),
    score: str(competitor.score),
    logo: logoOf(team),
    color: str(team.color) ? `#${str(team.color).replace(/^#/, "")}` : undefined,
    winner: competitor.winner === true,
  };
}

/** A driver standing in for a side, so a race can use the same poster templates. */
function driverSide(competitor: Json, position: number): MatchSide {
  const athlete = obj(competitor.athlete);
  const name = str(athlete.displayName) || str(athlete.shortName) || `P${position}`;
  return {
    id: str(athlete.id) || String(position),
    name,
    shortName: str(athlete.shortName) || name,
    abbreviation: str(athlete.abbreviation) || name.split(" ").pop()!.slice(0, 3).toUpperCase(),
    score: `P${position}`,
    logo: logoOf(obj(competitor.team)),
    color: undefined,
    winner: position === 1,
  };
}

export function listMatches(league: EspnLeague, payload: Json): MatchListing[] {
  return arr(payload.events).map(event => {
    const competition = league.sport === "motorsport" ? mainCompetition(event) : obj(arr(event.competitions)[0]);
    const competitors = arr(competition.competitors);
    const type = statusOf(competition);
    const sides = league.sport === "motorsport"
      ? competitors.slice(0, 2).map((c, i) => driverSide(c, i + 1))
      : competitors.map(sideOf);
    const [a, b] = [sides[0], sides[1]];
    const blank = { name: "", abbreviation: "", score: "" };
    return {
      eventId: str(event.id), leagueId: league.id, sport: league.sport,
      name: str(event.name) || str(event.shortName), shortName: str(event.shortName) || str(event.name),
      date: str(event.date), detail: str(type.shortDetail) || str(type.detail) || str(type.description),
      completed: isFinished(competition),
      a: a ? { name: a.name, abbreviation: a.abbreviation, score: a.score } : blank,
      b: b ? { name: b.name, abbreviation: b.abbreviation, score: b.score } : blank,
    };
  });
}

/**
 * Cricket publishes no team boxscore. ESPN already formats each side's score as
 * "387/3" or "360/7 (50 ov, target 388)", which is more reliable than the linescores:
 * those carry a padded entry per period, so the batting innings cannot be picked by
 * position.
 */
function cricketStats(competitors: Json[]): MatchStat[] {
  const parsed = competitors.map(c => {
    const score = str(c.score);
    const runs = /^\s*(\d+)/.exec(score)?.[1] ?? "";
    const wickets = /^\s*\d+\/(\d+)/.exec(score)?.[1] ?? "";
    const overs = /\(([\d.]+)\s*ov/.exec(score)?.[1]
      ?? str(arr(c.linescores).find(l => str(l.runs) === runs && runs !== "")?.overs);
    return { runs, wickets, overs };
  });
  if (parsed.length < 2) return [];
  const rows: MatchStat[] = [];
  for (const [label, key] of [["RUNS", "runs"], ["WICKETS", "wickets"], ["OVERS", "overs"]] as const) {
    const a = parsed[0][key], b = parsed[1][key];
    if (a && b) rows.push({ label, a, b });
  }
  return rows;
}

/** Pairs the two sides' boxscore rows by label so they can be compared. */
function pairedStats(teams: Json[]): MatchStat[] {
  const rows = teams.map(team => new Map(arr(team.statistics).map(s => [str(s.label) || str(s.name), str(s.displayValue)])));
  if (rows.length < 2) return [];
  const stats: MatchStat[] = [];
  for (const [label, a] of rows[0]) {
    const b = rows[1].get(label);
    if (b !== undefined && label) stats.push({ label: label.toUpperCase(), a, b });
  }
  return stats;
}

function leaderHighlights(payload: Json, limit = 3): MatchHighlight[] {
  const out: MatchHighlight[] = [];
  for (const group of arr(payload.leaders)) {
    for (const category of arr(group.leaders)) {
      const top = arr(category.leaders)[0];
      if (!top) continue;
      const athlete = obj(top.athlete);
      const label = str(category.displayName) || str(category.name);
      if (label && athlete.displayName) out.push({ label: label.toUpperCase(), value: `${str(athlete.displayName)} · ${str(top.displayValue)}` });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Builds facts for a race straight from its scoreboard event: racing has no summary. */
export function raceFacts(league: EspnLeague, event: Json): MatchFacts {
  const competition = mainCompetition(event);
  const ordered = [...arr(competition.competitors)].sort((x, y) => Number(x.order ?? 99) - Number(y.order ?? 99));
  if (ordered.length < 2) throw new StudioError("This race has no classified finishers yet.", 404);
  const type = statusOf(competition);
  const a = driverSide(ordered[0], 1), b = driverSide(ordered[1], 2);
  return {
    sport: league.sport, leagueId: league.id, leagueName: league.name,
    eventId: str(event.id), name: str(event.name) || str(event.shortName),
    shortName: str(event.shortName) || str(event.name),
    date: str(competition.date) || str(event.date),
    status: str(type.name), detail: str(type.detail) || str(type.shortDetail),
    completed: isFinished(competition),
    venue: str(obj(event.circuit).fullName) || undefined,
    note: undefined,
    a, b,
    stats: [],
    highlights: ordered.slice(0, 3).map((c, i) => ({ label: `P${i + 1}`, value: driverSide(c, i + 1).name })),
  };
}

export function matchFacts(league: EspnLeague, payload: Json): MatchFacts {
  const header = obj(payload.header);
  const competition = obj(arr(header.competitions)[0]);
  const competitors = arr(competition.competitors);
  const type = statusOf(competition);
  const boxTeams = arr(obj(payload.boxscore).teams);

  if (competitors.length < 2) throw new StudioError("This fixture does not have two sides yet.", 404);
  const a = sideOf(competitors[0]), b = sideOf(competitors[1]);
  const stats = pairedStats(boxTeams).length ? pairedStats(boxTeams) : cricketStats(competitors);
  const highlights = leaderHighlights(payload);
  // Cricket names a player of the match on the status block rather than in leaders.
  const featured = arr(obj(competition.status).featuredAthletes)[0];
  if (featured) highlights.unshift({ label: str(featured.abbreviation) || "PLAYER OF THE MATCH", value: str(obj(featured.athlete).displayName) || str(obj(featured.athlete).name) });

  const venue = obj(obj(competition.venue).address);
  return {
    sport: league.sport, leagueId: league.id, leagueName: league.name,
    eventId: str(header.id) || str(competition.id),
    name: `${a.name} v ${b.name}`,
    shortName: `${a.abbreviation} v ${b.abbreviation}`,
    date: str(competition.date),
    status: str(type.name), detail: str(type.detail) || str(type.shortDetail),
    completed: isFinished(competition),
    venue: str(obj(competition.venue).fullName) || str(venue.city) || undefined,
    note: str(obj(competition.status).summary) || str(arr(competition.notes)[0]?.headline) || undefined,
    a, b, stats, highlights,
  };
}
