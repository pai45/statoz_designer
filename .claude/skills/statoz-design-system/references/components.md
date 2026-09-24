# StatOz components and implementation patterns

Hand-written. Check that the code it names still exists before you rely on it.

## Studio design-system components (`src/design-system/components/ui.tsx`)

| Component | Props | Notes |
| --- | --- | --- |
| `Button` | button attributes + `variant?: "primary" \| "secondary" \| "ghost"` | Primary is the one cyan action on a surface. Its CSS is `.button` and `.button-*` in `globals.css`. |
| `HudPanel` | `{ children, className? }` | Draws `.hud-shell` (a 1px outline clipped by `--ds-clip-hud`) around a `.hud-fill` with the same clip. This is the layered-shell pattern in its simplest form. |
| `InputField` | input attributes + `label` | Always labelled. |
| `FilterChips` | `{ options, selected, onSelect, label }` | A chamfered chip group using `--ds-clip-chip`. It is a `tablist` with Left/Right/Home/End keys and 44px targets, and scrolls horizontally on narrow screens. Use it for every chip, tab or filter row. |
| `Icon` | `{ name, size? }` | A stroke-1.5 inline SVG set. Unknown names fall back to `spark`. |
| `Tag` | `{ children, color? }` | A compact uppercase label. `color` sets `--tag-accent`. |

These are the studio's own chrome controls. The shared StatOz action and element
family (ported from statoz_web and card_game) is in `actions.tsx` and
`elements.tsx`; see `actions.md` for the catalog. Reuse both before writing new
controls, and put a repeated pattern into the shared component instead of a
one-off screen.

## The layered chamfer shell

```css
.plate { position: relative; isolation: isolate; }            /* unclipped: keeps glow and focus */
.plate::before { content: ""; position: absolute; inset: 0; z-index: -1;
  clip-path: var(--ds-clip-hud); background: var(--ds-color-border-muted); }   /* edge */
.plate::after  { content: ""; position: absolute; inset: 1px; z-index: -1;
  clip-path: var(--ds-clip-hud); background: var(--ds-color-background-secondary); } /* fill */
/* Focal state only: the glow sits on the unclipped element. */
.plate.is-live { filter: drop-shadow(0 0 12px color-mix(in srgb, var(--ds-color-accent-cyan) 45%, transparent)); }
.plate.is-live::before { background: var(--ds-color-accent-cyan); }
/* Keyboard focus: pull the fill in so a ring follows the chamfer. */
.plate:focus-visible { outline: none; } .plate:focus-visible::after { inset: 3px; }
```

- A CSS `border` never follows a clip-path. Always use the edge and fill pair.
- Filters apply before clipping, so a `drop-shadow` or `box-shadow` on a clipped
  element is cut away. Put the glow on an unclipped element (as above), never on
  the clipped layer. `actions.css` builds every chamfered action this way.
- `--ds-clip-card` resolves its cuts on `:root`, so it is only right at the
  resting cut sizes. A resized collectible card computes its cuts with
  `cardCuts(width)` from `src/design-system/tokens/shape.ts`.

## TypeScript token helpers (`src/design-system/tokens/`)

- `colors`, `accentVar(name)`, `feedbackVar(name)`, `rarityVar(...)`,
  `readableInk(color)` (for picking text ink on a fill), `liftForContrast(...)`
- `glow(color, { alpha, blur, spread })`, `withAlpha(color, alpha)`
- `shape` cut sizes, the `*ClipPath` strings, `hudChamferPath(big, small)`, `cardCuts(width)`
- `spacing` and `typography`, which mirror the CSS tokens

## Compositions (social artwork and video)

- **Structure.** `src/features/compositions/composition.tsx` renders every
  template for both preview and export. The server export
  (`src/server/composition-html.ts`) embeds `tokens.css` and the two fonts, so
  export matches preview.
- **Format classes.** The canvas carries `format-${project.format}`:
  `format-square`, `format-portrait`, `format-reel`, `format-landscape`, and
  the app-store formats.
- **Sizing.** Size artwork text and spacing with `--social-title`,
  `--social-body`, `--social-small`, `--social-gap`, `--social-margin`,
  `--social-top`, `--social-bottom` and `--social-right`. The per-ratio values
  are in `references/tokens.md`.
- **Accent.** `--accent` on the canvas is the current sport or template accent.
  Use it instead of hard-coding cyan so sport content re-themes itself.
- **Motion.** Motion is a pure function of frame time. Use `clamp`, `smoothstep`,
  `easeOut` and `step(time, start, duration)` from `motion.ts`. Don't use CSS
  animations, timers or `Date.now()` in compositions.
- **Safe area.** `.safe-guide` draws the house safe area (8%, or
  `14% 14% 22% 8%` on reels).
- **Templates.** They are registered in `src/features/templates/registry.ts`,
  and every standard template declares all four ratios.

## Known legacy values: do not copy

Older compositions still hard-code some colours. Use the tokens in new work.

| Legacy value | Where | Use instead |
| --- | --- | --- |
| Pitch cyan `#15e6ff` | pitch-deck, invite, roadmap and `.visual-pitch` | `--ds-color-accent-cyan` |
| A palette literal (`const C = {...}`) | `game-art.tsx` | `var(--ds-*)` |
| Raw hex in `globals.css` studio chrome | `globals.css` | `--studio-*` / `--ds-*` |

## Outside the studio

- The skill ships the brand mark at `assets/logo.png`.
- For the tokens and fonts, download the kit from **Assets & brand → Assets →
  Design kit**, or call `GET /api/brand-kit/<id>`. The ids are `tokens-css`,
  `tokens-json`, `font-orbitron`, `font-onest`, `logo`, `design-guide` and
  `brand-guide`.
- In HTML, load the CSS and set up the fonts like this:

```css
@font-face { font-family: "Orbitron"; src: url(orbitron-latin-variable.woff2) format("woff2"); font-weight: 400 900; }
@font-face { font-family: "Onest"; src: url(onest-latin-variable.woff2) format("woff2"); font-weight: 100 900; }
body { background: var(--ds-color-background-primary); color: var(--ds-color-text-default); font-family: var(--ds-font-body); }
```

- `--ds-font-body` and `--ds-font-display` fall back to the family names
  "Onest" and "Orbitron" when the Next.js font variables are absent, so the
  `@font-face` names above must match exactly.
