# Architecture

The product has two shells around the same Studio feature tree. The local Next.js App
Router shell provides the direct recovery/development UI and all route handlers. A
separate static-export shell under `pages-site` publishes the full browser UI at the
repository's GitHub Pages base path. It has no server routes and sends no workspace data
to GitHub. Both shells use the same editor, templates, compositions, design system and
CSS, so preview and export continue to share one renderer.

The local companion supervises Next.js, a separate Node render worker, the assistant
process and a posting window process. Every process with an HTTP surface binds to
`127.0.0.1`; `npm run dev` and `npm start` print the companion's `/connect` URL.

- `app`: route/layout shell and local HTTP endpoints.
- `features`: studio, editor, template registry, and React compositions.
- `design-system`: brand tokens, CSS variables, and generic controls.
- `domain`: shared project/asset/job types, schemas, and timing rules.
- `shared`: non-visual browser utilities.
- `server`: persistence, media handling, composition bundling, queue, rendering.
- `pages-site`: static GitHub Pages shell and export configuration.

No source checkout, hosted AI service, social network, or database is required at
runtime. Assistant runs call a locally installed CLI only when the user starts one.
The dashboard loads projects and their media once; exports, posting state, assistant
status, transcripts, player searches, and match data are fetched only after the
corresponding workspace or control is opened. Active user-started runs may poll only
for their own completion. Imported media is immutable and cacheable by asset ID.

## Local interfaces

`GET /connect` creates a cryptographically random one-use nonce with a two-minute
lifetime and redirects to the Pages URL. Its fragment carries only that nonce and the
validated loopback origin, then the browser removes the fragment from history.

- GET `/api/connection`: nonsensitive readiness information.
- POST `/api/session`: consumes the one-use pairing nonce and returns a signed,
  time-limited bearer session.
- GET `/api/session/media-token`: returns a separate signed read-only token used only
  by asset, brand-kit, export-poster and export-file GET routes.
- OPTIONS `/api/*`: exact-origin CORS and browser private-network preflights.

Requests from `https://pai45.github.io` require bearer authorization except the
readiness and pairing endpoints. Cross-origin media URLs require the scoped media token.
The companion accepts no other remote origin. Localhost same-origin behavior remains
available, and every request must carry a loopback Host header; LAN and public binding
are rejected.

- GET/POST `/api/projects`; GET/PUT/DELETE `/api/projects/:id`. PUT and DELETE
  require `If-Match` with the SHA-256 ETag of the exact source JSON; mismatches
  return 409. DELETE removes only the editable project JSON and preserves exports.
- POST `/api/projects/:id/variants` with a name and audience snapshots a saved
  pitch deck into the same family and records its source project and revision.
- GET `/api/config`: templates, formats, and managed project-folder path.
- GET/POST `/api/agents`; POST `/api/agents/:id/cancel|retry`; GET `/api/agents/:id/log`.
  GET/PUT `/api/agent-settings`. A revise request may include `focusPageId`, which
  must belong to its project. Creation returns 202; the client checks status only while
  a user-started run is queued or running, or when the user refreshes it.
- GET/POST `/api/investor-reviews`; GET `/api/investor-reviews/:id`; POST
  `/api/investor-reviews/:id/apply|cancel|retry`. Reviews bind to the exact saved
  project ETag. Apply accepts approved recommendation IDs, founder answers and
  optional provider/model confirmations that must match the original screening,
  then returns 202 while the shared assistant queue builds a new deck variant.
- GET `/api/espn/leagues|matches|match/:eventId`; POST `/api/espn/poster`.
- POST `/api/preview`: validated project → self-contained HTML.
- POST `/api/audio-preview`: validated video project → deterministic SFX WAV.
- GET/POST `/api/assets`; GET `/api/assets/:id`; PATCH `/api/assets/:id` approval.
  Newly imported PNG files record dimensions and alpha-channel metadata used by the
  store-icon export gate. Asset responses include a purpose category for the studio
  library; older schema-version-1 records are classified on read and are not rewritten.
  App screens (`src/domain/app-screens.ts`) are copied from the card_game screenshot
  catalog by `scripts/import-app-screens.ts` under stable ids; the same list groups the
  App showcase phone picker, supplies each screen's default page copy, and picks the
  page's category background (`src/features/compositions/app-showcase-backdrops.tsx`).
  Gameplay screens are captured by `scripts/capture-gameplay.ts`, which serves the
  unchanged card_game web build locally, runs per-game recipes
  (`src/server/capture/gameplay-recipes.ts`) through Flutter's semantics tree, and
  registers each frame with the same asset writer as the catalog importer.
- GET `/api/players` with optional `q` and `sport` filters; POST `/api/players`;
  PUT `/api/players/:id`. Portraits must reference a registered image asset.
  The parsed library is cached against the players folder's modification time and
  entry count, because search runs on every keystroke over hundreds of records.
  Editing a player file in place changes neither, so such an edit appears after the
  next library write or a restart.
- GET/POST `/api/exports`; GET `/api/exports/:id`; POST `/:id/cancel` or `/:id/retry`.
- GET `/api/exports/:id/poster` and `/:id/file`, with optional `?download`.
- GET `/api/doctor`: Chromium, FFmpeg, render-worker, and posting-window checks.
- GET/POST `/api/publish`; POST `/api/publish/:id/retry`, `/close`, or `/posted`.
- GET `/api/publish-options/:jobId`: per-platform compatibility and default caption.
- GET/PUT `/api/publish-settings`; POST `/api/publish-login/:platform` opens sign-in.

