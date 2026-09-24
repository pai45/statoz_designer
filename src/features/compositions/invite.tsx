/** A lit stadium-horizon arc, drawn behind the closing copy on a 1920 × 1080 board. */
export function InviteArc() {
  // The ring's centre sits above the slide, so its lowest point lands at y 690 and it
  // rises to about y 370 at both edges.
  const cx = 960, cy = -900, r = 1590;
  const ticks = Array.from({ length: 29 }, (_, index) => (index - 14) * 1.6);
  return <svg className="invite-arc" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="inviteBand" x1="0" y1="0" x2="1920" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#15e6ff" stopOpacity="0"/><stop offset=".3" stopColor="#15e6ff" stopOpacity=".35"/>
        <stop offset=".5" stopColor="#dffbff"/><stop offset=".7" stopColor="#15e6ff" stopOpacity=".35"/><stop offset="1" stopColor="#15e6ff" stopOpacity="0"/>
      </linearGradient>
      <radialGradient id="inviteFloor" cx="960" cy="720" r="760" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 720) scale(1 .42) translate(0 -720)">
        <stop offset="0" stopColor="#15e6ff" stopOpacity=".2"/><stop offset="1" stopColor="#15e6ff" stopOpacity="0"/>
      </radialGradient>
      <filter id="inviteGlow" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="16"/></filter>
      <filter id="inviteHalo" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="40"/></filter>
    </defs>
    <ellipse className="invite-floor" cx="960" cy="720" rx="760" ry="320" fill="url(#inviteFloor)"/>
    <circle className="invite-shelf" cx={cx} cy={cy} r={r - 250}/>
    <circle className="invite-shelf" cx={cx} cy={cy} r={r - 120}/>
    <circle cx={cx} cy={cy} r={r - 40} fill="none" stroke="url(#inviteBand)" strokeWidth="150" filter="url(#inviteHalo)" opacity=".32"/>
    <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#inviteBand)" strokeWidth="46" filter="url(#inviteGlow)" opacity=".75"/>
    <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#inviteBand)" strokeWidth="5"/>
    <g className="invite-ticks">{ticks.map(angle => <line key={angle} x1={cx} y1={cy + r + 26} x2={cx} y2={cy + r + (angle === 0 ? 50 : 38)} transform={`rotate(${angle} ${cx} ${cy})`}/>)}</g>
    <circle className="invite-node" cx={cx} cy={cy + r} r="7"/>
  </svg>;
}

function ContactIcon({ kind }: { kind: string }) {
  if (/web|site|url/i.test(kind)) return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M2.5 10h15M10 2.5c2.4 2.2 2.4 12.8 0 15M10 2.5c-2.4 2.2-2.4 12.8 0 15"/></svg>;
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 4.5h15v11h-15z"/><path d="m2.5 5 7.5 6 7.5-6"/></svg>;
}

/** Bullets under the arc: "Label / value" lines are contacts; a line without " / " is the sign-off. */
export function InviteLines({ bullets }: { bullets: string[] }) {
  const lines = bullets.filter(item => item.trim()).map(item => {
    const [label, ...value] = item.split(" / ");
    return value.length ? { contact: true, label, text: value.join(" / ") } : { contact: false, label: "", text: label };
  });
  if (lines.length === 0) return null;
  return <div className="invite-lines">{lines.map((line, index) => line.contact
    ? <span className="invite-contact" key={index}><ContactIcon kind={line.label}/><b data-overflow>{line.text}</b></span>
    : <p className="invite-signoff" key={index} data-overflow>{line.text}</p>)}</div>;
}
