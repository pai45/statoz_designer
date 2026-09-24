import { z } from "zod";

export const maxPitchPages = 20;

export const formats = {
  square: { label: "Square", ratio: "1:1", width: 1080, height: 1080 },
  portrait: { label: "Portrait feed", ratio: "4:5", width: 1080, height: 1350 },
  reel: { label: "Reels / Shorts", ratio: "9:16", width: 1080, height: 1920 },
  landscape: { label: "Landscape", ratio: "16:9", width: 1920, height: 1080 },
  instagramPortrait: { label: "Instagram portrait", ratio: "4:5", width: 1080, height: 1350 },
  playPhonePortrait: { label: "Google Play phone", ratio: "9:16", width: 1080, height: 1920 },
  appStoreIphone69: { label: "App Store iPhone 6.9-inch", ratio: "1320:2868", width: 1320, height: 2868 },
  playTabletLandscape: { label: "Google Play tablet", ratio: "16:9", width: 1920, height: 1080 },
  appStoreIpad13: { label: "App Store iPad 13-inch", ratio: "3:4", width: 2064, height: 2752 },
  playFeatureGraphic: { label: "Google Play feature graphic", ratio: "1024:500", width: 1024, height: 500 },
  playIcon: { label: "Google Play icon", ratio: "1:1", width: 512, height: 512 },
  appStoreIcon: { label: "Apple icon master", ratio: "1:1", width: 1024, height: 1024 },
} as const;
export type Format = keyof typeof formats;
export const formatIds = Object.keys(formats) as Format[];
export const sports = {
  football: { label: "Football", accent: "#5cdfff", symbol: "01" },
  cricket: { label: "Cricket", accent: "#ffffff", symbol: "02" },
  basketball: { label: "Basketball", accent: "#fdc700", symbol: "03" },
  tennis: { label: "Tennis", accent: "#51ff94", symbol: "04" },
  motorsport: { label: "Motorsport", accent: "#f42d29", symbol: "05" },
} as const;
export type Sport = keyof typeof sports;
/** Games the launch template can illustrate, each drawn from its in-match screen. */
export const launchGames = {
  "pitch-duel": { label: "Pitch Duel", sport: "football", tagline: "Tactical card game" },
  "penalty-shootout": { label: "Penalty Shootout", sport: "football", tagline: "Sudden-death spot kicks" },
  "football-chess": { label: "5v5 Football Chess", sport: "football", tagline: "Tactical squad duel" },
  "final-over": { label: "Final Over", sport: "cricket", tagline: "Six-ball cricket chase" },
  "hoop-duel": { label: "Hoop Duel", sport: "basketball", tagline: "Street 1-on-1 arcade hoops" },
  "grand-prix-dash": { label: "Grand Prix Dash", sport: "motorsport", tagline: "One-lap arcade racer" },
  "tennis-rally": { label: "Tennis Rally", sport: "tennis", tagline: "2D arcade sets" },
  quiz: { label: "Sports Quiz", sport: "football", tagline: "Trivia gauntlet" },
  "football-bingo": { label: "Football Bingo", sport: "football", tagline: "Country x club grid" },
  "guess-player": { label: "Guess the Player", sport: "football", tagline: "Daily mystery" },
  "guess-driver": { label: "Guess the Driver", sport: "motorsport", tagline: "Daily F1 mystery" },
  "guess-winner": { label: "Guess the Winner", sport: "tennis", tagline: "Daily mystery" },
} as const satisfies Record<string, { label: string; sport: Sport; tagline: string }>;
export type LaunchGame = keyof typeof launchGames;
const launchGameIds = Object.keys(launchGames) as [LaunchGame, ...LaunchGame[]];
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const text = z.string().max(300);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const presentationSchema = z.object({
  layout: z.enum(["cover", "cover-frame", "statement", "problem-map", "device", "loop", "comparison", "convergence", "solution-stack", "market", "funds", "invite", "showcase", "team", "timeline", "seasonality", "traction", "closing"]),
  visual: z.enum(["none", "app-screen", "sports-hub", "trending-games", "predict-pick", "pitch-duel", "deck-locker", "leaderboard", "game-library", "storefront"]),
  bullets: z.array(z.string().max(300)).max(6),
  metrics: z.array(z.object({ label: z.string().max(80), value: z.string().max(80), detail: z.string().max(300) })).max(6),
  evidenceStatus: z.enum(["repo-backed", "hypothesis", "input-needed", "source-backed", "illustrative", "proposed"]),
  sourceNote: z.string().max(500),
});
const pitchDeckSchema = z.object({
  familyId: id,
  role: z.enum(["master", "variant"]),
  variantName: z.string().min(1).max(80),
  basedOnProjectId: id.nullable(),
  basedOnRevision: z.number().int().min(1).nullable(),
});
export const pageSchema = z.object({
  id, eyebrow: text, headline: text, body: z.string().max(1200), cta: text,
  nameA: text, nameB: text, scoreA: z.string().max(30), scoreB: z.string().max(30),
  statLabel: text, statValue: z.string().max(40),
  chartValues: z.array(z.number().min(0).max(100)).min(2).max(12).default([37, 59, 48, 72, 61, 78, 54, 91, 74, 96]),
  cardMetrics: z.object({ pace: z.number().int().min(0).max(100), skill: z.number().int().min(0).max(100), form: z.number().int().min(0).max(100) }).default({ pace: 94, skill: 91, form: 89 }),
  playerCard: z.object({ playerId: id.or(z.literal("")), position: z.string().max(60), club: z.string().max(60), nation: z.string().max(60) }).nullable().default(null),
  presentation: presentationSchema.nullable().default(null),
  assetId: id.or(z.literal("")), tabletAssetId: id.or(z.literal("")).default(""), crop: z.enum(["cover", "contain"]),
  /** Team crests drawn by the match and comparison visuals, in place of initials. */
  emblemA: id.or(z.literal("")).default(""), emblemB: id.or(z.literal("")).default(""),
  /** The launch template draws this game's gameplay art when no media overrides it. */
  game: z.enum(launchGameIds).or(z.literal("")).default(""),
  /** Match-story beat this scene plays. "" follows scene order: score, stats, graph, then pick last. */
  beat: z.enum(["", "score", "stats", "graph", "pick"]).default(""),
  /** Stats both sides have, as reported, compared row by row in the stats beat. */
  matchStats: z.array(z.object({ label: z.string().max(40), a: z.string().max(20), b: z.string().max(20) })).max(6).default([]),
  /** Who the score beat reveals as the winner. "" reads it from the scoreline; "none" is a draw or no result. */
  winner: z.enum(["", "A", "B", "none"]).default(""),
  /** Team colours for side A and B. "" falls back to the sport accent. */
  colorA: hex.or(z.literal("")).default(""), colorB: hex.or(z.literal("")).default(""),
  /** Graph beat: "auto" picks the sport's own chart. Series are entered by hand, never projected. */
  graph: z.enum(["auto", "momentum", "race", "lead", "position"]).default("auto"),
  seriesA: z.array(z.number().min(0).max(999)).max(60).default([]), seriesB: z.array(z.number().min(0).max(999)).max(60).default([]),
  /** Goals, wickets or lead changes, placed at a point index of their side's series. */
  markers: z.array(z.object({ at: z.number().int().min(0).max(59), side: z.enum(["A", "B"]), label: z.string().max(12) })).max(20).default([]),
  /** Pick beat crowd share for side A (B is the rest). Hand-entered; null hides the bars. */
  pickShare: z.number().min(0).max(100).nullable().default(null), pickVotes: z.string().max(20).default(""),
  /** News flash photo and story credit, printed on the artwork. "" hides the line. */
  credit: z.string().max(200).default(""),
  cropX: z.number().min(0).max(100), cropY: z.number().min(0).max(100),
  clipStart: z.number().min(0).max(36000), clipEnd: z.number().min(0).max(36000),
  duration: z.number().min(0.5).max(60),
  layout: z.enum(["editorial", "centered", "split"]),
  motion: z.enum(["rise", "slide", "zoom", "none"]),
  transition: z.enum(["cut", "fade"]), showLogo: z.boolean(), showCta: z.boolean(),
}).refine(p => p.clipEnd === 0 || p.clipEnd > p.clipStart, "Clip end must follow clip start.");
export const projectSchema = z.object({
  schemaVersion: z.literal(1), id, revision: z.number().int().min(1),
  name: z.string().min(1).max(120), templateId: id, templateVersion: z.literal(1),
  kind: z.enum(["image", "carousel", "video"]), sport: z.enum(["football", "cricket", "basketball", "tennis", "motorsport"]),
  format: z.enum(["square", "portrait", "reel", "landscape", "instagramPortrait", "playPhonePortrait", "appStoreIphone69", "playTabletLandscape", "appStoreIpad13", "playFeatureGraphic", "playIcon", "appStoreIcon"]),
  outputVariants: z.array(z.enum(["square", "portrait", "reel", "landscape", "instagramPortrait", "playPhonePortrait", "appStoreIphone69", "playTabletLandscape", "appStoreIpad13", "playFeatureGraphic", "playIcon", "appStoreIcon"])).min(1).max(8),
  pages: z.array(pageSchema).min(1).max(maxPitchPages),
  pitchDeck: pitchDeckSchema.nullable().default(null),
  audio: z.object({ assetId: id.or(z.literal("")), gain: z.number().min(0).max(1), silent: z.boolean(), sfx: z.boolean() }),
  brief: z.object({ objective: z.string().max(1500), audience: text }),
  sample: z.boolean(), archived: z.boolean(), createdAt: z.string(), updatedAt: z.string(),
}).superRefine((p, ctx) => {
  if (p.pages.length > 12 && !(p.templateId === "investor-pitch" && p.pitchDeck && p.kind === "carousel"))
    ctx.addIssue({ code: "custom", message: "Non-pitch projects support up to 12 pages.", path: ["pages"] });
  const seconds = p.pages.reduce((sum, page) => sum + page.duration, 0);
  if (p.kind === "video" && (seconds < 8 || seconds > 60 || Math.abs(seconds * 30 - Math.round(seconds * 30)) > .001))
    ctx.addIssue({ code: "custom", message: "Video duration must be 8–60 seconds and align to 30 fps.", path: ["pages"] });
  if (p.kind === "image" && p.pages.length !== 1) ctx.addIssue({ code: "custom", message: "Image projects contain exactly one page.", path: ["pages"] });
  if (new Set(p.pages.map(s => s.id)).size !== p.pages.length) ctx.addIssue({ code: "custom", message: "Scene IDs must be unique.", path: ["pages"] });
  if (p.pitchDeck) {
    if (p.kind !== "carousel" || p.format !== "landscape" || p.outputVariants.some(format => format !== "landscape"))
      ctx.addIssue({ code: "custom", message: "Pitch decks are landscape carousel projects.", path: ["pitchDeck"] });
    if (p.pages.some(page => !page.presentation))
      ctx.addIssue({ code: "custom", message: "Every pitch-deck page requires presentation content.", path: ["pages"] });
    if (p.pitchDeck.role === "master" && (p.pitchDeck.familyId !== p.id || p.pitchDeck.basedOnProjectId || p.pitchDeck.basedOnRevision))
      ctx.addIssue({ code: "custom", message: "A pitch-deck master owns its family and has no source revision.", path: ["pitchDeck"] });
    if (p.pitchDeck.role === "variant" && (!p.pitchDeck.basedOnProjectId || !p.pitchDeck.basedOnRevision))
      ctx.addIssue({ code: "custom", message: "A pitch-deck variant must record its source project and revision.", path: ["pitchDeck"] });
  }
});
export type Scene = z.infer<typeof pageSchema>;
export type Project = z.infer<typeof projectSchema>;
export type PresentationSlide = NonNullable<Scene["presentation"]>;
export type PitchDeckMeta = NonNullable<Project["pitchDeck"]>;
export type AssetCategory = "uploads" | "product-capture" | "player-portrait" | "team-crest" | "news-photo" | "line-art" | "audio-video" | "brand-artwork";
export type Asset = {
  schemaVersion: 1; id: string; name: string; file: string; mime: string; bytes: number;
  width?: number; height?: number; duration?: number; hasAlpha?: boolean;
  /** Line art is browsed and picked separately from photography and footage. */
  category?: AssetCategory; sport?: Sport;
  source: string; approval: "brand" | "reference" | "approved"; createdAt: string;
};
export const isLineArt = (asset?: Asset) => asset?.category === "line-art";
export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted";
export type RenderJob = {
  schemaVersion: 1; id: string; projectId: string; projectName: string; revision: number;
  format: Format; outputType: "png" | "jpeg" | "zip" | "pdf" | "pptx" | "mp4"; status: JobStatus;
  progress: number; createdAt: string; updatedAt: string; error?: string; output?: string;
  bytes?: number; duration?: number; width: number; height: number; audio?: boolean;
};
export type ProjectEnvelope = { project: Project; etag: string };
export function durationOf(p: Project) { return p.pages.reduce((n, page) => n + page.duration, 0); }
export function sceneAt(p: Project, time: number) {
  let start = 0;
  for (let i = 0; i < p.pages.length; i++) {
    const scene = p.pages[i];
    if (time < start + scene.duration || i === p.pages.length - 1) return { scene, index: i, localTime: Math.max(0, time - start), start };
    start += scene.duration;
  }
  throw new Error("Project has no scenes");
}
