import type { Format } from "./project";

/**
 * The StatOz design guide as data. The studio's Brand tab renders it, and
 * `npm run design:sync` renders it into the statoz-design-system skill, so the
 * people and the assistants read one guide.
 *
 * Only token *names* live here. Values stay in `src/design-system/styles/tokens.css`
 * (and the social type scale in `composition.css`); every consumer resolves them
 * from there, so this file can never disagree with the stylesheet.
 */

export type GuideToken = { token: string; name: string; role: string };
export type ColorGroup = { id: string; name: string; description: string; tokens: GuideToken[] };
export type ShapeSpec = { name: string; clip: string; cut?: string; use: string };
export type UseCase = {
  id: string; name: string; summary: string;
  /** Canvas formats this work is delivered in; empty when it is not a studio export. */
  formats: Format[];
  /** Registry template ids to start from; empty when there is no studio template. */
  startTemplates: string[];
  palette: string[]; type: string[]; assets: string[]; rules: string[]; checklist: string[];
};
export type DoDont = { topic: string; do: string; dont: string };
/** A shared component in the guide's catalog, with where its design came from. */
export type CatalogEntry = {
  id: string; name: string;
  /** The export in `src/design-system/components/actions.tsx` or `elements.tsx`. */
  component: string;
  /** The statoz_web / card_game original this ports. */
  from: string;
  use: string; rules: string[];
};
/** A downloadable file on Assets › Design kit, as `GET /api/brand-kit` lists it. */
export type BrandKitItem = { id: string; name: string; fileName: string; format: string; description: string; bytes: number };

export const brandPrinciples = [
  { name: "Dark and calm", rule: "Dark navy surfaces, white type, muted blue-grey support. Atmosphere comes from the calm grid and scanlines, never film grain or noise." },
  { name: "One signal", rule: "Cyan is the identity and the interactive signal. Other accents carry a meaning (sport, reward, danger, elite) and are never decoration." },
  { name: "Glow is scarce", rule: "Only one focal element glows: the selected action, the live state, or the reveal moment. Static panels, rows and secondary chips stay flat." },
  { name: "Every edge has intent", rule: "Surfaces are chamfered plates with a continuous outline around the whole silhouette. No rounded Material cards, no pill-heavy UI, no generic white cards." },
  { name: "Display for identity, body for detail", rule: "Orbitron carries headlines, numbers and the brand; Onest carries body copy and controls. Changing numbers use tabular figures." },
] as const;

