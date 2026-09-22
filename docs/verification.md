# Verification record

Verified on Windows on 15 September 2026, including the production server at
`http://127.0.0.1:3000`. Chromium, FFmpeg, and the separate render worker passed
the runtime checks.

## Checks completed

| Check | Result |
| --- | --- |
| ESLint, TypeScript, production build | Passed; build completed without warnings |
| Unit and persistence tests | 8 passed, including malformed JSON, save conflicts, concurrent writes, Windows rename retries, and worker restart recovery |
| Composition matrix | 48 template/ratio combinations passed; generated contact sheet and full-resolution frames visually inspected |
| Video composition frames | First, intermediate, transition, and final frames checked; repeated seeks produced identical screenshots |
| Production studio workflow | Create, edit, autosave, reopen, undo, ratio changes, import, navigation, and responsive width passed with no browser runtime errors |
| Image exports | PNG dimensions and exact preview/export pixel parity passed; JPEG export passed |
| Carousel export | ZIP contained four ordered PNG pages |
| Video export | Eight-second 1080 × 1920, 30 fps MP4 with synthesized audio fully decoded with FFmpeg and played in Chromium |
| Imported media | Trimmed clip seeking, invalid trim rejection, soundtrack/SFX mixing, and silent MP4 passed |
| Queue operations | Cancellation, retry, snapshot isolation, and unique output retention passed |
| Editor recovery and accessibility | External-edit recovery copy, output selection, keyboard filters, mobile navigation, and focus checks passed |

## Local evidence

The verification scripts preserve their reports and rendered examples in:

- `test-results/media/report.json` and `contact-sheet.png`
- `test-results/studio/report.json` and `ui-report.json`
- `test-results/audio-video/report.json`, `mixed.mp4`, and `silent.mp4`

Completed studio exports remain available in the Exports screen and under
`storage/renders`. Test reports, project data, and generated media are local files
excluded from Git. The scripts and their assertions are versioned.

## Scope of verification

The matrix covers all starter layouts at their default content, with additional
overflow and missing-media checks. User copy and imported media still require
visual review before use. Export validation reports detected text overflow.
Video decode checks used eight-second samples; the project contract validates
the full supported 8–60 second range. The studio is intended for one local user.
Source clip audio is muted; music or voiceover is selected as a separate track.

## Assisted posting (added 15 September 2026)

| Check | Result |
| --- | --- |
| ESLint, TypeScript | Passed |
| Unit and process tests | 12 passed, including platform media rules, caption limits, carousel page extraction, duplicate and path-escape rejection, close/retry/posted transitions, and posting-window restart recovery with a single-process lock |
| Local API (development server) | Compatibility for image, carousel, reel, and cancelled exports matched the matrix; invalid settings, a YouTube image post, and a cross-origin write were rejected; doctor reported the posting window |
| Studio UI | Post button, platform picker, per-platform caption limit, dialog close, Social accounts tab, and 400 px width passed with no browser errors |

Not yet verified: `npm run build` (a production studio was running from `.next`),
and every site adapter against live signed-in LinkedIn, YouTube Studio, Instagram,
and X pages. Site selectors are best effort and change with each site. After signing
in, run `npm run test:publish` and inspect `test-results/publish`.

## Player card library (added 16 September 2026)

| Check | Result |
| --- | --- |
| ESLint, TypeScript, production build | Passed |
| Unit and persistence tests | 15 passed, including the new player schema, sample-record completeness, multi-field search, sport filtering, rating-ordered results, create/update round trips, portrait and rating validation, path-escape rejection, damaged-record tolerance, and `playerCard` defaulting to `null` for projects written before the library |
| Composition matrix | 56 template/ratio combinations passed, adding both card families rendered with a linked player; square, portrait, reels, and landscape PNGs were inspected at full resolution |
| Studio UI | Searching the library, applying a player, its club/position/nation and PACE/SKILL/FORM printing on the card, choosing a portrait, saving as a new player, and reselecting it with the portrait intact all passed with no browser errors |
| Image export | A portrait PNG of a card with a linked player and a registered portrait asset exported through the worker and matched the editor preview |
| Upgrade path | An existing storage folder already carrying `.initialized` gained the library on the next start through its own `.players` marker |

The library seeds twelve invented sample players across the five sports. It has no
delete action in the studio; a record is removed by deleting its file in
`storage/players`. `npm run test:ui` removes the player it creates, leaving the
library as it found it.

## Landscape video (checked 16 September 2026)

All four ratios were already offered for every template family, including the four
video families; only the 1080 x 1920 MP4 had been decoded previously.

