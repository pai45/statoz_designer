import type { CSSProperties, ReactNode } from "react";
import type { Scene, Sport } from "@/domain/project";
import { beatOf, classificationOf, contrast, countUp, graphOf, shareOf, teamColors, winnerSide, type Beat, type GraphKind } from "@/domain/match-story";
import type { Media } from "./composition";
import { clamp, step } from "./motion";

/**
 * Match & stat story: a match told in four beats (score, stats, graph, pick your side),
 * drawn in the StatOz app's match-centre language. Every value derives from `localTime`.
 */
type Props = { scene: Scene; index: number; total: number; localTime: number; sport: Sport; media: Record<string, Media>; sample: boolean };
type BeatProps = { scene: Scene; t: number; sport: Sport; media: Record<string, Media>; sample: boolean; colors: [string, string] };

/** The length each beat's choreography is written for; shorter scenes play it proportionally faster. */
const nominal: Record<Beat, number> = { score: 2.4, stats: 2.6, graph: 3.2, pick: 2.6 };
const status: Record<Sport, string> = { football: "FULL TIME", cricket: "RESULT", basketball: "FINAL", tennis: "FINAL", motorsport: "CHEQUERED FLAG" };
const vars = (values: Record<string, string | number>) => values as CSSProperties;

export function MatchStoryScene({ scene, index, total, localTime, sport, media, sample }: Props) {
  const beat = beatOf(scene, index, total);
  const t = localTime / Math.min(1, scene.duration / nominal[beat]);
  const colors = teamColors(scene, sport);
  const props: BeatProps = { scene, t, sport, media, sample, colors };
  return <>
    <section className="composition-copy ms-copy" data-safe>
      <div className="eyebrow" style={{ opacity: step(t, 0, .3) }}><span/>{scene.eyebrow}</div>
      <Headline text={scene.headline} t={t}/>
    </section>
    <section className={`composition-art ms-art ms-beat-${beat} ms-sport-${sport}`} data-safe style={vars({ "--ms-a": colors[0], "--ms-b": colors[1] })}>
      {beat === "score" ? <ScoreBeat {...props}/> : beat === "stats" ? sport === "motorsport" ? <ClassificationBeat {...props}/> : <StatsBeat {...props}/> : beat === "graph" ? <GraphBeat {...props}/> : <PickBeat {...props}/>}
    </section>
  </>;
}

/** Word-by-word reveal, as the app's prediction questions arrive. */
function Headline({ text, t }: { text: string; t: number }) {
  let word = 0;
  return <h1 data-overflow>{text.split("\n").map((line, li) => <span className="ms-line" key={li}>{line.split(/(\s+)/).map((part, pi) => !part.trim() ? part : <span key={pi} className="ms-word" style={vars({ "--r": step(t, .05 + word++ * .09, .42) })}>{part}</span>)}</span>)}</h1>;
}

/**
 * A chamfer plate: a 1px shell and an inner fill that share one clip-path, so the outline
 * follows every cut. The wrapper carries the glow, since a clip-path would cut a shadow off.
 */
