import type { Scene } from "@/domain/project";
import { SolutionStack } from "./solution-stack";
import { MarketBubbles, MarketHighlight } from "./market-scale";
import { FundsSplit, FundsTerms } from "./use-of-funds";
import { InviteArc, InviteLines } from "./invite";
import { ShowcaseBackdrop, ShowcaseTags } from "./showcase";
import { TeamBackdrop, TeamCards } from "./team";
import { RoadmapTrack } from "./roadmap";

function MiniHeader({ section }: { section: string }) {
  return <><div className="product-status"><b>09:41</b><span>STATOZ</span><i>● ● ●</i></div><div className="product-nav"><strong>{section}</strong><span>SHOP</span><span>TOP</span><span>PROFILE</span></div></>;
}

function SportsHub() {
  return <div className="product-phone"><MiniHeader section="SPORTS"/><div className="sport-tabs"><b>ALL</b><span>⚽</span><span>🏏</span><span>🏀</span><span>🎾</span><span>🏁</span></div><div className="product-kicker">LIVE & UPCOMING</div><div className="match-tile"><div><small>PREMIER LEAGUE · 18:30</small><b>NORTH FC</b><b>SOUTH FC</b></div><div className="match-score"><strong>VS</strong><span>PRE-MATCH</span></div></div><div className="hub-actions"><div><small>PREDICT</small><strong>Match quiz</strong><span>Earn XP</span></div><div><small>PICK</small><strong>Outcome market</strong><span>Use Oz Coins</span></div></div><div className="product-kicker">TRENDING GAMES</div><div className="game-hero"><span>FEATURED // TACTICAL</span><strong>PITCH DUEL</strong><small>BUILD YOUR DECK. MAKE YOUR MOVE.</small></div><div className="product-dock"><b>SPORTS</b><span>SHOP</span><span>TOP</span><span>PROFILE</span></div></div>;
}

const trendingGames = [
  ["PITCH DUEL", "TACTICAL CARD GAME", "FEATURED // TACTICAL", "ENTER THE DUEL", "hero"],
  ["PENALTY SHOOTOUT", "SUDDEN-DEATH SPOT KICKS", "SUDDEN DEATH", "TAKE THE SHOT", "penalty"],
  ["5V5 FOOTBALL CHESS", "TACTICAL SQUAD DUEL", "FEATURED // 5V5", "MAKE YOUR MOVE", "chess"],
  ["FOOTBALL QUIZ", "TRIVIA GAUNTLET", "FREE", "", "quiz"],
  ["FOOTBALL BINGO", "BUILD A WINNING GRID", "FREE", "", "bingo"],
  ["GUESS THE PLAYER", "DAILY FOOTBALL MYSTERY", "FREE", "", "guess"],
] as const;

function TrendingGames({ src }: { src?: string }) {
  return <div className="iphone17-frame" aria-label="iPhone 17 mockup showing the StatOz Trending Games feed">
    <i className="iphone17-island" aria-hidden="true"/>
    <i className="iphone17-button iphone17-button-volume" aria-hidden="true"/>
    <i className="iphone17-button iphone17-button-action" aria-hidden="true"/>
    <i className="iphone17-button iphone17-button-power" aria-hidden="true"/>
    <div className="trending-games-screen">
      {src && <img className="pitch-games-capture" src={src} alt="StatOz Games and Trending screen"/>}
      <div className={src ? "trending-screen-fallback is-hidden" : "trending-screen-fallback"} aria-hidden={Boolean(src)}>
      <div className="trending-mobile-status"><span>09:41</span><b><i className="status-bars"/> <i className="status-wifi"/> <i className="status-battery"/></b></div>
      <div className="trending-mobile-header"><strong>StatOz</strong><span className="trending-streak"><i>7</i></span><span className="trending-wallet"><i>OZ</i>1,250 <b>+</b></span></div>
      <div className="trending-tab-bar" role="tablist" aria-label="Prediction hub"><span role="tab" aria-selected="false">MATCH</span><b role="tab" aria-selected="true">GAMES</b></div>
      <div className="trending-sport-tabs"><b>TRENDING</b><span>FOOTBALL</span><span>CRICKET</span><span>BASKET</span><span>MORE</span></div>
      <div className="trending-quest"><span>DAILY QUEST</span><strong>PLAY 2 GAMES</strong><b>2 / 3</b></div>
      <div className="trending-feed-window"><div className="trending-bento">{trendingGames.map(([title, subtitle, badge, cta, tone]) => <article className={`trending-game ${tone}`} key={title}>
        <span className="trending-game-rule"/><span className="trending-game-art" aria-hidden="true"/><div className="trending-game-top"><b>{badge}</b><i aria-hidden="true"/></div><div className="trending-game-copy"><strong>{title}</strong><small>{subtitle}</small></div>{cta && <em>{cta}</em>}
      </article>)}</div></div>
      <div className="trending-mobile-dock"><b><i className="dock-sport"/>SPORTS</b><span><i className="dock-shop"/>SHOP</span><span><i className="dock-top"/>TOP</span><span><i className="dock-profile"/>PROFILE</span></div>
      </div>
    </div>
  </div>;
}