export const colorGroups: ColorGroup[] = [
  {
    id: "surfaces", name: "Surfaces", description: "Dark navy layers, from the page up to raised panels.",
    tokens: [
      { token: "--ds-color-background-primary", name: "Primary", role: "Page and canvas base" },
      { token: "--ds-color-background-secondary", name: "Secondary", role: "Panels and cards" },
      { token: "--ds-color-background-elevated", name: "Elevated", role: "Raised plates, hover, selected rows" },
      { token: "--ds-color-background-muted", name: "Muted", role: "Deepest wells behind content" },
      { token: "--ds-color-background-nav", name: "Nav", role: "Navigation chrome" },
      { token: "--ds-color-background-data", name: "Data", role: "The flat bed under charts and data rows" },
    ],
  },
  {
    id: "text", name: "Text", description: "White for what matters, blue-greys for support.",
    tokens: [
      { token: "--ds-color-text-default", name: "Default", role: "Headlines and primary copy" },
      { token: "--ds-color-text-subtle", name: "Subtle", role: "Secondary copy on dark panels" },
      { token: "--ds-color-text-muted", name: "Muted", role: "Captions, telemetry labels, metadata" },
      { token: "--ds-color-text-accent", name: "Accent", role: "Highlighted words and links" },
      { token: "--ds-color-text-inverse", name: "Inverse", role: "Text on cyan, gold or lime fills" },
      { token: "--ds-color-text-disabled", name: "Disabled", role: "Unavailable controls only" },
    ],
  },
  {
    id: "borders", name: "Borders", description: "Every plate is outlined. Stronger borders mean more importance, not glow.",
    tokens: [
      { token: "--ds-color-border-subtle", name: "Subtle", role: "Dividers and quiet outlines" },
      { token: "--ds-color-border-muted", name: "Muted", role: "Standard HUD plate outline" },
      { token: "--ds-color-border-default", name: "Default", role: "Cards, fields and chips" },
      { token: "--ds-color-border-strong", name: "Strong", role: "Hover and emphasised outlines" },
      { token: "--ds-color-border-active", name: "Active", role: "Elite or active violet edge" },
    ],
  },
  {
    id: "accents", name: "Accents", description: "Each accent means something. card_game's Cyber.magenta is this violet (#C27AFF); there is no separate magenta.",
    tokens: [
      { token: "--ds-color-accent-cyan", name: "Cyan", role: "Brand identity, primary action, live signal" },
      { token: "--ds-color-accent-white", name: "White", role: "Neutral sport identity (cricket)" },
      { token: "--ds-color-accent-gold", name: "Gold", role: "Rewards, coins, winners" },
      { token: "--ds-color-accent-lime", name: "Lime", role: "Tennis identity, fresh or positive moments" },
      { token: "--ds-color-accent-racing", name: "Racing", role: "Motorsport identity" },
      { token: "--ds-color-accent-violet", name: "Violet", role: "Elite tiers and sparing secondary emphasis" },
      { token: "--ds-color-accent-orange", name: "Orange", role: "Streaks and heat" },
      { token: "--ds-color-accent-blue", name: "Blue", role: "Informational highlights" },
      { token: "--ds-color-accent-pink", name: "Pink", role: "Rare secondary emphasis" },
    ],
  },
  {
    id: "feedback", name: "Feedback", description: "Keep reward, danger, live and team semantics distinct.",
    tokens: [
      { token: "--ds-color-success", name: "Success", role: "Correct picks, completed steps" },
      { token: "--ds-color-warning", name: "Warning", role: "Attention without failure" },
      { token: "--ds-color-danger", name: "Danger", role: "Errors, losses, destructive actions" },
      { token: "--ds-color-info", name: "Info", role: "Neutral notices" },
    ],
  },
  {
    id: "sports", name: "Sport accents", description: "Five sports, one system. A sport's accent replaces cyan as the local accent on its content.",
    tokens: [
      { token: "--ds-color-accent-cyan", name: "Football", role: "football" },
      { token: "--ds-color-accent-white", name: "Cricket", role: "cricket" },
      { token: "--ds-color-accent-gold", name: "Basketball", role: "basketball" },
      { token: "--ds-color-accent-lime", name: "Tennis", role: "tennis" },
      { token: "--ds-color-accent-racing", name: "Motorsport", role: "motorsport" },
    ],
  },
  {
    id: "sections", name: "Product sections", description: "card_game's navigation identity: each app section keeps one accent across its tabs, labels and borders. Profile uses its own blue (#51A2FF), which has no token.",
    tokens: [
      { token: "--ds-color-accent-violet", name: "Matches", role: "Match centre and fixtures" },
      { token: "--ds-color-accent-orange", name: "Games", role: "Arcade games hub" },
      { token: "--ds-color-accent-lime", name: "Picks", role: "Predictions and picks" },
      { token: "--ds-color-accent-gold", name: "Top", role: "Leaderboards and rankings" },
    ],
  },
  {
    id: "rarity", name: "Card rarity", description: "Collectible tiers. Each has a catch-light, the hue, and a deep base.",
    tokens: (["bronze", "silver", "gold", "platinum"] as const).flatMap(tier => (["light", "base", "deep"] as const).map(step => ({
      token: `--ds-color-rarity-${tier}-${step}`, name: `${tier[0].toUpperCase()}${tier.slice(1)} ${step}`, role: step === "base" ? `${tier} tier hue` : step === "light" ? `${tier} catch-light` : `${tier} metallic base`,
    }))),
  },
];

