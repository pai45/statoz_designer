# Architecture

Next.js App Router with a separate Node render worker. `npm run dev` and `npm start`
supervise both processes. The UI talks to Node route handlers over loopback.

- `app`: route/layout shell and local HTTP endpoints.
- `features`: studio, editor, template registry, and React compositions.
- `design-system`: brand tokens, CSS variables, and generic controls.
- `domain`: shared project/asset/job types, schemas, and timing rules.
- `shared`: non-visual browser utilities.
- `server`: persistence, media handling, composition bundling, queue, rendering.

No source checkout, AI service, social network, or database is required at runtime.

## Local interfaces

- GET/POST `/api/projects`; GET/PUT `/api/projects/:id`. PUT requires `If-Match`
  with the SHA-256 ETag of the exact source JSON; mismatches return 409.
- GET `/api/config`: templates, formats, and managed project-folder path.
- POST `/api/preview`: validated project → self-contained HTML.
- POST `/api/audio-preview`: validated video project → deterministic SFX WAV.
- GET/POST `/api/assets`; GET `/api/assets/:id`; PATCH `/api/assets/:id` approval.
- GET/POST `/api/exports`; GET `/api/exports/:id`; POST `/:id/cancel` or `/:id/retry`.
- GET `/api/exports/:id/poster` and `/:id/file`, with optional `?download`.
- GET `/api/doctor`: Chromium, FFmpeg, and render-worker checks.

Mutations validate Host and same-origin Origin. IDs are constrained. Media paths
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

The vendored renderer is the inspected upstream reference. Its FFmpeg discovery
and SFX synthesis are extracted into `vendor/statoz-video/core.mjs` so unused CLI
code is excluded from the app bundle; byte-for-byte SFX parity is tested. React HTML generation, explicit
progress/cancellation, ZIP/still export, and queue ownership are project-owned.
