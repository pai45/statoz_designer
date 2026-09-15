/**
 * StatOz semantic color tokens, seeded from the Flutter application's theme.
 * Components should use semantic names instead of raw palette values.
 */
export const colors = {
  background: {
    primary: "#0d111a",
    secondary: "#0f172b",
    elevated: "#1d293d",
    muted: "#070c1f",
    nav: "#1a253a",
    /** Solid navy bed beneath the two-team wash on quiz objective cards. */
    quizHub: "#06152b",
    /** The flat bed under charts and the data rows a report is built from. */
    data: "#10192d",
  },
  text: {
    default: "#ffffff",
    muted: "#90a1b9",
    subtle: "#cad5e2",
    accent: "#5cdfff",
    inverse: "#081019",
    disabled: "#6a7282",
  },
  border: {
    default: "#314158",
    muted: "#243654",
    subtle: "#20293e",
    strong: "#45556c",
    active: "rgba(173, 70, 255, 0.5)",
    /** Neutral edge for inactive streak surfaces. */
    inactive: "#94a3b8",
  },
  accent: {
    /** Neutral sport identity used by cricket; aliases the primary text ink. */
    white: "#ffffff",
    cyan: "#5cdfff",
    violet: "#c27aff",
    orange: "#ff8904",
    lime: "#51ff94",
    gold: "#fdc700",
    blue: "#2b7fff",
    racing: "#f42d29",
    pink: "#ff94c1",
  },
  feedback: {
    success: "#05df72",
    warning: "#fdc700",
    danger: "#ff4d4d",
    info: "#3c95da",
  },
  overlay: {
    subtle: "rgba(255, 255, 255, 0.1)",
    scrim: "rgba(0, 0, 0, 0.84)",
    /** The scrim a label sits on when it lies over card art. */
    plate: "rgba(0, 0, 0, 0.6)",
    /** Near-black action rail shared by purchasable shop cards. */
    shopFooter: "rgba(0, 0, 0, 0.88)",
    /** Dark veil under the tilted OWNED stamp on shop cards. */
    shopOwnership: "rgba(0, 0, 0, 0.66)",
  },
  /** Shared fixture-card chrome, matched to the Flutter match hub. */
  fixture: {
    shadow: "#04060b",
    base: "#141c2b",
    strip: "#0f1826",
    /** The brighter fill a fixture card's call-to-action strip takes. */
    stripFocal: "#173a5e",
    border: "#2a3550",
    predicted: "#2c7a8c",
    kickoff: "#c8a45a",
    dimName: "#aeb7c5",
    score: "#9fb0c2",
    result: "#bac5d3",
  },
  /**
   * Collectible card rarity, bronze through platinum. Each tier is a catch-light,
   * the hue itself, and a deep base — enough to build a metallic fill, an edge,
   * and a glow without reaching for another value.
   *
   * Gold and platinum resolve to accents the palette already holds, so the app
   * reads as one system rather than growing a second gold. The Flutter source
   * carries two disagreeing tier palettes (`tierColor` says #facc15 / #67e8f9,
   * the reveal says #fdc700 / #5cdfff); these are the reveal's.
   */
  rarity: {
    bronze: { light: "#e8a45c", base: "#cd7f32", deep: "#5c3a1a" },
    silver: { light: "#f1f5f9", base: "#cbd5e1", deep: "#64748b" },
    gold: { light: "#ffe9a8", base: "#fdc700", deep: "#b8860b" },
    platinum: { light: "#b9f6ff", base: "#5cdfff", deep: "#c27aff" },
  },
} as const;

export type ColorTokens = typeof colors;
export type AccentName = keyof typeof colors.accent;
export type FeedbackName = keyof typeof colors.feedback;
export type RarityName = keyof typeof colors.rarity;

/** How much reveal drama a tier earns: 0 bronze, 1 silver, 2 gold, 3 platinum. */
export const rarityOrder = ["bronze", "silver", "gold", "platinum"] as const;

/** The CSS custom property backing an accent, for inline color props. */
export function accentVar(name: AccentName): string {
  return `var(--ds-color-accent-${name})`;
}

/** The CSS custom property backing a feedback color. */
export function feedbackVar(name: FeedbackName): string {
  return `var(--ds-color-${name})`;
}

/**
 * Every colour a surface is allowed to be *themed* in: the eight accents plus
 * the four feedback colours.
 *
 * Data that names its own colour — a guide's accent, a support channel's — uses
 * this, because the choice crosses the two scales: most modes take an accent,
 * but a lives counter or a bug report takes danger, and it is one field either
 * way.
 */
export type PaletteName = AccentName | FeedbackName;

/** The CSS custom property behind any palette name, accent or feedback. */
export function paletteVar(name: PaletteName): string {
  return name in colors.accent
    ? accentVar(name as AccentName)
    : feedbackVar(name as FeedbackName);
}

/** The CSS custom property backing one shade of a rarity tier. */
export function rarityVar(
  name: RarityName,
  shade: "light" | "base" | "deep" = "base",
): string {
  return `var(--ds-color-rarity-${name}-${shade})`;
}

/*
 * Identity colours — a club's, a driver's, a market outcome's — arrive as data
 * and land on filled plates. Two things have to be worked out from the colour
 * itself: what ink reads on top of it, and whether it is dark enough to
 * disappear into the surface it sits on. Both are pure, so they can run during
 * a server render.
 */

/** Parses `#rgb` / `#rrggbb`. Anything else (a `var()`, a name) is not ours. */
function parseHex(color: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  const digits = match[1];
  const full =
    digits.length === 3
      ? digits.split("").map((digit) => digit + digit).join("")
      : digits;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
function luminance([red, green, blue]: [number, number, number]): number {
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrastRatio(a: number, b: number): number {
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The ink that reads on a plate filled with `color` — dark on a light fill,
 * light on a dark one, at the same threshold the app uses.
 *
 * A colour this cannot parse gets the light ink, which is the safe answer for
 * the dark palette everything else here is built on.
 */
export function readableInk(color: string): string {
  const rgb = parseHex(color);
  if (!rgb) return "var(--ds-color-text-default)";
  return luminance(rgb) > 0.48
    ? "var(--ds-color-text-inverse)"
    : "var(--ds-color-text-default)";
}

/**
 * Keeps an identity colour distinguishable from the surface behind it.
 *
 * A colour that already clears `ratio` is returned untouched — most do. One
 * that does not is mixed toward white in tenths until it does, so a near-black
 * club colour still reads as that club rather than as a hole in the card.
 */
export function liftForContrast(
  color: string,
  { against, ratio = 2.2 }: { against: string; ratio?: number },
): string {
  const fill = parseHex(color);
  const surface = parseHex(against);
  if (!fill || !surface) return color;

  const surfaceLuminance = luminance(surface);
  if (contrastRatio(luminance(fill), surfaceLuminance) >= ratio) return color;

  let lifted = fill;
  for (let mix = 10; mix <= 60; mix += 10) {
    lifted = [
      Math.round(fill[0] + (255 - fill[0]) * (mix / 100)),
      Math.round(fill[1] + (255 - fill[1]) * (mix / 100)),
      Math.round(fill[2] + (255 - fill[2]) * (mix / 100)),
    ];
    if (contrastRatio(luminance(lifted), surfaceLuminance) >= ratio) break;
  }
  // A hex rather than a `color-mix`, so the result can be measured again --
  // the ink on this plate is decided from the colour that ends up on it.
  return `#${lifted.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
