import { finishedStatuses, type EspnLeague, type Finisher, type MatchFacts, type MatchHighlight, type MatchListing, type MatchSide, type MatchStat, type MatchTimeline, type NewsArticle } from "@/domain/espn";
import { StudioError } from "@/server/storage";

/* ESPN's payloads are loosely typed and vary by sport, so everything below reads
 * defensively: a missing branch yields an empty string rather than throwing. */
type Json = Record<string, unknown>;
const obj = (value: unknown): Json => (value && typeof value === "object" ? value as Json : {});
const arr = (value: unknown): Json[] => (Array.isArray(value) ? value as Json[] : []);
const str = (value: unknown): string => (typeof value === "string" ? value : typeof value === "number" ? String(value) : "");
const num = (value: unknown): number => { const n = typeof value === "number" ? value : Number(str(value)); return Number.isFinite(n) ? n : 0; };
/** Cricket sends booleans as strings ("true"), the other sports as booleans. */
const yes = (value: unknown) => value === true || value === "true";

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
    // Basketball and cricket have no short display name, but their `name` is the short form ("Mystics", "England").
    shortName: str(team.shortDisplayName) || str(team.name) || str(team.abbreviation) || name,
    abbreviation: str(team.abbreviation) || str(team.shortDisplayName) || name.slice(0, 3).toUpperCase(),
    score: str(competitor.score),
    logo: logoOf(team),
    color: str(team.color) ? `#${str(team.color).replace(/^#/, "")}` : undefined,
    winner: yes(competitor.winner),
  };
}