function AppScreen({ src }: { src?: string }) {
  return <div className="iphone17-frame app-screen-frame" aria-label="iPhone 17 mockup showing an actual StatOz product screen">
    <i className="iphone17-island" aria-hidden="true"/>
    <i className="iphone17-button iphone17-button-volume" aria-hidden="true"/>
    <i className="iphone17-button iphone17-button-action" aria-hidden="true"/>
    <i className="iphone17-button iphone17-button-power" aria-hidden="true"/>
    <div className="app-screen-viewport">
      {src ? <img className="app-screen-capture" src={src} alt="Actual StatOz app screen"/> : <div className="app-screen-missing">REGISTERED APP CAPTURE REQUIRED</div>}
    </div>
  </div>;
}

function PredictPick() {
  return <div className="product-duo"><div className="product-phone compact"><MiniHeader section="PREDICT"/><div className="prediction-fixture"><small>ARS · SUN</small><strong>WHO WINS?</strong><span>Locks at kickoff</span></div><div className="prediction-options"><b>ARSENAL</b><span>DRAW</span><span>SUNDERLAND</span></div><div className="booster"><strong>2× BOOSTER</strong><span>Apply to your strongest call</span></div><button>LOCK ANSWER</button></div><div className="product-phone compact pick"><MiniHeader section="PICKS"/><div className="market-meta"><span>PREMIER LEAGUE</span><b>OPEN</b></div><h3>Will both teams score?</h3><div className="market-price"><div><small>YES</small><strong>0.62</strong></div><div><small>NO</small><strong>0.38</strong></div></div><div className="market-stake"><small>YOUR POSITION</small><strong>250 OZ</strong><span>Available balance 1,250</span></div><button>CONFIRM PICK</button></div></div>;
}

function PitchDuel() {
  return <div className="duel-screen"><div className="duel-top"><span>ROUND 03 / 04</span><strong>PITCH DUEL</strong><span>YOU 2 : 1 CPU</span></div><div className="duel-scenario"><small>SCENARIO</small><strong>COUNTER ATTACK</strong><span>Quick transition. Spaces open up.</span></div><div className="duel-field"><div className="duel-card"><small>PLAYER</small><b>92</b><strong>THE PLAYMAKER</strong><span>PACE 94 · SKILL 91</span></div><div className="duel-center"><span>YOUR POWER</span><strong>128</strong><i>VS</i><strong>117</strong><span>CPU POWER</span></div><div className="duel-card rival"><small>RIVAL</small><b>88</b><strong>THE ANCHOR</strong><span>PACE 82 · FORM 90</span></div></div><div className="duel-actions"><span>QUICK PASS +12</span><b>LOCK YOUR MOVE</b><span>PRESS +9</span></div></div>;
}

function DeckLocker() {
  const cards = ["92", "89", "87", "90", "84"];
  return <div className="product-phone deck-phone"><MiniHeader section="DECKS"/><div className="deck-heading"><div><small>ACTIVE LOADOUT</small><strong>STARTING XI</strong></div><span>FOOTBALL</span></div><div className="deck-slots">{cards.map((rating, index) => <div className="mini-card" key={index}><b>{rating}</b><span>{index === 4 ? "GK" : index < 2 ? "ATK" : "DEF"}</span><i/><small>{["VANCE", "BRANDT", "OSEI", "FIORE", "HALE"][index]}</small></div>)}</div><div className="action-cards"><div><b>+12</b><span>QUICK PASS</span></div><div><b>+9</b><span>PRESS</span></div><div><b>+15</b><span>FINISH</span></div></div><button>SAVE ACTIVE DECK</button><div className="deck-foot">2 ATTACKERS · 2 DEFENDERS · 1 KEEPER · 6 ACTIONS</div></div>;
}

