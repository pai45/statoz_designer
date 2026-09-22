# Renderer and scene contract

Run from the intended workspace:

```powershell
node C:/Users/priya/.codex/skills/statoz-video/scripts/render-video.mjs C:/path/to/spec.json
```

Use `--check` for input/runtime validation without rendering, or append
`--preview-dir C:/path/to/temporary/frames` to render first/middle/final PNGs without
encoding an MP4. Preview images are for internal QA and must be cleaned by the caller.

## Specification

```json
{
  "scene": "scene.html",
  "slug": "statoz-feature",
  "platform": "reel",
  "duration": 15,
  "fps": 30,
  "output": "C:/workspace/build/statoz-video/statoz-feature.mp4",
  "assets": {"hero": "C:/workspace/approved-feature.png"},
  "sfx": [
    {"type": "whoosh", "time": 0.8, "duration": 0.45, "gain": 0.3},
    {"type": "impact", "time": 5, "duration": 0.6, "gain": 0.25},
    {"type": "shimmer", "time": 12, "duration": 1, "gain": 0.18}
  ]
}
```

- `scene`: required local HTML path, relative to the spec file when not absolute.
- `duration`: required number, 8-60 seconds inclusive; it must produce a whole
  frame count at the selected fps. There is no default duration.
- `width`, `height`: optional pair of positive even integers; override `platform`.
  Otherwise a platform/preset from `platform-presets.md` is required.
- `fps`: integer 1-60, default 30. Use 30 for new social motion graphics. Lower
  values are primarily useful for inexpensive QA renders.
- `output`: optional `.mp4` path, relative to the working directory. Existing
  files are never overwritten. Default: `build/statoz-video/<slug>-<W>x<H>-<duration>s.mp4`.
- `slug`: optional safe filename stem, default `statoz-video`.
- `assets`: optional object mapping names to local PNG, JPG, WebP, SVG, GIF,
  AVIF, WOFF/WOFF2, TTF, OTF, MP4, WebM, WAV, MP3, M4A, OGG or FLAC files.
  Relative paths resolve against the spec directory. Assets are embedded as data
  URLs; no network requests are allowed while rendering. For source videos, seek
  and await each frame explicitly in an async `drawFrame`; do not rely on playback.
- `brandRoot`: optional StatOz checkout root. Otherwise the renderer searches
  working-directory ancestors for the token CSS and StatOz logo. No matching
  checkout means packaged brand fallback. Explicit missing/incomplete roots fail.
- `silent`: optional boolean, default false. True disables both SFX and audio.
- `sfx`: optional events, each with `type`, `time` in seconds, optional `duration`
  (0.01-8 seconds) and `gain` (0-1). Types: `whoosh`, `impact`, `tick`, `rise`,
  `shimmer`. Events must fit within the video. Defaults: 0.45, 0.6, 0.08, 1.2,
  and 0.8 seconds respectively, gain 0.25. Synthesized mono 48kHz PCM uses a
  fixed seed and a peak ceiling to avoid clipping; output is AAC.
- `audio`: optional `{ "path": "voiceover.wav", "gain": 0.8 }` for user-supplied
  approved audio. Starts at zero, pads or trims to video duration, and mixes with
  SFX through a limiter. It does not loop short music automatically.

CLI failures return a nonzero exit code. Successful encoding prints JSON containing
the absolute output path, dimensions, duration, fps, frame count, byte size and audio
presence. The final file appears only after encoding succeeds. Runtime resolution:
`PLAYWRIGHT_PATH`, installed Playwright, bundled Codex Playwright; `FFMPEG_PATH`,
FFmpeg on PATH, then `imageio_ffmpeg` via `PYTHON_PATH` or Python on PATH. An explicit
invalid override fails clearly rather than silently selecting another runtime.

## HTML lifecycle

Author trusted local HTML. Include exactly one `/*__STATOZ_SCENE_DATA__*/` marker in
a script expression:

```html
<script>
const scene = /*__STATOZ_SCENE_DATA__*/;
window.drawFrame = async function(context) {
  // Set every animated property directly from context.time.
};
</script>
```

The injected object contains `width`, `height`, `duration`, `fps`, `frames`, `assets`
(data URLs), and `brand`: `{source, colors, logo, fonts: {onest, orbitron}}`.
Colors use CSS token names such as `--ds-color-accent-cyan`; values may reference
other injected variables. Set them on the root before using them. Brand source is
the detected checkout path or `packaged`.

Define optional `window.ready` as a promise for scene setup. The renderer awaits
it, all document fonts, and all initial images before drawing. It awaits each
`drawFrame` call with `{frame, time, progress, width, height, duration, fps, frames}`.
`time = frame / fps`; frames run from zero through `frames - 1`. `progress` runs
from zero through one, including both endpoints. An HTML scene can use either
time or progress, but must use one consistently for its timing logic.

The viewport is exactly width x height with device scale 1. Hide overflow. Motion
must be deterministic for an arbitrary frame index; no wall-clock animation,
unseeded random values, unpaused video/audio, or network-loaded assets. Await
seeking/decoding for media created during drawFrame. Errors from scene scripts,
missing images and rejected readiness promises fail the render.

Use `assets/scene-template.html` for logo/font setup, responsive layout and a
four-beat starting scene. Replace its copy and illustrative plate with the actual
requested creative. A named `hero` asset appears in its center plate when supplied.

## Renderer maintenance

After changing the renderer, run `node <skill>/scripts/test-render-video.mjs` from
a StatOz checkout. It checks presets, invalid inputs, brand fallback, deterministic
SFX, failed-scene cleanup and collision protection, then fully decodes SFX, silent
30fps, and mixed-audio MP4s. It also renders previews for all four layouts. Use
`--keep-artifacts` for visual inspection; the command prints its unique temporary
directory, which can be removed after review. Normal successful tests clean it.
