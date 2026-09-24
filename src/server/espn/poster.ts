import type { MatchFacts, MatchStat } from "@/domain/espn";
import type { Format, Project, Scene, Sport } from "@/domain/project";
import { beatOf, comparable, readableColor, type Beat } from "@/domain/match-story";
import { createProject, templateFor } from "@/features/templates/registry";
import { importCrest } from "@/server/espn/crests";

/** The stat each sport leads with when the person has not chosen one. */
const preferred: Record<string, string[]> = {
  football: ["POSSESSION", "SHOTS", "ON GOAL", "SHOTS ON GOAL", "CORNER KICKS", "FOULS"],
  basketball: ["FIELD GOAL %", "THREE POINT %", "REBOUNDS", "ASSISTS", "TURNOVERS", "POINTS IN PAINT", "FAST BREAK POINTS", "STEALS", "BLOCKS", "FREE THROW %"],
  cricket: ["1ST INNINGS", "2ND INNINGS", "RUN RATE", "FOURS", "SIXES", "EXTRAS", "WICKETS", "OVERS", "RUNS"],
  motorsport: [],
};

/**
 * Puts the sport's headline stat first, so `stats[0]` is genuinely the default the
 * poster will use and the picker can name it honestly.
 */
export function orderStats(facts: MatchFacts): MatchFacts {
  const order = preferred[facts.sport] ?? [];
  const rank = (s: MatchStat) => { const i = order.indexOf(s.label); return i === -1 ? order.length : i; };
  return { ...facts, stats: [...facts.stats].sort((a, b) => rank(a) - rank(b)) };
}

export function featuredStat(facts: MatchFacts, wanted?: string): MatchStat | undefined {
  if (wanted) { const exact = facts.stats.find(s => s.label === wanted.toUpperCase()); if (exact) return exact; }
  return orderStats(facts).stats[0];
}

/** Percentages and fractions both appear; only a plain number can drive the chart. */
const numeric = (value: string) => { const match = /-?\d+(\.\d+)?/.exec(value.replace(/,/g, "")); return match ? Number(match[0]) : NaN; };

/**
 * Turns a stat pair into the 2-12 values in 0-100 the chart expects. A share of the
 * pair keeps two very different scales (possession vs rebounds) readable.
 */
function chartFor(stat: MatchStat | undefined): number[] | undefined {
  if (!stat) return undefined;
  const a = numeric(stat.a), b = numeric(stat.b);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a + b <= 0) return undefined;
  const shareA = Math.round((a / (a + b)) * 100);
  return [Math.max(0, Math.min(100, shareA)), Math.max(0, Math.min(100, 100 - shareA))];
}

/**
 * Formatted in UTC on purpose. ESPN dates the fixture in UTC and the picker browses by
 * that date, so formatting in the machine's zone would print the day after for an
 * evening kick-off.
 */
const dateLabel = (iso: string) => {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
};

/**
 * The rows a match story compares. Split bars need a number on each side, so "5-23" style
 * made-attempted pairs give way to the sport's percentages. A race has no two-sided stat:
 * its rows are the top of the classification, driver | qualified | finished.
 */
export function storyStats(facts: MatchFacts): Scene["matchStats"] {
  if (facts.sport === "motorsport") return (facts.classification ?? []).slice(0, 6)
    .map(f => ({ label: f.name.slice(0, 40), a: f.qualified ? `P${f.qualified}` : "", b: `P${f.finished}` }));
  const ordered = orderStats(facts).stats;
  const usable = ordered.filter(s => comparable(s.a) && comparable(s.b));
  return (usable.length >= 3 ? usable : ordered).slice(0, 5).map(s => ({ label: s.label.slice(0, 40), a: s.a.slice(0, 20), b: s.b.slice(0, 20) }));
}

/** The fixture itself — sides, score, reported stats, colours and crests — which every beat of a match story shares. */
export function matchDataFor(facts: MatchFacts, crests: { a: string; b: string }): Partial<Scene> {
  return {
    nameA: facts.a.name.slice(0, 300), nameB: facts.b.name.slice(0, 300),
    scoreA: facts.a.score.slice(0, 30), scoreB: facts.b.score.slice(0, 30),
    matchStats: storyStats(facts),
    colorA: readableColor(facts.a.color ?? ""), colorB: readableColor(facts.b.color ?? ""),
    ...(crests.a ? { emblemA: crests.a } : {}),
    ...(crests.b ? { emblemB: crests.b } : {}),
  };
}

