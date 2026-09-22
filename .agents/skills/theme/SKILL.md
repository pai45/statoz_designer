---
name: theme
description: Web-port of the StatOz theme build guide, imported from the card_game project. Use for visual work in this studio alongside cyber-ui.
source: C:\Users\priya\OneDrive\Desktop\flutter_projects\card_game\.agents\skills\theme\SKILL.md
---

# Theme — StatOz web build guide

This local adaptation preserves the card_game theme guidance for the Next.js
studio. Build with the studio's existing tokens and components; do not import
Flutter runtime code or hard-code visual values that the token layer expresses.

## Rules

- Keep the application dark. Resolve any card_game `AppTheme` / `Cyber` value to
  the current studio semantic token before use. The Flutter facade is a source
  reference, not a web dependency.
- Use Orbitron for display labels, headings, and tabular figures; use Onest for
  body copy. Uppercase HUD labels use measured tracking.
- Reuse the studio's shared composition and design-system primitives before
  creating local equivalents. A repeated web pattern belongs in the relevant
  shared component, not a one-off screen implementation.
- Work with the four supported ratios and deterministic composition time. Preview
  and export must use the same renderer.
- Preserve card_game data only as an illustrative product mock unless it is
  explicitly registered and approved as a source asset.

## Porting procedure

1. Inspect the Flutter screen and `lib/config/theme.dart`; identify semantic
   roles rather than copying raw colors or fixed phone measurements.
2. Map `Column`/`Row`/`Stack` to responsive CSS grid, flex, and positioned
   layers. Reflow fixed phone widths instead of treating them as web tokens.
3. Translate `Cyber.display`, `Cyber.label`, and `Cyber.body` to the studio's
   loaded Orbitron/Onest fonts and existing type scale.
4. Translate `CyberPanel` and HUD cards to current chamfer tokens and CSS,
   retaining flat surfaces and border hierarchy.
5. Use registered assets only. Keep provenance and approval explicit.
6. Validate with lint, typecheck, tests, build, and media visual inspection.

For composition and aesthetic choices, follow the adjacent `cyber-ui` skill.
