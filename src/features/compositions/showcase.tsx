/**
 * Loop steps as tags around the centred phone: the first half on the left, the rest on
 * the right, top to bottom. Each tag's numbered square sits on its corner nearest the phone.
 */
export function ShowcaseTags({ bullets }: { bullets: string[] }) {
  const steps = bullets.filter(item => item.trim()).slice(0, 6).map(item => {
    const [label, ...detail] = item.split(" / ");
    return { label, detail: detail.join(" / ") };
  });
  const split = Math.ceil(steps.length / 2);
  return <div className="showcase-tags">
    {[steps.slice(0, split), steps.slice(split)].map((column, side) => <ol className={`showcase-column ${side === 0 ? "is-left" : "is-right"}`} key={side}>
      {column.map(({ label, detail }, row) => {
        const index = side * split + row;
        return <li className={`showcase-tag${index === 0 ? " is-primary" : ""}`} key={index}>
          <div><strong data-overflow>{label}</strong>{detail && <span data-overflow>{detail}</span>}</div>
          <b aria-hidden="true">{String(index + 1).padStart(2, "0")}</b>
        </li>;
      })}
    </ol>)}
  </div>;
}

/** Slide 3's glass language behind the phone: a pale cyan disc, two dark glass circles and faint floor plates. */
export function ShowcaseBackdrop() {
  return <div className="showcase-backdrop" aria-hidden="true">
    <svg viewBox="0 0 1736 814" preserveAspectRatio="none">
      <path d="M40 814V650l40-40h300v204M1696 814V650l-40-40h-300v204"/>
      <path d="M150 814V720l24-24h160v118M1586 814V720l-24-24h-160v118"/>
    </svg>
    <i className="showcase-disc"/><i className="showcase-glass is-upper"/><i className="showcase-glass is-lower"/>
  </div>;
}
