import type { z } from "zod";
import { espnLeagues, matchQuerySchema, posterRequestSchema, type MatchFacts, type MatchListing } from "@/domain/espn";
import { addProject, readProject, saveProject, StudioError } from "@/server/storage";
import { listMatches, matchFacts, raceFacts } from "@/server/espn/adapters";
import { requireLeague, scoreboard, summary } from "@/server/espn/client";
import { buildPoster, featuredStat, orderStats, sceneFieldsFor } from "@/server/espn/poster";
import { importCrest } from "@/server/espn/crests";

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new StudioError(result.error.issues.map(issue => issue.message).join(" "));
  return result.data;
}

export const espnCatalogue = () => espnLeagues;

export async function espnMatches(input: unknown): Promise<MatchListing[]> {
  const { leagueId, date } = parse(matchQuerySchema, input);
  const league = requireLeague(leagueId);
  return listMatches(league, await scoreboard(league, date));
}

export async function espnMatch(leagueId: string, eventId: string, date?: string): Promise<MatchFacts> {
  const league = requireLeague(leagueId);
  if (league.sport !== "motorsport") return orderStats(matchFacts(league, await summary(league, eventId)));
  // Racing has no summary endpoint; the scoreboard for the weekend carries the result.
  if (!date) throw new StudioError("Pick the race from a date so its results can be read.", 400);
  const board = await scoreboard<{ events?: unknown }>(league, date);
  const event = (Array.isArray(board.events) ? board.events : []).find(e => String((e as { id?: unknown }).id) === eventId);
  if (!event) throw new StudioError("That race is not on the chosen date.", 404);
  return raceFacts(league, event as Record<string, unknown>);
}

/**
 * Creates a poster project from a match, or fills a scene of an existing one. Facts are
 * written into ordinary project fields, so nothing has to reach the network at render time.
 */
export async function espnPoster(input: unknown) {
  const request = parse(posterRequestSchema, input);
  const facts = await espnMatch(request.leagueId, request.eventId, request.date);

  if (!request.projectId) {
    const project = await buildPoster(facts, request);
    await addProject(project);
    return { project, facts };
  }

  const current = await readProject(request.projectId);
  const stat = featuredStat(facts, request.statLabel);
  const crests = request.crests === false ? { a: "", b: "" }
    : { a: await importCrest(facts.a, facts.sport), b: await importCrest(facts.b, facts.sport) };
  const index = Math.min(request.pageIndex ?? 0, current.project.pages.length - 1);
  const fields = sceneFieldsFor(facts, stat, crests);
  const project = { ...current.project, pages: current.project.pages.map((page, i) => (i === index ? { ...page, ...fields } : page)) };
  const saved = await saveProject(project, current.etag);
  return { project: saved.project, etag: saved.etag, facts };
}