function Plate({ className = "", glow = 0, style, children }: { className?: string; glow?: number; style?: CSSProperties; children: ReactNode }) {
  return <div className={`ms-plate-wrap ${className}`} style={{ ...style, ...vars({ "--glow": glow, "--lit": Math.min(1, glow * 1.8) }) }}>
    <div className="ms-plate"><div className="ms-plate-fill">{children}</div></div>
  </div>;
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "--";
const octagon = (x: number, y: number, w: number, h: number, c: number) => `${x + c},${y} ${x + w - c},${y} ${x + w},${y + c} ${x + w},${y + h - c} ${x + w - c},${y + h} ${x + c},${y + h} ${x},${y + h - c} ${x},${y + c}`;

/** The app's team badge: an octagon in the team colour with a hard drop shadow, or the imported crest. */
function TeamBadge({ name, crest, color, id }: { name: string; crest?: Media; color: string; id: string }) {
  if (crest) return <div className="ms-badge has-crest"><img src={crest.src} alt={`${name} crest`}/></div>;
  const ink = contrast(color, "#050a12") > contrast(color, "#ffffff") ? "#050a12" : "#ffffff";
  return <svg className="ms-badge" viewBox="0 0 100 110" role="img" aria-label={`${name} initials`}>
    <defs><clipPath id={id}><polygon points={octagon(0, 0, 100, 100, 29)}/></clipPath></defs>
    <polygon points={octagon(0, 10, 100, 100, 29)} style={{ fill: `color-mix(in srgb, ${color} 42%, #000)` }}/>
    <g clipPath={`url(#${id})`}><rect width="100" height="100" fill={color}/><rect y="89" width="100" height="11" style={{ fill: `color-mix(in srgb, ${color} 62%, #000)` }}/></g>
    <text x="50" y="52" textAnchor="middle" dominantBaseline="central" fill={ink}>{initials(name)}</text>
  </svg>;
}

function Team({ scene, side, media, color, style }: { scene: Scene; side: "A" | "B"; media: Record<string, Media>; color: string; style?: CSSProperties }) {
  const name = side === "A" ? scene.nameA : scene.nameB;
  return <div className={`ms-team ms-team-${side.toLowerCase()}`} style={style}>
    <TeamBadge name={name} crest={media[side === "A" ? scene.emblemA : scene.emblemB]} color={color} id={`ms-badge-${scene.id}-${side}`}/>
    <h3>{name}</h3>
  </div>;
}

/** Cricket scorelines run long ("453 & 130/2"), so the figure steps down rather than wrapping. */
const scoreSize = (score: string) => (score.length > 8 ? " is-dense" : score.length > 4 ? " is-compact" : "");

/**
 * Beat 1: the result as a scoreboard, one plate per side. The score lands rather than
 * counting up (intermediate scorelines would be invented results), then the winner's plate
 * lights. A race shows its podium instead.
 */
function ScoreBeat({ scene, t, sport, media, colors }: BeatProps) {
  const podium = sport === "motorsport" ? classificationOf(scene).slice(0, 3) : [];
  const winner = winnerSide(scene, sport);
  const reveal = step(t, 1, .45), glow = reveal * (.55 + .45 * Math.sin(Math.PI * clamp((t - 1) / .9)));
  const land = (i: number) => step(t, .42 + i * .1, .5);
  const enter = (i: number) => step(t, .1 + i * .1, .5);
  const rows = podium.length >= 2
    ? podium.map((row, i) => <Plate key={row.finished} className={`ms-scoreline ms-podium${i === 0 ? " is-winner" : ""}`} glow={i === 0 ? glow : 0}
      style={{ opacity: enter(i), transform: `translateX(${(enter(i) - 1) * 48}px)` }}>
      <span className="ms-pos" style={{ opacity: land(i) }}>P{row.finished}</span>
      <h3>{row.name}</h3>
      {row.qualified && <small className="ms-from" style={{ opacity: land(i) }}>QUALIFIED P{row.qualified}</small>}
    </Plate>)
    : (["A", "B"] as const).map((side, i) => {
      const score = side === "A" ? scene.scoreA : scene.scoreB, key = side.toLowerCase();
      const state = winner === side ? " is-winner" : winner ? " is-beaten" : "";
      return <Plate key={side} className={`ms-scoreline${state}`} glow={winner === side ? glow : 0}
        style={{ ...vars({ "--side": `var(--ms-${key})`, "--beaten": reveal }), opacity: enter(i), transform: `translateX(${(enter(i) - 1) * (i ? -48 : 48)}px)` }}>
        <i className="ms-strip"/>
        <TeamBadge name={side === "A" ? scene.nameA : scene.nameB} crest={media[side === "A" ? scene.emblemA : scene.emblemB]} color={colors[i]} id={`ms-badge-${scene.id}-${side}-score`}/>
        <h3>{side === "A" ? scene.nameA : scene.nameB}</h3>
        {winner === side && <span className="ms-win" style={{ opacity: reveal, transform: `scale(${.8 + .2 * reveal})` }}>WIN</span>}
        <b className={`ms-points${scoreSize(score)}`} style={{ opacity: land(i), transform: `translateY(${(1 - land(i)) * 18}px) scale(${1.1 - .1 * land(i)})` }}>{score}</b>
      </Plate>;
    });
  return <div className="ms-score">
    <div className="ms-status" style={{ opacity: step(t, 0, .3) }}><i/><span>{status[sport]}</span><i/></div>
    <div className="ms-board">{rows}</div>
    {scene.body && <p className="ms-detail" data-overflow style={{ opacity: step(t, 1.25, .4) }}>{scene.body}</p>}
  </div>;
}

function Legend({ scene, style }: { scene: Scene; style?: CSSProperties }) {
  return <div className="ms-legend" style={style}>
    <span className="ms-key-a"><i/>{scene.nameA}</span><span className="ms-key-b">{scene.nameB}<i/></span>
  </div>;
}

/** Beat 2: the app's stat comparison. Values either side, the label between, one split bar beneath. */
function StatsBeat({ scene, t, sport, sample }: BeatProps) {
  const paired = scene.statValue.split(/\s+[—–-]\s+/).map(value => value.trim()).filter(Boolean);
  const rows = scene.matchStats.length ? scene.matchStats : paired.length === 2 ? [{ label: scene.statLabel, a: paired[0], b: paired[1] }] : [];
  const heading = `${sample ? "EXAMPLE · " : ""}${sport === "cricket" || sport === "tennis" ? "TEAM COMPARISON" : "TEAM CONTROL"}`;
  return <div className="ms-stats">
    <div className="ms-heading" style={{ opacity: step(t, 0, .4) }}><span>{heading}</span><i/></div>
    <Legend scene={scene} style={{ opacity: step(t, .1, .4) }}/>
    {rows.length ? rows.map((row, i) => {
      const start = .3 + i * .18, enter = step(t, start, .48), fill = step(t, start + .1, .72);
      const share = shareOf(row.a, row.b), lead = clamp((t - start - .82) / .2);
      const leader = share > .5 ? "a" : share < .5 ? "b" : "";
      const tint = (side: "a" | "b") => leader === side ? `color-mix(in srgb, var(--ms-${side}) ${lead * 100}%, #fff)` : undefined;
      return <Plate key={i} className="ms-row" style={{ ...vars({ "--edge": leader ? `color-mix(in srgb, var(--ms-${leader}) ${lead * 45}%, var(--ds-color-border-default))` : "var(--ds-color-border-default)" }), opacity: enter, transform: `translateY(${(1 - enter) * 14}px)` }}>
        <div className="ms-row-line"><b style={{ color: tint("a") }}>{countUp(row.a, fill)}</b><span>{row.label}</span><b style={{ color: tint("b") }}>{countUp(row.b, fill)}</b></div>
        <div className="ms-split"><i style={{ flexGrow: share, transform: `scaleX(${fill})` }}/><i style={{ flexGrow: 1 - share, transform: `scaleX(${fill})` }}/></div>
      </Plate>;
    }) : <p className="ms-empty">Add match stats in the editor, or fill from a match.</p>}
  </div>;
}

/**
 * Beat 2 for a race: the top of the classification, finishing order down the page, with
 * where each driver qualified and the places made up or lost since.
 */
function ClassificationBeat({ scene, t, sample }: BeatProps) {
  const rows = classificationOf(scene);
  return <div className="ms-stats ms-classification">
    <div className="ms-heading" style={{ opacity: step(t, 0, .4) }}><span>{sample ? "EXAMPLE · " : ""}RACE CLASSIFICATION</span><i/><small>FROM QUALIFYING</small></div>
    {rows.length ? rows.map((row, i) => {
      const enter = step(t, .25 + i * .14, .45), moved = row.qualified ? row.qualified - row.finished : undefined;
      const trend = moved === undefined ? "" : moved > 0 ? " is-up" : moved < 0 ? " is-down" : " is-level";
      return <Plate key={`${row.finished}-${row.name}`} className={`ms-row ms-classified${i === 0 ? " is-winner" : ""}`} glow={i === 0 ? step(t, 1.3, .4) * .6 : 0}
        style={{ opacity: enter, transform: `translateX(${(1 - enter) * 36}px)` }}>
        <span className="ms-pos">P{row.finished}</span>
        <h4>{row.name}</h4>
        {row.qualified ? <small>Q{row.qualified}</small> : <small/>}
        <b className={`ms-moved${trend}`} style={{ opacity: step(t, .55 + i * .14, .35) }}>{moved === undefined ? "" : moved > 0 ? `▲${moved}` : moved < 0 ? `▼${-moved}` : "="}</b>
      </Plate>;
    }) : <p className="ms-empty">Add the classification in the editor: driver | qualified | finished.</p>}
  </div>;
}

const titles: Record<GraphKind, string> = { momentum: "MATCH MOMENTUM", race: "THE RACE", lead: "SCORING RUN", position: "POSITION TRACK" };
const title = (kind: GraphKind, sport: Sport) => (kind === "race" && sport === "cricket" ? "RUN WORM" : titles[kind]);
const unit = (kind: GraphKind, sport: Sport) => kind === "momentum" ? "SHOTS + CORNERS / 5 MIN" : kind === "position" ? "RUNNING ORDER"
  : kind === "lead" ? (sport === "basketball" ? "RUNNING SCORE" : "CUMULATIVE") : sport === "cricket" ? "RUNS, OVER BY OVER" : "CUMULATIVE";
const axis = (kind: GraphKind, sport: Sport, n: number): [string, string] =>
  kind === "momentum" ? ["KICK-OFF", "FULL TIME"] : kind === "lead" ? ["TIP-OFF", "FINAL"] : kind === "position" ? ["START", "FINISH"]
    : sport === "cricket" ? ["OVER 1", `OVER ${n}`] : ["START", "END"];
/** A top value that splits into four round steps (0, 30, 60, 90, 120). */
const niceMax = (n: number) => {
  const raw = Math.max(n, 1) / 4, unit = Math.pow(10, Math.floor(Math.log10(raw)));
  return 4 * unit * ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(m => m * unit >= raw) ?? 10);
};

