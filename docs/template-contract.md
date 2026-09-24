# Template and composition contract

Register templates in `src/features/templates/registry.ts`: unique ID, version,
name, category, kind, description, visual entry, supported formats, editable
fields, defaults, optional initial pages, and optional page limit. `createProject`
produces schema-versioned project JSON. A project's selected format and every output
variant must belong to the registered template.
Extend the domain schema and editor controls together when adding a field.

All template families render through the React `Composition` component. Additional
visual entry values must be implemented there. Keep visual modules independent of
Next.js server/client navigation, storage, clocks, and remote services.

## Rendering lifecycle

`compositionHtml(project)` uses esbuild to compile the React browser entry and
embeds compiled styles, tokens, fonts, logo, project JSON, and selected media as
data URLs. `window.STUDIO` contains project, media, logo and optional page index.

`window.drawFrame({time,pageIndex,guides})` synchronously commits React, awaits
fonts/images, and explicitly seeks video. It returns a promise. Time is in seconds;
exports use `frame / 30`. All animated properties must derive from this time.
`window.ready` covers initial setup. `window.overflowReport()` reports clipped text.

The editor iframe uses this exact HTML, with a parent-only postMessage bridge.
The render browser runs it offline at output size and device scale 1. UI chrome,
safe-area guides, selection tools, and playback controls do not belong in exports.
Never use running CSS animations, random frame values, or uncontrolled video playback.

Preview only: `studio:frame` messages update project/time/page/guides. Responses
are `studio:ready`, `studio:drawn` (including overflow), and `studio:error`.

## Project data

`src/domain/project.ts` owns the Zod schema and public types. Each project records
its revision, template/version, media kind, sport, selected format and variants,
scenes/pages, soundtrack settings, brief, and timestamps. Asset references are IDs.
Projects retain page IDs when reordered. New pages must receive a new UUID.

Pitch decks use the hidden `investor-pitch` carousel template and are always 16:9.
`pitchDeck` records family, master/variant role, and snapshot provenance. Each page's
nullable `presentation` object holds its pitch layout, product visual, up to six
bullets and metrics, evidence status, and source note. Evidence status distinguishes
repository-backed product proof, supplied-source figures, illustrative category maps,
and proposed roadmap or financing claims; the source note stays visible in the exported
slide footer. Both fields default to null,
so schema-version-1 projects load without migration. Variants copy a saved revision
with fresh project/page IDs and never inherit later source edits.

The `solution-stack` pitch layout draws an exploded player-journey stack from
`presentation.bullets`, ordered top to bottom using `Label / detail`. It supports
up to six editable layers; blank rows are omitted and descriptions are optional.
Use `visual: "none"` with an empty `assetId` for a diagram-only slide. Geometry is
static SVG and labels are HTML in the shared composition, so no raster asset or
schema migration is required.

The `market` pitch layout sets glass stat bubbles beside a chamfered light panel
that holds the headline, body and one large figure. `metrics[0–2]` fill the
bubbles (the first is the large light one), `metrics[3]` is the panel figure, and
up to two `Label / detail` bullets sit beside the icon tile. The panel draws a
growth bar only when the figure and the first amount in its detail both read as
`$1.5B`-style amounts and the detail's is smaller, so the bar never shows a number
the slide does not state. Units after the number render smaller.

The `cover-frame` pitch layout is a cover variant: the headline and body sit low on
the left over tilted, nested chamfered slabs drawn as static SVG behind the copy. It
behaves as a cover (no evidence chip, confidential footer label) and leaves the
original `cover` layout unchanged for decks that use it.

The `funds` pitch layout shows a use-of-funds split. `metrics[0]` and `metrics[1]`
are the two shares (`68%`, `32%`), set either side of a divider with their label and
detail; a stepped chart below draws 50 tiles, one per 2% of the round, so the tiles
match the stated split. Unreadable shares fall back to an even split. `metrics[2]`
and `metrics[3]` (such as the raise and runway) become spec tiles under the body.

The `invite` pitch layout is a closing slide: a centred logo lockup, headline and body
above a lit arc drawn as static SVG. Bullets sit under the arc in order; a
`Label / value` bullet is a contact line (a label containing "web", "site" or "url"
gets a globe icon, anything else an envelope) and a bullet without ` / ` is the
sign-off. It behaves as a cover (no evidence chip, confidential footer label).
Contact details must be supplied by the founders, never invented.

