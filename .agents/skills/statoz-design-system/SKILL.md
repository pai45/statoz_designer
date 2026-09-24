---
name: statoz-design-system
description: The StatOz design system for this studio. Use for any StatOz visual work, including studio UI and components, composition templates, social posts and carousels, reels and video, match posters, player cards, app-store creatives, pitch slides, and pages, documents, Figma files or slides made outside the studio. Covers tokens, typography, chamfer geometry, glow, layout ratios, safe areas, motion, asset approval and brand claims. Do not use it for backend-only work.
---

# StatOz design system

StatOz looks like a premium dark esports HUD. It uses navy surfaces, one cyan
signal, outlined chamfer plates, Orbitron display type over Onest body copy, and
glow only where it counts. This skill tells you how to apply that to any job.
The values themselves live in the repository.

## Sources of truth, in order

1. `src/design-system/styles/tokens.css` holds every `--ds-*` value. The app and the
   export renderer both load it. The TS mirror in `src/design-system/tokens/`
   must match it; `npm test` checks this.
2. `src/features/compositions/composition.css` holds the social artwork scale
   (`--social-*`) and the per-ratio `.format-*` overrides.
3. This skill and its references. `references/tokens.md`,
   `references/actions.md` and `references/use-cases.md` are generated from
   `src/domain/brand-guide.ts` and the two stylesheets.
4. `docs/brand-guide.md`, `docs/template-contract.md` and `docs/architecture.md`.
5. The older `theme` and `cyber-ui` skills, ported from card_game. Where they
   disagree with this skill, this skill wins. card_game's `Cyber.magenta` is the
   violet token (`#C27AFF`); there is no separate magenta. There is no film grain
   or noise anywhere.

The system is shared with two read-only upstream projects. `statoz_web` (Next.js)
is where the tokens came from: its `src/design-system` holds the same
`tokens.css`, and the studio's actions and elements port its `Button`,
`SignalPanel`, `AccentPanel`, `Badge`, `Progress`, `StepMeter`, `UnderlineTabs`
and `SelectableTile`. `card_game` (Flutter) holds the product: `lib/config/theme.dart`
(`AppTheme`, `Cyber`), `lib/widgets/cyber/` (`HudCtaButton`, `CyberFuseCtaButton`,
`HudPagerButton`, the pills and chips) and `docs/product/design/`. Read them for
reference only; never edit them from this studio.

People see the same guide in the studio under **Assets & brand → Brand**. They can
download the kit (tokens CSS/JSON, fonts, logo, guides) from
**Assets & brand → Assets → Design kit**, which is served by `GET /api/brand-kit`.
Outside a checkout, the brand mark is bundled at `assets/logo.png`; keep its
proportions and never recolour or redraw it.

## Pick the recipe first

Match the job to a recipe in [use-cases.md](references/use-cases.md):

- social feed posts and carousels
- reels and video
- match posters and match stories
- player and collectible cards
- app-store creatives
- investor pitch slides
- studio and product UI
- pages, docs and external tools

Each recipe names its formats, the studio template to start from, and its
palette, type, asset and claims rules, plus a checklist. Look up token values in
[tokens.md](references/tokens.md). For buttons and UI elements, read
[actions.md](references/actions.md). For implementation details, read
[components.md](references/components.md).

## Actions

- One focal action per surface: `HeroCta`, or a solid `ActionButton` with
  `glow`. Everything else is tonal, surface or ghost.
- Pick by job:
  - `ActionButton` / `ActionLink`: ordinary actions (solid, tonal, surface,
    ghost; sm, md, lg; pending)
  - `HeroCta`: play and commit moments, including hold-to-charge
  - `FuseCta`: time-limited actions
  - `PagerButton`: back and next in a step flow
  - `ActionChip`: inline card actions
  - `IconButton`: icon-only actions and toggles
  - `DialogActions`: the confirm bar
  - `Stepper`: bounded numbers
  - `SelectableTile`: picture choices
  - `ControlPad`: press-and-hold game input
- Every action shows default, hover, pressed, focus, disabled, pending,
  selected and destructive states without losing its label.
- The elements (`Badge`, `StatusPill`, `DeltaChip`, `Progress`, `StepMeter`,
  `SignalPanel`, `AccentPanel`, `UnderlineTabs`) live in `elements.tsx`.