export const typeFamilies: GuideToken[] = [
  { token: "--ds-font-display", name: "Orbitron", role: "Display: headlines, numbers, scores, brand identity. Uppercase HUD labels use measured tracking." },
  { token: "--ds-font-body", name: "Onest", role: "Body: supporting copy, controls, forms, long text." },
  { token: "--ds-font-mono", name: "System mono", role: "Code and IDs only; never in artwork." },
];

/** The compact UI ramp. Artwork uses the social scale instead. */
export const uiTypeScale: GuideToken[] = [
  { token: "--ds-text-2xs", name: "2XS", role: "Telemetry labels, tags" },
  { token: "--ds-text-xs", name: "XS", role: "Captions and metadata" },
  { token: "--ds-text-compact", name: "Compact", role: "Dense controls" },
  { token: "--ds-text-sm", name: "SM", role: "Secondary body" },
  { token: "--ds-text-md", name: "MD", role: "Default control text" },
  { token: "--ds-text-base", name: "Base", role: "Body copy" },
  { token: "--ds-text-lg", name: "LG", role: "Lead copy" },
  { token: "--ds-text-xl", name: "XL", role: "Panel titles" },
  { token: "--ds-text-2xl", name: "2XL", role: "Section titles" },
  { token: "--ds-text-3xl", name: "3XL", role: "Page titles" },
  { token: "--ds-text-hero", name: "Hero", role: "Hero statements" },
  { token: "--ds-text-celebration", name: "Celebration", role: "Reveal moments" },
  { token: "--ds-text-countdown", name: "Countdown", role: "Big live numbers" },
];

export const tracking: GuideToken[] = [
  { token: "--ds-tracking-tight", name: "Tight", role: "Large display headlines" },
  { token: "--ds-tracking-label", name: "Label", role: "Buttons and chips" },
  { token: "--ds-tracking-display", name: "Display", role: "Orbitron sub-heads" },
  { token: "--ds-tracking-ultra", name: "Ultra", role: "Uppercase telemetry labels" },
  { token: "--ds-tracking-mega", name: "Mega", role: "Eyebrows and overlines" },
];

/** The pixel type scale artwork uses, per ratio, read from `composition.css`. */
export const socialScaleVars = ["--social-title", "--social-body", "--social-small", "--social-gap", "--social-margin", "--social-top", "--social-bottom", "--social-right"] as const;
export const socialScaleFormats: { format: Format; className: string }[] = [
  { format: "square", className: "format-square" },
  { format: "portrait", className: "format-portrait" },
  { format: "reel", className: "format-reel" },
  { format: "landscape", className: "format-landscape" },
];

export const shapes: ShapeSpec[] = [
  { name: "HUD panel", clip: "--ds-clip-hud", cut: "--ds-shape-hud-cut", use: "Standard plates and HudPanel: a large top-left/bottom-right cut with small opposing accents." },
  { name: "Compact HUD", clip: "--ds-clip-compact-hud", cut: "--ds-shape-compact-hud-cut", use: "Dense rows and small tiles." },
  { name: "Panel", clip: "--ds-clip-panel", cut: "--ds-shape-panel-cut", use: "Symmetric containers and dialogs." },
  { name: "Signal plate", clip: "--ds-clip-signal", cut: "--ds-shape-signal-cut", use: "Callouts with a notched signal step on the top edge." },
  { name: "Collectible card", clip: "--ds-clip-card", cut: "--ds-card-cut-big", use: "PlayerCard and ActionCard silhouettes. Resized cards compute their cuts with cardCuts(width) from tokens/shape.ts." },
  { name: "Chip", clip: "--ds-clip-chip", use: "FilterChips plates and compact tags." },
  { name: "Field", clip: "--ds-clip-field", cut: "--ds-shape-field-cut", use: "Inputs and selects." },
  { name: "Tab plate", clip: "--ds-clip-tab-plate", cut: "--ds-shape-tab-chamfer", use: "Raised active tabs; bottom corners cut only." },
];