The `showcase` pitch layout centres the title and body above the slide's product
visual (usually the phone), set on a pale glass disc with dark glass circles in the
style of the `market` layout. Up to six `Label / detail` bullets become tags: the
first half on the left and the rest on the right, top to bottom, each numbered on the
corner nearest the phone. The first tag uses the light panel treatment. The headline
is set on one line; a headline that does not fit is reported as overflow.

The `team` pitch layout sets the headline and body beside up to three founder cards.
Each `Name / Role / Bio` bullet is one card; the first role uses the light panel
treatment. Portraits are drawn placeholders (a silhouette on a glass disc with the
founder's initials, labelled PHOTO PLACEHOLDER), so the layout needs no asset.
Founder names, roles and bios come from the founders; never invent credentials.

The `timeline` pitch layout sets the headline and body beside a rising track. Each
`Label / Title: detail` bullet is one station on the track, up to five; treads and
risers are straight lines with mitred joints, and the stations alternate above and
below it. The last station is the destination and takes the light node. Four `Q1`-`Q4`
labels are read as quarters counted from funding, so each card is captioned with its
month range; any other labels caption the card as written. Milestones stay proposed
outcomes unless the founders state otherwise.

Investor Lens reviews do not extend the project schema. Review records carry the
source project ID, revision and ETag, structured screening result, approved changes,
founder-supplied answers, resulting variant ID and follow-up review. Revisions are
assembled as temporary candidates and enter `storage/projects` only after project,
asset, evidence and provenance validation. Founder-supplied claims must say so in the
visible source note; missing claims stay input-needed, illustrative or proposed.

Card scenes may link an entry from the local player library. `playerCard` holds a
snapshot (`playerId`, position, club, nation) so the composition renders without the
library present; the name, rating, PACE/SKILL/FORM, and portrait asset stay in the
ordinary scene fields. It is `null` when no player is linked, and projects written
before the library load unchanged.

`emblemA` and `emblemB` are asset ids for the two sides' crests. Match visuals draw
crests directly on the canvas without a container and fall back to an unboxed initials
monogram when empty; comparison visuals also fall back to initials. They are separate
from `assetId` so a scene can carry both a photograph and
two crests. Projects written before them load unchanged, because both default to "".

Launch scenes carry `game`, one of the ids in `launchGames` (`src/domain/project.ts`)
or `""`. When it is set and the scene has no `assetId`, the launch visual draws that
game's gameplay art (`src/features/compositions/game-art.tsx`) straight onto the
canvas, with no frame or caption. The art is an SVG on a 1600 × 900 board. It bleeds
to the canvas edges and is masked so it fades into the background behind the copy.
The focal action sits inside x 380–1220, which keeps it in view at every ratio.
Visual media replaces the art with the ordinary framed image. New launch projects
start on Pitch Duel; projects written before the field load unchanged, because it
defaults to `""`.

Gameplay demos show one arcade game playing itself. The Grand Prix demo has its own
visual (`grand-prix`, `src/features/compositions/grand-prix.tsx`); the other four share
the `gameplay` visual (`src/features/compositions/gameplay.tsx`), which picks its game
from the scene's `game` field:

| Template | Game | Sport |
| --- | --- | --- |
| `penalty-shootout-demo` | `penalty-shootout` | football |
| `final-over-demo` | `final-over` | cricket |
| `hoop-duel-demo` | `hoop-duel` | basketball |
| `tennis-rally-demo` | `tennis-rally` | tennis |

Each demo opens on four beats: three plays, then the payoff with the call to action.
Beat one sets the challenge up, beat two is the input the player makes, beat three is
the outcome, and beat four settles on a result card. A beat draws one SVG board plus an
HTML HUD, meter, mark row, venue label, toast, control pad and result card. Every value
is a pure function of scene time, so seeking is deterministic.

The athletes are an SVG port of the StatOz athlete rig
(`src/features/compositions/athlete.tsx`), the way `GrandPrixCar` ports that game's car
painter. The source is the `statoz_web` checkout's canvas rigs — `final-over`'s
`renderer/rig.ts` for cricket and `basketball`'s for the court sports, plus `tennis`'s
`renderer/actors.ts` — which are themselves ports of the Flutter app's `rigLimb`
primitives. That checkout is READ ONLY and is never a runtime dependency: the geometry
and the poses are copied here, not imported.

Only the hip, shoulder and head are stored; limbs are two-segment round-cap strokes
whose knee or elbow is the midpoint pushed along the segment normal, with a dark pass
behind each segment for volume. Lengths are metres from the feet times `px`, except
hand positions, which are screen offsets from the shoulder as in the source. A build
picks cricket's or the court sports' shoulder and head heights; gear draws a helmet and
grille, a cap, a headband or hair; legs draw trousers or shorts over bare lower legs;
and `hand` hangs a bat or a racket off the near hand. Every kit is invented for StatOz
and every pose is a plain value, so a frame stays a pure function of scene time. Real
club liveries in the source are deliberately not ported.

The board is authored at 1:1 with the output pixel, and `viewWindow` gives each ratio
its own window onto it rather than scaling one frame: landscape anchors the action at
74% across so the copy keeps its own left column, and the taller ratios anchor it in
the middle and show more of the scene above the copy. The focal action therefore stays
inside x 680-1240, and every backdrop bleeds to x -800 and y 1900, past every window.
Portrait, square and reel set the copy under the action over a scrim; landscape sets it
in its own column. These demos use the shared scene-boundary soundtrack, not a bespoke
bed like the Grand Prix demo's engine track in `src/server/audio.ts`.

A template may declare `sport`, which `createProject` uses in place of the requested
sport. All five gameplay demos declare one, since a demo of a single game must not
carry another sport's identity, and the studio's sport picker shows it locked. Every
scoreline, club, player number and venue drawn by these demos is invented.

The match & stat story (`match-story`, visual `match-story`) tells one fixture in four
beats, drawn by `src/features/compositions/match-story.tsx` in the app's match-centre
language:

1. **Score.** A scoreboard: one chamfer plate per side, with the team-colour strip, badge
   or crest, name and score. The score lands (it never counts up, since intermediate
   scorelines would be invented), then the winner's plate lights and takes a `WIN` chip.
   `winner` is `""` (read from the scoreline), `A`, `B` or `none`. A cricket scoreline
   such as `453 & 130/2` cannot say who won, so cricket lights a winner only when one is
   set. Motorsport shows the podium from its classification instead.
2. **Stats.** Up to six `matchStats` rows (`label`, `a`, `b`) stagger in. Values count
   up in their own format (`54%`, `1,204`, `3.5`), and each split bar grows to side A's
   share. Two-part values such as `187/4` never animate; a cricket innings splits on its
   runs. In motorsport the rows are the classification (`driver | qualified | finished`,
   e.g. `Driver A | P4 | P1`), drawn as a finishing order with places made up or lost
   since qualifying.
3. **Graph.** `graph` is one of `momentum`, `race`, `lead` or `position`; `auto` picks
   the sport's chart. `seriesA` and `seriesB` (up to 60 values, 0–999) wipe in from left
   to right, and `markers` (`at` is a point index, `side`, `label`) pop in as the wipe
   passes them.
4. **Pick your side.** Two A/B tiles and optional crowd bars from `pickShare` (side A's
   %, `null` hides the bars) and `pickVotes`.

`beat` pins a scene to a beat. When it is `""`, scene order decides: the first scene is
the score, the second is stats, the third is the graph, the last is pick, and any other
scene is stats. `colorA` and `colorB` are hex team colours. They are lifted to a 4.5:1
contrast ratio against the chart surface, and `""` falls back to the sport accent.
Each beat's choreography is written for a nominal length (2.4, 2.6, 3.2 and 2.6 seconds)
and plays proportionally faster in a shorter scene. New projects split their duration
2:3:3:2 across the beats through the template's `durationWeights`.

The match data is shared by every beat. The editor writes it to all scenes, and "Fill
from a match" (or "From a match" → Match story video) writes the sides, result, winner,
five reported stats, colours and crests to every scene. The stats prefer each sport's
comparable figures, so made-attempted pairs such as `5-23` give way to percentages. The
score beat's headline states the result ("Liverpool win it.", "Antonelli wins.",
"Honours even."). The graph comes from what ESPN reports for each sport, in
`src/server/espn/adapters.ts`:

