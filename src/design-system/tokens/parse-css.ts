/**
 * Reads the `--ds-*` custom properties out of `styles/tokens.css`, so tools that
 * cannot load a stylesheet (the brand kit, the design-system skill, tests) see the
 * same values the browser does.
 */
export type TokenMap = Record<string, string>;

/** Every custom property declared in the stylesheet's `:root` blocks, in source order. */
export function parseTokenCss(css: string): TokenMap {
  const tokens: TokenMap = {};
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const block of source.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
    for (const declaration of block[1].split(";")) {
      const match = /^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(declaration);
      if (match) tokens[match[1]] = match[2].replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
    }
  }
  return tokens;
}

/** The custom properties set by the first rule whose selector is exactly `selector`. */
export function parseRuleVars(css: string, selector: string): TokenMap {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const body = new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`).exec(css.replace(/\/\*[\s\S]*?\*\//g, ""))?.[1] ?? "";
  return parseTokenCss(`:root{${body}}`);
}

/** A token's value with every `var(--ds-*)` it refers to substituted. Unknown vars stay as written. */
export function resolveToken(tokens: TokenMap, name: string, seen: string[] = []): string | undefined {
  const value = tokens[name];
  if (value === undefined || seen.includes(name)) return value;
  return value.replace(/var\((--[\w-]+)\)/g, (whole, ref: string) => resolveToken(tokens, ref, [...seen, name]) ?? whole);
}

/** Hex and rgb()/rgba() colors in both syntaxes as one comparable `r,g,b,a` string. */
export function normalizeColor(value: string): string | undefined {
  const color = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(color)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map(c => c + c).join("") : hex;
    const [r, g, b, a = 255] = full.match(/../g)!.map(pair => parseInt(pair, 16));
    return `${r},${g},${b},${+(a / 255).toFixed(3)}`;
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(color)?.[1];
  if (!rgb) return undefined;
  const parts = rgb.split(/[\s,/]+/).filter(Boolean);
  const alpha = parts[3] === undefined ? 1 : parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
  return `${parts.slice(0, 3).map(Number).join(",")},${+alpha.toFixed(3)}`;
}
