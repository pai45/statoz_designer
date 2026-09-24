import assert from "node:assert/strict";
import test from "node:test";
import type { MatchFacts } from "../src/domain/espn";
import { buildPoster, fillMatchStory, sceneFieldsFor } from "../src/server/espn/poster";
import { basketballTimeline, cricketStats, cricketTimeline, footballTimeline, isEspnImage, matchFacts, newsArticles, raceFacts } from "../src/server/espn/adapters";
import { classificationOf, contrast, shareOf, winnerSide } from "../src/domain/match-story";
import { projectSchema } from "../src/domain/project";
import { createProject } from "../src/features/templates/registry";

const fixture: MatchFacts = {
  sport: "football", leagueId: "esp.1", leagueName: "LaLiga", eventId: "match-1",
  name: "Atlético Madrid v Real Madrid", shortName: "ATM v RMA", date: "2026-09-20T19:00:00Z",
  status: "STATUS_FULL_TIME", detail: "FT", completed: true,
  a: { id: "atm", name: "Atlético Madrid", shortName: "Atlético", abbreviation: "ATM", score: "2", winner: true },
  b: { id: "rma", name: "Real Madrid", shortName: "Real Madrid", abbreviation: "RMA", score: "1", winner: false },
  stats: [{ label: "POSSESSION", a: "60.9", b: "39.1" }], highlights: [],
};

test("match poster copy leaves the score to the scoreboard", () => {
  const result = sceneFieldsFor(fixture, fixture.stats[0], { a: "", b: "" });
  assert.equal(result.headline, "A finish\nto remember.");
  assert.equal(result.scoreA, "2");
  assert.equal(result.scoreB, "1");

  const preview = sceneFieldsFor({ ...fixture, completed: false }, fixture.stats[0], { a: "", b: "" });
  assert.equal(preview.headline, "Two sides.\nOne statement.");
});

test("a match story takes the fixture on every beat and leaves out a graph it has no data for", () => {
  const stats = ["POSSESSION", "SHOTS", "ON GOAL", "CORNER KICKS", "FOULS", "OFFSIDES"].map((label, i) => ({ label, a: String(10 + i), b: String(5 + i) }));
  const story = createProject("match-story", "reel", "football", 15);
  const filled = fillMatchStory(story, { ...fixture, stats, a: { ...fixture.a, color: "#132257" } }, { a: "crest-a", b: "" });
  assert.deepEqual(filled.pages.map(page => page.beat), ["score", "stats", "pick"], "no timeline, so no empty chart is exported");
  assert.equal(Math.round(filled.pages.reduce((n, page) => n + page.duration, 0) * 30), 450, "the running time is shared out, not lost");
  assert.deepEqual(filled.pages.map(page => Math.round(page.duration * 30)), [129, 193, 128]);
  assert.equal(filled.pages.every(page => page.nameA === "Atlético Madrid" && page.scoreA === "2" && page.emblemA === "crest-a"), true);
  assert.deepEqual(filled.pages[1].matchStats.map(row => row.label), stats.slice(0, 5).map(row => row.label));
  assert.equal(filled.pages.every(page => !page.seriesA.length && !page.markers.length && page.pickShare === null), true);
  assert.ok(contrast(filled.pages[0].colorA, "#10192d") >= 4.5);
  assert.equal(filled.pages[0].colorB, "");
  assert.match(filled.pages[0].eyebrow, /^LALIGA · 20 SEPT? 2026$/); // ICU versions abbreviate September differently.
  assert.equal(filled.pages[0].headline, "Atlético\nwin it.", "the score beat states the result");
  assert.equal(filled.pages[0].body, "", "a bare \"FT\" is left to the status chip");
  assert.equal(filled.pages[0].winner, "A");
  assert.equal(filled.pages[2].headline, story.pages[3].headline, "beat copy is kept");
  assert.equal(projectSchema.safeParse(filled).success, true);

  const timeline = { graph: "momentum" as const, a: [1, 0, 2], b: [0, 3, 1], markers: [{ at: 2, side: "A" as const, label: "12'" }] };
  const flowing = fillMatchStory(filled, { ...fixture, timeline }, { a: "", b: "" });
  assert.deepEqual(flowing.pages.map(page => page.beat), ["score", "stats", "graph", "pick"], "a refill brings the graph back once there is data");
  assert.equal(Math.round(flowing.pages.reduce((n, page) => n + page.duration, 0) * 30), 450);
  assert.deepEqual([flowing.pages[2].seriesA, flowing.pages[2].seriesB, flowing.pages[2].markers], [timeline.a, timeline.b, timeline.markers]);
  assert.equal(flowing.pages[2].graph, "momentum");
  assert.equal(flowing.pages[2].body, "", "the sample graph caption is not left under real data");
  assert.equal(flowing.pages[3].pickShare, null, "the crowd share is never filled from ESPN");
  assert.deepEqual(fillMatchStory(flowing, { ...fixture, timeline }, { a: "", b: "" }).pages.map(page => page.duration), flowing.pages.map(page => page.duration), "an unchanged beat list keeps its timing");

  const drawn = fillMatchStory(story, { ...fixture, a: { ...fixture.a, score: "1", winner: false }, b: { ...fixture.b, score: "1" } }, { a: "", b: "" });
  assert.equal(drawn.pages[0].headline, "Honours\neven.");
  assert.equal(drawn.pages[0].winner, "none");
});

