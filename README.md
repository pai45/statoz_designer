# StatOz Designer

A local Next.js studio for StatOz social images, carousels, and short videos.
Choose a template, edit content and media, preview, and export. Codex and Claude
can extend the same project folder using the shared instructions in AGENTS.md.

## Start

Requirements: Node.js 22+, Chromium through Playwright, and FFmpeg with libx264/AAC.

```powershell
npm install
npx playwright install chromium
npm run doctor
npm run dev
```

Open **http://127.0.0.1:3000**. The launcher starts Next.js and one persistent render
worker. `PORT` changes the local port. Stop with Ctrl+C.

FFmpeg is resolved from `FFMPEG_PATH`, PATH, or Python's `imageio_ffmpeg` package.
Set `PYTHON_PATH` if Python is not on PATH. Set `CHROMIUM_PATH` to use an existing
compatible Chromium executable. No AI API keys or sibling checkouts are required.

For a production build: `npm run build`, then `npm start`.

## Create

- Projects opens saved designs and supports duplicate, rename (in the editor),
  archive, and restore. Starter projects use clearly labelled sample content.
- Templates includes 7 single-image, 1 carousel, and 4 video families. All support
  square, portrait feed, reels, and landscape, with five sport themes.
- The editor provides guided copy/media/style fields, scene/page ordering,
  duplication, undo/redo, autosave, output size, safe areas, and video timing.
- Video duration must be explicitly selected between 8 and 60 seconds at creation.
  Scene edits must keep the total in that range and aligned to 30 fps.
- Import PNG/JPEG/WebP, MP4/WebM, or MP3/WAV/M4A/OGG in Assets & brand. Static images
  are supported in card, feature, and launch layouts; clips in feature/launch.
  Crop positions and clip in/out points are editable. End frame holds after a clip
  ends. Source clip audio is muted; soundtrack audio is selected separately.
- Export PNG/JPEG, numbered carousel PNGs in ZIP, or H.264 MP4. Each requested ratio
  receives its own export. The worker checks text overflow before publishing.
- Export history includes progress, playback, downloads, cancellation, and retry.
  Completed files are never overwritten. Retry uses the original frozen snapshot.

## Work with Codex or Claude

Open this folder in your assistant and read AGENTS.md. The editor's **Copy brief**
button supplies project path, objective, audience, CTA, dimensions, duration, and
assets. Project JSON is in `storage/projects`. New designs can be added to the
template registry and implemented through the documented composition contract.

External file edits are detected by content hashes. Unsaved browser edits trigger
a conflict with **Reload file** and **Save my edits as copy** recovery options.
Malformed files are listed with their errors; they are not silently overwritten.

## Storage

`storage/projects`: readable project JSON. `storage/assets`: imported media and
asset metadata. `storage/jobs`: queue records. `storage/renders/<job-id>`: frozen
project, self-contained HTML/media, preview poster, and final output. These folders
are ignored by Git. Back up the entire storage folder to preserve your work.
`STUDIO_DATA_DIR` optionally selects another local storage root at launch.

Bundled tokens, fonts, logo, and curated media are self-contained. Provenance is
recorded in `docs/brand-snapshot.json`. Repository media is initially marked as
product reference; the library lets you record campaign approval.

## Verify

```powershell
npm run lint
npm run typecheck
npm test
npm run test:media
npm run build
```

With the studio running, `npm run test:studio` exercises creation, saves, preview
parity, all export types, cancellation/retry, uploads, and playback. `npm run test:ui`
checks responsive navigation and conflict recovery; `npm run test:audio-video`
checks imported clip trims, mixed audio, silence, and decoding. These checks create
labelled verification projects and exports in the local library.

Media checks render all 48 template/ratio combinations, intermediate video frames,
and deterministic-seeking comparisons. View `test-results/media/contact-sheet.png`
and the per-template frames. `test-results` is ignored by Git.

See [the verification record](docs/verification.md) for completed checks and scope.

The studio is intended for a single local user. It binds to loopback and rejects
cross-origin writes. Render HTML cannot fetch remote URLs. SFX are synthesized
locally; uploaded music/voiceover and synthesized SFX preview in the editor. Both are
included in the final export and can be checked in the export player.

## Troubleshooting

- Run `npm run doctor` or use **Exports → Check render setup**.
- A missing browser needs `npx playwright install chromium`.
- Restart the studio after a worker crash. Running jobs become interrupted and
  can be retried. Queued jobs are picked up automatically.
- Exports blocked by overflow: shorten copy or select another layout, then export.
- A missing asset: reimport the media and select the replacement in the editor.
- Templates are trusted repository code. Restart the dev server after changing
  domain contracts; standard template/component edits use Next.js hot reload.
