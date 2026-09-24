/** A drawn portrait placeholder: slide 3's pale glass disc behind a neutral silhouette. */
function PortraitPlaceholder({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return <div className="team-portrait" aria-label={`Photo placeholder for ${name}`}>
    <i className="team-portrait-disc"/>
    <svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="78" r="38"/><path d="M28 200c4-46 34-72 72-72s68 26 72 72Z"/></svg>
    <b>{initials}</b>
    <span>PHOTO PLACEHOLDER</span>
  </div>;
}

/** Each "Name / Role / Bio" bullet becomes a founder card; up to three cards. */
export function TeamCards({ bullets }: { bullets: string[] }) {
  const founders = bullets.filter(item => item.trim()).slice(0, 3).map(item => {
    const [name = "", role = "", ...bio] = item.split(" / ");
    return { name, role, bio: bio.join(" / ") };
  });
  if (founders.length === 0) return null;
  return <section className={`team-cards is-${founders.length}`} aria-label="Founding team">
    {founders.map(({ name, role, bio }, index) => <article className={`team-card${index === 0 ? " is-primary" : ""}`} key={index}>
      {/* The shell is the outline and the panel sits 1.5px inside it, so the border follows every cut corner. */}
      <div className="team-card-shell"><div className="team-card-panel">
        <PortraitPlaceholder name={name}/>
        <div className="team-card-copy">
          <small>CO-FOUNDER</small>
          <strong data-overflow>{name}</strong>
          {role && <span className="team-role"><em data-overflow>{role}</em></span>}
          {bio && <p data-overflow>{bio}</p>}
        </div>
      </div></div>
      <i className="team-bracket is-top" aria-hidden="true"/><i className="team-bracket is-bottom" aria-hidden="true"/>
      <b className="team-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</b>
    </article>)}
  </section>;
}

/** Slide 5's backdrop: faint cut-corner floor plates behind the team layout. */
export function TeamBackdrop() {
  return <div className="team-backdrop" aria-hidden="true">
    <svg viewBox="0 0 1736 814" preserveAspectRatio="none">
      <path d="M40 814V650l40-40h300v204M150 814V720l24-24h160v118"/>
    </svg>
  </div>;
}