function Leaderboard() {
  const rows = [["04", "MAYA#204", "8,920"], ["05", "YOU", "8,740"], ["06", "ARJUN#771", "8,615"], ["07", "LEO#118", "8,440"]];
  return <div className="product-phone leaderboard-phone"><MiniHeader section="TOP"/><div className="league-title"><small>GLOBAL LEAGUE</small><strong>DIAMOND DIVISION</strong><span>Season ends in 2d 14h</span></div><div className="podium"><div><b>02</b><strong>9,870</strong></div><div><b>01</b><strong>10,240</strong></div><div><b>03</b><strong>9,310</strong></div></div><div className="rank-list">{rows.map(([rank, name, xp]) => <div className={name === "YOU" ? "you" : ""} key={rank}><b>{rank}</b><span>{name}</span><strong>{xp} XP</strong></div>)}</div><div className="streak-strip"><b>7 DAY STREAK</b><span>Next reward: 150 XP</span></div></div>;
}

function GameLibrary() {
  const games = [
    ["FOOTBALL", "PITCH DUEL", "TACTICAL"], ["CRICKET", "POWER PLAY", "ARCADE"], ["BASKETBALL", "CLUTCH SHOT", "SKILL"],
    ["FORMULA 1", "GRID DASH", "ARCADE"], ["TENNIS", "RALLY RUN", "DAILY"], ["DAILY", "MATCH IQ", "PUZZLE"],
  ];
  return <div className="product-phone game-library-phone"><MiniHeader section="PLAY"/><div className="library-heading"><small>CHOOSE A MODE</small><strong>GAME LIBRARY</strong><span>Illustrative product data</span></div><div className="library-tabs"><b>ALL</b><span>SPORT</span><span>DAILY</span></div><div className="library-grid">{games.map(([sport, name, type]) => <div className="library-game" key={name}><small>{sport} / {type}</small><strong>{name}</strong><span>PLAY NOW</span></div>)}</div><div className="library-status"><b>5 SPORTS</b><span>One shared progression system</span></div></div>;
}

function Storefront() {
  return <div className="product-phone storefront-phone"><MiniHeader section="SHOP"/><div className="store-balance"><small>YOUR BALANCE</small><strong>1,250 <span>OZ</span></strong><b>PROTOTYPE ECONOMY</b></div><div className="store-heading"><small>FEATURED</small><strong>REWARD PATHS</strong></div><div className="store-offers"><div className="store-offer highlight"><small>COIN PACK</small><strong>STARTER BOOST</strong><b>+ 500 OZ</b><span>Illustrative price</span></div><div className="store-offer"><small>SEASON PASS</small><strong>MATCHDAY TRACK</strong><b>REWARDS + COSMETICS</b><span>Planned</span></div><div className="store-offer"><small>REWARDED VIDEO</small><strong>EXTRA LIFELINE</strong><b>ONE MORE TRY</b><span>Planned</span></div></div><button>VIEW ALL REWARDS</button></div>;
}

function ProductVisual({ visual, src }: { visual: NonNullable<Scene["presentation"]>["visual"]; src?: string }) {
  if (visual === "app-screen") return <AppScreen src={src}/>;
  if (visual === "sports-hub") return <SportsHub/>;
  if (visual === "trending-games") return <TrendingGames src={src}/>;
  if (visual === "predict-pick") return <PredictPick/>;
  if (visual === "pitch-duel") return <PitchDuel/>;
  if (visual === "deck-locker") return <DeckLocker/>;
  if (visual === "leaderboard") return <Leaderboard/>;
  if (visual === "game-library") return <GameLibrary/>;
  if (visual === "storefront") return <Storefront/>;
  return null;
}

const evidenceLabels = {
  "repo-backed": "PRODUCT EVIDENCE", "source-backed": "SOURCE-BACKED", illustrative: "ILLUSTRATIVE",
  proposed: "PROPOSED", hypothesis: "HYPOTHESIS", "input-needed": "INPUT NEEDED",
} as const;