- In artwork, draw these shapes with the same tokens; the components are for UI
  and mocks.

## Non-negotiables

- **Token first.** Use the `--ds-*` semantic token, never its hex value. In this
  studio's chrome, use the `--studio-*` variables. Add a token only for a
  reusable decision, and add it to both `tokens.css` and the TS mirror. Don't
  change the global palette to fix one component.
- **One signal.** Cyan is identity and interaction. Every other accent has a
  meaning:
  - gold means reward
  - success green means correct
  - danger red means error or loss
  - violet means elite
  - a sport's accent marks that sport's content (football cyan, cricket white,
    basketball gold, tennis lime, motorsport racing red)
- **Glow is scarce.** Only one element glows: the selected, live or revealed
  one. Use `glow()` from `tokens/elevation.ts`. Everything else stays flat.
- **Chamfer plates with continuous outlines.**
  - Use the clip-path tokens (`--ds-clip-hud`, `-panel`, `-chip`, `-card`,
    `-signal`, `-field`, `-tab-plate`).
  - Draw each surface as a 1px outer shell plus an inner fill that share one
    clip-path, so the border follows every cut.
  - Don't use rounded Material cards, pill-heavy layouts or generic white cards.
- **Type.**
  - Orbitron (`--ds-font-display`) is for headlines, numbers and identity.
  - Onest (`--ds-font-body`) is for copy and controls.
  - Numbers that change use tabular figures.
  - UI uses the `--ds-text-*` ramp. Artwork uses `--social-*`.
- **Ratios.** Compose 1:1, 4:5, 9:16 and 16:9 independently.
  - Keep a safe area of 8% on every side.
  - 9:16 is different: it reserves 14% at the top, 14% on the right and 22% at
    the bottom.
  - Keep the logo undistorted and the CTA readable with the sound off.
- **Motion.** Video briefs run 8–60 s at 30 fps. Drive motion from frame time
  so preview and export stay identical. Use `step`, `easeOut` and `smoothstep`
  from `src/features/compositions/motion.ts`. Never build a second renderer.

## Assets and claims

- **Registered assets only.** Import through the studio into `storage/assets`,
  and record provenance and approval explicitly:
  - `brand` is StatOz's own artwork: the logo, line art and brand illustrations.
  - `reference` is product captures, crests and real-athlete portraits.
  - `approved` is cleared for campaigns.
- **Crests.** Team crests are club trademarks. Never use them as brand
  decoration.
- **Players.** Invented sample players are never presented as real. Imported
  real athletes never imply endorsement.
- **Numbers.** Sample statistics keep their sample label. Match posters carry
  reported figures only; never invent or project a number. Prototype behaviour
  is not a marketing promise.
- **Audio.** Use only audio the user supplied and approved. Never publish or post
  without the user's request.

## Where code goes

| Change | Location |
| --- | --- |
| A colour, type, shape or spacing decision | `src/design-system/styles/tokens.css` plus the `src/design-system/tokens/*.ts` mirror |
| A generic control | `src/design-system/components/ui.tsx` (studio chrome), `actions.tsx` and `elements.tsx` (the shared StatOz family), with CSS in `actions.css` / `elements.css` |
| Studio screens | `src/features/studio`, with a feature CSS file next to the component |
| Artwork and templates | `src/features/compositions`, `src/features/templates/registry.ts` |
| Guide content (principles, catalogs, recipes, do/don't) | `src/domain/brand-guide.ts`, then run `npm run design:sync`; a new catalog entry also needs a demo in `src/features/studio/brand-actions-section.tsx` |

## Validate

- Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.
- **Compositions:** run `npm run test:media` and look at the PNGs it generates.
  Check crops, tiny text, overflow, fallback fonts and contrast.
- **Studio UI:** run `npm run test:ui` and check the desktop and 412px mobile
  screenshots. There should be no horizontal scroll.
- **Tokens or guide content:** if you changed `tokens.css`, the social scale or
  `brand-guide.ts`, run `npm run design:sync`. The test suite fails while the
  skill references or the `.claude` mirror are stale.
- Report honestly anything you could not inspect.
