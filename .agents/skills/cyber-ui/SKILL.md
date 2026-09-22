---
name: cyber-ui
description: Web-port of the StatOz cyber UI guide, imported from the card_game project. Use for cyber/HUD visual work alongside theme.
source: C:\Users\priya\OneDrive\Desktop\flutter_projects\card_game\.agents\skills\cyber-ui\SKILL.md
---

# Cyber UI — StatOz web design rules

Premium dark esports HUD: neon on near-black, crisp angular surfaces, dense
information hierarchy, and restrained glow. This is a web adaptation of the
card_game guide; current studio tokens remain the implementation authority.

## Non-negotiable visual rules

1. Use hierarchy through scarcity. One focal element may glow because it is
   selected, live, primary, or the hero. Static panels, dividers, secondary
   chips, and ordinary rows stay calm.
2. Let texture and the existing composition grid create atmosphere. Do not cover
   every panel in gradients or glow.
3. Prefer asymmetric HUD layouts, short telemetry labels, and information-dense
   grouping over centered stacks of generic cards.
4. Cyan is the dominant interactive/signal accent. Magenta is sparing secondary
   emphasis; gold communicates rewards, green success, red danger, violet elite.
5. Use opposing top-left/bottom-right chamfers for standard plates and cards.
   Avoid rounded Material-style surfaces.

## Component vocabulary

- A live or selected primary plate: one cyan border/glow, high contrast label,
  and a clear action or state.
- A standard HUD plate: flat dark fill, subtle border, top signal rule, small
  telemetry, no glow.
- A quick-play tile: accent icon/marker, compact state chip, large title,
  supporting mode label, and a faint oversized decorative glyph.
- An active tab: raised cyan plate; inactive tabs remain muted and flat.

## Web checks

- Use existing `--ds-*` and pitch composition tokens before adding values.
- Preserve reduced-motion behavior and avoid decorative assets that are not
  registered in `storage/assets`.
- Keep the mock readable at all export ratios, with the same composition in
  preview and export.
- Inspect rendered PNGs after visual changes; do not rely on source review alone.
