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
- Sample statistics are examples. Do not turn prototype product behavior into
  marketing promises or claim sponsorship/endorsement from repository assets.
- Video briefs require a duration of 8–60 seconds. Render at 30 fps. Keep the
  final call to action readable with sound muted. Use user-approved audio only.
- Validate with `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
  For composition changes, run `npm run test:media` and inspect the generated PNGs.
- Test exports in the app and decode finished MP4s with FFmpeg. Record limitations
  honestly. Do not publish media or add hosted integrations without a request.

## Commands

`npm run dev` runs the local app and worker at http://127.0.0.1:3000.
`npm run doctor` checks Chromium, FFmpeg, and worker heartbeat.
`npm run compositions` builds the standalone browser composition bundle.

See README.md for setup and troubleshooting.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
