# Template and composition contract

Register templates in `src/features/templates/registry.ts`: unique ID, version,
name, category, kind, description, visual entry, supported formats, editable
fields, defaults, optional initial pages, and optional page limit. `createProject`
produces schema-versioned project JSON. A project's selected format and every output
variant must belong to the registered template.
Extend the domain schema and editor controls together when adding a field.

All template families render through the React `Composition` component. Additional
visual entry values must be implemented there. Keep visual modules independent of
Next.js server/client navigation, storage, clocks, and remote services.

## Rendering lifecycle

`compositionHtml(project)` uses esbuild to compile the React browser entry and
embeds compiled styles, tokens, fonts, logo, project JSON, and selected media as
data URLs. `window.STUDIO` contains project, media, logo and optional page index.

`window.drawFrame({time,pageIndex,guides})` synchronously commits React, awaits
fonts/images, and explicitly seeks video. It returns a promise. Time is in seconds;
exports use `frame / 30`. All animated properties must derive from this time.
`window.ready` covers initial setup. `window.overflowReport()` reports clipped text.

The editor iframe uses this exact HTML, with a parent-only postMessage bridge.
The render browser runs it offline at output size and device scale 1. UI chrome,
safe-area guides, selection tools, and playback controls do not belong in exports.
Never use running CSS animations, random frame values, or uncontrolled video playback.

Preview only: `studio:frame` messages update project/time/page/guides. Responses
are `studio:ready`, `studio:drawn` (including overflow), and `studio:error`.

## Project data

`src/domain/project.ts` owns the Zod schema and public types. Each project records
its revision, template/version, media kind, sport, selected format and variants,
scenes/pages, soundtrack settings, brief, and timestamps. Asset references are IDs.
Projects retain page IDs when reordered. New pages must receive a new UUID.

Pitch decks use the hidden `investor-pitch` carousel template and are always 16:9.
`pitchDeck` records family, master/variant role, and snapshot provenance. Each page's
nullable `presentation` object holds its pitch layout, product visual, up to six
bullets and metrics, evidence status, and source note. Evidence status distinguishes
repository-backed product proof, supplied-source figures, illustrative category maps,
and proposed roadmap or financing claims; the source note stays visible in the exported
slide footer. Both fields default to null,
so schema-version-1 projects load without migration. Variants copy a saved revision
with fresh project/page IDs and never inherit later source edits.

Investor Lens reviews do not extend the project schema. Review records carry the
source project ID, revision and ETag, structured screening result, approved changes,
founder-supplied answers, resulting variant ID and follow-up review. Revisions are
assembled as temporary candidates and enter `storage/projects` only after project,
asset, evidence and provenance validation. Founder-supplied claims must say so in the
visible source note; missing claims stay input-needed, illustrative or proposed.

Card scenes may link an entry from the local player library. `playerCard` holds a
snapshot (`playerId`, position, club, nation) so the composition renders without the
library present; the name, rating, PACE/SKILL/FORM, and portrait asset stay in the
ordinary scene fields. It is `null` when no player is linked, and projects written
before the library load unchanged.

`emblemA` and `emblemB` are asset ids for the two sides' crests. Match visuals draw
crests directly on the canvas without a container and fall back to an unboxed initials
monogram when empty; comparison visuals also fall back to initials. They are separate
from `assetId` so a scene can carry both a photograph and
two crests. Projects written before them load unchanged, because both default to "".

App showcase scenes use `assetId` for the shared phone capture and `tabletAssetId`
for the separate tablet capture. `tabletAssetId` also defaults to `""`, so existing
schema-version-1 projects remain valid. Preview keys, offline embedding, briefs, and
assistant validation must treat both fields as asset references.

The Product template family adds exact placement formats for Instagram portrait,
Google Play phone/tablet/feature/icon, and App Store iPhone/iPad/icon output. App
showcases start with one page and may be duplicated to eight pages. Blank projects
remain editable and saveable, but export readiness requires the appropriate capture,
replacement copy where the placement uses copy, and a compliant icon master. Icon
masters must be square PNG files at least 1024 × 1024 with known, fully opaque alpha
metadata; legacy assets without recorded alpha metadata must be re-imported.

Video duration is the sum of scene durations, 8–60 seconds, aligned to 30 fps.
Image projects contain one page; carousel/video projects support up to 12 unless a
template declares a smaller limit. Pitch
PDF and PPTX exports flatten those exact rendered pages for visual parity; ZIP keeps
the same ordered PNG slides.
Clip in/out is seconds; out=0 means source end. Frames hold at clip end. The
soundtrack starts at zero, pads/trims, and never automatically loops.

## Validation

Run unit tests and all media-layout checks. Inspect first/middle/final frames and
transitions, not only the contact sheet. Test long copy, missing assets, ratio
switching, repeated seeking, and export output. Update docs when contracts change.
