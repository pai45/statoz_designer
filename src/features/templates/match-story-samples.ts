import type { Scene, Sport } from "@/domain/project";

/**
 * Example data for a new match & stat story, one set per sport so each sport's own
 * graph has a sensible shape. Every figure here is illustrative; projects are marked
 * as sample content until real match data replaces it.
 */
const samples: Record<Sport, Partial<Scene>> = {
  football: {
    nameA: "NORTH FC", nameB: "SOUTH FC", scoreA: "2", scoreB: "1",
    matchStats: [{ label: "POSSESSION", a: "58%", b: "42%" }, { label: "SHOTS", a: "14", b: "9" }, { label: "ON TARGET", a: "6", b: "3" }, { label: "CORNERS", a: "7", b: "4" }, { label: "FOULS", a: "10", b: "12" }],
    seriesA: [1, 2, 3, 1, 3, 4, 2, 1, 1, 3, 4, 3, 2, 1, 3, 4, 5, 3],
    seriesB: [2, 1, 1, 2, 1, 0, 3, 3, 2, 1, 1, 2, 3, 2, 1, 1, 0, 1],
    markers: [{ at: 5, side: "A", label: "27'" }, { at: 7, side: "B", label: "38'" }, { at: 16, side: "A", label: "82'" }],
  },
  cricket: {
    nameA: "NORTH XI", nameB: "SOUTH XI", scoreA: "187/4", scoreB: "172/8", winner: "A",
    matchStats: [{ label: "RUN RATE", a: "9.35", b: "8.60" }, { label: "FOURS", a: "16", b: "12" }, { label: "SIXES", a: "9", b: "6" }, { label: "EXTRAS", a: "8", b: "11" }, { label: "DOT BALLS", a: "38", b: "44" }],
    seriesA: [6, 15, 26, 34, 46, 53, 58, 66, 75, 85, 92, 103, 112, 118, 130, 144, 154, 167, 182, 187],
    seriesB: [4, 12, 20, 31, 38, 47, 52, 60, 66, 74, 83, 90, 98, 107, 115, 124, 136, 147, 160, 172],
    markers: [{ at: 5, side: "A", label: "W" }, { at: 9, side: "A", label: "W" }, { at: 14, side: "A", label: "W" }, { at: 18, side: "A", label: "W" }, { at: 2, side: "B", label: "W" }, { at: 6, side: "B", label: "W" }, { at: 11, side: "B", label: "W" }, { at: 16, side: "B", label: "W" }],
  },
  basketball: {
    nameA: "NORTH HAWKS", nameB: "SOUTH BAY", scoreA: "112", scoreB: "104",
    matchStats: [{ label: "FIELD GOAL %", a: "48.9%", b: "44.2%" }, { label: "THREE POINT %", a: "38.5%", b: "33.3%" }, { label: "REBOUNDS", a: "46", b: "41" }, { label: "ASSISTS", a: "27", b: "22" }, { label: "TURNOVERS", a: "11", b: "15" }],
    seriesA: [0, 8, 17, 24, 31, 38, 47, 55, 60, 68, 75, 83, 90, 97, 105, 112],
    seriesB: [0, 10, 18, 22, 29, 37, 43, 52, 61, 66, 72, 78, 86, 94, 99, 104],
    markers: [{ at: 3, side: "A", label: "LEAD" }, { at: 8, side: "B", label: "LEAD" }, { at: 9, side: "A", label: "LEAD" }],
  },
  tennis: {
    nameA: "PLAYER A", nameB: "PLAYER B", scoreA: "2", scoreB: "1",
    matchStats: [{ label: "ACES", a: "12", b: "7" }, { label: "DOUBLE FAULTS", a: "2", b: "5" }, { label: "1ST SERVE %", a: "68%", b: "61%" }, { label: "WINNERS", a: "38", b: "29" }, { label: "BREAKS", a: "4", b: "2" }],
    seriesA: [0, 2, 3, 5, 6, 6, 7, 8, 11, 15],
    seriesB: [0, 1, 3, 3, 4, 6, 8, 10, 11, 13],
    markers: [{ at: 4, side: "A", label: "SET 1" }, { at: 7, side: "B", label: "SET 2" }, { at: 9, side: "A", label: "SET 3" }],
  },
  motorsport: {
    nameA: "DRIVER A", nameB: "DRIVER B", scoreA: "P1", scoreB: "P2",
    // A race compares the field rather than two sides: each row is driver | qualified | finished.
    matchStats: [{ label: "DRIVER A", a: "P4", b: "P1" }, { label: "DRIVER B", a: "P2", b: "P2" }, { label: "DRIVER C", a: "P1", b: "P3" }, { label: "DRIVER D", a: "P6", b: "P4" }, { label: "DRIVER E", a: "P3", b: "P5" }, { label: "DRIVER F", a: "P5", b: "P6" }],
    seriesA: [4, 3, 3, 2, 2, 1, 1, 1, 2, 1, 1, 1],
    seriesB: [2, 2, 1, 1, 1, 2, 2, 2, 1, 2, 2, 2],
    markers: [{ at: 5, side: "A", label: "P1" }, { at: 9, side: "A", label: "P1" }],
  },
};

const status: Record<Sport, string> = { football: "FULL TIME", cricket: "RESULT", basketball: "FINAL", tennis: "FINAL", motorsport: "CHEQUERED FLAG" };

/** The four beats in order: score, stats, graph, pick. Match data is shared by every beat. */
export function matchStoryPages(sport: Sport): Partial<Scene>[] {
  const data: Partial<Scene> = { ...samples[sport], pickShare: 62, pickVotes: "1,204 VOTES" };
  return [
    { ...data, beat: "score", eyebrow: `${status[sport]} / EXAMPLE`, headline: "A finish\nto remember.", body: "Example fixture · Matchday 6", showCta: false },
    { ...data, beat: "stats", ...(sport === "motorsport" ? { eyebrow: "01 / THE CLASSIFICATION", headline: "How they\nfinished." } : { eyebrow: "01 / THE NUMBERS", headline: "Where it\nwas won." }), body: "", showCta: false },
    { ...data, beat: "graph", eyebrow: "02 / THE FLOW", headline: "How it\nswung.", body: "The decisive spell came late.", showCta: false },
    { ...data, beat: "pick", eyebrow: "03 / YOUR CALL", headline: "Pick your\nside.", body: "", cta: "Pick your side in StatOz", showCta: true },
  ];
}
