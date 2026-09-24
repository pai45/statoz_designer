import type { CSSProperties } from "react";
import type { PresentationSlide } from "@/domain/project";

type Metric = PresentationSlide["metrics"][number];

const TILES = 50;
/** Pitch slides are 1920 px wide with 92 px side padding, so the main column is 1736 px. */
const MAIN_WIDTH = 1736;

/** Splits "68%" so the unit sits small and raised beside the figure. */
function Share({ value }: { value: string }) {
  const match = value.match(/^([\d.]+)(.*)$/);
  return <strong data-overflow>{match ? <>{match[1]}<i>{match[2]}</i></> : value}</strong>;
}

/** Three stepped rows, longest at the bottom, so each group reads as a rising staircase. */
function rows(count: number) {
  const bottom = Math.min(count, Math.ceil(count / 3) + 1), middle = Math.ceil((count - bottom) / 2);
  return [count - bottom - middle, middle, bottom];
}

/**
 * Metrics 1–2 are the two allocation shares. Each tile is 2% of the round, so the
 * chart shows exactly the stated split; unreadable shares fall back to an even split.
 */
export function FundsSplit({ metrics }: { metrics: Metric[] }) {
  const [left, right] = metrics;
  if (!left || !right) return null;
  const a = parseFloat(left.value), b = parseFloat(right.value);
  const leftTiles = a > 0 && b > 0 ? Math.round((a / (a + b)) * TILES) : TILES / 2;
  const leftRows = rows(leftTiles), rightRows = rows(TILES - leftTiles);
  const columns = leftRows[2] + rightRows[2];
  const style = { "--funds-split": `${(leftRows[2] / columns) * 100}%`, "--funds-pitch": `${MAIN_WIDTH / columns}px` } as CSSProperties;
  return <section className="pitch-funds" style={style} aria-label={`Use of funds: ${left.value} ${left.label}, ${right.value} ${right.label}`}>
    <i className="funds-divider" aria-hidden="true"/>
    {[left, right].map((metric, index) => <div className={`funds-share ${index === 0 ? "is-primary" : "is-secondary"}`} key={index}>
      <Share value={metric.value}/>
      <span data-overflow>{metric.label}</span>
      {metric.detail && <small data-overflow>{metric.detail}</small>}
    </div>)}
    <div className="funds-tiles" aria-hidden="true">
      {[leftRows, rightRows].map((group, side) => <div className={`funds-group ${side === 0 ? "is-primary" : "is-secondary"}`} key={side}>
        {group.map((count, row) => <div className="funds-row" key={row}>{Array.from({ length: count }, (_, tile) => <b key={tile}/>)}</div>)}
      </div>)}
    </div>
  </section>;
}

/** Metrics 3–4, such as the raise and the runway, as compact spec tiles under the body. */
export function FundsTerms({ metrics }: { metrics: Metric[] }) {
  if (metrics.length === 0) return null;
  return <div className="funds-terms">{metrics.slice(0, 2).map((metric, index) => <div key={index}>
    <strong data-overflow>{metric.value}</strong><span data-overflow>{metric.label}</span>
  </div>)}</div>;
}
