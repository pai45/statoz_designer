import type { PresentationSlide } from "@/domain/project";

type Metric = PresentationSlide["metrics"][number];

/** Splits "$3.2B" into "$", "3.2" and "B" so the unit can sit smaller than the figure. */
function figure(value: string) {
  const match = value.match(/^([^\d]*)([\d.,]+)(.*)$/);
  return match ? { prefix: match[1], number: match[2], suffix: match[3] } : { prefix: "", number: value, suffix: "" };
}

const scale = { K: 1e3, M: 1e6, B: 1e9 } as Record<string, number>;
/** Reads the first "$1.5B"-style amount, so the bar only draws figures the slide already states. */
function amount(text: string) {
  const match = text.match(/([\d.]+)\s*([KMB])\b/i);
  return match ? { text: match[0].trim(), prefix: text.slice(0, match.index).match(/[$₹€£]$/)?.[0] ?? "", value: Number(match[1]) * scale[match[2].toUpperCase()] } : null;
}

function Figure({ value }: { value: string }) {
  const { prefix, number, suffix } = figure(value);
  return <strong data-overflow>{prefix && <i>{prefix}</i>}{number}{suffix && <i>{suffix}</i>}</strong>;
}

/** Metrics 1–3 become the bubble cluster; bullets become the policy notes beside the tile. */
export function MarketBubbles({ metrics, bullets }: { metrics: Metric[]; bullets: string[] }) {
  const notes = bullets.filter(item => item.trim()).slice(0, 2).map(item => {
    const [label, ...detail] = item.split(" / ");
    return { label, detail: detail.join(" / ") };
  });
  return <section className="market-field" aria-label="India games market indicators">
    <div className="market-tile" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M6 30 16 20l6 6L34 12"/><path d="M25 12h9v9"/></svg></div>
    {notes.length > 0 && <ul className="market-notes">{notes.map(({ label, detail }, index) => <li key={index}><b data-overflow>{label}</b>{detail && <span data-overflow>{detail}</span>}</li>)}</ul>}
    {metrics.slice(0, 3).map((metric, index) => <div className={`market-bubble market-bubble-${index + 1}`} key={index}>
      {index === 0 && <em aria-hidden="true">→</em>}
      <Figure value={metric.value}/>
      <span data-overflow>{metric.label}</span>
      {metric.detail && <small data-overflow>{metric.detail}</small>}
    </div>)}
  </section>;
}

/** Metric 4 is the panel's headline figure; its detail's first amount is the bar's starting point. */
export function MarketHighlight({ metric }: { metric?: Metric }) {
  if (!metric) return null;
  const end = amount(metric.value), start = amount(metric.detail);
  const share = end && start && start.value < end.value ? start.value / end.value : null;
  return <div className="market-highlight">
    <div className="market-hero"><Figure value={metric.value}/><span data-overflow>{metric.label}</span></div>
    {share !== null && <div className="market-bar" aria-label={`${start!.text} growing to ${end!.text}`}>
      <div className="market-bar-track"><i style={{ width: `${share * 100}%` }}/></div>
      <div className="market-bar-labels"><b style={{ left: `${share * 100}%` }}>{start!.prefix}{start!.text}</b><b>{metric.value}</b></div>
    </div>}
    {metric.detail && <p data-overflow>{metric.detail}</p>}
  </div>;
}