export const surfaceRules = [
  "Draw a chamfered surface as two layers with the same clip-path: an outer shell in the border color and an inner fill inset by 1px. A normal CSS border does not follow a clip-path.",
  "Keep the outline continuous around every cut corner at every breakpoint and state.",
  "Glow is an accent at about 30% alpha: glow() from design-system/tokens/elevation.ts on unclipped elements, or a drop-shadow on the unclipped element around a clipped plate. A clip-path cuts away any shadow cast by the clipped layer itself. One glowing element per surface.",
  "Depth for the rest comes from the surface ladder (muted, primary, secondary, elevated) and border strength, not drop shadows.",
] as const;

/** House safe areas; `box` is the top, right, bottom and left inset in percent. */
export const safeAreas: { format: Format; inset: string; box: [number, number, number, number]; note: string }[] = [
  { format: "square", inset: "8% on all sides", box: [8, 8, 8, 8], note: "Keep the logo and CTA inside the guide." },
  { format: "portrait", inset: "8% on all sides", box: [8, 8, 8, 8], note: "The default feed ratio." },
  { format: "reel", inset: "14% top · 14% right · 22% bottom · 8% left", box: [14, 14, 22, 8], note: "Platform UI covers the top, the right rail and the caption area." },
  { format: "landscape", inset: "8% on all sides", box: [8, 8, 8, 8], note: "Use the width: split layouts beat centred stacks." },
];

export const motionRules = [
  "Video briefs run 8–60 seconds and render at 30 fps. Motion is a function of frame time, so preview and export match.",
  "Entries ease out (cubic, about 0.5 s); exits fade quickly (about 0.25 s). Use step, easeOut and smoothstep from src/features/compositions/motion.ts.",
  "Structure: an immediate hook, a concise reveal, a payoff, then a StatOz CTA that reads with the sound off.",
  "Keep each line on screen long enough to read twice. No flashes, no strobing, no hard cuts on text.",
  "Respect prefers-reduced-motion in studio UI.",
  "Feedback has a hierarchy (card_game): a subtle selection tick, an impact confirmation, the round result, the settlement reveal, then the rare celebration. Save the biggest beat for genuinely scarce outcomes.",
  "Actions answer a press at once: hover lifts 1px, press returns to rest or scales to 0.96, and the hero CTA breathes its halo on a 1.8 s loop that reduced motion stills.",
  "Reduced motion removes shake, trails, repeated pulses and long staging, but keeps every score, verdict and reward readable.",
] as const;

/** Every state an action must show without losing its label or contrast (card_game visible-states rule). */
export const actionStates = [
  { state: "Default", rule: "The variant's resting plate." },
  { state: "Hover", rule: "Lifts 1px and brightens the fill; ghosts gain a faint accent wash." },
  { state: "Pressed", rule: "Returns to rest; hero CTAs light their halo fully and hold actions swap to their pressed copy." },
  { state: "Focus", rule: "The edge turns solid accent and the fill pulls in to leave a ring that follows the chamfer." },
  { state: "Disabled", rule: "55% opacity, muted ink, no glow, no pointer." },
  { state: "Pending", rule: "A spinner replaces the trailing icon, aria-busy is set and input is blocked." },
  { state: "Selected", rule: "Choice tiles take an accent edge, a soft glow and a corner seal." },
  { state: "Destructive", rule: "Danger accent, and always behind a confirm dialog." },
] as const;

/** Which action to reach for. */
export const actionHierarchy = [
  "One focal action per surface: a HeroCta, or a solid ActionButton with glow. Everything else stays calm.",
  "Solid is the primary action. Tonal is a secondary action that keeps the accent. Surface is neutral (third-party sign-in, utilities). Ghost is tertiary and inline.",
  "Play and commit moments (PLAY MATCH, LOCK PICK) use HeroCta; add a helper line for odds or a hint, and pressedLabel when releasing does something.",
  "Use FuseCta only when waiting has a cost; the fuse shows the real time left.",
  "Step flows pair a calm PagerButton (back) with a focal one (next or submit).",
  "Destructive actions use the danger accent and confirm through DialogActions.",
  "Icon-only actions are IconButtons with a label; they never glow.",
] as const;

