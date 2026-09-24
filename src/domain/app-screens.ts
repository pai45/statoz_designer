/**
 * The curated StatOz app screens for the App showcase template, captured from the
 * Pitch Duel (`card_game`) Flutter screenshot catalog at 393 × 852.
 *
 * The importer copies each file into `storage/assets`; the editor uses the same
 * list to group the phone-capture picker and to prefill a page's copy when a
 * screen is chosen. Copy describes what the screen shows — never prizes, prices,
 * partnerships, or real-world outcomes.
 */
import { appCreativePlaceholders } from "./app-creatives";

export type AppScreenGroup = "Onboarding" | "Sports" | "Games" | "Gameplay" | "Match stats" | "Predictions" | "Profile & social" | "Shop";
export type AppScreenCopy = { eyebrow: string; headline: string; body: string };
export type AppScreen = {
  /** Stable asset id, so re-importing refreshes in place instead of duplicating. */
  id: string;
  /** File inside `output/screenshots/statoz`. Omitted for captures imported another way. */
  file?: string;
  /** Produced by `npm run capture:gameplay` from the unchanged card_game web build. */
  capture?: "gameplay";
  /** Shared by a game's start screen and its gameplay screen, so the two can be paired. */
  game?: string;
  name: string;
  group: AppScreenGroup;
  copy: AppScreenCopy;
};

export const appScreenGroups: AppScreenGroup[] = ["Onboarding", "Sports", "Games", "Gameplay", "Match stats", "Predictions", "Profile & social", "Shop"];

