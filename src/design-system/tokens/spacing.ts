/** Spacing values preserve the Flutter application's 2px-based rhythm. */
export const spacing = {
  0: "0",
  2: "0.125rem",
  4: "0.25rem",
  6: "0.375rem",
  8: "0.5rem",
  10: "0.625rem",
  12: "0.75rem",
  14: "0.875rem",
  16: "1rem",
  20: "1.25rem",
  24: "1.5rem",
  28: "1.75rem",
  32: "2rem",
  40: "2.5rem",
  48: "3rem",
  64: "4rem",
} as const;

export type SpacingToken = keyof typeof spacing;
