# StatOz Designer

This is a local Next.js content studio. Read `docs/brand-guide.md`,
`docs/template-contract.md`, and `docs/architecture.md` before changing designs.
`CLAUDE.md` shares these instructions. Codex and Claude work in the same folder.

## Working rules

- Preserve the StatOz brand snapshot: token-first color/type/spacing, continuous
  chamfer borders, Onest body text, Orbitron display type, restrained glow.
- Routes are thin; feature UI lives in `src/features`, generic controls in
  `src/design-system`, shared schemas in `src/domain`, and local I/O in `src/server`.
- Templates must work in all four declared ratios and use deterministic frame
  time. Preview and export share the same composition; never build a second renderer.
- Read installed Next.js guides in `node_modules/next/dist/docs` for the APIs you use.
- Project files live in `storage/projects`. Preserve schema/version/IDs, change
  `updatedAt` when editing, and leave existing exports intact. JSON is data, not code.
- Assets referenced by projects must be registered in `storage/assets`; use the
  studio importer. Keep asset provenance and approval explicit.
- The player card library lives in `storage/players` and seeds invented sample players.
  Selecting one fills ordinary scene fields plus the `playerCard` snapshot; portraits
  must be registered assets. Never present these players, clubs, or nations as real.
- `npm run import:players` reads the Pitch Duel (`card_game`) Dart roster through
  `src/server/import/pitch-duel.ts`. That checkout is READ ONLY and is never a runtime
  dependency; the import copies records and portraits into storage. Imported players
  are real athletes: keep their provenance in `source`, leave portraits at `reference`
  approval, and never imply that any of them endorse StatOz.
- Sample statistics are examples. Do not turn prototype product behavior into
  marketing promises or claim sponsorship/endorsement from repository assets.
- Video briefs require a duration of 8–60 seconds. Render at 30 fps. Keep the
  final call to action readable with sound muted. Use user-approved audio only.
- Validate with `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
  For composition changes, run `npm run test:media` and inspect the generated PNGs.
- Test exports in the app and decode finished MP4s with FFmpeg. Record limitations
  honestly. Do not publish media or add hosted integrations without a request.
- Assisted posting (`src/server/publisher.ts`, `src/server/publish`) was requested by
  the user. It only opens site composers, attaches files, and fills text; never make it
  click Post/Share/Publish or send Ctrl/Cmd+Enter. Site selectors stay in
  `src/server/publish/platforms/<site>.ts`. The posting browser profile holds live
  sign-in cookies: never read, copy, sync, or commit it.
- Match data (`src/server/espn`) was requested by the user. It reads ESPN's public,
  unofficial site API, so treat every response as untrusted and keep the studio usable
  when it is unreachable: responses are cached under `storage/espn` and a stale answer is
  preferred to an error. Posters carry reported figures only — never invent or project a
  number. Team crests import as `reference` with the ESPN URL as provenance; they are club
  trademarks, never brand assets, and must never imply endorsement.
- Assistant runs (`src/server/agent.ts`, `src/server/agents`) were requested by the user.
  They drive a locally installed Claude Code or Codex CLI, which signs in on its own, so
  the studio stores no API key and still runs with neither installed. Keep the bounds:
  the prompt goes on stdin, never argv; no shell tool (`--allowedTools` excludes Bash,
  Codex stays on `--sandbox workspace-write`); never pass a bypass-approvals flag. A run
  develops one project the studio created, stops at an editable project, and never
  exports. The owner process re-validates the project afterwards and restores its
  snapshot if the assistant left it invalid, so a run can never commit a broken project.

## Commands

`npm run dev` runs the local app and worker at http://127.0.0.1:3000.
`npm run doctor` checks Chromium, FFmpeg, and worker heartbeat.
`npm run compositions` builds the standalone browser composition bundle.
`npm run test:publish` opens each site composer with recent exports, without posting.
`npm run assistant` runs the assistant process alone; `npm run doctor` reports which CLIs it found.
`npm run test:espn` checks the match adapters against the live feed, one league per sport.

See README.md for setup and troubleshooting.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
