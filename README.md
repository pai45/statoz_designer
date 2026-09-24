# StatOz Designer

A local Next.js studio for StatOz social images, carousels, short videos, and investor pitch decks.
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

Open **http://127.0.0.1:3000**. The launcher starts Next.js, one persistent render
worker, and the posting window process. `PORT` changes the local port. Stop with Ctrl+C.

FFmpeg is resolved from `FFMPEG_PATH`, PATH, or Python's `imageio_ffmpeg` package.
Set `PYTHON_PATH` if Python is not on PATH. Set `CHROMIUM_PATH` to use an existing
compatible Chromium executable. No AI API keys or sibling checkouts are required.

For a production build: `npm run build`, then `npm start`.

## Create

- Projects opens saved designs and supports duplicate, rename (in the editor),
  archive, and restore. Starter projects use clearly labelled sample content.
- Pitch decks groups investor-deck masters with independent named variants. The
  seeded 12-slide master separates repository evidence, hypotheses, and founder
  inputs; variants snapshot the saved source revision with fresh IDs.
- **Review as investor** runs a local India seed-VC first screening against the
  saved deck. It scores the investment case, turns missing proof into founder
  questions, and lets you choose which recommendations to apply. An approved
  rewrite becomes a new variant; the master is never edited. The studio then
  screens the variant again and shows the before/after result. Reviews use the
  selected local Codex or Claude sign-in and do not browse the web.
- Templates includes 7 single-image, 1 carousel, and 4 video families. All support
  square, portrait feed, reels, and landscape, with five sport themes.
- Every editor has a **Content** tab for selected scene/page corrections and a
  **Brief** tab for AI-first template design. In Brief, one natural-language command
  can revise focused content, template-wide styling/motion, or video audio; manual
  style/audio adjustments remain under Advanced controls.
- Codex can also discover the repository skill `$investor-deck-advisor` for the
  same critique-first, evidence-aware pitch workflow outside the studio screen.
- Video duration must be explicitly selected between 8 and 60 seconds at creation.
  Scene edits must keep the total in that range and aligned to 30 fps.
- Card layouts (Rewards & cards, Card reveal) can draw from a local player library.
  Search it by name, position, club, or nation; the player you pick supplies the card
  name, rating, PACE/SKILL/FORM, the portrait image, and the club/position/nation that
  print on the card. Save any card you build back to the library, as a new player or as
  an update. Starter entries are invented sample players, not real athletes or teams.
- The Pitch Duel card roster can be imported into that library in one command:

  ```powershell
  npm run import:players -- --from "C:\path	o\card_game"
  ```

  This reads the game's Dart roster and portrait art, then copies 745 players across
  the five sports, with their card art, into your studio. The game folder is read
  only and is never needed again: everything lives in your own storage afterwards.
  Add `--dry-run` to see the counts without writing, or `--no-portraits` for records
  only. Re-running refreshes in place rather than duplicating. Imported portraits are
  real athlete images and land marked **product reference** - record campaign approval
  per asset in Assets & brand before using one in a published post.
- The App showcase phone picker draws on curated app screens (games, gameplay, match
  stats, predictions, profile, shop) imported from the same game folder:

  ```powershell
  npm run import:app-screens -- --from "C:path	ocard_game"
  ```

  Only phone-shaped captures are offered for the phone frame, and choosing a curated
  screen fills the page's eyebrow, headline, and supporting copy unless you already
  edited them. Add `--dry-run` to list the screens without writing.
- Gameplay screens for every game come from the same folder's existing web build:

  ```powershell
  npm run capture:gameplay -- --from "C:path	ocard_game"
  ```

  This serves `card_game/build/web` as it is (it never builds or changes that folder),
  plays each game in a fresh preview profile, and saves one mid-play frame per game to
  `output/app-gameplay` and the asset library. Use `--only pitch-duel,hoop-duel` to redo
  a few games. Frames vary a little between runs because the games are random.