- **Football, `momentum`** (`footballTimeline`): each side's shots, corners and goals
  per five minutes. Stoppage time folds into the last period of its half, extra time
  adds periods and shootouts are left out. Own goals, goal kicks and fouls are not
  counted, and goals from the key events become markers at their minute.
- **Basketball, `lead`** (`basketballTimeline`): each side's running score from the
  play-by-play at four even checkpoints a quarter (two per overtime). Lead changes are
  marked; past six, only the change that stuck is. If the last play disagrees with the
  reported final, the graph is left out.
- **Limited-overs cricket, `race`** (`cricketTimeline`): each side's running total per
  over, with the overs in which wickets fell marked. It is drawn only when the overs add
  up to the reported total. ESPN repeats the first innings' overs on a second innings,
  so a Test has no worm. Cricket stats come from the innings linescores: the innings
  themselves for a Test, and run rate, fours, sixes, extras, wickets and overs for one
  innings a side.
- **Motorsport** has no race summary, so it has no graph. Its classification is the top
  six from the scoreboard, with qualifying positions from the weekend's `Qual` session,
  printed as qualifying and never as the grid. Drivers' flags stand in for crests.

A beat the match has no data for is left out rather than exported empty, and its time
goes to the other beats by the 2:3:3:2 weights. A later fill from a match that has the
data brings the beat back. The fill always clears the crowd share and the graph caption,
because sample figures and claims must never sit beside real teams. Hand-entered series and crowd shares stay the user's
responsibility; sample projects label the crowd bars `EXAMPLE`. Every new field has a default, so match stories written before these fields
existed still load and play their beats by scene order.