export const actionCatalog: CatalogEntry[] = [
  { id: "action-button", name: "Action button", component: "ActionButton", from: "statoz_web Button (solid · tonal · surface · ghost)", use: "Every ordinary action: primary, secondary, neutral and tertiary, in sm, md and lg.", rules: ["Chamfered with --ds-clip-field; label in Orbitron black.", "glow only on the one focal action.", "pending swaps the trailing icon for a spinner and blocks input."] },
  { id: "action-link", name: "Action link", component: "ActionLink", from: "statoz_web Button with href", use: "Navigation or a download that should look like an action.", rules: ["Renders an anchor, so it keeps link semantics.", "Same variants and sizes as ActionButton."] },
  { id: "hero-cta", name: "Hero CTA", component: "HeroCta", from: "card_game HudCtaButton / HudHoldCtaButton", use: "The play or commit moment on a screen: PLAY MATCH, LOCK PICK, START.", rules: ["One per screen; the halo breathes while idle.", "outlined is the calm secondary with no halo.", "For hold-to-charge, pass pressedLabel and the press callbacks."] },
  { id: "fuse-cta", name: "Fuse CTA", component: "FuseCta", from: "card_game CyberFuseCtaButton", use: "A time-limited action: a daily drop, a closing pick, a streak save.", rules: ["The fuse is the real remaining fraction; never fake urgency.", "Chevrons chase toward the action; reduced motion stills them."] },
  { id: "pager", name: "Pager buttons", component: "PagerButton", from: "card_game HudPagerButton", use: "Back and next in tutorials, quizzes and setup flows.", rules: ["Forward is focal; backward is calm.", "A disabled forward action drops to the calm plate."] },
  { id: "action-chip", name: "Action chip", component: "ActionChip", from: "card_game CyberObjectiveAction", use: "Small inline actions inside cards: CLAIM, VIEW, RETRY.", rules: ["Tonal accent tint with an icon; 44px target around a compact plate."] },
  { id: "icon-button", name: "Icon button", component: "IconButton", from: "card_game CyberSearchButton, statoz_web nav and toolbar icons", use: "Search, close, share, settings and toggles.", rules: ["label is required: it is the accessible name and the tooltip.", "pressed makes it a toggle with aria-pressed.", "Never glows."] },
  { id: "dialog-actions", name: "Dialog actions", component: "DialogActions", from: "statoz_web ConfirmDialog, card_game CyberConfirmDialog", use: "The split bar that ends a confirm dialog.", rules: ["Cancel is muted on the left; confirm takes the accent on the right.", "destructive paints confirm in the danger color."] },
  { id: "stepper", name: "Stepper", component: "Stepper", from: "statoz_web StakeStepper", use: "A bounded number: a stake, a quantity, a count.", rules: ["The value uses tabular Orbitron figures.", "Each end disables at its bound."] },
  { id: "selectable-tile", name: "Selectable tile", component: "SelectableTile", from: "statoz_web SelectableTile, card_game CyberSelectableCard", use: "Picture-first choices: avatars, banners, crests, coin-toss calls.", rules: ["radio for one-of-many, checkbox for independent toggles.", "Selected takes the accent edge, soft glow and corner seal."] },
  { id: "control-pad", name: "Control pad", component: "ControlPad", from: "statoz_web Hoop Duel direction pads, card_game game controls", use: "Press-and-hold game input in demos and mocks.", rules: ["Lit while held; releases on pointer up, cancel or leave.", "For play only, never for navigation."] },
];