/** Beat 3: the app's chart panel. A left-to-right wipe with a playhead, bloom under the lines and markers that pop as it passes. */
function GraphBeat({ scene, t, sport }: BeatProps) {
  const kind = graphOf(scene, sport);
  const series = [scene.seriesA, scene.seriesB] as const;
  const n = Math.max(series[0].length, series[1].length);
  // Momentum has no value axis, so its plot runs almost edge to edge.
  const [L, R, T, B] = [kind === "momentum" ? 24 : 92, 976, 60, 620], W = R - L, H = B - T, mid = (T + B) / 2;
  const wipe = step(t, .3, 1.45), wipeX = L + W * wipe, after = step(t, 1.8, .5);
  const values = [...series[0], ...series[1]];
  const top = kind === "position" ? Math.max(3, ...values) : kind === "momentum" ? Math.max(1, ...values) : niceMax(Math.max(1, ...values));
  const x = (i: number) => L + (n > 1 ? i * W / (n - 1) : 0);
  const y = (v: number, side: 0 | 1) => kind === "momentum" ? mid + (side ? 1 : -1) * v / top * H / 2 * .94 : kind === "position" ? T + (v - 1) / (top - 1) * H : B - v / top * H;
  const line = (s: readonly number[], side: 0 | 1) => s.map((v, i) => kind === "lead" && i ? `H${x(i)}V${y(v, side)}` : `${i ? "L" : "M"}${x(i)} ${y(v, side)}`).join("");
  const area = (s: readonly number[], side: 0 | 1) => `${line(s, side)}L${x(s.length - 1)} ${kind === "momentum" ? mid : B}L${x(0)} ${kind === "momentum" ? mid : B}Z`;
  const grid = kind === "momentum" ? [] : kind === "position" ? Array.from({ length: top }, (_, i) => i + 1) : [0, .25, .5, .75, 1].map(f => Math.round(top * f));
  const id = `ms-${scene.id}`, [start, end] = axis(kind, sport, n);
  const markers = scene.markers.filter(m => m.at < series[m.side === "A" ? 0 : 1].length).sort((a, b) => a.at - b.at);
  const focal = after > 0 ? markers[markers.length - 1] : undefined;
  const last = (s: readonly number[]) => s.length ? s[s.length - 1] : undefined;
  const legendValue = (s: readonly number[]) => { const v = last(s); return v === undefined || kind === "momentum" ? "" : kind === "position" ? `P${v}` : countUp(String(v), after); };
  // Dense series (a 50-over worm) carry many markers, so their labels shrink.
  const dense = markers.length > 10;
  return <div className="ms-graph" style={{ opacity: step(t, 0, .3) }}>
    <div className="ms-graph-title"><span>{title(kind, sport)}</span><small>{unit(kind, sport)}</small></div>
    {n < 2 ? <p className="ms-empty">Add series A and B in the editor to draw this graph.</p> : <Plate className="ms-chart-plate"><svg className="ms-chart" viewBox="0 0 1000 740" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${title(kind, sport)} graph`}>
      <defs>
        <clipPath id={`${id}-wipe`}><rect x="0" y="0" width={wipeX} height="740"/></clipPath>
        <filter id={`${id}-bloom`} x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
        {(["a", "b"] as const).map((side, i) => <linearGradient key={side} id={`${id}-fill-${side}`} x1="0" y1={kind === "momentum" && i ? 1 : 0} x2="0" y2={kind === "momentum" && i ? 0 : 1}><stop offset="0" stopColor={`var(--ms-${side})`} stopOpacity=".22"/><stop offset="1" stopColor={`var(--ms-${side})`} stopOpacity="0"/></linearGradient>)}
      </defs>
      <g className="ms-grid">{grid.map(v => <g key={v}><line x1={L} x2={R} y1={y(v, 0)} y2={y(v, 0)}/><text x={L - 16} y={y(v, 0)} textAnchor="end" dominantBaseline="central">{kind === "position" ? `P${v}` : v}</text></g>)}</g>
      {kind === "momentum" && <line className="ms-baseline" x1={L} x2={R} y1={mid} y2={mid}/>}
      <g clipPath={`url(#${id}-wipe)`}>
        {kind !== "position" && series.map((s, i) => s.length > 1 && <path key={i} d={area(s, i as 0 | 1)} fill={`url(#${id}-fill-${i ? "b" : "a"})`}/>)}
        {series.map((s, i) => s.length > 1 && <path key={`bloom-${i}`} className="ms-bloom" d={line(s, i as 0 | 1)} stroke={`var(--ms-${i ? "b" : "a"})`} filter={`url(#${id}-bloom)`}/>)}
        {series.map((s, i) => s.length > 1 && <path key={`line-${i}`} className="ms-line-path" d={line(s, i as 0 | 1)} stroke={`var(--ms-${i ? "b" : "a"})`}/>)}
      </g>
      {markers.map((m, i) => {
        const side = m.side === "A" ? 0 : 1, mx = x(m.at);
        const my = kind === "momentum" ? (side ? B - 6 : T + 6) : y(series[side][m.at], side);
        const pop = clamp((wipeX - mx) / 40), scale = .7 + .3 * pop, isFocal = focal === m;
        const colour = `var(--ms-${side ? "b" : "a"})`, labelY = (side ? 1 : -1) * (dense ? 30 : 40);
        return <g key={i} className={`ms-marker${dense ? " is-dense" : ""}`} opacity={pop} transform={`translate(${mx} ${my}) scale(${scale})`}>
          <circle r={isFocal ? 12 + 12 * after : dense ? 11 : 15} fill="none" stroke={colour} strokeOpacity={isFocal ? .5 : .28} strokeWidth="3"/>
          {kind === "race" ? <rect x={dense ? -6 : -8} y={dense ? -6 : -8} width={dense ? 12 : 16} height={dense ? 12 : 16} transform="rotate(45)" fill={colour}/> : <circle r={dense ? 7 : 9} fill={colour}/>}
          {m.label && <text y={labelY} textAnchor="middle" dominantBaseline="central" fill={colour}>{m.label}</text>}
        </g>;
      })}
      {wipe > 0 && wipe < 1 && <line className="ms-playhead" x1={wipeX} x2={wipeX} y1={T - 10} y2={B + 10}/>}
      <g className="ms-axis"><text x={L} y={B + 90}>{start}</text><text x={R} y={B + 90} textAnchor="end">{end}</text></g>
    </svg></Plate>}
    <div className="ms-graph-legend" style={{ opacity: step(t, 1.4, .4) }}>
      <span><i className="ms-swatch-a"/>{scene.nameA}<b>{legendValue(series[0])}</b></span>
      <span><b>{legendValue(series[1])}</b>{scene.nameB}<i className="ms-swatch-b"/></span>
    </div>
    {scene.body && <p className="ms-caption" data-overflow style={{ opacity: after, transform: `translateY(${(1 - after) * 12}px)` }}>{scene.body}</p>}
  </div>;
}

function Tile({ letter, children, glow, enter }: { letter: string; children: ReactNode; glow: number; enter: number }) {
  return <Plate className="ms-tile" glow={glow} style={{ opacity: enter, transform: `translateY(${(1 - enter) * 10}px)` }}><span className="ms-letter">{letter}</span>{children}</Plate>;
}

/** Beat 4, the ending: both sides as pick tiles, crowd bars that fill, and a selection that pulses between them. */
function PickBeat({ scene, t, media, sample, colors }: BeatProps) {
  const ramp = step(t, 1.4, .3), pulse = .5 + .5 * Math.sin(2 * Math.PI * Math.max(0, t - 1.4) / 1.1 - Math.PI / 2);
  const fill = step(t, 1.2, .72), share = scene.pickShare;
  const crowd = share === null ? [] : [[scene.nameA, share, "a"], [scene.nameB, 100 - share, "b"]] as const;
  return <div className={`ms-pick${crowd.length ? "" : " is-solo"}`}>
    <div className="ms-tiles">
      <Tile letter="A" glow={ramp * (1 - pulse)} enter={step(t, .6, .5)}><Team scene={scene} side="A" media={media} color={colors[0]}/></Tile>
      <span className="ms-vs" style={{ opacity: step(t, .85, .4) }}>VS</span>
      <Tile letter="B" glow={ramp * pulse} enter={step(t, .9, .5)}><Team scene={scene} side="B" media={media} color={colors[1]}/></Tile>
    </div>
    {crowd.length > 0 && <div className="ms-crowd" style={{ opacity: step(t, 1.1, .3) }}>
      <div className="ms-heading"><span>{sample ? "EXAMPLE CROWD PICK %" : "CROWD PICK %"}</span><i/>{scene.pickVotes && <small>{scene.pickVotes}</small>}</div>
      {crowd.map(([name, value, side]) => <div className="ms-crowd-row" key={side}>
        <div><span>{name}</span><b>{countUp(`${Math.round(value)}%`, fill)}</b></div>
        <div className="ms-crowd-bar"><i style={{ width: `${value}%`, transform: `scaleX(${fill})`, background: `var(--ms-${side})` }}/></div>
      </div>)}
    </div>}
  </div>;
}