test("a race story leads with the podium and compares the classification", () => {
  const race: MatchFacts = {
    ...fixture, sport: "motorsport", leagueId: "f1", leagueName: "Formula 1", detail: "Final", venue: "Madring",
    a: { id: "5829", name: "Kimi Antonelli", shortName: "K. Antonelli", abbreviation: "ANT", score: "P1", winner: true },
    b: { id: "4665", name: "Max Verstappen", shortName: "M. Verstappen", abbreviation: "VER", score: "P2", winner: false },
    stats: [], classification: [{ name: "Kimi Antonelli", qualified: 2, finished: 1 }, { name: "Max Verstappen", qualified: 3, finished: 2 }, { name: "Lando Norris", finished: 3 }],
  };
  const story = fillMatchStory(createProject("match-story", "portrait", "motorsport", 15), race, { a: "", b: "" });
  assert.deepEqual(story.pages.map(page => page.beat), ["score", "stats", "pick"]);
  assert.equal(story.pages[0].headline, "Antonelli\nwins.");
  assert.equal(story.pages[0].body, "Madring");
  assert.deepEqual(story.pages[1].matchStats, [{ label: "Kimi Antonelli", a: "P2", b: "P1" }, { label: "Max Verstappen", a: "P3", b: "P2" }, { label: "Lando Norris", a: "", b: "P3" }]);
  assert.deepEqual(classificationOf(story.pages[1]), [{ name: "Kimi Antonelli", qualified: 2, finished: 1 }, { name: "Max Verstappen", qualified: 3, finished: 2 }, { name: "Lando Norris", finished: 3 }]);
  assert.equal(story.pages[1].headline, "How they\nfinished.");
  assert.equal(projectSchema.safeParse(story).success, true);
});

test("creating a match story from a fixture gives the video a running time", async () => {
  const project = await buildPoster(fixture, { templateId: "match-story", format: "reel", duration: 12, crests: false });
  assert.equal(project.kind, "video");
  assert.equal(Math.round(project.pages.reduce((n, page) => n + page.duration, 0) * 30), 360);
  assert.equal(projectSchema.safeParse(project).success, true);
});

test("the score beat reveals the winner from the scoreline, except where a scoreline cannot say", () => {
  const page = createProject("match-story", "reel", "football", 12).pages[0];
  assert.equal(winnerSide({ ...page, winner: "", scoreA: "2", scoreB: "1" }, "football"), "A");
  assert.equal(winnerSide({ ...page, winner: "", scoreA: "98", scoreB: "104" }, "basketball"), "B");
  assert.equal(winnerSide({ ...page, winner: "", scoreA: "1", scoreB: "1" }, "football"), "");
  assert.equal(winnerSide({ ...page, winner: "", scoreA: "P2", scoreB: "P1" }, "motorsport"), "B");
  assert.equal(winnerSide({ ...page, winner: "", scoreA: "453 & 130/2", scoreB: "133 & 449" }, "cricket"), "");
  assert.equal(winnerSide({ ...page, winner: "A", scoreA: "453 & 130/2", scoreB: "133 & 449" }, "cricket"), "A");
  assert.equal(winnerSide({ ...page, winner: "none", scoreA: "2", scoreB: "1" }, "football"), "");
  assert.equal(shareOf("130/2", "449"), 130 / 579, "a cricket innings compares on its runs");
});

const innings = (period: number, runs: number, wickets: number, overs: number, extra: Record<string, unknown> = {}) => ({
  period, isBatting: "true", runs, wickets, overs, fours: 10, sixes: 2, description: wickets === 10 ? "all out" : "",
  statistics: { categories: [{ stats: [{ name: "runRate", displayValue: (runs / overs).toFixed(2) }, { name: "extras", displayValue: "7" }] }], ...extra },
});
const fielding = (period: number) => ({ period, isBatting: false, runs: 0, wickets: 0, overs: 20, statistics: {} });