/** A driver standing in for a side, so a race can use the same poster templates. */
function driverSide(competitor: Json, position: number): MatchSide {
  const athlete = obj(competitor.athlete);
  const name = str(athlete.displayName) || str(athlete.shortName) || `P${position}`;
  return {
    // The scoreboard puts the driver's id on the competitor. Never fall back to the position:
    // the crest importer caches by id, so "P1" would reuse the last winner's flag.
    id: str(athlete.id) || str(competitor.id) || name.toLowerCase(),
    name,
    shortName: str(athlete.shortName) || name,
    abbreviation: str(athlete.abbreviation) || name.split(" ").pop()!.slice(0, 3).toUpperCase(),
    score: `P${position}`,
    // Racing has no team block on the scoreboard, so the driver's flag stands in for a crest.
    logo: logoOf(obj(competitor.team)) || str(obj(athlete.flag).href) || undefined,
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

/** "453 & 130/2 (24.2 ov, target 130)" prints as "453 & 130/2": overs and targets belong in the stats. */
export const cricketScore = (score: string) => score.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();

/** A side's batting innings, in match order. Fielding innings are listed too, with nothing in them. */
const battingInnings = (competitor: Json) => arr(competitor.linescores)
  .filter(l => yes(l.isBatting) && (num(l.runs) > 0 || num(l.overs) > 0 || num(l.wickets) > 0))
  .sort((x, y) => num(x.period) - num(y.period));
const inningsStat = (innings: Json, name: string) => {
  for (const category of arr(obj(innings.statistics).categories)) {
    const found = arr(category.stats).find(s => str(s.name) === name);
    if (found) return str(found.displayValue);
  }
  return "";
};
/** Cricket's own notation: all out is the runs alone, otherwise runs/wickets, "d" when declared. */
const inningsScore = (innings: Json) => {
  const runs = str(innings.runs), wickets = num(innings.wickets);
  return `${runs}${wickets < 10 ? `/${wickets}` : ""}${/declared/i.test(str(innings.description)) ? "d" : ""}`;
};

/**
 * Cricket publishes no team boxscore, so the comparison is read from each side's innings
 * linescores. A one-innings match compares the innings; a Test compares each innings in
 * turn, plus the boundaries and extras summed across them.
 */
export function cricketStats(competitors: Json[]): MatchStat[] {
  if (competitors.length < 2) return [];
  const [a, b] = competitors.slice(0, 2).map(battingInnings);
  const rows: MatchStat[] = [];
  const push = (label: string, x: string, y: string) => { if (x !== "" && y !== "") rows.push({ label, a: x, b: y }); };
  const sum = (innings: Json[], key: string) => String(innings.reduce((n, l) => n + num(key in l ? l[key] : inningsStat(l, key)), 0));
  if (a.length === 1 && b.length === 1) {
    push("RUN RATE", inningsStat(a[0], "runRate"), inningsStat(b[0], "runRate"));
    push("FOURS", str(a[0].fours), str(b[0].fours));
    push("SIXES", str(a[0].sixes), str(b[0].sixes));
    push("EXTRAS", inningsStat(a[0], "extras"), inningsStat(b[0], "extras"));
    push("WICKETS", str(a[0].wickets), str(b[0].wickets));
    push("OVERS", str(a[0].overs), str(b[0].overs));
  } else if (a.length && b.length) {
    ["1ST INNINGS", "2ND INNINGS"].forEach((label, i) => { if (a[i] && b[i]) push(label, inningsScore(a[i]), inningsScore(b[i])); });
    push("FOURS", sum(a, "fours"), sum(b, "fours"));
    push("SIXES", sum(a, "sixes"), sum(b, "sixes"));
    push("EXTRAS", sum(a, "extras"), sum(b, "extras"));
  }
  if (rows.length) return rows;
  // Payloads without linescores: ESPN's formatted score still carries runs and wickets.
  const parsed = competitors.map(c => ({ runs: /^\s*(\d+)/.exec(str(c.score))?.[1] ?? "", wickets: /^\s*\d+\/(\d+)/.exec(str(c.score))?.[1] ?? "" }));
  push("RUNS", parsed[0].runs, parsed[1].runs);
  push("WICKETS", parsed[0].wickets, parsed[1].wickets);
  return rows;
}

/**
 * The run worm of a one-innings-a-side match: each side's running total after every over,
 * with the overs in which wickets fell marked. A Test has no common over axis and is left
 * out, as is any innings whose overs do not add up to its reported total.
 */
export function cricketTimeline(competitors: Json[]): MatchTimeline | undefined {
  if (competitors.length < 2) return undefined;
  const sides = competitors.slice(0, 2).map(battingInnings);
  if (sides.some(innings => innings.length !== 1)) return undefined;
  const markers: MatchTimeline["markers"] = [];
  const series = sides.map(([innings], index) => {
    const overs = arr(obj(innings.statistics).overs).flatMap(entry => (Array.isArray(entry) ? entry as Json[] : [entry]));
    let total = 0;
    const running = overs.map((over, at) => {
      total += num(over.runs);
      const fell = arr(over.wicket).length;
      if (fell) markers.push({ at, side: index ? "B" : "A", label: fell > 1 ? `${fell}W` : "W" });
      return total;
    });
    return running.length > 1 && running.length <= 60 && total === num(innings.runs) && total <= 999 ? running : undefined;
  });
  if (!series[0] || !series[1]) return undefined;
  return { graph: "race", a: series[0], b: series[1], markers: markers.slice(0, 20) };
}

/** "9:46" or "45.3" left on the clock, in seconds. */
const clockSeconds = (display: string) => {
  const [minutes, seconds] = display.includes(":") ? display.split(":") : ["0", display];
  const value = Number(minutes) * 60 + Number(seconds);
  return display && Number.isFinite(value) ? value : undefined;
};

/**
 * Basketball's scoring run from ESPN's play-by-play: each side's running score at four
 * even checkpoints per quarter (two per overtime), with lead changes marked. Every play
 * carries the running score, so nothing is interpolated. If the last play disagrees with
 * the reported final, the graph is left out rather than drawn wrong.
 */
export function basketballTimeline(payload: Json, aIsHome: boolean, final: { a: number; b: number }): MatchTimeline | undefined {
  const format = obj(payload.format), regulation = obj(format.regulation), overtime = obj(format.overtime);
  const periods = num(regulation.periods) || 4, length = num(regulation.clock) || 600, extra = num(overtime.clock) || 300;
  const lengthOf = (period: number) => (period <= periods ? length : extra);
  const startOf = (period: number) => { let t = 0; for (let p = 1; p < period; p++) t += lengthOf(p); return t; };
  const points = arr(payload.plays).flatMap(play => {
    const period = num(obj(play.period).number), left = clockSeconds(str(obj(play.clock).displayValue));
    if (period < 1 || left === undefined) return [];
    const home = num(play.homeScore), away = num(play.awayScore);
    return [{ period, at: startOf(period) + Math.max(0, lengthOf(period) - left), a: aIsHome ? home : away, b: aIsHome ? away : home }];
  });
  const last = points[points.length - 1];
  if (points.length < 20 || !last || last.a !== final.a || last.b !== final.b) return undefined;
  const played = Math.max(periods, ...points.map(p => p.period));
  const per = Math.max(1, Math.round(16 / periods));
  const checkpoints = [0];
  for (let p = 1; p <= played; p++) {
    const steps = p <= periods ? per : Math.ceil(per / 2);
    for (let i = 1; i <= steps; i++) checkpoints.push(startOf(p) + lengthOf(p) * i / steps);
  }
  if (checkpoints.length > 60 || Math.max(final.a, final.b) > 999) return undefined;
  // Each checkpoint takes the running score of the last play at or before it.
  const scoreAt = (t: number) => points.reduce((found, p) => (p.at <= t + .001 ? p : found), { a: 0, b: 0 });
  const a = checkpoints.map(t => scoreAt(t).a), b = checkpoints.map(t => scoreAt(t).b);
  a[a.length - 1] = final.a; b[b.length - 1] = final.b;
  const periodName = (p: number) => (p <= periods ? `${periods === 2 ? "H" : "Q"}${p}` : `OT${p - periods > 1 ? p - periods : ""}`);
  const changes: MatchTimeline["markers"] = [];
  let leader = 0;
  for (const p of points) {
    const now = Math.sign(p.a - p.b);
    if (!now) continue;
    if (leader && now !== leader) {
      const at = checkpoints.findIndex(t => t >= p.at - .001);
      changes.push({ at: at < 0 ? checkpoints.length - 1 : at, side: now > 0 ? "A" : "B", label: `LEAD ${periodName(p.period)}` });
    }
    leader = now;
  }
  // A back-and-forth game changes lead a dozen times; then only the change that stuck is marked.
  const byPoint = [...new Map(changes.map(change => [change.at, change])).values()];
  return { graph: "lead", a, b, markers: byPoint.length > 6 ? byPoint.slice(-1) : byPoint };
}

/** Pairs the two sides' boxscore rows by label so they can be compared. */
function pairedStats(teams: Json[]): MatchStat[] {
  const rows = teams.map(team => new Map(arr(team.statistics).map(s => [str(s.label) || str(s.name), str(s.displayValue)])));
  if (rows.length < 2) return [];
  const stats: MatchStat[] = [];
  for (const [label, a] of rows[0]) {
    const b = rows[1].get(label);
    if (b === undefined || !label) continue;
    // ESPN prints percentages bare ("39", "46.2"); the unit is part of the reported figure.
    const upper = label.toUpperCase(), percent = upper.includes("%") || upper === "POSSESSION";
    const unit = (value: string) => (percent && /^\d+(\.\d+)?$/.test(value) ? `${value}%` : value);
    stats.push({ label: upper, a: unit(a), b: unit(b) });
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
  // Qualifying order is reported on the weekend's Qual session. It is not the grid (penalties
  // move drivers), so it prints as qualifying, never as the grid.
  const qualifying = arr(event.competitions).find(c => str(obj(c.type).abbreviation).toLowerCase().startsWith("qual"));
  const qualified = new Map(arr(qualifying?.competitors).map(c => [str(c.id), num(c.order)]));
  const classification: Finisher[] = ordered.slice(0, 6).map((c, i) => {
    const q = qualified.get(str(c.id));
    return { name: driverSide(c, i + 1).name, finished: i + 1, ...(q ? { qualified: q } : {}) };
  });
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
    classification,
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
  if (league.sport === "cricket") { a.score = cricketScore(a.score); b.score = cricketScore(b.score); }
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
    ...timelineOf(league, payload, competitors, a, b),
  };
}

/** Each sport's flow graph, from whatever ESPN reports for it. Racing has no summary to read. */
function timelineOf(league: EspnLeague, payload: Json, competitors: Json[], a: MatchSide, b: MatchSide): { timeline?: MatchTimeline } {
  const timeline = league.sport === "football" ? footballTimeline(payload, a, b)
    : league.sport === "basketball" ? basketballTimeline(payload, str(competitors[0].homeAway) === "home", { a: num(a.score), b: num(b.score) })
      : league.sport === "cricket" ? cricketTimeline(competitors)
        : undefined;
  return timeline ? { timeline } : {};
}

/** Commentary types that count as an attacking event. Goal kicks are restarts, and an own goal is not the scorer's attack. */
const attacking = /^(goal(?!-kick)|shot|corner|penalty---scored)/;
/**
 * Counts each side's shots, corners and goals per five-minute period from ESPN's
 * commentary, and marks goals from its key events. Stoppage time folds into the last
 * period of its half. Extra time adds periods; shootouts are left out.
 */
export function footballTimeline(payload: Json, a: MatchSide, b: MatchSide): MatchTimeline | undefined {
  const sideOf = (team: Json): "A" | "B" | undefined => {
    const id = str(team.id), name = str(team.displayName);
    if ((id && id === a.id) || (name && name === a.name)) return "A";
    if ((id && id === b.id) || (name && name === b.name)) return "B";
  };
  const minuteOf = (play: Json) => {
    const period = Number(obj(play.period).number) || 1, seconds = Number(obj(play.clock).value);
    if (period > 4 || !Number.isFinite(seconds)) return undefined;
    const minute = Math.max(1, Math.ceil(seconds / 60));
    const [from, to] = [[1, 45], [46, 90], [91, 105], [106, 120]][period - 1];
    return Math.min(to, Math.max(from, minute));
  };
  const plays = arr(payload.commentary).map(entry => obj(entry.play)).filter(play => attacking.test(str(obj(play.type).type)));
  const goals = arr(payload.keyEvents).filter(event => event.scoringPlay === true && Number(obj(event.period).number) <= 4);
  const events = plays.map(play => ({ side: sideOf(obj(play.team)), minute: minuteOf(play) }));
  if (!events.some(event => event.side && event.minute)) return undefined;
  const periods = [...events, ...goals.map(goal => ({ minute: minuteOf(goal) }))].some(event => (event.minute ?? 0) > 90) ? 24 : 18;
  const bin = (minute: number) => Math.min(periods - 1, Math.floor((minute - 1) / 5));
  const series = { A: Array<number>(periods).fill(0), B: Array<number>(periods).fill(0) };
  // Goals are counted from the commentary like any other attack; key events only mark them.
  for (const { side, minute } of events) if (side && minute) series[side][bin(minute)]++;
  const markers = goals.flatMap(goal => {
    const side = sideOf(obj(goal.team)), minute = minuteOf(goal);
    return side && minute ? [{ at: bin(minute), side, label: str(obj(goal.clock).displayValue).slice(0, 12) }] : [];
  }).slice(0, 12);
  return { graph: "momentum", a: series.A, b: series.B, markers };
}

/** Only ESPN's own image CDN is fetched, so a hostile payload cannot point the importer elsewhere. */
export function isEspnImage(url: string) {
  try { const u = new URL(url); return u.protocol === "https:" && (u.hostname === "a.espncdn.com" || u.hostname.endsWith(".espncdn.com")); }
  catch { return false; }
}

/** `(Photo by Jane Doe/Getty Images)` and `Jane Doe/Getty Images` read the same on the artwork. */
const creditOf = (raw: string) => raw.trim().replace(/^\((.*)\)$/, "$1").replace(/^photo(?:\s+by)?\s*:?\s*/i, "").trim().slice(0, 120);

/** A league's news feed as stories with, where ESPN has one, a header photo. Video items are skipped. */
export function newsArticles(raw: unknown): NewsArticle[] {
  return arr(obj(raw).articles).flatMap(article => {
    const id = str(article.id), headline = str(article.headline).trim();
    if (!/^\d{1,20}$/.test(id) || !headline || str(article.type) === "Media") return [];
    const images = arr(article.images).filter(image => isEspnImage(str(image.url)) && str(image.type) !== "Media");
    const photo = images.find(image => str(image.type) === "header") ?? images[0];
    const size = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0);
    return [{
      id, headline: headline.slice(0, 300), description: str(article.description).trim().slice(0, 1200),
      published: str(article.published), byline: str(article.byline).slice(0, 120),
      link: str(obj(obj(article.links).web).href),
      ...(photo ? { image: { url: str(photo.url), credit: creditOf(str(photo.credit)), alt: str(photo.alt || photo.caption).slice(0, 300), width: size(photo.width), height: size(photo.height) } } : {}),
    }];
  });
}
