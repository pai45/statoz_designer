/**
 * Typography tokens. The size scale carries the steps the StatOz surfaces
 * actually use — the Flutter app leans on 10, 13, 15, 17 and 22px far more than
 * on a conventional web scale, so the ramp is calibrated to those.
 */
export const typography = {
  family: {
    body: 'var(--font-onest), "Onest", system-ui, sans-serif',
    display:
      'var(--font-orbitron), "Orbitron", var(--font-onest), "Onest", system-ui, sans-serif',
    mono: 'ui-monospace, "SFMono-Regular", monospace',
  },
  size: {
    nano: "0.5rem",
    micro: "0.5625rem",
    "2xs": "0.625rem",
    xs: "0.6875rem",
    compact: "0.75rem",
    sm: "0.8125rem",
    md: "0.875rem",
    base: "0.9375rem",
    lg: "1.0625rem",
    badge: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.375rem",
    "3xl": "2rem",
    hero: "2.625rem",
    celebration: "3.375rem",
    countdown: "4.5rem",
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  lineHeight: {
    compact: 1,
    tight: 1.2,
    body: 1.4,
    relaxed: 1.6,
  },
  letterSpacing: {
    normal: "0",
    tight: "0.02em",
    label: "0.05em",
    wide: "0.07em",
    display: "0.075em",
    ultra: "0.12em",
    mega: "0.2em",
    max: "0.3em",
  },
  /** Every figure on the prediction surfaces uses tabular lining numerals. */
  numeric: {
    tabular: '"tnum" 1',
  },
} as const;

export type TypographyTokens = typeof typography;