export const elementCatalog: CatalogEntry[] = [
  { id: "badge", name: "Badge", component: "Badge", from: "statoz_web Badge, card_game FixtureLiveTag", use: "A status label, or the LIVE marker.", rules: ["bare is plain accent text; outlined adds an edge and a dot.", "One outlined badge per surface; pulse only for genuinely live data."] },
  { id: "status-pill", name: "Status pill", component: "StatusPill", from: "card_game CyberStatusPill / CyberStatPill", use: "State tags (CONFIRMED, OWNED) and labelled stats (XP 1,240).", rules: ["A tinted plate; the value is white and tabular.", "Never glows; there are often several on screen."] },
  { id: "delta-chip", name: "Delta chip", component: "DeltaChip", from: "card_game CyberDeltaChip", use: "Movement since a reference point: ▲6 TODAY, ▼3 THIS WEEK.", rules: ["Lime up, danger down, muted when flat."] },
  { id: "progress", name: "Progress", component: "Progress", from: "statoz_web Progress, card_game CyberProgressBar", use: "Probabilities and completion.", rules: ["A thin accent fill with a faint glow; always labelled."] },
  { id: "step-meter", name: "Step meter", component: "StepMeter", from: "statoz_web StepMeter, card_game HudProgressSegment", use: "Position in a paginated flow.", rules: ["Green behind, amber here, slate ahead; only the current segment glows."] },
  { id: "signal-panel", name: "Signal panel", component: "SignalPanel", from: "statoz_web SignalPanel", use: "The signature card: a tag rail, a body and an optional footer rail.", rules: ["The notched top edge and accent hairline come from --ds-clip-signal.", "The lift beneath uses the accent at 22%."] },
  { id: "accent-panel", name: "Accent panel", component: "AccentPanel", from: "statoz_web AccentPanel, card_game CyberPanel", use: "A flat plate with both bottom corners cut.", rules: ["glow for the one panel a screen wants seen first, and nothing else."] },
  { id: "underline-tabs", name: "Underline tabs", component: "UnderlineTabs", from: "statoz_web UnderlineTabs, card_game CyberUnderlineTabs / SportUnderlineTabs", use: "Dense browse surfaces that already carry a focal element.", rules: ["The glowing underline is the only live element.", "Arrow, Home and End keys move between tabs."] },
];

