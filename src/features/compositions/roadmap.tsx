import type { CSSProperties } from "react";

/** The roadmap column is 1160 px wide inside the 1736 px main area, and 814 px tall. */
const WIDTH = 1160, HEIGHT = 814;
/** The track starts this far up from the floor and climbs by RISE in total. */
const BOTTOM = 660, RISE = 345;
/** Horizontal run of each diagonal riser between two treads. */
const RISER = 85, CARD = 280;
/** The final tread stops short of the edge so the arrow head has room. */
const TAIL = 60;

type Stage = { label: string; title: string; detail: string };

/** "Q1 / Retention foundation: live data, accounts" splits into label, title and detail. */
function stage(item: string): Stage {
  const [label = "", ...rest] = item.split(" / ");
  const text = rest.join(" / ");
  const colon = text.indexOf(":");
  return colon > 0
    ? { label, title: text.slice(0, colon).trim(), detail: text.slice(colon + 1).trim() }
    : { label, title: text, detail: "" };
}

/** Quarters counted from funding, so Q1 covers months one to three. */
function months(index: number) {
  return `M${index * 3 + 1}-${index * 3 + 3}`;
}

/**
 * A rising staircase track with a station on every tread, cards alternating above and
 * below it. Treads and risers are straight lines with mitred joints, so the track keeps
 * the deck's angular language instead of the reference's curve.
 */
export function RoadmapTrack({ bullets }: { bullets: string[] }) {
  const stages = bullets.filter(item => item.trim()).slice(0, 5).map(stage);
  const count = stages.length;
  if (count === 0) return null;
  const span = WIDTH / count, rise = count > 1 ? RISE / (count - 1) : 0;
  const quarterly = count === 4 && stages.every(item => /^Q[1-4]$/i.test(item.label));
  const stations = stages.map((item, index) => {
    const y = BOTTOM - index * rise;
    const start = index * span, end = index === count - 1 ? WIDTH - TAIL : start + span - RISER;
    const x = (start + end) / 2;
    return { ...item, y, x, start, end, above: index % 2 === 0, cardX: Math.max(0, Math.min(WIDTH - CARD, x - CARD / 2)) };
  });
  let track = `M0 ${stations[0].y}`;
  stations.forEach((station, index) => {
    track += ` H${station.end}`;
    const next = stations[index + 1];
    if (next) track += ` L${next.start} ${next.y}`;
  });
  const last = stations[count - 1];

  return <section className="pitch-roadmap" aria-label="Twelve-month roadmap">
    <svg className="roadmap-art" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
      <defs>
        <linearGradient id="roadmapTrack" x1="0" y1="0" x2={WIDTH} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#15e6ff" stopOpacity=".3"/><stop offset=".55" stopColor="#15e6ff" stopOpacity=".7"/><stop offset="1" stopColor="#dffbff"/>
        </linearGradient>
        <filter id="roadmapGlow" x="-6%" y="-14%" width="112%" height="128%"><feGaussianBlur stdDeviation="11"/></filter>
      </defs>
      {/* Faint chamfered plates fill the empty upper left, as on the product and team slides. */}
      <path className="roadmap-plate" d="M0 300h250l40 40v150M120 180h180l28 28v96"/>
      <g className="roadmap-ruler">
        <path d={`M0 70H${WIDTH}`}/>
        {stations.map(station => <path d={`M${station.x} 70v14`} key={`tick-${station.label}`}/>)}
      </g>
      <g className="roadmap-guides">{stations.map(station => <path d={`M${station.x} 84V${station.y}`} key={`guide-${station.label}`}/>)}</g>
      <path className="roadmap-start" d={`M0 ${stations[0].y - 16}v32`}/>
      <path className="roadmap-track-bed" d={track}/>
      <path className="roadmap-track-glow" d={track} filter="url(#roadmapGlow)"/>
      <path className="roadmap-track" d={track}/>
      <path className="roadmap-track" d={`M${WIDTH - TAIL} ${last.y}H${WIDTH - 22}`}/>
      <path className="roadmap-arrow" d={`M${WIDTH - 36} ${last.y - 13}l13 13-13 13`}/>
    </svg>
    <ol className="roadmap-stations">
      {stations.map((station, index) => <li
        className={`roadmap-station${station.above ? " is-above" : " is-below"}${index === count - 1 ? " is-final" : ""}`}
        style={{ "--station-x": `${station.x}px`, "--station-y": `${station.y}px`, "--card-x": `${station.cardX}px` } as CSSProperties}
        key={station.label}
      >
        <b className="roadmap-node" aria-hidden="true">{station.label}</b>
        <i className="roadmap-stem" aria-hidden="true"/>
        {/* The shell is the outline and the panel sits inside it, so the border follows every cut corner. */}
        <div className="roadmap-card-shell"><div className="roadmap-card-panel">
          <small data-overflow>{quarterly ? months(index) : station.label}</small>
          <strong data-overflow>{station.title}</strong>
          {station.detail && <p data-overflow>{station.detail}</p>}
        </div></div>
      </li>)}
    </ol>
  </section>;
}
