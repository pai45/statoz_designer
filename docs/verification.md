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

See [README](../README.md#verify) for commands to reproduce the checks.
