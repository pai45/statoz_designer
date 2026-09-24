import fs from "node:fs/promises";
import path from "node:path";
import { espnSports, leagueById, type EspnLeague } from "@/domain/espn";
import { atomicWrite, dataRoot, hash, StudioError } from "@/server/storage";

const BASE = "https://site.api.espn.com/apis/site/v2/sports";
const cacheRoot = path.join(/* turbopackIgnore: true */ dataRoot, "espn");
/** A finished fixture never changes, but a day's listing can, so keep the window short. */
const TTL_MS = 10 * 60_000;

export function requireLeague(leagueId: string): EspnLeague {
  const league = leagueById(leagueId);
  if (!league) throw new StudioError(`Unknown league: ${leagueId}.`, 404);
  return league;
}

/** `soccer/eng.1`, `basketball/nba`, `cricket/8048`, `racing/f1`. */
export const leaguePath = (league: EspnLeague) => `${espnSports[league.sport].path}/${league.id}`;

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const file = path.join(cacheRoot, `${hash(key).slice(0, 32)}.json`);
  const hit = await fs.readFile(file, "utf8").then(raw => JSON.parse(raw) as { at: number; body: T }).catch(() => null);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.body;
  try {
    const body = await load();
    await atomicWrite(file, { at: Date.now(), body });
    return body;
  } catch (error) {
    // A stale answer beats no answer when the network drops mid-session.
    if (hit) return hit.body;
    throw error;
  }
}

async function get<T>(url: string, attempt = 0): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { accept: "application/json", "user-agent": "StatOz Designer (local studio)" },
    cache: "no-store",
  }).catch(error => {
    throw new StudioError(`ESPN could not be reached (${(error as Error).message}). Check your connection and try again.`, 503);
  });
  // This feed is unofficial and returns the odd 5xx under rapid use. One retry clears it.
  if (response.status >= 500 && attempt < 1) {
    await new Promise(resolve => setTimeout(resolve, 1200));
    return get<T>(url, attempt + 1);
  }
  if (!response.ok) throw new StudioError(`ESPN returned ${response.status} for this request.`, response.status === 404 ? 404 : 502);
  return await response.json() as T;
}

export function scoreboard<T>(league: EspnLeague, date: string): Promise<T> {
  const url = `${BASE}/${leaguePath(league)}/scoreboard?dates=${date}`;
  return cached(url, () => get<T>(url));
}
export function summary<T>(league: EspnLeague, eventId: string): Promise<T> {
  const url = `${BASE}/${leaguePath(league)}/summary?event=${eventId}`;
  return cached(url, () => get<T>(url));
}
export function news<T>(league: EspnLeague): Promise<T> {
  const url = `${BASE}/${leaguePath(league)}/news?limit=30`;
  return cached(url, () => get<T>(url));
}
