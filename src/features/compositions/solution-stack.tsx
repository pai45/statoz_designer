/** SVG geometry and HTML labels share fixed frame coordinates, without a clock. */
export function SolutionStack({ bullets }: { bullets: string[] }) {
  const layers = bullets.filter(item => item.trim()).map(item => {
    const [label, ...detail] = item.split(" / ");
    return { label, detail: detail.join(" / ") };
  });
  const step = Math.min(104, 416 / Math.max(1, layers.length - 1));
  return <section className={`solution-stack${layers.length > 5 ? " is-dense" : ""}`} aria-label="StatOz player journey, from discovery to competition">
    <svg className="solution-stack-plates" viewBox="0 0 660 760" preserveAspectRatio="none" aria-hidden="true">
      {/* Paint the back plates first so each raised surface occludes those below. */}
      {layers.map((_, index) => index).reverse().map(index => <g key={index} transform={`translate(0 ${index * step})`} className={index === 0 ? "solution-plate is-primary" : "solution-plate"}>
        <path className="solution-plate-depth" d="M54 166 308 310 562 166V194L316 332H300L54 194Z"/>
        <path className="solution-plate-face" d="M300 28H316L562 166V180L316 318H300L54 180V166Z"/>
        <path className="solution-plate-inset" d="M300 53H316L526 171V175L316 293H300L90 175V171Z"/>
        <path className="solution-plate-seam" d="M308 318V332"/>
      </g>)}
      {layers.map((_, index) => <g className={index === 0 ? "solution-connector is-primary" : "solution-connector"} key={index} transform={`translate(0 ${index * step})`}>
        <path d="M582 173H658"/><circle cx="582" cy="173" r="3"/>
      </g>)}
    </svg>
    <ol className="solution-stack-labels">
      {layers.map(({ label, detail }, index) => <li key={index} style={{ top: 143 + index * step }}>
        <span className="solution-stack-number">{String(index + 1).padStart(2, "0")}</span>
        <div><strong data-overflow>{label}</strong>{detail && <p data-overflow>{detail}</p>}</div>
      </li>)}
    </ol>
  </section>;
}
