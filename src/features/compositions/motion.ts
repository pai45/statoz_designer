/** Frame-time easing shared by animated visuals. Every value is a pure function of scene time. */
export const clamp = (n: number) => Math.min(1, Math.max(0, n));
export const smoothstep = (n: number) => {
  const value = clamp(n);
  return value * value * (3 - 2 * value);
};
export const easeOut = (n: number) => 1 - Math.pow(1 - clamp(n), 3);
/** Eased progress of a step that starts at `start` seconds and lasts `duration`. */
export const step = (time: number, start: number, duration: number) => easeOut((time - start) / duration);