const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const seasonRows = [
  { sport: "CRICKET", note: "ICC / ECB cricket", months: ["active", "peak", "peak", "peak", "peak", "peak", "peak", "active", "active", "active", "active", "active"] },
  { sport: "FOOTBALL", note: "Football coverage reflects founder input", months: ["active", "active", "active", "active", "active", "peak", "peak", "quiet", "active", "active", "active", "active"] },
  { sport: "BASKETBALL", note: "NBA season", months: ["active", "active", "active", "peak", "peak", "peak", "quiet", "quiet", "quiet", "active", "active", "active"] },
  { sport: "FORMULA 1", note: "F1 2026", months: ["quiet", "quiet", "active", "active", "active", "peak", "peak", "active", "peak", "peak", "peak", "active"] },
  { sport: "TENNIS", note: "ATP 2026", months: ["peak", "active", "active", "active", "peak", "peak", "peak", "peak", "peak", "active", "peak", "active"] },
] as const;

function SeasonCalendar() {
  return <section className="pitch-season-calendar" aria-label="Year-round sports calendar"><div className="season-months">{months.map(month => <span key={month}>{month}</span>)}</div><div className="season-rows">{seasonRows.map(row => <div className="season-row" key={row.sport}><strong>{row.sport}</strong>{row.months.map((state, index) => <i className={`season-cell season-${state}`} key={`${row.sport}-${months[index]}`}/>)}</div>)}</div><div className="season-summary"><div className="season-legend"><span><i className="season-cell season-active"/>Active season</span><span><i className="season-cell season-peak"/>Major-event peak</span></div><p>Daily games carry the quieter windows.</p></div><div className="season-notes">{seasonRows.map(row => <span key={row.sport}>{row.note}</span>)}</div></section>;
}

const tractionMonths = ["APR", "MAY", "JUN", "JUL", "AUG", "SEP"];

function TractionProof({ values, metrics }: { values: number[]; metrics: NonNullable<Scene["presentation"]>["metrics"] }) {
  const points = values.slice(0, tractionMonths.length).map((value, index, all) => {
    const x = 24 + (index * 952) / Math.max(1, all.length - 1);
    const y = 134 - (Math.max(0, Math.min(100, value)) / 100) * 98;
    return { x, y };
  });
  const linePoints = points.map(point => `${point.x},${point.y}`).join(" ");
  const areaPoints = points.length > 0 ? `24,142 ${linePoints} 976,142` : "";
  return <section className="pitch-traction" aria-label="Founder-supplied product traction from April to September 2026">
    <div className="traction-metrics">{metrics.slice(0, 3).map((metric, metricIndex) => <div className={metricIndex === 0 ? "traction-metric is-primary" : "traction-metric"} key={metric.label}>
      {/* The shell is the outline and the panel sits inside it, so the border follows every cut corner. */}
      <div className="traction-metric-panel">
        <strong>{metric.value}</strong><span>{metric.label}</span><em>{metric.detail}</em>
      </div>
      <small>{String(metricIndex + 1).padStart(2, "0")}</small>
    </div>)}</div>
    <div className="traction-chart"><div className="traction-chart-panel">
      <div className="traction-chart-label"><span>CUMULATIVE DOWNLOADS</span><b>APR-SEP 2026</b></div>
      <svg viewBox="0 0 1000 154" role="img" aria-label="Downloads increased from zero in April to sixteen thousand in September">
        <defs><linearGradient id="tractionArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#15e6ff" stopOpacity=".24"/><stop offset="1" stopColor="#15e6ff" stopOpacity="0"/></linearGradient></defs>
        {points.map((point, index) => <line className="traction-grid-line" x1={point.x} x2={point.x} y1="16" y2="142" key={tractionMonths[index]}/>) }
        <polyline className="traction-area" points={areaPoints}/>
        <polyline className="traction-line" points={linePoints}/>
        {points.map((point, index) => <circle className={index === points.length - 1 ? "traction-point is-final" : "traction-point"} cx={point.x} cy={point.y} r={index === points.length - 1 ? 7 : 4} key={`point-${index}`}/>) }
        <text className="traction-start-value" x="24" y="128">0</text>
        <text className="traction-end-value" x="976" y="22" textAnchor="end">16K</text>
      </svg>
      <div className="traction-months">{tractionMonths.map(month => <span key={month}>{month}</span>)}</div>
    </div></div>
  </section>;
}

