---
name: statoz-video
description: Create StatOz promotional and product videos as MP4 files for Instagram, Reels, Shorts, LinkedIn, YouTube, mobile, or custom dimensions. Use for video creation and adaptation; not for static images or publishing posts.
---

# StatOz Video

Turn the user's brief into one finished MP4 using authored HTML motion graphics,
the StatOz brand, and original synthesized sound effects. Use the bundled renderer
from any workspace; no external video plugin is needed.

## Resolve the brief

- Require a user-supplied duration from 8 through 60 seconds. Ask for duration if
  absent; do not invent one. Capture the subject, audience, CTA, and requested
  platform from the conversation, and make sensible creative choices for the rest.
- Read [platform presets](references/platform-presets.md) to resolve dimensions
  and placement. Explicit positive even-pixel dimensions take precedence. Generate
  only requested variants. Recompose text and subject placement for each ratio.
- Build an immediate hook, a concise feature/story reveal, a payoff, and a readable
  final StatOz CTA. Scale beat lengths and copy to the duration. Check that the
  subject and call to action remain understandable with the sound muted.

## Use the brand and media

- Within a StatOz checkout, inspect its current `src/design-system/styles/tokens.css`,
  typography tokens, relevant feature UI, and requested product assets. The renderer
  discovers the checkout by walking up from the working directory; `brandRoot` can
  select a checkout explicitly. It injects its current color variables, logo and fonts.
- Outside a checkout, use the packaged logo and fonts and bundled palette: dark
  navy, white text, cyan emphasis, and restrained sport accents. Orbitron is for
  display copy; Onest is for supporting text. Scale type for video readability.
- Preserve the logo's proportions and recognizable appearance. Use real product
  screenshots and existing assets when available. Never imply unsupported product
  capabilities, athlete endorsements, or sponsor relationships. Keep demo statistics
  recognizable as examples; verify current sports claims if the brief needs them.
- When original supporting raster art is useful, use the available imagegen skill
  and tool; compose exact text and logos in HTML. Do not scrape footage or music.
  Do not assume a repository asset establishes rights for every marketing use.
- Add sparse original transition/impact SFX through the renderer's timeline.
  Silence overrides this default. User-supplied approved music or voiceover can be
  mixed through `audio`; do not substitute downloaded tracks.

## Author and render

Read [the scene contract](references/scene-contract.md) before writing a scene or
specification. Start from `assets/scene-template.html`, then author the requested
story and media; the template is a starting composition, not a fixed campaign.

1. Create a unique temporary working directory for the scene/specification and
   original intermediate artwork. The render output belongs outside that directory.
2. Build deterministic motion from frame time. Supply named assets as local files,
   and use the injected brand fonts, logo and tokens. Use deliberate easing, depth,
   masks and transitions; keep text visible long enough to read and avoid flashes.
3. Render a few preview frames into the temporary directory with `--preview-dir`.
   Inspect the first, middle and final frames plus transitions. Revise cropped
   subjects, occluded logos, tiny text, overflow, fallback fonts and weak contrast.
4. Run `node <skill>/scripts/render-video.mjs <spec.json>`. It streams PNGs into
   FFmpeg, writes H.264/yuv420p MP4, and adds AAC audio when specified. It refuses
   existing output paths; use a new filename for revisions.
5. Decode the finished video with FFmpeg (`-v error -i <video> -f null -`), inspect
   metadata, and check playback/timing and audio when supported. If playback cannot
   be checked, report that limitation instead of claiming it was reviewed.
6. Deliver only the final MP4 using an absolute local file link or inline preview.
   Remove the unique temporary working directory after successful validation.
   Keep debug artifacts on failure only when useful, and report the failure clearly.

For missing runtimes, call `load_workspace_dependencies` to locate bundled Node
and Playwright, then set `PLAYWRIGHT_PATH` to its package directory. The renderer
also checks the standard Codex runtime location. Set `FFMPEG_PATH` if necessary;
otherwise it tries PATH and Python's `imageio_ffmpeg` (optionally `PYTHON_PATH`).
Do not install project dependencies or change application code just to render video.

Default output is `<workspace>/build/statoz-video/<slug>-<width>x<height>-<duration>s.mp4`.
No thumbnail, subtitle file, storyboard, source bundle, upload, or posting is part of
normal delivery. The renderer cleans its own temporary files on success or failure.