App showcase scenes use `assetId` for the shared phone capture and `tabletAssetId`
for the separate tablet capture. `tabletAssetId` also defaults to `""`, so existing
schema-version-1 projects remain valid. Preview keys, offline embedding, briefs, and
assistant validation must treat both fields as asset references.

The Product template family adds exact placement formats for Instagram portrait,
Google Play phone/tablet/feature/icon, and App Store iPhone/iPad/icon output. App
showcases start with one page and may be duplicated to eight pages. Blank projects
remain editable and saveable, but export readiness requires the appropriate capture,
replacement copy where the placement uses copy, and a compliant icon master. Icon
masters must be square PNG files at least 1024 × 1024 with known, fully opaque alpha
metadata; legacy assets without recorded alpha metadata must be re-imported.

Video duration is the sum of scene durations, 8–60 seconds, aligned to 30 fps.
Image projects contain one page; ordinary carousel/video projects support up to 12 unless a
template declares a smaller limit. Investor pitch decks start with twelve pages and
support up to twenty so additional approved pages can be inserted without deleting content. Pitch
PDF and PPTX exports flatten those exact rendered pages for visual parity; ZIP keeps
the same ordered PNG slides.
Clip in/out is seconds; out=0 means source end. Frames hold at clip end. The
soundtrack starts at zero, pads/trims, and never automatically loops.

## Validation

Run unit tests and all media-layout checks. Inspect first/middle/final frames and
transitions, not only the contact sheet. Test long copy, missing assets, ratio
switching, repeated seeking, and export output. Update docs when contracts change.

The `problem-map` pitch layout uses an angular background and staggered chamfered
plates inspired by a pain-point map. Editable `Label / detail` bullets supply the
plates; four is the intended composition and five or six reflow into two columns.
Use `visual: "none"` and an empty `assetId` for the clean diagram. Evidence state
and source note remain visible, including when problem framing is a hypothesis.

The News flash (`news-flash`, visual `news`, `src/features/compositions/news.tsx`) sets one
reported headline over its photo. It is a still image in all four standard ratios and opens
on the reel, through the template's `defaultFormat`. The scene's `eyebrow` is the tag chip
(the one glowing element), `headline` is set in uppercase Orbitron, `body` is an optional
summary clamped to its line budget, and `credit` is the photo and story credit printed on
the artwork. `credit` defaults to `""`, so pages written before it load unchanged. Wrap one
phrase of the headline in `*asterisks*` to set it in the sport accent.

The headline sizes itself: `fitHeadline` wraps the uppercase text word by word over
measured Orbitron 800 glyph widths and picks the largest size that fits the ratio's
budget. It is a pure function, so preview and export agree. The budget grows when the
summary is empty and shrinks when a CTA shows. A headline that does not fit at the
minimum size is still reported as overflow.

`layout` picks the treatment. `editorial` bleeds the photo across the top of the canvas (the
right-hand side in landscape) and dissolves it into a blurred, darkened copy of itself, so a
16:9 wire photo never has to be stretched to fill a reel. `centered` does the same with
centred copy. `split` frames the photo in a chamfered plate and prints the credit on it.
With no photo, the sport board is drawn in its place.

"Pick an ESPN story" reads a league's news feed (`GET /api/espn/news?leagueId=`). Only
header photos on ESPN's own image CDN are accepted. `POST /api/espn/news-photo` downloads
the story's photo once, as `espn-news-<articleId>` with category `news-photo`, approval
`reference`, and the image URL, credit and story link as provenance. It returns the
headline, summary, credit and asset id as ordinary scene fields, which the editor applies
as one undoable edit. The photos belong to their agencies. They never become brand assets,
and the user confirms the right to use one before publishing.
