import { formats, type Project, type Scene, type Format, type Sport } from "@/domain/project";

export type Template = {
  id: string; version: 1; name: string; category: "Product" | "Sports" | "Education";
  kind: Project["kind"]; description: string; visual: "feature" | "launch" | "card" | "match" | "player" | "stats" | "tutorial";
  formats: Format[]; fields: string[]; defaults: Partial<Scene>;
};
const allFormats = Object.keys(formats) as Format[];
const define = (id: string, name: string, category: Template["category"], kind: Template["kind"], visual: Template["visual"], description: string, defaults: Partial<Scene>): Template =>
  ({ id, version: 1, name, category, kind, visual, description, formats: allFormats, fields: ["eyebrow", "headline", "body", "cta", "assetId", ...(visual === "match" || visual === "player" ? ["nameA", "nameB", "scoreA", "scoreB"] : []), ...(visual === "stats" || visual === "card" ? ["statLabel", "statValue"] : [])], defaults });

export const templates: Template[] = [
  define("feature-spotlight", "Feature spotlight", "Product", "image", "feature", "One feature. One unmistakable statement.", { eyebrow: "THE GAME BEYOND THE GAME", headline: "Your instincts.\nYour arena.", body: "Predict. Play. Collect. Find your next challenge on StatOz.", cta: "Explore StatOz", assetId: "stadium" }),
  define("game-launch", "Game launch", "Product", "image", "launch", "A bold introduction to your next campaign.", { eyebrow: "ENTER THE ARENA", headline: "Every play\nstarts with you.", body: "Meet Pitch Duel. Build your deck. Make your move.", cta: "Discover Pitch Duel", assetId: "arena" }),
  define("reward-card", "Rewards & cards", "Product", "image", "card", "Give a collectible its own spotlight.", { eyebrow: "THE COLLECTION", headline: "Built for\nyour next play.", body: "Discover player and action cards in StatOz.", statValue: "92", statLabel: "EXAMPLE RATING", nameA: "THE PLAYMAKER", cta: "Explore the collection" }),
  define("match-preview", "Match preview", "Sports", "image", "match", "Set the stage for the next big fixture.", { eyebrow: "MATCHDAY / PREVIEW", headline: "Two sides.\nOne statement.", body: "Who takes the moment? Make your prediction.", nameA: "NORTH FC", nameB: "SOUTH FC", scoreA: "—", scoreB: "—", cta: "Join the conversation" }),
  define("match-result", "Match result", "Sports", "image", "match", "The score, the story, the final word.", { eyebrow: "FULL TIME / EXAMPLE", headline: "A finish\nto remember.", body: "The final whistle. A new story to tell.", nameA: "NORTH FC", nameB: "SOUTH FC", scoreA: "3", scoreB: "2", cta: "What was your moment?" }),
  define("player-spotlight", "Player comparison", "Sports", "image", "player", "Put two performances side by side.", { eyebrow: "HEAD TO HEAD", headline: "Let the\nnumbers talk.", body: "Two standouts. Two different ways to change a game.", nameA: "PLAYER A", nameB: "PLAYER B", scoreA: "28", scoreB: "24", statLabel: "EXAMPLE POINTS", cta: "Who is your pick?" }),
  define("stat-breakdown", "Stat breakdown", "Sports", "image", "stats", "Turn a number into a compelling story.", { eyebrow: "INSIDE THE NUMBERS", headline: "The edge is\nin the details.", body: "A closer look at the numbers behind the performance.", statValue: "78", statLabel: "EXAMPLE ACCURACY %", scoreA: "78", scoreB: "54", cta: "See the bigger picture" }),
  define("explainer", "Swipe-through explainer", "Education", "carousel", "tutorial", "A cover, a clear story, and a strong finish.", { eyebrow: "THE STATOZ PLAYBOOK", headline: "Get closer\nto the game.", body: "Your quick guide to predicting, playing, and collecting.", cta: "Swipe to explore" }),
  define("feature-promo", "Feature promo", "Product", "video", "feature", "Hook, reveal, payoff, and a clear call to action.", { eyebrow: "WELCOME TO STATOZ", headline: "More than\na spectator.", body: "Put your sports instincts into play.", cta: "Discover StatOz", assetId: "stadium" }),
  define("gameplay-tutorial", "Gameplay tutorial", "Education", "video", "tutorial", "Make the first move easy to understand.", { eyebrow: "PITCH DUEL / QUICK START", headline: "Make your\nfirst move.", body: "A quick introduction to your next game.", cta: "Explore Pitch Duel" }),
  define("match-story", "Match & stat story", "Sports", "video", "stats", "Build a sports story one beat at a time.", { eyebrow: "THE MATCH IN NUMBERS", headline: "Every number\nhas a story.", body: "Look beyond the scoreline.", statValue: "78", statLabel: "EXAMPLE ACCURACY %", cta: "What did you notice?" }),
  define("reward-reveal", "Card reveal", "Product", "video", "card", "A cinematic moment for your collection.", { eyebrow: "A NEW ADDITION", headline: "Meet your\nnext playmaker.", body: "Bring a new dimension to your StatOz deck.", statValue: "92", statLabel: "EXAMPLE RATING", nameA: "THE PLAYMAKER", cta: "Explore the collection" }),
];
export function templateFor(id: string) {
  const value = templates.find(t => t.id === id);
  if (!value) throw new Error(`Unknown template: ${id}`);
  return value;
}
export function makeScene(overrides: Partial<Scene> = {}): Scene {
  return { id: crypto.randomUUID(), eyebrow: "STATOZ STUDIO", headline: "Your next\nbig moment.", body: "A fresh perspective on the sports you love.", cta: "Explore StatOz", nameA: "NORTH FC", nameB: "SOUTH FC", scoreA: "3", scoreB: "2", statLabel: "EXAMPLE STAT", statValue: "78", chartValues: [37, 59, 48, 72, 61, 78, 54, 91, 74, 96], cardMetrics: { pace: 94, skill: 91, form: 89 }, assetId: "", crop: "cover", cropX: 50, cropY: 50, clipStart: 0, clipEnd: 0, duration: 3, layout: "editorial", motion: "rise", transition: "fade", showLogo: true, showCta: true, ...overrides };
}
export function createProject(templateId: string, format: Format, sport: Sport = "football", duration?: number): Project {
  const template = templateFor(templateId);
  if (template.kind === "video" && (!duration || duration < 8 || duration > 60)) throw new Error("Choose a video duration from 8 through 60 seconds.");
  const first = makeScene(template.defaults);
  const pages = template.kind === "image" ? [first] : [first,
    makeScene({ ...template.defaults, eyebrow: template.category === "Sports" ? "01 / THE PERFORMANCE" : "01 / DISCOVER", headline: template.visual === "tutorial" ? "Build\nyour deck." : "A closer\nlook.", body: "Explore the details. Find the moment that matters.", showCta: false }),
    makeScene({ ...template.defaults, eyebrow: template.category === "Sports" ? "02 / THE TAKEAWAY" : "02 / MAKE IT YOURS", headline: template.visual === "tutorial" ? "Make\nyour move." : "Find\nyour edge.", body: "Your perspective brings the story to life.", showCta: false }),
    makeScene({ ...template.defaults, eyebrow: "YOUR NEXT CHAPTER", headline: "See you\nin StatOz.", body: "Predict. Play. Collect.", cta: "Explore StatOz" })];
  if (template.kind === "video") {
    const totalFrames = Math.round(duration! * 30);
    pages.forEach((p, i) => { p.duration = (Math.floor(totalFrames / pages.length) + (i < totalFrames % pages.length ? 1 : 0)) / 30; });
  }
  const now = new Date().toISOString();
  return { schemaVersion: 1, id: crypto.randomUUID(), revision: 1, name: template.name, templateId, templateVersion: 1, kind: template.kind, sport, format, outputVariants: [format], pages, audio: { assetId: "", gain: .7, silent: false, sfx: true }, brief: { objective: template.description, audience: "Sports fans and StatOz players" }, sample: true, archived: false, createdAt: now, updatedAt: now };
}