test("cricket compares innings from the linescores and flags the winner ESPN sends as a string", () => {
  const perOver = (runs: number[], wicketAt: number[]) => ({ overs: [runs.map((r, i) => ({ number: String(i + 1), runs: String(r), wicket: wicketAt.includes(i) ? [{}] : [] }))] });
  const header = {
    header: { competitions: [{ status: { type: { state: "post" } }, competitors: [
      { team: { id: "1", displayName: "Chennai Super Kings", name: "Chennai Super Kings", abbreviation: "CSK" }, winner: "true", score: "25/1 (3 ov)", linescores: [fielding(1), innings(2, 25, 1, 3, perOver([10, 7, 8], [1]))] },
      { team: { id: "2", displayName: "Lucknow Super Giants", name: "Lucknow Super Giants", abbreviation: "LSG" }, winner: "false", score: "24/3", linescores: [innings(1, 24, 3, 3, perOver([4, 12, 8], [0, 2])), fielding(2)] },
    ] }] },
  };
  const facts = matchFacts({ id: "8048", sport: "cricket", name: "Indian Premier League", short: "IPL" }, header);
  assert.equal(facts.a.winner, true); assert.equal(facts.b.winner, false);
  assert.equal(facts.a.score, "25/1", "overs and targets leave the scoreline");
  assert.deepEqual(facts.stats.map(s => s.label), ["RUN RATE", "FOURS", "SIXES", "EXTRAS", "WICKETS", "OVERS"]);
  assert.deepEqual(facts.timeline, { graph: "race", a: [10, 17, 25], b: [4, 16, 24], markers: [{ at: 1, side: "A", label: "W" }, { at: 0, side: "B", label: "W" }, { at: 2, side: "B", label: "W" }] });

  const testMatch = [
    { team: { id: "1", name: "England" }, winner: "true", score: "453 & 130/2 (24.2 ov, target 130)", linescores: [innings(2, 453, 10, 89), innings(4, 130, 2, 24.2)] },
    { team: { id: "7", name: "Pakistan" }, winner: "false", score: "133 & 449", linescores: [innings(1, 133, 10, 33.5), innings(3, 449, 10, 96.4)] },
  ];
  assert.deepEqual(cricketStats(testMatch).slice(0, 2), [{ label: "1ST INNINGS", a: "453", b: "133" }, { label: "2ND INNINGS", a: "130/2", b: "449" }]);
  assert.deepEqual(cricketStats(testMatch)[2], { label: "FOURS", a: "20", b: "20" }, "a Test sums boundaries across innings");
  assert.equal(cricketTimeline(testMatch), undefined, "a Test has no common over axis");
  // ESPN repeats the first innings' overs on a second innings; totals that do not add up are dropped.
  const mismatched = [{ linescores: [innings(1, 50, 1, 3, perOver([10, 10, 10], []))] }, { linescores: [innings(2, 30, 1, 3, perOver([10, 10, 10], []))] }];
  assert.equal(cricketTimeline(mismatched), undefined);
});

test("basketball's scoring run reads the running score at even checkpoints and marks lead changes", () => {
  const play = (period: number, clock: string, home: number, away: number) => ({ period: { number: period }, clock: { displayValue: clock }, homeScore: home, awayScore: away });
  const plays = [play(1, "10:00", 0, 0)];
  // Home leads 10-4 at the first quarter mark, away takes the lead in the second, home finishes 20-16.
  for (let i = 1; i <= 10; i++) plays.push(play(1, `${10 - i}:00`, i, Math.floor(i * .4)));
  for (let i = 1; i <= 10; i++) plays.push(play(2, `${10 - i}:00`, 10, 4 + i));
  plays.push(play(3, "5:00", 12, 14), play(4, "2:00", 18, 16), play(4, "0.0", 20, 16));
  const payload = { format: { regulation: { periods: 4, clock: 600 }, overtime: { clock: 300 } }, plays };
  const timeline = basketballTimeline(payload, true, { a: 20, b: 16 })!;
  assert.equal(timeline.graph, "lead");
  assert.equal(timeline.a.length, 17, "four checkpoints a quarter, plus tip-off");
  assert.deepEqual([timeline.a[4], timeline.b[4]], [10, 4], "end of the first quarter");
  assert.deepEqual([timeline.a[16], timeline.b[16]], [20, 16]);
  assert.deepEqual(timeline.markers.map(m => `${m.side} ${m.label}`), ["B LEAD Q2", "A LEAD Q4"]);
  assert.deepEqual(basketballTimeline(payload, false, { a: 16, b: 20 })!.a.slice(-1), [16], "side A follows home or away");
  assert.equal(basketballTimeline(payload, true, { a: 21, b: 16 }), undefined, "a play-by-play that disagrees with the final is not drawn");
});