| Check | Result |
| --- | --- |
| Landscape video project | Created at 1920 x 1080 from the Feature promo family with an eight-second duration |
| Landscape MP4 export | Completed through the render worker at 1920 x 1080 |
| FFmpeg decode | Full decode reported no errors: H.264 High, yuv420p progressive, 1920 x 1080, SAR 1:1, DAR 16:9, 30 fps, 8.00 s, with an AAC track |

## Pitch Duel roster import (added 16 September 2026)

`npm run import:players` reads the `card_game` Dart sources. That checkout was treated
as read only throughout; nothing was written to it.

| Check | Result |
| --- | --- |
| ESLint, TypeScript, production build | Passed |
| Unit tests | 18 passed. Three cover the reader against a hermetic fixture tree: balanced nested parentheses, a map anchored on its declaration rather than an earlier use of the same name, both Dart quote styles, alias portrait filenames, the webp/png driver split, and dropping a mapped portrait whose file is absent |
| Roster parity | 745 players read: football 180, cricket 180, basketball 180, tennis 100, motorsport 105. Ids diffed 1:1 against the game's own `tool/extract_player_cards.py` dump with no players missing or extra |
| Import | 745 records and 745 portraits written; `storage/assets` grew to 311 MB. Re-running refreshes in place because ids derive from the source card ids |
| Search | Name, club, nation and position queries resolved across all five sports; the sport filter and query combine |
| Search latency | 0.49 s cold, about 12 ms warm after the library cache was added (757 records on OneDrive-backed storage) |
| Composition matrix | 56 layouts passed after the card gained a top scrim so the rank and tier read over bright portrait art |
| Studio UI | The picker searched the imported roster, applied a player with their portrait, and printed position and nation on the card, with no browser errors |
| Image export | A portrait PNG of an imported player exported through the worker and matched the editor preview |

Known limits, by design: football cards are a national-team roster and carry no club,
so that line falls back to the house label. PACE/SKILL/FORM come from real sub-ratings
for tennis and motorsport; football, cricket and basketball cards carry a single
overall rating in the source, so all three read the same number rather than being
invented. Portraits import at `reference` approval and are real athlete likenesses;
campaign approval is a per-asset decision recorded in Assets & brand.

See [README](../README.md#verify) for commands to reproduce the checks.

## Pitch deck library (added 17 September 2026)

| Check | Result |
| --- | --- |
| Schema and persistence | Backward-compatible null defaults, one-time master seed, unique slide IDs, family provenance, invalid-source rejection, and independent variant edits passed |
| Unit suite | 27 tests passed |
| Composition matrix | 57 supported layouts passed; all 12 investor slides were checked for overflow and deterministic redraw and visually inspected |
| Export packages | Ordered PNG ZIP, PDF, and PPTX each contained 12 slides; PDF pages were 16:9 and the PPTX package had 12 widescreen slide records |
| Studio UI | Desktop and 412 px workflows passed for family grouping, creation, rename, archive/restore, structured editing, and PDF/PPTX/PNG ZIP choices |
| Production checks | ESLint, TypeScript, and the production build passed; the build retained the existing Turbopack dynamic-filesystem tracing warning for assistant CLI discovery |

Pitch UI screenshots are in `test-results/pitch-ui`; full-resolution slides and the
contact sheet are in `test-results/media`. `npm run test:pitch-exports` uses a temporary
storage root and removes its generated packages after validation.

## Investor Lens agent (added 20 September 2026)

| Check | Result |
| --- | --- |
| Shared skill | `$investor-deck-advisor` passed the Codex skill validator with implicit invocation enabled |
| Review contract | The fixed 100-point India seed-VC rubric, linked founder questions, recommendation limits and malformed-reference rejection passed |
| Source safety | Required-answer gating, saved-ETag staleness rejection, fresh project/page IDs and byte-identical master preservation passed |
| Provider handling | A structured Codex review completed read-only; malformed Claude JSON failed without changing the source deck |
| Full workflow | A hermetic Codex stub revised a temporary candidate, published the valid variant, removed the candidate and completed the automatic follow-up screening |
| Unit and process suite | 34 tests passed |
| Studio UI | Desktop and 412 px Investor Lens entry, screening form, scorecard, recommendation selection and founder-answer gating passed with no browser errors |
| Composition and exports | 62 media layouts passed, including a reordered long-copy/input-needed candidate with no visual asset; the investor deck retained 12-slide ZIP, PDF and PPTX export parity |
| Production checks | ESLint, TypeScript and production build passed; the existing dynamic CLI-discovery tracing warning remains |

Investor UI screenshots are in `test-results/pitch-ui/investor-review-desktop.png`
and `investor-review-approval.png`. The agent tests use local stub CLIs and consume
no real model quota. Live review quality still depends on the selected local model
and the evidence supplied in the deck.
