/**
 * How to reach live play in each game of the unchanged card_game web build, starting
 * from the home screen of a freshly onboarded, grandfathered profile.
 *
 * Labels are the app's own semantics labels. Coordinates are in the 393 × 852 viewport
 * and are used only where the control is drawn without a label.
 */
export type Step =
  | { tap: string }                          // tap a labelled control, fail if missing
  | { when: string; timeoutMs?: number }     // wait for a control to appear, then tap it
  | { maybe: string; timeoutMs: number }     // tap it only if it appears in time
  | { xy: [number, number] }                 // tap an unlabelled point
  | { press: [number, number] }              // hold a point down (release with { release })
  | { release: true }
  | { settle: number }                       // wait, then refresh the semantics tree
  | { sleep: number }                        // wait without touching semantics
  | { scroll: number }                       // wheel the main list down by this many pixels
  | { capture: string };                     // save the viewport as this asset id

export type Recipe = { game: string; name: string; steps: Step[] };

const gamesTab: Step[] = [{ xy: [295, 109] }, { settle: 1500 }];
/** First entry into a sport's games opens its starter pack; each game names its own exit. */
const starterPack = (enter: string): Step[] => [{ maybe: "SKIP", timeoutMs: 3500 }, { maybe: "CONTINUE", timeoutMs: 3000 }, { maybe: enter, timeoutMs: 3000 }];
const quickPlay: Step[] = [...gamesTab, { xy: [98, 164] }, { settle: 2000 }, { scroll: 500 }];

export const gameplayRecipes: Recipe[] = [
  { game: "pitch-duel", name: "Pitch Duel", steps: [
    ...gamesTab, { tap: "PITCH DUEL, ENTER" }, { settle: 3000 }, ...starterPack("ENTER THE GAME"),
    { maybe: "SKIP ALL", timeoutMs: 4000 }, { settle: 2000 }, { capture: "app-screen-pitch-duel" },
    { tap: "PLAY MATCH" }, { when: "HEADS", timeoutMs: 20_000 }, { maybe: "ATTACK", timeoutMs: 8000 },
    { settle: 6000 }, { capture: "app-screen-play-pitch-duel" },
  ] },
  { game: "penalty-shootout", name: "Penalty Shootout", steps: [
    ...gamesTab, { tap: "PENALTY SHOOTOUT, TAKE" }, { settle: 3000 }, ...starterPack("ENTER THE GAME"),
    { tap: "PLAY SHOOTOUT" }, { when: "BEGIN SHOOTOUT" }, { when: "SKIP ALL" }, { settle: 2500 },
    { tap: "Shoot left" }, { settle: 1200 }, { capture: "app-screen-play-penalty-shootout" },
  ] },
  { game: "football-chess", name: "5v5 Football Chess", steps: [
    ...gamesTab, { tap: "5V5 FOOTBALL CHESS" }, { settle: 3000 }, ...starterPack("ENTER THE GAME"),
    { tap: "FIND MATCH" }, { when: "HEADS", timeoutMs: 20_000 }, { settle: 5000 }, { maybe: "SKIP ALL", timeoutMs: 5000 },
    { settle: 9000 }, { capture: "app-screen-play-football-chess" },
  ] },
  { game: "football-quiz", name: "Football Quiz", steps: [
    ...gamesTab, { tap: "FOOTBALL QUIZ" }, { settle: 3000 }, { tap: "EASY category" }, { settle: 3000 },
    { tap: "Set 1, available" }, { settle: 3000 }, { tap: "START SET" }, { settle: 3000 },
    { tap: "Answer C" }, { settle: 1200 }, { capture: "app-screen-play-football-quiz" },
  ] },
  { game: "football-bingo", name: "Football Bingo", steps: [
    ...quickPlay, { tap: "FOOTBALL BINGO" }, { settle: 3000 }, { tap: "PLAY TODAY" }, { settle: 6000 },
    { capture: "app-screen-play-football-bingo" },
  ] },
  { game: "guess-player", name: "Guess the Player", steps: [
    ...quickPlay, { tap: "GUESS THE PLAYER" }, { settle: 3000 }, { tap: "PLAY" }, { settle: 3500 },
    { tap: "POSITION hint" }, { settle: 1500 }, { tap: "SPEND 25" }, { settle: 3000 }, { capture: "app-screen-play-guess-player" },
  ] },
  { game: "hoop-duel", name: "Hoop Duel", steps: [
    ...gamesTab, { tap: "BASKET" }, { settle: 2000 }, { tap: "HOOP DUEL" }, { settle: 3000 }, ...starterPack("ENTER HOOP DUEL"),
    { tap: "TIP OFF" }, { maybe: "SKIP ALL", timeoutMs: 6000 }, { settle: 5000 }, { capture: "app-screen-play-hoop-duel" },
  ] },
  { game: "grand-prix-dash", name: "Grand Prix Dash", steps: [
    ...gamesTab, { tap: "MOTORSPORT" }, { settle: 2000 }, { tap: "GRAND PRIX DASH" }, { settle: 3000 }, ...starterPack("ENTER GRAND PRIX DASH"),
    { tap: "START RACE" }, { sleep: 4000 }, { press: [333, 795] }, { sleep: 10_000 }, { capture: "app-screen-play-grand-prix-dash" }, { release: true },
  ] },
  { game: "guess-driver", name: "Guess the Driver", steps: [
    ...gamesTab, { tap: "MOTORSPORT" }, { settle: 2000 }, { tap: "GUESS THE DRIVER" }, { settle: 3000 }, { tap: "PLAY TODAY" }, { settle: 4000 },
    { tap: "TEAM hint" }, { settle: 1500 }, { tap: "SPEND 25" }, { settle: 3000 }, { capture: "app-screen-play-guess-driver" },
  ] },
  { game: "tennis-rally", name: "Tennis Rally", steps: [
    ...gamesTab, { tap: "ALL SPORTS" }, { settle: 2000 }, { tap: "Tennis, 3" }, { settle: 2500 }, { tap: "TENNIS RALLY" }, { settle: 3000 },
    ...starterPack("ENTER"), { maybe: "SKIP ALL", timeoutMs: 3000 }, { settle: 1500 }, { capture: "app-screen-tennis-rally" },
    { tap: "PLAY MATCH" }, { maybe: "SKIP ALL", timeoutMs: 6000 }, { settle: 5000 }, { capture: "app-screen-play-tennis-rally" },
  ] },
  { game: "guess-winner", name: "Guess the Winner", steps: [
    ...gamesTab, { tap: "ALL SPORTS" }, { settle: 2000 }, { tap: "Tennis, 3" }, { settle: 2500 }, { tap: "GUESS THE WINNER" }, { settle: 3000 },
    { maybe: "SKIP", timeoutMs: 3000 }, { maybe: "PLAY TODAY", timeoutMs: 5000 }, { settle: 3000 }, { capture: "app-screen-play-guess-winner" },
  ] },
];