/** Who won, from ESPN's flag or, failing that, the scoreline. Undefined for a draw or an unfinished match. */
function winnerOf(facts: MatchFacts) {
  if (facts.a.winner !== facts.b.winner) return facts.a.winner ? facts.a : facts.b;
  const a = Number(facts.a.score), b = Number(facts.b.score);
  if (facts.completed && facts.sport !== "cricket" && Number.isFinite(a) && Number.isFinite(b) && a !== b && facts.a.score && facts.b.score) return a > b ? facts.a : facts.b;
}

/** The score beat's headline states the result, and nothing more. */
export function resultHeadline(facts: MatchFacts): string | undefined {
  if (!facts.completed) return undefined;
  if (facts.sport === "motorsport") return `${facts.a.shortName.replace(/^\p{L}\.\s+/u, "") || facts.a.name}\nwins.`;
  const winner = winnerOf(facts);
  // "Chennai Super Kings win it." would run to three lines, so a long name gives way to its abbreviation.
  if (winner) return `${(winner.shortName.length <= 14 ? winner.shortName : winner.abbreviation) || winner.name}\nwin it.`;
  const level = facts.a.score !== "" && facts.a.score === facts.b.score;
  if (level || /\b(draw|drawn|tied)\b/i.test(facts.note ?? "")) return "Honours\neven.";
}

/** ESPN's status detail says "FT" or "Final" on every finished match; the status chip already does. */
const informative = (detail: string) => !/^(ft|final|full[ -]time|result)$/i.test(detail.trim());

const order: Record<Beat, number> = { score: 0, stats: 1, graph: 2, pick: 3 };
const weights: Record<Beat, number> = { score: 2, stats: 3, graph: 3, pick: 2 };

/**
 * Keeps only the beats this match has data for, so a story never exports an empty chart or
 * a blank stats panel, and brings back a beat an earlier fill left out once a match can fill
 * it again. When the beats change, the running time is shared out again by beat weight.
 */
function beatsFor(project: Project, has: Record<Beat, boolean>): (Scene & { beat: Beat })[] {
  const pages = project.pages.map((page, i) => ({ ...page, beat: beatOf(page, i, project.pages.length) }));
  const kept = pages.filter(page => has[page.beat]);
  if (!kept.some(page => page.beat === "score" || page.beat === "pick")) return pages;
  const missing = (["stats", "graph"] as const).filter(beat => has[beat] && !kept.some(page => page.beat === beat));
  for (const beat of missing) {
    const fresh = createProject(project.templateId, project.format, project.sport, 15).pages.find(page => page.beat === beat);
    if (!fresh) continue;
    const at = kept.findIndex(page => order[page.beat] > order[beat]);
    kept.splice(at < 0 ? kept.length : at, 0, { ...fresh, beat });
  }
  if (kept.length === pages.length && !missing.length) return kept;
  const frames = Math.round(pages.reduce((n, page) => n + page.duration, 0) * 30);
  const sum = kept.reduce((n, page) => n + weights[page.beat], 0);
  let assigned = 0;
  return kept.map((page, i) => {
    const share = i === kept.length - 1 ? frames - assigned : Math.round(frames * weights[page.beat] / sum);
    assigned += share;
    return { ...page, duration: share / 30 };
  });
}

/**
 * Fills a match story from a fixture. The graph comes from each sport's reported flow:
 * football's attacks, basketball's running score, a limited-overs run worm. A beat with no
 * data is left out rather than exported empty, and the crowd vote is always cleared, so no
 * sample figure is left beside real teams.
 */
