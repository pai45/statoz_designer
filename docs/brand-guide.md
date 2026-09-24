# Brand guide

The full design system (every token, the type scales, shapes, action buttons and
UI elements ported from statoz_web and card_game, safe areas, motion,
use-case recipes, and do/don't) is in the studio under **Assets & brand → Brand**.
Assistants get the same content from the `statoz-design-system` skill. Both come from
`src/domain/brand-guide.ts` plus the stylesheets. To use the brand outside the studio,
download the tokens, fonts, logo and guide from **Assets → Design kit**.

## Source of truth

The versioned local snapshot from `statoz_web` provides CSS and TypeScript tokens,
local Orbitron/Onest fonts, the StatOz mark, and selected product backgrounds.
`card_game` provides gameplay context, sport/team color semantics, and the HUD
aesthetic. The source revisions and copied-file hashes are in brand-snapshot.json.

Use dark navy surfaces, white text, muted blue-grey supporting text, and cyan for
the primary identity. Sport accents: football cyan, cricket white, basketball gold,
tennis lime, motorsport red. Keep reward, danger, live, and team semantics distinct.

## Typography and geometry

Onest is the body/control font. Orbitron is for display, numerical emphasis, and
brand identity. Numbers that change use tabular figures. Social artwork has its
own pixel-based type scale in composition.css; UI controls use the compact scale.

Panels follow the existing web HUD geometry. Preserve their full outlined
silhouette with layered shells. FilterChips is a compact chamfered plate group
with keyboard selection and 44px targets. The local components adapt the web
HudPanel, Button, InputField and FilterChips patterns. Collectible visuals follow
the existing PlayerCard/ActionCard cut-corner and rarity conventions.

The Flutter product documentation records a future top-left/bottom-right standard
panel migration. Its old shared widgets still include legacy cuts, and portions
of the cyber-ui skill still describe retired grain. Use the current web baseline
and the current Flutter implementation: calm grid/scanlines; no film noise.

Glow is scarce: selected actions, a focal live state, or a reveal moment. Ambient
decoration stays behind content. Do not add pill-heavy or generic white-card UI.

## Social compositions

Always compose independently for 1:1, 4:5, 9:16, and 16:9. House safe areas are 8%
on all sides; 9:16 reserves 14% top, 22% bottom, and 14% right. These are internal
guides, not official platform compliance guarantees. Keep text phone-readable,
the logo undistorted, and final CTA readable without sound.

## Claims and media

The templates use example teams, players, and statistics. Keep the sample label
until replacing and verifying content. Product screenshots and assets establish
appearance; they do not establish athlete endorsement or campaign rights. Asset
metadata records source and an explicit brand/reference/approved classification.