function OpenToReturnLoop({ bullets }: { bullets: string[] }) {
  return <div className="pitch-open-return-loop" aria-label="Open to return product loop">
    <div className="open-return-signal" aria-hidden="true"><span>LIVE LOOP</span><i/></div>
    <div className="open-return-steps">{bullets.map((item, itemIndex) => {
      const [label, detail] = item.split(" / ");
      return <div className={itemIndex === 0 ? "is-entry" : itemIndex === bullets.length - 1 ? "is-return" : ""} key={label}>
        <b>{String(itemIndex + 1).padStart(2, "0")}</b><span><strong>{label}</strong>{detail && <small>{detail}</small>}</span><i aria-hidden="true">{itemIndex === bullets.length - 1 ? "↺" : "→"}</i>
      </div>;
    })}</div>
  </div>;
}

function pitchItem(item = "") {
  const [label = "", ...detail] = item.split(" / ");
  return { label, detail: detail.join(" / ") };
}

function ConvergenceDiagram({ bullets, logo }: { bullets: string[]; logo: string }) {
  const sources = Array.from({ length: 3 }, (_, itemIndex) => pitchItem(bullets[itemIndex]));
  const destination = pitchItem(bullets[3]);
  const progression = pitchItem(bullets[4]);
  const progressionItems = progression.detail.split(/,\s*|\s+and\s+/i).filter(Boolean);

  return <section className="pitch-convergence" aria-label="Single-purpose sports apps converge into the StatOz free-to-play progression system">
    <div className="convergence-sources">
      {sources.map((source, itemIndex) => <div className="convergence-source" key={source.label}>
        <div><b>{String(itemIndex + 1).padStart(2, "0")}</b><span><strong>{source.label}</strong><small>{source.detail}</small></span></div>
      </div>)}
    </div>
    <div className="convergence-flow" aria-hidden="true"><i/><i/><i/><b/></div>
    <div className="convergence-destination">
      <div className="convergence-core"><div>
        <span>UNIFIED F2P SYSTEM</span>
        <strong>{destination.label}</strong>
        <small>{destination.detail}</small>
        <img className="convergence-mark" src={logo} alt="" aria-hidden="true"/>
      </div></div>
      <div className="convergence-progression">
        <span><small>SHARED LAYER</small><strong>{progression.label}</strong></span>
        <div>{progressionItems.map(item => <b key={item}>{item}</b>)}</div>
      </div>
    </div>
  </section>;
}

/** Nested chamfered slabs tilted up to the right; drawn behind the cover copy on a 1920 × 1080 board. */
function CoverFrame() {
  const plate = (x: number, y: number, w: number, h: number, cut: number) => `M${x + cut} ${y}H${x + w}V${y + h - cut}L${x + w - cut} ${y + h}H${x}V${y + cut}Z`;
  return <svg className="cover-frame-art" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="coverSlab" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0d1f30"/><stop offset="1" stopColor="#07121e"/></linearGradient>
      <pattern id="coverScan" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 .5H8"/></pattern>
    </defs>
    <g transform="translate(0 300) skewY(-12)">
      <path className="cover-frame-slab" d={plate(860, 0, 1200, 840, 56)}/>
      <path className="cover-frame-outline" d={plate(1190, -100, 850, 880, 44)}/>
      <path className="cover-frame-inner" d={plate(1260, 170, 760, 290, 32)}/>
      <path className="cover-frame-scan" d={plate(1500, 200, 520, 230, 26)}/>
      <path className="cover-frame-focus" d={plate(1500, 200, 520, 230, 26)}/>
      <path className="cover-frame-tick" d="M1190 810V850H1230"/>
    </g>
  </svg>;
}

