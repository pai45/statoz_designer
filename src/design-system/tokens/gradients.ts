import type { RarityName } from "./colors";

/** Gradient decisions that repeat across StatOz surfaces. */
export const gradients = {
  /** The full-bleed backdrop behind every platform screen. */
  appBackground: "linear-gradient(135deg, #010916 0%, #0e2646 100%)",
  /** Navigation chrome — brighter at the top edge so it lifts off the page. */
  navBar:
    "linear-gradient(to top, rgb(14 22 43 / 97.6%) 0%, rgb(28 40 60 / 97.6%) 100%)",
  /** The arena bed the pre-platform screens sit on — darker than the app. */
  arenaBackdrop:
    "linear-gradient(to bottom, #02060f 0%, #06121f 46%, #01040a 100%)",
  /** A step meter's completed segment. */
  stepPassed: "linear-gradient(to right, #00c850 0%, #009865 100%)",
  /** The segment the player is on — the only one that glows. */
  stepCurrent: "linear-gradient(to right, #ffb13d 0%, #ff7a1a 100%)",
  /**
   * A segment the player got wrong. Only a graded meter has one — a plain
   * step flow has nothing to fail — which is why it joins the set last.
   */
  stepFailed: "linear-gradient(to right, #ff6b6b 0%, #c81e30 100%)",
  /** The headline a pack announces itself with, cyan raking into acid green. */
  packHeadline: "linear-gradient(135deg, #5cdfff 0%, #d4ff5c 100%)",
  /** A collectible card's nameplate, under the player's name. */
  cardNameplate: "linear-gradient(to right, #202836 0%, #121824 100%)",
  /** The neutral navy body shared by sport fixture cards. */
  fixtureCard: "linear-gradient(to bottom, #1b2336 0%, #121a28 100%)",
  /** The restrained slate-and-cyan body shared by the MATCH Trending feed. */
  trendingCard: [
    "linear-gradient(to bottom,",
    "color-mix(in srgb, var(--ds-color-accent-cyan) 4%, var(--ds-color-background-elevated)) 0%,",
    "var(--ds-color-background-elevated) 100%)",
  ].join(" "),
  /** Dense data surface used by league standings and ranked rows. */
  leagueTable: "linear-gradient(135deg, #121b30 0%, #0e1628 100%)",
  /** The bed a decision sheet is taken on, raked from lit slate to hull dark. */
  hudSheet: "linear-gradient(135deg, #152139 0%, #0b101c 100%)",
  /** The lit top edge of that sheet: cyan into violet, fading at both ends. */
  hudEdge: [
    "linear-gradient(to right, transparent 0%,",
    "var(--ds-color-accent-cyan) 28%,",
    "var(--ds-color-accent-violet) 72%,",
    "transparent 100%)",
  ].join(" "),
  /** The docked bar under a match's tabs — panel slate falling to hull navy. */
  dockBar:
    "linear-gradient(to bottom, color-mix(in srgb, #1d293d 88%, transparent) 0%, #17233d 100%)",
  /** Earned streak milestone surface, warming from gold into the dark stack. */
  streakMilestone:
    "linear-gradient(135deg, color-mix(in srgb, var(--ds-color-accent-gold) 24%, transparent) 0%, var(--ds-color-background-secondary) 50%, var(--ds-color-background-elevated) 100%)",
} as const;

/**
 * The metallic fill of a card face, graded by tier: the higher the rarity, the
 * lighter and more iridescent the base, so rarity reads before the edge is seen.
 *
 * Flutter layers a semi-transparent tier tint over the shell's fill; here the
 * tint is mixed into the neighbouring dark stop instead, which composites to the
 * same color and keeps the gradient opaque and self-contained.
 */
export const rarityFoil: Record<RarityName, string> = {
  bronze: [
    "linear-gradient(135deg,",
    "#19120c 0%,",
    "color-mix(in srgb, var(--ds-color-rarity-bronze-base) 10%, #19120c) 50%,",
    "#120f0e 100%)",
  ].join(" "),
  silver: [
    "linear-gradient(135deg,",
    "#141a24 0%,",
    "color-mix(in srgb, var(--ds-color-rarity-silver-base) 12%, #141a24) 36%,",
    "#10151f 70%,",
    "#0e1118 100%)",
  ].join(" "),
  gold: [
    "linear-gradient(135deg,",
    "#1a1606 0%,",
    "color-mix(in srgb, var(--ds-color-rarity-gold-base) 16%, #1a1606) 34%,",
    "#14130a 70%,",
    "#0f1118 100%)",
  ].join(" "),
  platinum: [
    "linear-gradient(135deg,",
    "#0b1426 0%,",
    "color-mix(in srgb, var(--ds-color-rarity-platinum-base) 22%, #0b1426) 30%,",
    "#141d3a 50%,",
    "color-mix(in srgb, var(--ds-color-rarity-platinum-deep) 18%, #141d3a) 72%,",
    "#0b1426 100%)",
  ].join(" "),
};

/** The sealed pack's shell, and the card back it flips from: light to deep. */
export const rarityPack: Record<RarityName, string> = {
  bronze: packFill("bronze"),
  silver: packFill("silver"),
  gold: packFill("gold"),
  platinum: packFill("platinum"),
};

function packFill(tier: RarityName): string {
  return [
    "linear-gradient(to bottom,",
    `var(--ds-color-rarity-${tier}-light) 0%,`,
    `var(--ds-color-rarity-${tier}-base) 50%,`,
    `var(--ds-color-rarity-${tier}-deep) 100%)`,
  ].join(" ");
}

/**
 * An action card's ground, tinted towards what the action does: warm for
 * attack, violet for defense, cool for the specials.
 */
export const actionCategoryFill = {
  attack: "linear-gradient(135deg, #1a1520 0%, #200d0d 100%)",
  defense: "linear-gradient(135deg, #151020 0%, #1d0d2b 100%)",
  special: "linear-gradient(135deg, #0d1520 0%, #1a1520 100%)",
} as const;

/**
 * The plate behind a card's glyph when no portrait exists — a bright catch-light
 * raking down through the tier hue into ink and a deep red edge.
 */
export function cardIconFallback(tierColor: string): string {
  return [
    "linear-gradient(135deg,",
    "#f7f7f4 0%,",
    "#ffffff 40%,",
    `${tierColor} 54%,`,
    "#111827 72%,",
    "#e31f26 100%)",
  ].join(" ");
}

export type GradientTokens = typeof gradients;
