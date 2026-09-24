import { sports, type Scene, type Sport } from "./project";

/**
 * The match & stat story reel tells a match in four beats. These helpers are pure so
 * the composition, the editor and the tests all read a scene the same way.
 */
export type Beat = "score" | "stats" | "graph" | "pick";
export type GraphKind = "momentum" | "race" | "lead" | "position";

/** An unset beat follows scene order, so match stories saved before beats existed still play in sequence. */
export function beatOf(scene: Scene, index: number, total: number): Beat {
  if (scene.beat) return scene.beat;
  if (index === 0) return "score";
  if (index === total - 1 && total > 1) return "pick";
  return index === 2 ? "graph" : "stats";
}

const sportGraph: Record<Sport, GraphKind> = { football: "momentum", cricket: "race", basketball: "lead", tennis: "race", motorsport: "position" };
export const graphOf = (scene: Scene, sport: Sport): GraphKind => scene.graph === "auto" ? sportGraph[sport] : scene.graph;

const single = /^(\D*?)(-?\d[\d,]*(?:\.\d+)?)(\D*)$/;
/** The number in a stat such as "54%", "1,204" or "3.5". Values holding two numbers ("187/4", "1:32.4") have none. */
export function numericValue(value: string): number | undefined {
  const match = single.exec(value.trim());
  if (!match) return undefined;
  const n = Number(match[2].replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/** Counts a reported value up from zero, keeping its prefix, suffix, decimals and grouping. */
export function countUp(value: string, progress: number): string {
  const match = single.exec(value.trim());
  if (!match || progress >= 1) return value;
  const target = Number(match[2].replace(/,/g, ""));
  if (!Number.isFinite(target)) return value;
  const decimals = match[2].split(".")[1]?.length ?? 0;
  const current = target * Math.max(0, progress);
  const text = match[2].includes(",")
    ? current.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : current.toFixed(decimals);
  return `${match[1]}${text}${match[3]}`;
}

/** A cricket innings ("130/2", "450/8d") compares on its runs. */
const innings = /^(\d+)\/\d+d?$/;
const magnitude = (value: string) => numericValue(value) ?? (innings.test(value.trim()) ? Number(innings.exec(value.trim())![1]) : undefined);
/** Whether a reported value can drive a split bar. */
export const comparable = (value: string) => magnitude(value) !== undefined;

/** Side A's share of a pair, as the app's split bars draw it: 0-0 is even, and neither side vanishes. */
export function shareOf(a: string | number, b: string | number) {
  const x = typeof a === "number" ? a : magnitude(a), y = typeof b === "number" ? b : magnitude(b);
  if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x + y <= 0) return .5;
  return Math.min(.995, Math.max(.005, x / (x + y)));
}

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map(v => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map(v => { const s = v / 255; return s <= .03928 ? s / 12.92 : Math.pow((s + .055) / 1.055, 2.4); });
  return .2126 * r + .7152 * g + .0722 * b;
};
export const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };

/** Lightens a club colour until it reads on the chart surface (WCAG AA, 4.5:1), as the app's team palettes do. */
export function readableColor(hex: string, surface = "#10192d") {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "";
  let colour = hex.toLowerCase();
  for (let step = 1; contrast(colour, surface) < 4.5 && step <= 20; step++) colour = toHex(rgb(hex).map(v => v + (255 - v) * step / 20));
  return colour;
}

/** Side colours for the reel. Two near-identical kits would read as one team, so B then falls back. */
export function teamColors(scene: Scene, sport: Sport): [string, string] {
  const accent = sports[sport].accent;
  const a = readableColor(scene.colorA) || accent;
  const fallbackB = a === "#ffffff" ? "#5cdfff" : "#ffffff";
  const b = readableColor(scene.colorB) || fallbackB;
  const apart = (c: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(c)[i])) >= 60;
  return [a, [b, fallbackB, "#5cdfff", "#fdc700"].find(apart) ?? b];
}

/** A race's classification row: the driver, where they qualified and where they finished. */
export type ClassifiedRow = { name: string; qualified?: number; finished: number };
const position = (value: string) => { const match = /^P?(\d{1,2})$/i.exec(value.trim()); return match ? Number(match[1]) : undefined; };
/**
 * A motorsport story's stat rows are its classification: driver | qualified | finished.
 * Rows whose finish is not a position are left out, so a hand-typed row cannot break the order.
 */
export function classificationOf(scene: Scene): ClassifiedRow[] {
  return scene.matchStats.flatMap(row => {
    const finished = position(row.b), qualified = position(row.a);
    return finished && row.label.trim() ? [{ name: row.label.trim(), finished, ...(qualified ? { qualified } : {}) }] : [];
  }).sort((x, y) => x.finished - y.finished);
}

/**
 * The side the score beat reveals as the winner. An explicit choice wins; otherwise a race
 * reads the positions and other sports compare plain scores. A cricket scoreline ("453 &
 * 130/2") cannot say who won, so cricket reveals a winner only when one is set.
 */
export function winnerSide(scene: Scene, sport: Sport): "A" | "B" | "" {
  if (scene.winner === "A" || scene.winner === "B") return scene.winner;
  if (scene.winner === "none" || sport === "cricket") return "";
  if (sport === "motorsport") {
    const a = position(scene.scoreA), b = position(scene.scoreB);
    return a && b && a !== b ? (a < b ? "A" : "B") : "";
  }
  const a = numericValue(scene.scoreA), b = numericValue(scene.scoreB);
  return a !== undefined && b !== undefined && a !== b ? (a > b ? "A" : "B") : "";
}