export function PitchDeckSlide({ scene, index, total, logo, visualSrc }: { scene: Scene; index: number; total: number; logo: string; visualSrc?: string }) {
  const slide = scene.presentation!;
  const isInvite = slide.layout === "invite";
  const isShowcase = slide.layout === "showcase";
  const isTeam = slide.layout === "team";
  const isTimeline = slide.layout === "timeline";
  const isCover = slide.layout === "cover" || slide.layout === "cover-frame" || isInvite;
  const isSeasonality = slide.layout === "seasonality";
  const isConvergence = slide.layout === "convergence";
  const isOpenReturnLoop = slide.layout === "loop";
  const isTraction = slide.layout === "traction";
  const isSolutionStack = slide.layout === "solution-stack";
  const isMarket = slide.layout === "market";
  const isFunds = slide.layout === "funds";
  const isProblemMap = slide.layout === "problem-map";
  return <div className={`pitch-slide pitch-layout-${slide.layout}`}>
    {slide.visual === "none" && visualSrc && <div className="pitch-slide-background" aria-hidden="true"><img src={visualSrc} alt=""/><i/></div>}
    <div className="pitch-slide-grid"/>
    {slide.layout === "cover-frame" && <CoverFrame/>}
    {isInvite && <InviteArc/>}
    {slide.layout === "cover-frame" && <div className="cover-frame-lockup" aria-label="StatOz"><img src={logo} alt=""/><span>StatOz</span></div>}
    <header className="pitch-slide-header"><div className="pitch-brand"><img src={logo} alt=""/><span>StatOz</span></div><div><span>{scene.eyebrow}</span><b>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</b></div></header>
    <main className="pitch-slide-main">
      {isShowcase && <ShowcaseBackdrop/>}
      {isTeam && <TeamBackdrop/>}
      {isMarket && <MarketBubbles metrics={slide.metrics} bullets={slide.bullets}/>}
      <section className="pitch-slide-copy">
        {!isCover && !isSeasonality && <div className={`pitch-evidence evidence-${slide.evidenceStatus}`}><i/>{evidenceLabels[slide.evidenceStatus]}</div>}
        {isInvite && <div className="invite-lockup"><img src={logo} alt=""/><span>StatOz</span></div>}
        <h1 data-overflow>{scene.headline}</h1>
        <p data-overflow>{scene.body}</p>
        {isSeasonality && <SeasonCalendar/>}
        {isConvergence && (
          <ConvergenceDiagram bullets={slide.bullets} logo={logo}/>
        )}
        {isTraction && <TractionProof values={scene.chartValues} metrics={slide.metrics}/>} 
        {!isSeasonality && isOpenReturnLoop && <OpenToReturnLoop bullets={slide.bullets}/>} 
        {!isSeasonality && !isConvergence && !isOpenReturnLoop && !isTraction && !isSolutionStack && !isMarket && !isFunds && !isInvite && !isShowcase && !isTeam && !isProblemMap && !isTimeline && slide.bullets.length > 0 && <div className={`pitch-bullets ${slide.layout === "loop" ? "pitch-loop" : ""}`}>{slide.bullets.map((item, itemIndex) => {
          const [label, detail] = item.split(" / ");
          return <div key={itemIndex}><b>{String(itemIndex + 1).padStart(2, "0")}</b><span><strong>{label}</strong>{detail && <small>{detail}</small>}</span></div>;
        })}</div>}
        {isMarket && <MarketHighlight metric={slide.metrics[3]}/>}
        {isFunds && <FundsTerms metrics={slide.metrics.slice(2)}/>}
        {isInvite && <InviteLines bullets={slide.bullets}/>}
        {!isSeasonality && !isTraction && !isMarket && !isFunds && !isInvite && !isShowcase && !isTeam && slide.metrics.length > 0 && <div className="pitch-metrics">{slide.metrics.map((metric, metricIndex) => <div key={metricIndex}><strong>{metric.value}</strong><span>{metric.label}</span><small>{metric.detail}</small></div>)}</div>}
      </section>
      {isProblemMap && <section className="pitch-problem-map" aria-label="Sports fan pain points">{slide.bullets.filter(item => item.trim()).map((item, itemIndex) => {
        const { label, detail } = pitchItem(item);
        return <article className="problem-plate" key={itemIndex}><div className="problem-plate-inner"><b className="problem-marker">{String(itemIndex + 1).padStart(2, "0")}</b><div><h2 data-overflow>{label}</h2>{detail && <p data-overflow>{detail}</p>}</div></div></article>;
      })}</section>}
      {isSolutionStack && <SolutionStack bullets={slide.bullets}/>}
      {isFunds && <FundsSplit metrics={slide.metrics}/>}
      {isShowcase && <ShowcaseTags bullets={slide.bullets}/>}
      {isTeam && <TeamCards bullets={slide.bullets}/>}
      {isTimeline && <RoadmapTrack bullets={slide.bullets}/>}
      {slide.visual !== "none" && <section className="pitch-product-visual" aria-label={`${slide.visual} product view`}><ProductVisual visual={slide.visual} src={visualSrc}/></section>}
    </main>
    <footer className="pitch-slide-footer"><span>{slide.sourceNote}</span><b>{isCover ? "CONFIDENTIAL / WORKING DRAFT" : evidenceLabels[slide.evidenceStatus]}</b></footer>
  </div>;
}