export const useCases: UseCase[] = [
  {
    id: "social-feed", name: "Social feed posts & carousels",
    summary: "Single images and swipe-through carousels for Instagram, LinkedIn and X.",
    formats: ["square", "portrait", "landscape"],
    startTemplates: ["feature-spotlight", "game-launch", "stat-breakdown", "explainer", "reward-card"],
    palette: ["Primary or muted navy ground with the calm grid.", "Cyan for the one highlighted word or stat; a sport accent replaces cyan on sport content.", "Gold only when the post is about rewards."],
    type: ["Orbitron headline at --social-title, at most 3 short lines.", "Onest body at --social-body, one or two sentences.", "Eyebrow in uppercase Orbitron with wide tracking."],
    assets: ["Product captures and line art at reference or better.", "Campaign photography must be marked approved.", "Logo from the Brand assets tab, never redrawn or stretched."],
    rules: ["Compose each ratio on its own: do not scale a square into a reel.", "Sample statistics keep their sample label until verified.", "Carousels: one idea per slide, the CTA on the last slide."],
    checklist: ["Text inside the 8% safe area", "Headline readable at phone size", "Logo undistorted", "One glowing element at most", "CTA present and legible"],
  },
  {
    id: "video", name: "Reels, Shorts & motion video",
    summary: "Feature promos, gameplay demos and tutorials rendered to MP4.",
    formats: ["reel", "portrait", "square", "landscape"],
    startTemplates: ["feature-promo", "gameplay-tutorial", "penalty-shootout-demo", "grand-prix-demo", "reward-reveal"],
    palette: ["Navy base throughout; brighten with cyan at the hook and the CTA only.", "Use the sport accent for a single-sport demo."],
    type: ["Scale type up a step for motion: fewer words, larger size.", "Keep captions in Onest; numbers and scores in Orbitron tabular figures."],
    assets: ["Gameplay captures from npm run capture:gameplay are reference product data.", "Music and voiceover only when the user supplied and approved them."],
    rules: ["Duration must come from the brief (8–60 s) and render at 30 fps.", "9:16 reserves 14% top, 14% right and 22% bottom for platform UI.", "The final CTA must be readable with the sound muted."],
    checklist: ["Duration from the brief", "Hook in the first second", "Nothing important in the reel UI zones", "Muted playback still makes sense", "Decoded the MP4 with FFmpeg"],
  },
  {
    id: "match", name: "Match posters & match stories",
    summary: "Previews, results and stat stories built from ESPN match data or example fixtures.",
    formats: ["square", "portrait", "reel", "landscape"],
    startTemplates: ["match-preview", "match-result", "match-story", "news-flash"],
    palette: ["Team colours stay inside team elements (crests, bars, legends). StatOz chrome stays navy and cyan.", "Team text and marks use the full-strength team colour that clears WCAG AA (4.5:1) on dark surfaces; translucent team washes always pair with a full-strength label or border.", "LIVE, danger, success and reward colours override team colour, and team colour never glows.", "Live state is the one glowing element."],
    type: ["Scores in Orbitron with tabular figures, the largest element on the canvas.", "Team names uppercase Orbitron; context in Onest."],
    assets: ["Team crests import as reference: they are club trademarks, never brand assets.", "Player portraits must be registered assets.", "News photos import as reference: they belong to their agencies, and the credit prints on the artwork."],
    rules: ["Posters carry reported figures only: never invent or project a number.", "Never imply a club, league or athlete endorses StatOz.", "Example fixtures keep their sample label.", "News flashes carry reported headlines only, credited to their source; rewrite for length, never for meaning."],
    checklist: ["Every figure traceable to the feed", "Crests shown as reference, not decoration", "Sample label on example data", "Score readable at thumbnail size"],
  },
  {
    id: "cards", name: "Player & collectible cards",
    summary: "Player comparisons, card drops and reveal moments.",
    formats: ["square", "portrait", "reel", "landscape"],
    startTemplates: ["player-spotlight", "reward-card", "reward-reveal"],
    palette: ["Rarity tokens for card frames: bronze, silver, gold, platinum.", "The reveal is the moment glow is allowed."],
    type: ["Card names in Orbitron; ratings in tabular figures.", "Keep card text short: the art carries the card."],
    assets: ["Use the player library; invented sample players must never be presented as real.", "Imported real athletes keep reference approval and never imply endorsement."],
    rules: ["Use the card clip-path and cut ratios, not rounded corners.", "Only one card glows during a reveal."],
    checklist: ["Rarity colours from tokens", "Card silhouette uses --ds-clip-card", "Player provenance respected"],
  },
  {
    id: "app-store", name: "App-store creatives",
    summary: "Store screenshots, the Google Play feature graphic and icon masters.",
    formats: ["instagramPortrait", "playPhonePortrait", "appStoreIphone69", "playTabletLandscape", "appStoreIpad13", "playFeatureGraphic", "playIcon", "appStoreIcon"],
    startTemplates: ["app-showcase", "play-feature-graphic", "store-icon"],
    palette: ["Showcase backdrops take a --ds-color-accent-* per screen; keep one accent per screen.", "Icons: the mark on navy, no text."],
    type: ["One benefit headline per screen in Orbitron; a short Onest sub-line."],
    assets: ["Curated screens from npm run import:app-screens.", "Names, scores and balances in captures are illustrative product data."],
    rules: ["Copy describes the screen only; no promises beyond what the product does.", "Respect each store's exact pixel size; never letterbox."],
    checklist: ["Exact store dimensions", "Headline describes what the screen shows", "Icon has no text and no transparency surprises"],
  },
  {
    id: "pitch", name: "Investor pitch slides",
    summary: "The 16:9 investor deck and its variants.",
    formats: ["landscape"],
    startTemplates: ["investor-pitch"],
    palette: ["Navy slides, cyan for the key number, violet or gold only for a second data series."],
    type: ["One claim per slide as an Orbitron headline; evidence in Onest.", "Charts use tabular figures and the data surface."],
    assets: ["Product captures as reference; team photos only when supplied."],
    rules: ["Every number needs a source; prototype behaviour is not a promise.", "Run the investor-deck-advisor skill for a first-screening critique."],
    checklist: ["One idea per slide", "Numbers sourced", "Readable from the back of the room"],
  },
  {
    id: "studio-ui", name: "Studio and product UI",
    summary: "Screens and components inside this studio and other StatOz web surfaces.",
    formats: [], startTemplates: [],
    palette: ["Use the --ds-* semantic tokens (and --studio-* chrome vars in this app); never raw hex.", "Cyan marks the selected or primary state only."],
    type: ["The compact --ds-text-* ramp; Onest for controls, Orbitron for headings and figures."],
    assets: ["Icons from the Icon component; artwork from registered assets only."],
    rules: ["Reuse Button, HudPanel, InputField, FilterChips, Icon and Tag before building anything new.", "44px minimum touch targets, visible focus, keyboard selection on chip groups.", "Chip rows scroll horizontally on narrow screens; they never wrap or shrink labels."],
    checklist: ["No raw hex added", "Works at 412px wide without horizontal scroll", "Keyboard and focus states checked", "lint, typecheck, test and build pass"],
  },
  {
    id: "off-studio", name: "Pages, docs & external tools",
    summary: "Landing pages, HTML one-offs, documents, Figma files and slides made outside the studio.",
    formats: [], startTemplates: [],
    palette: ["Use statoz-tokens.css or statoz-tokens.json from Assets › Design kit; map them to the tool's variables.", "Dark by default; if a light surface is unavoidable, keep cyan as the only accent."],
    type: ["Install Orbitron and Onest from the design kit; do not substitute other fonts."],
    assets: ["The logo from the design kit; keep its proportions and clear space."],
    rules: ["Follow the same principles, claims and approval rules as studio work.", "Do not publish or post anything without the user's request."],
    checklist: ["Fonts loaded, not falling back", "Colours from the kit", "Logo undistorted"],
  },
];