Local mutations validate Host and same-origin Origin. Pages mutations validate the
exact Pages origin and its bearer session. IDs are constrained. Media paths
are resolved through realpath and must remain inside managed asset roots. Remote
assets and executable uploads are excluded. Media uploads are capped at 150 MB.

## Persistence and jobs

Project saves use per-project exclusive locks, temporary-file rename with bounded
Windows sharing-lock retries, content-hash conflict checks, and incremented revisions. External edits are detected regardless
of whether an assistant increments the revision. JSON validation precedes use.

Export preparation freezes JSON, inline HTML/bundle/media, and an audio copy before
publishing a queued job. One worker owns the queue through an exclusive PID lock.
It sends heartbeat timestamps and processes jobs in creation order. Export states:
queued → running → completed/failed/cancelled; a restart maps running → interrupted.

Cancellation markers are separate from progress writes. MP4 frames stream into
FFmpeg; generated SFX use the existing skill's seeded synthesizer. Finished MP4s
are decoded before a collision-safe hard link publishes the final file. Temporary
output is removed on failure. Frozen input is retained for deterministic retries.
Pitch decks render all pages once and package those same screenshots as an ordered
PNG ZIP, a 16:9 PDF, or full-bleed widescreen PPTX slides.

Store-bound still exports are normalized and audited after rendering. Apple screenshot
and icon outputs are opaque RGB PNGs at their declared dimensions; the Google Play icon
is emitted at 512 × 512 with its source alpha behavior preserved. A job is not marked
successful until the finished PNG's dimensions and alpha/color behavior match the
placement contract.

## Assisted posting

Posting uses signed-in site composers instead of social network APIs. `POST /api/publish`
validates a completed export against the platform's media rules, extracts carousel pages
into `storage/publish/<id>/`, and writes a queued record. `src/server/publisher.ts` owns
one headed persistent browser context through a PID lock and heartbeat. It opens one
record at a time: queued → opening → needs-login → ready. The record ends as
posted (marked by the user), closed, or failed. A platform adapter
(`src/server/publish/platforms`) attaches files and fills text; the user clicks Post.
Close requests use marker files like export cancellation. A restart maps open tabs to
closed. Sign-in launches the same profile as a plain browser process without automation,
after the automated context closes. The profile lives outside the project folder.

## Match data

Posters can be built from a finished fixture. `src/server/espn` reads ESPN's public site
API: `scoreboard` for a league and date, `summary` for one fixture. Racing has no summary
endpoint and lists practice, qualifying and the race as sibling competitions, so a race is
read from the scoreboard with the race session selected. Cricket publishes no team boxscore
and reports neither a status name nor a completed flag, so innings come from each side's
formatted score and completion is read from `state`.

Every sport is normalised to one `MatchFacts` shape, which `poster.ts` maps onto ordinary
scene fields — names, scores, a featured stat, a chart, and the two crests. Nothing is
fetched at render time: the export browser runs with the network disabled, so crests are
downloaded once into `storage/assets` and inlined like any other asset. Responses cache
under `storage/espn` for ten minutes and a stale entry is served when the feed is
unreachable, so the studio keeps working offline.

## Assistant runs

An assistant run hands one project to a locally installed Claude Code or Codex CLI.
Each CLI carries its own sign-in, so no key is stored and the studio runs normally with
neither installed — `doctor()` reports which were found. `POST /api/agents` creates the
project shell from the template registry (so ids, schema version and revision stay
studio-owned), then writes a queued record to `storage/runs/<id>.json`.

`src/server/agent.ts` owns the runs through a PID lock and heartbeat, one at a time,
mirroring the publisher. It resolves the binary by env override, then PATH, then known
install locations — Claude Code lives at a version-stamped path inside the VS Code
extension, so that lookup globs the family and takes the newest. The prompt is written to
stdin rather than argv, which keeps it clear of the Windows command-line length limit and
of any shell quoting. The CLI runs with file access to the repository but no shell tool,
and normalised events stream into `storage/runs/<id>.log`.

The project is snapshotted before the run and re-validated after it. An invalid result is
reverted and the run fails with the validation message, so a run can never leave a broken
project. Paths changed outside `storage/` are recorded on the run for review. Cancellation
uses marker files like export cancellation, and a restart maps running to interrupted.

Editor Brief runs include the selected page as context. The prompt routes copy/data/media
requests to that page by default, while style/motion and video-audio requests apply to the
whole template unless the person explicitly narrows or broadens the scope. Any newly
selected soundtrack must be a registered audio asset marked `approved`; that rule is
enforced again after either CLI returns.

Investor Lens runs share the same single-process queue but use a separate versioned
record under `storage/reviews`. Initial and follow-up screenings are read-only and
must return a schema-validated India seed-VC assessment. Approved revisions work on
a temporary candidate under `storage/reviews`; only a valid, changed candidate is
published into the source deck family. The reviewed source ETag must still match at
approval time, and the source master is never passed to a revision run. A successful
revision automatically queues a second screening with the same provider and model.
Codex uses its structured-output file for reviews and revisions. Claude's final review
message must parse as the same strict JSON assessment; malformed output fails without
changing a project. Neither path browses the web, exports, or publishes.

The vendored renderer is the inspected upstream reference. Its FFmpeg discovery
and SFX synthesis are extracted into `vendor/statoz-video/core.mjs` so unused CLI
code is excluded from the app bundle; byte-for-byte SFX parity is tested. React HTML generation, explicit
progress/cancellation, ZIP/still export, and queue ownership are project-owned.
