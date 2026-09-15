# Template and composition contract

Register templates in `src/features/templates/registry.ts`: unique ID, version,
name, category, kind, description, visual entry, supported formats, editable
fields, and defaults. `createProject` produces schema-versioned project JSON.
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

Video duration is the sum of scene durations, 8–60 seconds, aligned to 30 fps.
Image projects contain one page; carousel/video projects support up to 12.
Clip in/out is seconds; out=0 means source end. Frames hold at clip end. The
soundtrack starts at zero, pads/trims, and never automatically loops.

## Validation

Run unit tests and all media-layout checks. Inspect first/middle/final frames and
transitions, not only the contact sheet. Test long copy, missing assets, ratio
switching, repeated seeking, and export output. Update docs when contracts change.