export const doDont: DoDont[] = [
  { topic: "Glow", do: "Glow the single selected, live or revealed element.", dont: "Glow every panel, divider or chip." },
  { topic: "Surfaces", do: "Use outlined chamfer plates with a continuous border.", dont: "Use rounded white cards or pill-heavy layouts." },
  { topic: "Colour", do: "Reach for a semantic token and give each accent a meaning.", dont: "Add raw hex values or decorative rainbow accents." },
  { topic: "Type", do: "Orbitron for headlines and numbers, Onest for copy.", dont: "Set long paragraphs in Orbitron or use other typefaces." },
  { topic: "Texture", do: "Let the calm grid and scanlines create atmosphere.", dont: "Add film grain, noise or heavy gradients over content." },
  { topic: "Ratios", do: "Recompose each of the four ratios on its own.", dont: "Scale or crop one ratio into another." },
  { topic: "Claims", do: "Label sample statistics and keep reported figures exact.", dont: "Invent numbers or imply athlete, club or sponsor endorsement." },
  { topic: "Actions", do: "Give each surface one focal action and make the rest tonal, surface or ghost.", dont: "Put two glowing or two solid primary buttons side by side." },
  { topic: "Icon actions", do: "Label every icon-only action and keep a 44px target.", dont: "Ship an unlabeled icon or a target smaller than a fingertip." },
  { topic: "Team colour", do: "Keep team colours inside crests, bars and legends at AA contrast.", dont: "Let a team colour glow or replace LIVE, danger or reward colours." },
  { topic: "Assets", do: "Use registered assets with explicit brand, reference or approved status.", dont: "Drop in scraped images, crests as decoration or unapproved music." },
];