export const appScreens: AppScreen[] = [
  { id: "app-screen-onboarding", file: "001_onboarding__profile-setup__intro.png", name: "Onboarding sign-in", group: "Onboarding",
    copy: { eyebrow: "GET STARTED", headline: "One arena.\nEvery sport.", body: "Sign in once and pick up your games, picks and progress anywhere." } },

  { id: "app-screen-match-hub", file: "002_sports__match-hub__trending.png", name: "Match hub trending", group: "Sports",
    copy: { eyebrow: "SPORTS / TRENDING", headline: "Every live match, one feed.", body: "Football, cricket, basketball, tennis and motorsport side by side." } },
  { id: "app-screen-match-hub-football", file: "003_sports__match-hub__football.png", name: "Match hub football", group: "Sports",
    copy: { eyebrow: "SPORTS / FOOTBALL", headline: "Your league, today.", body: "Scores and fixtures grouped by competition, with standings a tap away." } },
  { id: "app-screen-match-hub-cricket", file: "004_sports__match-hub__cricket.png", name: "Match hub cricket", group: "Sports",
    copy: { eyebrow: "SPORTS / CRICKET", headline: "Follow every over.", body: "Live and finished cricket in one scroll, from T20 to the league table." } },

  { id: "ba7e4cfc-7932-443e-b57e-44bc7a345e28", file: "009_games__games-hub__trending.png", name: "Games hub trending", group: "Games",
    copy: { eyebrow: "GAMES / HUB", headline: "Play the sport you follow.", body: "Card duels, spot kicks, quizzes and arcade modes in one place." } },
  { id: "app-screen-games-hub-football", file: "010_games__games-hub__football.png", name: "Games hub football", group: "Games",
    copy: { eyebrow: "GAMES / FOOTBALL", headline: "Four ways to play football.", body: "Tactical cards, sudden-death penalties, a 5v5 duel and daily trivia." } },
  { id: "app-screen-pitch-duel", capture: "gameplay", name: "Pitch Duel", group: "Games", game: "pitch-duel",
    copy: { eyebrow: "GAMES / PITCH DUEL", headline: "Build a squad. Win the duel.", body: "A fast four-round card duel against a rival squad." } },
  { id: "app-screen-penalty-shootout", file: "016_games__penalty-shootout__entry.png", name: "Penalty Shootout", group: "Games", game: "penalty-shootout",
    copy: { eyebrow: "GAMES / PENALTY SHOOTOUT", headline: "Hold your nerve.", body: "Sudden-death spot kicks. Pick your corner and beat the keeper." } },
  { id: "app-screen-football-chess", file: "017_games__football-chess__entry.png", name: "5v5 Football Chess", group: "Games", game: "football-chess",
    copy: { eyebrow: "GAMES / FOOTBALL CHESS", headline: "Out-think the other side.", body: "A 5v5 tactical grid duel. Build your deck and find a match." } },
  { id: "app-screen-football-quiz", file: "018_games__football-quiz__entry.png", name: "Football Quiz", group: "Games", game: "football-quiz",
    copy: { eyebrow: "GAMES / QUIZ", headline: "Prove what you know.", body: "Climb from easy to global trivia, one category ladder at a time." } },
  { id: "app-screen-football-bingo", file: "019_games__football-bingo__entry.png", name: "Football Bingo", group: "Games", game: "football-bingo",
    copy: { eyebrow: "GAMES / BINGO", headline: "A new grid every day.", body: "Match players to the clubs on a 3 × 3 board and complete the line." } },
  { id: "app-screen-guess-player", file: "020_games__football-guess-player__entry.png", name: "Guess the Player", group: "Games", game: "guess-player",
    copy: { eyebrow: "GAMES / GUESS THE PLAYER", headline: "Crack the classified file.", body: "Decode six career signals. Fewer clues, bigger reward." } },
  { id: "app-screen-final-over", file: "021_games__final-over__entry.png", name: "Final Over", group: "Games", game: "final-over",
    copy: { eyebrow: "GAMES / FINAL OVER", headline: "Six balls to win it.", body: "Three overs, five batters, one chase. Pick your tier and take guard." } },
  { id: "app-screen-hoop-duel", file: "024_games__hoop-duel__entry.png", name: "Hoop Duel", group: "Games", game: "hoop-duel",
    copy: { eyebrow: "GAMES / HOOP DUEL", headline: "Street hoops, head to head.", body: "Two halves and a shot clock. Choose your difficulty and tip off." } },
  { id: "app-screen-grand-prix-dash", file: "027_games__grand-prix-dash__entry.png", name: "Grand Prix Dash", group: "Games", game: "grand-prix-dash",
    copy: { eyebrow: "GAMES / GRAND PRIX DASH", headline: "Lights out. Your race.", body: "Pick a circuit and a distance, tune your car and race the grid." } },
  { id: "app-screen-guess-driver", file: "029_games__guess-driver__entry.png", name: "Guess the Driver", group: "Games", game: "guess-driver",
    copy: { eyebrow: "GAMES / GUESS THE DRIVER", headline: "Name the winner.", body: "Decode the race winner before all ten lives leave the grid." } },
  { id: "app-screen-tennis-rally", capture: "gameplay", name: "Tennis Rally", group: "Games", game: "tennis-rally",
    copy: { eyebrow: "GAMES / TENNIS RALLY", headline: "Step on court.", body: "A fast-court showdown. Choose your level and play a match." } },
  { id: "app-screen-guess-winner", file: "032_games__guess-winner__entry.png", name: "Guess the Winner", group: "Games", game: "guess-winner",
    copy: { eyebrow: "GAMES / GUESS THE WINNER", headline: "One final a day.", body: "Identify the champion from the clues before your lives run out." } },

  { id: "1655e09e-0b29-4610-9501-77295675b4b2", name: "Final Over gameplay", group: "Gameplay", game: "final-over",
    copy: { eyebrow: "GAMEPLAY / FINAL OVER", headline: "Time it. Hit it.", body: "Read the delivery and tap to swing. Every ball changes the chase." } },
  { id: "app-screen-play-pitch-duel", capture: "gameplay", name: "Pitch Duel gameplay", group: "Gameplay", game: "pitch-duel",
    copy: { eyebrow: "GAMEPLAY / PITCH DUEL", headline: "Pick your play.", body: "One attacker and one action card against the defence, every round." } },
  { id: "app-screen-play-penalty-shootout", capture: "gameplay", name: "Penalty Shootout gameplay", group: "Gameplay", game: "penalty-shootout",
    copy: { eyebrow: "GAMEPLAY / PENALTIES", headline: "Pick a corner. Take the shot.", body: "Aim left, centre or right and try to beat the keeper." } },
  { id: "app-screen-play-football-chess", capture: "gameplay", name: "5v5 Football Chess gameplay", group: "Gameplay", game: "football-chess",
    copy: { eyebrow: "GAMEPLAY / FOOTBALL CHESS", headline: "Every move counts.", body: "Move your pieces across a 5v5 grid before the clock runs down." } },
  { id: "app-screen-play-football-quiz", capture: "gameplay", name: "Quiz gameplay", group: "Gameplay", game: "football-quiz",
    copy: { eyebrow: "GAMEPLAY / QUIZ", headline: "Ten questions. Lock it in.", body: "Pick an answer, build a streak and clear the set." } },
  { id: "app-screen-play-football-bingo", capture: "gameplay", name: "Football Bingo gameplay", group: "Gameplay", game: "football-bingo",
    copy: { eyebrow: "GAMEPLAY / BINGO", headline: "Fill the grid.", body: "Place players where their clubs cross before the timer runs out." } },
  { id: "app-screen-play-guess-player", capture: "gameplay", name: "Guess the Player gameplay", group: "Gameplay", game: "guess-player",
    copy: { eyebrow: "GAMEPLAY / GUESS THE PLAYER", headline: "Follow the career path.", body: "Read the club route, unlock a hint and name the player." } },
  { id: "app-screen-play-hoop-duel", capture: "gameplay", name: "Hoop Duel gameplay", group: "Gameplay", game: "hoop-duel",
    copy: { eyebrow: "GAMEPLAY / HOOP DUEL", headline: "Beat the shot clock.", body: "Move, drive and shoot in a fast one-on-one half." } },
  { id: "app-screen-play-grand-prix-dash", capture: "gameplay", name: "Grand Prix Dash gameplay", group: "Gameplay", game: "grand-prix-dash",
    copy: { eyebrow: "GAMEPLAY / GRAND PRIX DASH", headline: "Hold the racing line.", body: "Steer, brake and accelerate through the pack, corner by corner." } },
  { id: "app-screen-play-guess-driver", capture: "gameplay", name: "Guess the Driver gameplay", group: "Gameplay", game: "guess-driver",
    copy: { eyebrow: "GAMEPLAY / GUESS THE DRIVER", headline: "Decode the race winner.", body: "Year, track and country are in. Name the driver in ten tries." } },
  { id: "app-screen-play-tennis-rally", capture: "gameplay", name: "Tennis Rally gameplay", group: "Gameplay", game: "tennis-rally",
    copy: { eyebrow: "GAMEPLAY / TENNIS RALLY", headline: "Serve. Rally. Break.", body: "Move and swing to time your shots across the court." } },
  { id: "app-screen-play-guess-winner", capture: "gameplay", name: "Guess the Winner gameplay", group: "Gameplay", game: "guess-winner",
    copy: { eyebrow: "GAMEPLAY / GUESS THE WINNER", headline: "Name the champion.", body: "Year, tournament and category are decoded. Find the winner." } },

  { id: "app-screen-football-stats", file: "049_match-tabs__football__stats.png", name: "Football match stats", group: "Match stats",
    copy: { eyebrow: "MATCH STATS / FOOTBALL", headline: "Every stat, one tap away.", body: "Possession, shots and on-target numbers for both sides." } },
  { id: "app-screen-football-timeline", file: "066_match-tabs__football__stats-lower.png", name: "Football match timeline", group: "Match stats",
    copy: { eyebrow: "MATCH STATS / TIMELINE", headline: "Every change, minute by minute.", body: "Substitutions and key moments laid out on one match timeline." } },
  { id: "app-screen-cricket-stats", file: "053_match-tabs__cricket__stats.png", name: "Cricket match stats", group: "Match stats",
    copy: { eyebrow: "MATCH STATS / CRICKET", headline: "The whole innings, explained.", body: "Venue, toss, result and a side-by-side team comparison." } },
  { id: "app-screen-basketball-stats", file: "057_match-tabs__basketball__stats.png", name: "Basketball game stats", group: "Match stats",
    copy: { eyebrow: "MATCH STATS / BASKETBALL", headline: "Quarter by quarter.", body: "The scoring grid, series context and team control in one view." } },
  { id: "app-screen-basketball-leaders", file: "068_match-tabs__basketball__stats-lower.png", name: "Basketball impact leaders", group: "Match stats",
    copy: { eyebrow: "MATCH STATS / LEADERS", headline: "Who ran the game.", body: "Points, assists and rebounds leaders for both teams." } },
  { id: "app-screen-motorsport-stats", file: "061_match-tabs__motorsport__stats.png", name: "Motorsport race stats", group: "Match stats",
    copy: { eyebrow: "RACE STATS / MOTORSPORT", headline: "Know the circuit.", body: "Track map, laps, lap record and the winner's time in one card." } },
  { id: "app-screen-motorsport-classification", file: "069_match-tabs__motorsport__stats-lower.png", name: "Motorsport classification", group: "Match stats",
    copy: { eyebrow: "RACE STATS / CLASSIFICATION", headline: "The full grid, settled.", body: "Finishing positions, grid changes and gaps for every driver." } },
  { id: "app-screen-tennis-stats", file: "065_match-tabs__tennis__stats.png", name: "Tennis match stats", group: "Match stats",
    copy: { eyebrow: "MATCH STATS / TENNIS", headline: "Set by set.", body: "Match facts and the full scoreline for both players." } },

  { id: "app-screen-race-predictions", file: "058_match-tabs__motorsport__predict.png", name: "Race predictions", group: "Predictions",
    copy: { eyebrow: "PREDICT / RACE", headline: "Call the race.", body: "Answer race and bonus predictions, then compare with the community." } },
  { id: "app-screen-tennis-picks", file: "063_match-tabs__tennis__picks.png", name: "Tennis match picks", group: "Predictions",
    copy: { eyebrow: "PICKS / TENNIS", headline: "Back your read.", body: "See how the crowd split on every settled match market." } },
  { id: "app-screen-prediction-leaderboard", file: "060_match-tabs__motorsport__tops.png", name: "Prediction leaderboard", group: "Predictions",
    copy: { eyebrow: "TOPS / PREDICTIONS", headline: "Climb the match table.", body: "Every correct call moves you up the prediction leaderboard." } },

  { id: "app-screen-player-dossier", file: "041_profile__player-dossier__loaded.png", name: "Player profile dossier", group: "Profile & social",
    copy: { eyebrow: "PROFILE / DOSSIER", headline: "Your game, on the record.", body: "Level, mastery, friends and coin history in one player file." } },
  { id: "2e7a0f00-55e8-4d71-81eb-c4ad6e506873", file: "040_leaderboards__top__rankings.png", name: "Leaderboard rankings", group: "Profile & social",
    copy: { eyebrow: "LEADERBOARD / TOP", headline: "See where you stand.", body: "Team and player rankings across every sport, with your rank pinned." } },
  { id: "app-screen-friends-arena", file: "042_social__friends-arena__loaded.png", name: "Friends arena", group: "Profile & social",
    copy: { eyebrow: "SOCIAL / FRIENDS", headline: "Bring your rivals.", body: "Find friends by tag and settle it on your own leaderboard." } },
  { id: "app-screen-how-to-play", file: "044_help__tutorials__catalogue.png", name: "How to play", group: "Profile & social",
    copy: { eyebrow: "HELP / HOW TO PLAY", headline: "Learn any mode in minutes.", body: "Short step-by-step guides for predictions, picks and every game." } },

  { id: "e7d875fd-dfe7-41a8-92bb-b24112af2c61", file: "038_shop__catalogue__packs.png", name: "Shop packs catalogue", group: "Shop",
    copy: { eyebrow: "SHOP / PACKS", headline: "Open a new pack.", body: "Starter to elite packs, each with a set of collectible cards." } },
  { id: "app-screen-shop-cards", file: "039_shop__catalogue__cards.png", name: "Shop cards catalogue", group: "Shop",
    copy: { eyebrow: "SHOP / CARDS", headline: "Build your squad.", body: "Browse cards by position and add the ones your deck needs." } },
];