export function fillMatchStory(project: Project, facts: MatchFacts, crests: { a: string; b: string }): Project {
  const flow = facts.timeline
    ? { graph: facts.timeline.graph, seriesA: facts.timeline.a, seriesB: facts.timeline.b, markers: facts.timeline.markers }
    : { seriesA: [], seriesB: [], markers: [] };
  const winner = winnerOf(facts);
  const data: Partial<Scene> = { ...matchDataFor(facts, crests), ...flow, winner: winner ? (winner === facts.a ? "A" : "B") : "none", pickShare: null, pickVotes: "" };
  const eyebrow = [facts.leagueName.toUpperCase(), dateLabel(facts.date)].filter(Boolean).join(" · ").slice(0, 300);
  const body = [facts.note || (informative(facts.detail) ? facts.detail : ""), facts.venue].filter(Boolean).join(" · ").slice(0, 1200);
  const headline = resultHeadline(facts);
  // The graph caption is a claim about the match, so sample wording never survives a fill.
  const copy: Partial<Record<Beat, Partial<Scene>>> = {
    score: { eyebrow, body, ...(headline ? { headline: headline.slice(0, 300) } : {}) },
    graph: { body: "" },
    ...(facts.sport === "motorsport" ? { stats: { eyebrow: "01 / THE CLASSIFICATION", headline: "How they\nfinished." } } : {}),
  };
  const has: Record<Beat, boolean> = { score: true, stats: !!data.matchStats?.length, graph: !!facts.timeline, pick: true };
  return { ...project, pages: beatsFor(project, has).map(page => ({ ...page, ...data, ...copy[page.beat] })) };
}

/** Facts only — no invented claims, and nothing that reads as an endorsement. */
export function sceneFieldsFor(facts: MatchFacts, stat: MatchStat | undefined, crests: { a: string; b: string }): Partial<Scene> {
  const chart = chartFor(stat);
  const headline = facts.sport === "motorsport"
    ? `${facts.a.name}\nwins.`
    : facts.completed
      ? "A finish\nto remember."
      : "Two sides.\nOne statement.";
  const body = [facts.note || facts.detail, facts.venue, ...facts.highlights.map(h => `${h.label}: ${h.value}`)].filter(Boolean).join(" · ").slice(0, 1200);
  return {
    eyebrow: [facts.leagueName.toUpperCase(), dateLabel(facts.date)].filter(Boolean).join(" · ").slice(0, 300),
    headline: headline.slice(0, 300),
    body,
    nameA: facts.a.name.slice(0, 300), nameB: facts.b.name.slice(0, 300),
    scoreA: facts.a.score.slice(0, 30), scoreB: facts.b.score.slice(0, 30),
    ...(stat ? { statLabel: stat.label.slice(0, 300), statValue: `${stat.a} — ${stat.b}`.slice(0, 40) } : {}),
    ...(chart ? { chartValues: chart } : {}),
    ...(crests.a ? { emblemA: crests.a } : {}),
    ...(crests.b ? { emblemB: crests.b } : {}),
  };
}

const defaultTemplate = (facts: MatchFacts) => (facts.completed ? "match-result" : "match-preview");

export async function buildPoster(facts: MatchFacts, options: { statLabel?: string; templateId?: string; format?: Format; duration?: number; crests?: boolean }): Promise<Project> {
  const stat = featuredStat(facts, options.statLabel);
  const crests = options.crests === false ? { a: "", b: "" }
    : { a: await importCrest(facts.a, facts.sport), b: await importCrest(facts.b, facts.sport) };
  const templateId = options.templateId ?? defaultTemplate(facts);
  const video = templateFor(templateId).kind === "video";
  const project = createProject(templateId, options.format ?? "portrait", facts.sport as Sport, video ? options.duration ?? 15 : undefined);
  project.name = `${facts.shortName} · ${facts.leagueName}`.slice(0, 120);
  project.brief = {
    objective: `A ${facts.completed ? "result" : "preview"} ${video ? "match story" : "poster"} for ${facts.name} in the ${facts.leagueName}. Match data from ESPN; figures are reported, not predicted.`.slice(0, 1500),
    audience: project.brief.audience,
  };
  if (templateFor(project.templateId).visual === "match-story") return fillMatchStory(project, facts, crests);
  const fields = sceneFieldsFor(facts, stat, crests);
  project.pages = project.pages.map(page => ({ ...page, ...fields }));
  return project;
}
