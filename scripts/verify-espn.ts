/**
 * Checks the ESPN adapters against the live feed, one league per sport.
 *
 *   npm run test:espn
 *
 * Network-dependent by nature: a failure here can mean ESPN changed its payload, or
 * simply that the connection is down. The message says which.
 */
import { espnLeagues, type EspnSport } from "../src/domain/espn";
import { initialize } from "../src/server/storage";
import { espnMatch, espnMatches } from "../src/server/espn/queue";
import { featuredStat, sceneFieldsFor } from "../src/server/espn/poster";

await initialize();
const days = Number(process.argv.find(a => a.startsWith("--days="))?.split("=")[1] ?? 10);
const stamp = (offset: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - offset); return d.toISOString().slice(0, 10).replace(/-/g, ""); };

let failures = 0, checked = 0;
for (const sport of ["football", "basketball", "cricket", "motorsport"] as EspnSport[]) {
  const leagues = espnLeagues.filter(l => l.sport === sport);
  let done = false;
  for (const league of leagues) {
    if (done) break;
    for (let offset = 0; offset <= days && !done; offset++) {
      let listing;
      // Pace the probes: this walks many dates and the feed throttles rapid callers.
      await new Promise(resolve => setTimeout(resolve, 150));
      try { listing = await espnMatches({ leagueId: league.id, date: stamp(offset) }); }
      catch (error) { console.error(`  ${league.name}: ${(error as Error).message}`); break; }
      const finished = listing.filter(m => m.completed);
      if (!finished.length) continue;
      const match = finished[0];
      try {
        const facts = await espnMatch(league.id, match.eventId, stamp(offset));
        const stat = featuredStat(facts);
        // Crests are skipped here: this checks the data shape, not the downloader.
        const fields = sceneFieldsFor(facts, stat, { a: "", b: "" });
        const problems: string[] = [];
        if (!facts.a.name || !facts.b.name) problems.push("a side has no name");
        if (!fields.eyebrow) problems.push("no eyebrow");
        if (!fields.headline) problems.push("no headline");
        if (sport !== "motorsport" && !stat) problems.push("no comparable stat");
        checked++;
        if (problems.length) { failures++; console.error(`FAIL ${league.name} ${match.shortName}: ${problems.join(", ")}`); }
        else console.log(`OK   ${league.name.padEnd(30)} ${facts.shortName.padEnd(14)} ${String(stat?.label ?? "podium").padEnd(16)} ${facts.stats.length} stats, ${facts.highlights.length} highlights`);
        done = true;
      } catch (error) { failures++; console.error(`FAIL ${league.name} ${match.eventId}: ${(error as Error).message}`); done = true; }
    }
  }
  if (!done) console.error(`SKIP ${sport}: no finished fixture in the last ${days} days.`);
}
console.log(`\nChecked ${checked} match(es) across four sports.`);
if (failures) process.exitCode = 1;