const byId = new Map(appScreens.map(screen => [screen.id, screen]));
export const appScreenFor = (assetId: string) => byId.get(assetId);

/** The gameplay screen paired with a game's start screen, if one was captured. */
export function appGameplayFor(assetId: string) {
  const game = appScreenFor(assetId)?.game;
  return game ? appScreens.find(screen => screen.group === "Gameplay" && screen.game === game) : undefined;
}

/** Each screen group's showcase background, drawn behind the phone. */
export type AppScreenTheme = "arena" | "pitch" | "arcade" | "motion" | "data" | "radar" | "network" | "vault";
export const appScreenThemes: Record<AppScreenGroup, AppScreenTheme> = {
  Onboarding: "arena", Sports: "pitch", Games: "arcade", Gameplay: "motion",
  "Match stats": "data", Predictions: "radar", "Profile & social": "network", Shop: "vault",
};
/** The background for a page's phone capture; captures outside the curated set keep the plain grid. */
export const appScreenTheme = (assetId: string): AppScreenTheme | undefined => {
  const group = appScreenFor(assetId)?.group;
  return group && appScreenThemes[group];
};

/**
 * The copy to apply when a page switches to `nextAssetId`. A field changes only while
 * it still holds the template prompt, is empty, or matches the previous screen's
 * default, so text the user wrote is never overwritten.
 */
export function appScreenPrefill(current: AppScreenCopy, previousAssetId: string, nextAssetId: string): Partial<AppScreenCopy> {
  const next = appScreenFor(nextAssetId)?.copy;
  if (!next) return {};
  const previous = appScreenFor(previousAssetId)?.copy;
  const change: Partial<AppScreenCopy> = {};
  for (const key of ["eyebrow", "headline", "body"] as const) {
    const value = current[key].trim();
    if (!value || value === appCreativePlaceholders[key] || value === previous?.[key]) change[key] = next[key];
  }
  return change;
}
