import type { MatchFacts, MatchStat } from "@/domain/espn";
import type { Format, Project, Scene, Sport } from "@/domain/project";
import { createProject } from "@/features/templates/registry";
import { importCrest } from "@/server/espn/crests";

/** The stat each sport leads with when the person has not chosen one. */
const preferred: Record<string, string[]> = {
  football: ["POSSESSION", "SHOTS", "ON GOAL", "SHOTS ON GOAL", "CORNER KICKS"],
  basketball: ["FIELD GOAL %", "REBOUNDS", "ASSISTS", "3PT", "FG"],
  cricket: ["RUNS", "WICKETS", "OVERS"],
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

export async function buildPoster(facts: MatchFacts, options: { statLabel?: string; templateId?: string; format?: Format; crests?: boolean }): Promise<Project> {
  const stat = featuredStat(facts, options.statLabel);
  const crests = options.crests === false ? { a: "", b: "" }
    : { a: await importCrest(facts.a, facts.sport), b: await importCrest(facts.b, facts.sport) };
  const project = createProject(options.templateId ?? defaultTemplate(facts), options.format ?? "portrait", facts.sport as Sport);
  project.name = `${facts.shortName} · ${facts.leagueName}`.slice(0, 120);
  project.brief = {
    objective: `A ${facts.completed ? "result" : "preview"} poster for ${facts.name} in the ${facts.leagueName}. Match data from ESPN; figures are reported, not predicted.`.slice(0, 1500),
    audience: project.brief.audience,
  };
  const fields = sceneFieldsFor(facts, stat, crests);
  project.pages = project.pages.map(page => ({ ...page, ...fields }));
  return project;
}
