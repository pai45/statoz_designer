/**
 * Elevation is expressed as accent glow rather than neutral drop shadow: only
 * the one "live" element on a surface glows, everything else stays flat.
 */

export type GlowOptions = {
  /** Glow opacity, 0..1. */
  alpha?: number;
  /** Blur radius in px. */
  blur?: number;
  /** Spread in px; negative pulls the glow back under the element. */
  spread?: number;
};

/** Builds an accent glow box-shadow from any CSS color. */
export function glow(
  color: string,
  { alpha = 0.3, blur = 16, spread = -2 }: GlowOptions = {},
): string {
  return `0 0 ${blur}px ${spread}px ${withAlpha(color, alpha)}`;
}

/** Fades any CSS color to the given opacity. */
export function withAlpha(color: string, alpha: number): string {
  return `color-mix(in srgb, ${color} ${alpha * 100}%, transparent)`;
}

export const elevation = {
  /** Blur-less offset shadow under fixed chrome such as the top bar. */
  hardDrop: "0 4px 0 rgb(0 0 0 / 20%)",
  /** Standard resting shadow for stacked panels. */
  panel: "0 2px 12px rgb(0 0 0 / 35%)",
  /** Flutter streak cards sit on a crisp five-pixel ink ledge. */
  streakCard: "0 5px 0 #04060b",
} as const;

export type ElevationTokens = typeof elevation;