- Import PNG/JPEG/WebP, MP4/WebM, or MP3/WAV/M4A/OGG in Assets & brand. Static images
  are supported in card, feature, and launch layouts; clips in feature/launch.
  Crop positions and clip in/out points are editable. End frame holds after a clip
  ends. Source clip audio is muted; soundtrack audio is selected separately.
- Export PNG/JPEG, numbered carousel PNGs in ZIP, H.264 MP4, or pitch decks as
  ordered PNG ZIP, 16:9 PDF, and flattened widescreen PPTX. Each requested ratio
  receives its own export. The worker checks text overflow before publishing.
- Export history includes progress, playback, downloads, cancellation, and retry.
  Completed files are never overwritten. Retry uses the original frozen snapshot.

## Post to social

Finished exports can be posted to the StatOz pages on LinkedIn, YouTube, Instagram,
and X without API keys or developer apps. The studio opens each site's composer in a
separate posting window (Microsoft Edge by default) that keeps its own sign-ins,
attaches the export, and fills in your caption. You review the post and click Post on
the site. The studio never posts by itself.

1. In **Assets & brand → Social accounts**, enter the LinkedIn company ID (from
   `linkedin.com/company/<ID>/admin`) and choose the posting browser.
2. Click **Sign in** for each platform, sign in to the StatOz account, then close that
   window. You can also sign in inside the posting window when it asks.
3. In **Exports**, click **Post** on a finished export, choose platforms, edit the
   caption, and click **Open in posting window**. The export row shows each tab's status.
   After posting, use **Mark posted** to record the link.

| Export | LinkedIn | YouTube | Instagram | X |
| --- | --- | --- | --- | --- |
| PNG/JPEG | Yes | No | Yes | Yes |
| Carousel | Up to 20 pages | No | Up to 10 pages | Up to 4 pages |
| MP4 | Yes | Yes | Yes (Reel) | Yes |

- LinkedIn posts as the company page, which needs a page admin role on your account.
- YouTube: confirm the StatOz channel, then choose audience and visibility yourself.
- Instagram: adjust the crop and click Next; the caption fills in at the caption step.
- X captions are limited to 280 characters.

Sign-ins are stored outside this folder in `%LOCALAPPDATA%\StatOz Designer\browser-profile`
(`~/.statoz-designer` elsewhere, or `PUBLISH_PROFILE_DIR`), so cloud sync never uploads
them. Treat that folder like a password. Posting depends on each site's current page
layout. If a site changes, the export row explains which step failed and the tab stays
open so you can finish by hand. The fix belongs in `src/server/publish/platforms/<site>.ts`.
If a posting window remains open after you stop the studio, close it before restarting.

## Work with Codex or Claude

Open this folder in your assistant and read AGENTS.md. The editor's Brief tab sends
the saved objective, audience, current scene/page context, dimensions, duration, and
registered assets to Codex or Claude; **Copy creative brief** remains under Advanced
controls for manual terminal work. Project JSON is in `storage/projects`. New designs
can be added to the template registry and implemented through the documented
composition contract.

External file edits are detected by content hashes. Unsaved browser edits trigger
a conflict with **Reload file** and **Save my edits as copy** recovery options.
Malformed files are listed with their errors; they are not silently overwritten.

## Storage

`storage/projects`: readable project JSON. `storage/assets`: imported media and
asset metadata. `storage/players`: the player card library, seeded once with sample
players, extended from the card editor, and optionally filled from the Pitch Duel
roster. An imported roster also adds its portraits to `storage/assets`, which is
why that folder grows by a few hundred MB after an import. `storage/jobs`: queue records. `storage/renders/<job-id>`: frozen
project, self-contained HTML/media, preview poster, and final output. `storage/publish`:
posting records, carousel pages extracted for upload, and review screenshots. These folders
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
labelled verification projects and exports in the local library. After signing in,
`npm run test:publish` opens each site composer with recent exports, saves screenshots
to `test-results/publish`, and closes the tabs without posting.

Media checks render all supported template/ratio combinations, including both card families
with a linked player, plus intermediate video frames
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
