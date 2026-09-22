import { z } from "zod";
import type { Sport } from "./project";

/**
 * Match data comes from ESPN's public site API. It is unofficial and unauthenticated:
 * treat every response as untrusted, keep the studio working when it is unreachable,
 * and never present a club crest or athlete as endorsing StatOz.
 */
export const espnSports = {
  football: { path: "soccer", label: "Football" },
  basketball: { path: "basketball", label: "Basketball" },
  cricket: { path: "cricket", label: "Cricket" },
  motorsport: { path: "racing", label: "Motorsport" },
} as const satisfies Partial<Record<Sport, { path: string; label: string }>>;
export type EspnSport = keyof typeof espnSports;

export type EspnLeague = { id: string; sport: EspnSport; name: string; short: string };

/**
 * Cricket ids are per-series and change between tours, so that list ages faster than
 * the others. `GET /api/espn/leagues` is the single source the UI reads.
 */
export const espnLeagues: EspnLeague[] = [
  { id: "eng.1", sport: "football", name: "English Premier League", short: "EPL" },
  { id: "esp.1", sport: "football", name: "LaLiga", short: "LALIGA" },
  { id: "ita.1", sport: "football", name: "Serie A", short: "SERIE A" },
  { id: "ger.1", sport: "football", name: "Bundesliga", short: "BUNDESLIGA" },
  { id: "fra.1", sport: "football", name: "Ligue 1", short: "LIGUE 1" },
  { id: "uefa.champions", sport: "football", name: "UEFA Champions League", short: "UCL" },
  { id: "nba", sport: "basketball", name: "NBA", short: "NBA" },
  { id: "wnba", sport: "basketball", name: "WNBA", short: "WNBA" },
  { id: "8048", sport: "cricket", name: "Indian Premier League", short: "IPL" },
  { id: "19430", sport: "cricket", name: "ICC World Test Championship", short: "WTC" },
  { id: "8039", sport: "cricket", name: "Cricket World Cup", short: "WORLD CUP" },
  { id: "23810", sport: "cricket", name: "International fixtures", short: "INTERNATIONAL" },
  { id: "f1", sport: "motorsport", name: "Formula 1", short: "F1" },
];
export const leagueById = (id: string) => espnLeagues.find(l => l.id === id);

/** One side of a fixture. For a race this is a driver rather than a club. */
export type MatchSide = {
  id: string; name: string; shortName: string; abbreviation: string;
  score: string; logo?: string; color?: string; winner: boolean;
};
/** A stat both sides have, so it can be compared on a poster. */
export type MatchStat = { label: string; a: string; b: string };
/** A single-sided fact: player of the match, fastest lap, top scorer. */
export type MatchHighlight = { label: string; value: string };

export type MatchFacts = {
  sport: EspnSport; leagueId: string; leagueName: string;
  eventId: string; name: string; shortName: string; date: string;
  status: string; detail: string; completed: boolean;
  venue?: string; note?: string;
  a: MatchSide; b: MatchSide;
  stats: MatchStat[];
  highlights: MatchHighlight[];
};

/** A row in the date listing, before the expensive summary fetch. */
export type MatchListing = {
  eventId: string; leagueId: string; sport: EspnSport;
  name: string; shortName: string; date: string; detail: string; completed: boolean;
  a: { name: string; abbreviation: string; score: string };
  b: { name: string; abbreviation: string; score: string };
};

const id = z.string().regex(/^[a-zA-Z0-9_.-]{1,60}$/);
export const matchQuerySchema = z.object({
  leagueId: id,
  /** YYYYMMDD, the only form the ESPN scoreboard accepts. */
  date: z.string().regex(/^\d{8}$/, "Use a date in YYYYMMDD form."),
});
export const posterRequestSchema = z.object({
  leagueId: id,
  eventId: id,
  /** Required for racing, which has no per-event endpoint. */
  date: z.string().regex(/^\d{8}$/).optional(),
  /** Which comparable stat to feature. Omitted means the adapter's first choice. */
  statLabel: z.string().max(60).optional(),
  /** Fill this project instead of creating one. */
  projectId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(),
  pageIndex: z.number().int().min(0).max(11).optional(),
  templateId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(),
  format: z.enum(["square", "portrait", "reel", "landscape"]).optional(),
  crests: z.boolean().optional(),
});

/** ESPN marks the end of a fixture differently per sport. */
export const finishedStatuses = ["STATUS_FINAL", "STATUS_FULL_TIME", "STATUS_END_OF_EXTRATIME", "STATUS_END_OF_PLAY"];
