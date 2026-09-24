import type { Scene } from "@/domain/project";

/** A HUD stat plate: a segmented gauge around the hero number, two meters and the form trend. */
const SEGMENTS = 36, SWEEP = 270, START = 135;
const numeric = (value: string) => Number.parseFloat(value.replace(/,/g, ""));
const polar = (deg: number, r: number) => [100 + r * Math.cos(deg * Math.PI / 180), 100 + r * Math.sin(deg * Math.PI / 180)].map(n => +n.toFixed(2));
const pad = (n: number) => String(n).padStart(2, "0");

/** Reads the hero statistic as a percentage, an "A — B" pair, or an open readout that fills no share. */
function readout(value: string, label: string) {
  const parts = value.split(/\s+[—–-]\s+/).map(part => part.trim()).filter(Boolean);
  if (parts.length === 2) {
    const a = numeric(parts[0]), b = numeric(parts[1]);
    if (a >= 0 && b >= 0 && a + b > 0) return { share: a / (a + b), lead: parts[0], trail: parts[1] };
  }
  const n = numeric(value);
  const percent = /^\s*[\d.,]+\s*%?\s*$/.test(value) && n >= 0 && n <= 100 && /%|percent|pct/i.test(`${value} ${label}`);
  return { share: percent ? n / 100 : null, lead: value, trail: "" };
}

function Gauge({ value, label }: { value: string; label: string }) {
  const { share, lead, trail } = readout(value, label);
  const lit = share === null ? 0 : Math.round(share * SEGMENTS);
  const ticks = Array.from({ length: SEGMENTS }, (_, i) => {
    const angle = START + SWEEP * (i + .5) / SEGMENTS;
    const [x1, y1] = polar(angle, 74), [x2, y2] = polar(angle, 90);
    return { i, x1, y1, x2, y2 };
  });
  const tick = (t: (typeof ticks)[number]) => <line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}/>;
  const scale = [0, .25, .5, .75, 1].map(f => { const a = START + SWEEP * f; const [x1, y1] = polar(a, 95), [x2, y2] = polar(a, 100); return <line key={f} x1={x1} y1={y1} x2={x2} y2={y2}/>; });
  const size = trail ? " is-pair" : lead.length > 4 ? " is-long" : lead.length > 2 ? " is-mid" : "";
  return <div className={`sb-gauge${share === null ? " is-open" : ""}`}>
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <circle className="sb-gauge-core" cx="100" cy="100" r="64"/>
      <g className="sb-gauge-scale">{scale}</g>
      <g className={trail ? "sb-gauge-trail" : "sb-gauge-track"}>{ticks.slice(lit).map(tick)}</g>
      <g className="sb-gauge-lit">{ticks.slice(0, lit).map(tick)}</g>
    </svg>
    <div className={`sb-gauge-value${size}`}><strong>{lead}</strong>{trail && <small>VS {trail}</small>}</div>
  </div>;
}

function Meter({ name, value, width, lead, side }: { name: string; value: string; width: number; lead: string; side: "a" | "b" }) {
  return <li className={`sb-row is-${side}`}>
    <span className="sb-row-name">{name}</span>
    {lead && <span className="sb-lead">▲ {lead}</span>}
    <b className="sb-row-value">{value}</b>
    <span className="sb-meter"><i style={{ width: `${width}%` }}/></span>
  </li>;
}

export function StatBreakdownArt({ scene }: { scene: Scene }) {
  const a = numeric(scene.scoreA), b = numeric(scene.scoreB);
  const both = Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b >= 0;
  // Percent-like values read against 100; small counts such as goals read against the larger side.
  const top = Math.max(a, b), range = top > 10 ? Math.max(100, top) : top || 1;
  const width = (n: number) => both ? Math.max(2, Math.min(100, n / range * 100)) : 0;
  const gap = both && a !== b ? Math.abs(a - b) : 0;
  const gapLabel = gap ? (Number.isInteger(a) && Number.isInteger(b) ? String(gap) : gap.toFixed(1)) : "";
  const trend = scene.chartValues.length >= 3 ? scene.chartValues : [];
  const average = trend.length ? Math.round(trend.reduce((n, v) => n + v, 0) / trend.length) : 0;
  return <div className={`stats-breakdown${trend.length ? " has-trend" : ""}`}>
    <i className="sb-bracket is-top"/><i className="sb-bracket is-bottom"/>
    <div className="sb-plate"><div className="sb-plate-inner">
      <header className="sb-head"><span className="sb-label">{scene.statLabel}</span><span className="sb-chip">KEY STAT</span></header>
      <div className="sb-body">
        <Gauge value={scene.statValue} label={scene.statLabel}/>
        <ul className="sb-rows">
          <Meter side="a" name={scene.nameA} value={scene.scoreA} width={width(a)} lead={a > b ? gapLabel : ""}/>
          <Meter side="b" name={scene.nameB} value={scene.scoreB} width={width(b)} lead={b > a ? gapLabel : ""}/>
        </ul>
      </div>
      {trend.length > 0 && <div className="sb-trend">
        <div className="sb-columns">
          {trend.map((v, i) => <i key={i} className={i === trend.length - 1 ? "is-last" : undefined} style={{ height: `${Math.max(4, v)}%` }}/>)}
          <span className="sb-average" style={{ bottom: `${average}%` }}><b>AVG {average}</b></span>
        </div>
        <div className="sb-axis"><span>01</span><span>TREND</span><span>{pad(trend.length)}</span></div>
      </div>}
    </div></div>
  </div>;
}