test("a race keeps drivers' ids and flags, and reads qualifying from the weekend", () => {
  const driver = (id: string, order: number, name: string, flag?: string) => ({ id, order, athlete: { displayName: name, shortName: name, ...(flag ? { flag: { href: flag } } : {}) } });
  const event = { id: "600", name: "Spanish Grand Prix", competitions: [
    { type: { abbreviation: "Qual" }, competitors: [driver("3", 1, "Lando Norris"), driver("1", 2, "Kimi Antonelli"), driver("2", 3, "Max Verstappen")] },
    { type: { abbreviation: "Race" }, status: { type: { state: "post" } }, competitors: [driver("1", 1, "Kimi Antonelli", "https://a.espncdn.com/i/teamlogos/countries/500/ita.png"), driver("2", 2, "Max Verstappen"), driver("3", 3, "Lando Norris")] },
  ] };
  const facts = raceFacts({ id: "f1", sport: "motorsport", name: "Formula 1", short: "F1" }, event);
  assert.equal(facts.a.id, "1", "never the finishing position, which the crest cache would reuse");
  assert.equal(facts.a.logo, "https://a.espncdn.com/i/teamlogos/countries/500/ita.png");
  assert.deepEqual(facts.classification, [{ name: "Kimi Antonelli", finished: 1, qualified: 2 }, { name: "Max Verstappen", finished: 2, qualified: 3 }, { name: "Lando Norris", finished: 3, qualified: 1 }]);
  assert.deepEqual(facts.stats, [], "a race has no two-sided stat for a poster to feature");
});

test("football momentum counts each side's shots and corners per five minutes from the commentary", () => {
  const a = { ...fixture.a, id: "382", name: "Manchester City" }, b = { ...fixture.b, id: "366", name: "Sunderland" };
  const play = (type: string, team: string, period: number, seconds: number) => ({ play: { type: { type }, team: { displayName: team }, period: { number: period }, clock: { value: seconds } } });
  const payload = {
    commentary: [
      play("shot-on-target", "Manchester City", 1, 100), play("corner-awarded", "Manchester City", 1, 250), play("goal", "Sunderland", 1, 674),
      play("foul", "Sunderland", 1, 700), play("goal-kick", "Sunderland", 1, 710), play("own-goal", "Sunderland", 1, 800),
      play("shot-blocked", "Sunderland", 1, 2940), // 49' in the first half is stoppage time, counted in 41–45'
      play("shot-off-target", "Manchester City", 2, 5700), // 95' folds into the last period
      play("shot-on-target", "Manchester City", 5, 7300), // shootout is left out
    ],
    keyEvents: [{ scoringPlay: true, team: { id: "366" }, period: { number: 1 }, clock: { value: 674, displayValue: "12'" } }],
  };
  const timeline = footballTimeline(payload, a, b)!;
  assert.equal(timeline.a.length, 18);
  assert.deepEqual(timeline.a.map((n, i) => n ? `${i}:${n}` : "").filter(Boolean), ["0:2", "17:1"]);
  assert.equal(timeline.b[2], 1); assert.equal(timeline.b[8], 1);
  assert.equal(timeline.b.reduce((n, v) => n + v, 0), 2, "own goals, goal kicks and fouls are not attacks");
  assert.deepEqual(timeline.markers, [{ at: 2, side: "B", label: "12'" }]);
  assert.equal(footballTimeline({ commentary: [] }, a, b), undefined);
});

test("news stories prefer the header photo, clean its credit and ignore foreign hosts", () => {
  const stories = newsArticles({ articles: [
    { id: 1, type: "Story", headline: " Arteta signs ", description: "Summary.", published: "2026-09-23T10:00:00Z", links: { web: { href: "https://www.espn.com/story/1" } },
      images: [{ type: "Media", url: "https://a.espncdn.com/video.jpg" }, { type: "inline", url: "https://a.espncdn.com/inline.jpg" }, { type: "header", url: "https://a.espncdn.com/photo/header.jpg", credit: "(Photo by Jane Doe/Getty Images)", width: 1296, height: 729 }] },
    { id: 2, type: "Story", headline: "Hot-linked elsewhere", images: [{ type: "header", url: "https://example.com/x.jpg" }] },
    { id: 3, type: "Media", headline: "A video", images: [{ type: "header", url: "https://a.espncdn.com/v.jpg" }] },
    { id: "../4", type: "Story", headline: "Bad id" },
  ] });
  assert.equal(stories.length, 2);
  assert.equal(stories[0].headline, "Arteta signs");
  assert.deepEqual(stories[0].image, { url: "https://a.espncdn.com/photo/header.jpg", credit: "Jane Doe/Getty Images", alt: "", width: 1296, height: 729 });
  assert.equal(stories[1].image, undefined);
  assert.equal(isEspnImage("http://a.espncdn.com/x.jpg"), false);
  assert.equal(isEspnImage("https://espncdn.com.evil.test/x.jpg"), false);
  assert.equal(newsArticles(null).length, 0);
});
