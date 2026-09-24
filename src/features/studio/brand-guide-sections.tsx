import { useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { brandPrinciples, colorGroups, doDont, motionRules, safeAreas, shapes, socialScaleFormats, socialScaleVars, surfaceRules, tracking, typeFamilies, uiTypeScale, useCases } from "@/domain/brand-guide";
import { formats } from "@/domain/project";
import { Button, FilterChips, HudPanel, Icon, Tag } from "@/design-system/components/ui";
import { templates } from "@/features/templates/registry";

/**
 * The design guide sections of the Brand tab. Values are read from the live
 * stylesheet with getComputedStyle, so what is shown is what the studio renders.
 */

const cssVar = (token: string) => `var(${token})`;

const noSubscription = () => () => {};
const noValues = {};
const readCache = new Map<string, unknown>();

/** Stylesheets do not change while the studio runs, so each computed read is made once. */
function cachedRead<T>(key: string, read: () => T): T {
  if (!readCache.has(key)) readCache.set(key, read());
  return readCache.get(key) as T;
}

/** Resolved custom properties on the root, or on a hidden probe carrying `className`. */
function readCssVars(names: readonly string[], className = "") {
  const probe = className ? document.body.appendChild(Object.assign(document.createElement("div"), { className, hidden: true })) : document.documentElement;
  const style = getComputedStyle(probe);
  const values: Record<string, string> = Object.fromEntries(names.map(name => [name, style.getPropertyValue(name).trim()]));
  if (className) probe.remove();
  return values;
}

function useCssVars(names: readonly string[]): Record<string, string> {
  const key = names.join(",");
  return useSyncExternalStore(noSubscription, () => cachedRead(`root|${key}`, () => readCssVars(names)), () => noValues);
}

/** The social type scale per ratio, as a composition canvas of that format resolves it. */
function useSocialScale(): Record<string, Record<string, string>> {
  return useSyncExternalStore(noSubscription, () => cachedRead("social", () => Object.fromEntries(socialScaleFormats.map(({ format, className }) => [format, readCssVars(socialScaleVars, `composition ${className}`)]))), () => noValues);
}

function CopyToken({ token, children, className, style }: { token: string; children: ReactNode; className: string; style?: CSSProperties }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" className={className} style={style} title={`Copy ${token}`} onClick={() => {
    void navigator.clipboard?.writeText(`var(${token})`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }).catch(() => {});
  }}>{children}{copied && <span className="guide-copied">COPIED</span>}</button>;
}

export function OverviewPrinciples() {
  return <section><div className="section-header"><h2>Five principles</h2><span className="muted-note">Apply them to every format and tool.</span></div>
    <ol className="guide-principles">{brandPrinciples.map((principle, index) => <li key={principle.name}><span>{String(index + 1).padStart(2, "0")}</span><strong>{principle.name}</strong><p>{principle.rule}</p></li>)}</ol>
  </section>;
}

export function ColorsSection() {
  const values = useCssVars(colorGroups.flatMap(group => group.tokens.map(entry => entry.token)));
  return <div className="brand-system">{colorGroups.map(group => <section key={group.id}>
    <div className="section-header"><h2>{group.name}</h2><span className="muted-note">{group.description}</span></div>
    <div className="guide-swatches">{group.tokens.map(entry => <CopyToken key={`${group.id}-${entry.name}`} token={entry.token} className="guide-swatch">
      <i style={{ background: cssVar(entry.token) }}/>
      <strong>{entry.name}</strong>
      <code>{entry.token}</code>
      <span>{values[entry.token]?.toUpperCase() || "…"}</span>
      <small>{group.id === "sports" ? "Sport accent" : entry.role}</small>
    </CopyToken>)}</div>
  </section>)}<p className="muted-note">Select a swatch to copy its <code>var(--ds-…)</code> reference. Use the token in code, never the value.</p></div>;
}

export function TypographySection() {
  const values = useCssVars([...uiTypeScale, ...tracking].map(entry => entry.token));
  const social = useSocialScale();
  return <div className="brand-system">
    <section className="type-showcase"><div><span className="section-caption">DISPLAY / ORBITRON</span><h3 className="display-specimen">MAKE<br/>YOUR MOVE.</h3><p>{typeFamilies[0].role}</p></div><div><span className="section-caption">BODY / ONEST</span><h3 className="body-specimen">A fresh perspective<br/>on the game you love.</h3><p>{typeFamilies[1].role}</p></div></section>
    <section><div className="section-header"><h2>UI type ramp</h2><span className="muted-note">Studio and product screens. Artwork uses the social scale.</span></div>
      <div className="guide-table" role="table" aria-label="UI type ramp">{uiTypeScale.map(entry => <div role="row" key={entry.token}>
        <span role="cell" className="guide-ramp-sample" style={{ fontSize: cssVar(entry.token) }}>Make your move</span>
        <code role="cell">{entry.token}</code><span role="cell">{values[entry.token]}</span><small role="cell">{entry.role}</small>
      </div>)}</div>
    </section>
    <section><div className="section-header"><h2>Social artwork scale</h2><span className="muted-note">Pixels on the export canvas, per ratio. Use the --social-* variables.</span></div>
      <div className="guide-scroll"><table className="guide-grid-table"><thead><tr><th>Format</th>{socialScaleVars.map(name => <th key={name}><code>{name}</code></th>)}</tr></thead>
        <tbody>{socialScaleFormats.map(({ format }) => <tr key={format}><th>{formats[format].ratio} <small>{formats[format].label}</small></th>{socialScaleVars.map(name => <td key={name}>{social[format]?.[name] || "…"}</td>)}</tr>)}</tbody></table></div>
    </section>
    <section><div className="section-header"><h2>Tracking</h2><span className="muted-note">Uppercase labels always get measured tracking.</span></div>
      <div className="guide-tracking">{tracking.map(entry => <div key={entry.token}><span style={{ letterSpacing: cssVar(entry.token) }}>STATOZ LIVE</span><code>{entry.token}</code><small>{values[entry.token]} · {entry.role}</small></div>)}</div>
      <span className="section-caption guide-caption">DATA / TABULAR NUMERALS</span><div className="number-specimen">09 : 24 <span>78%</span></div>
    </section>
  </div>;
}

export function ShapeSection() {
  return <div className="brand-system">
    <section className="brand-components"><HudPanel><span className="section-caption">HUD SURFACE</span><h3>Every edge has intent.</h3><p>Continuous outlined chamfers. Glow reserved for the moment that matters.</p><Button>Primary action<Icon name="arrow"/></Button></HudPanel><div><span className="section-caption">NAVIGATION / FILTER CHIPS</span><FilterChips options={["Football", "Cricket", "Basketball"]} selected="Football" onSelect={() => {}} label="Brand chip specimen"/><p className="muted-note">Compact outlined plates with a clear selected state. Accessible keyboard targets.</p></div></section>
    <section><div className="section-header"><h2>Chamfer shapes</h2><span className="muted-note">Outer shell and inner fill share one clip-path.</span></div>
      <div className="guide-shapes">{shapes.map(shape => <CopyToken key={shape.clip} token={shape.clip} className="guide-shape" style={{ "--guide-clip": cssVar(shape.clip) } as CSSProperties}>
        <div className="guide-shape-plate"><div/></div><strong>{shape.name}</strong><code>{shape.clip}</code><small>{shape.use}</small>
      </CopyToken>)}</div>
    </section>
    <section><div className="section-header"><h2>Glow is scarce</h2><span className="muted-note">One focal element per surface.</span></div>
      <div className="guide-glow"><div className="guide-glow-plate"><div><div><span className="section-caption">STANDARD PLATE</span><strong>Flat and calm</strong><small>Muted outline · no glow</small></div></div></div><div className="guide-glow-plate is-focal"><div><div><span className="section-caption">LIVE · SELECTED</span><strong>The one that glows</strong><small>Cyan outline · drop-shadow on an unclipped wrapper</small></div></div></div></div>
      <ul className="guide-list">{surfaceRules.map(rule => <li key={rule}>{rule}</li>)}</ul>
    </section>
  </div>;
}

/** The tallest a ratio preview may be; wide ratios shrink to fit their column instead. */
const frameHeight = 260;

export function LayoutSection() {
  return <div className="brand-system">
    <section><div className="section-header"><h2>Four ratios, composed independently</h2><span className="muted-note">House safe areas; not platform compliance guarantees.</span></div>
      <div className="guide-ratios">{safeAreas.map(area => { const format = formats[area.format]; const [top, right, bottom, left] = area.box; return <figure key={area.format}>
        <div className="guide-ratio-box"><div className="guide-ratio-frame" style={{ aspectRatio: `${format.width} / ${format.height}`, width: `min(100%, ${Math.round(frameHeight * format.width / format.height)}px)` }}><div className="guide-safe" style={{ inset: `${top}% ${right}% ${bottom}% ${left}%` }}><span>SAFE</span></div></div></div>
        <figcaption><strong>{format.ratio}</strong><span>{format.label} · {format.width}×{format.height}</span><small>{area.inset}</small><small>{area.note}</small></figcaption>
      </figure>; })}</div>
    </section>
    <section><div className="section-header"><h2>Motion</h2><span className="muted-note">Deterministic, readable, muted-friendly.</span></div><ul className="guide-list">{motionRules.map(rule => <li key={rule}>{rule}</li>)}</ul></section>
  </div>;
}

export function UseCasesSection() {
  const [selected, setSelected] = useState(useCases[0].name);
  const useCase = useCases.find(item => item.name === selected) ?? useCases[0];
  const names = new Map(templates.map(template => [template.id, template.name]));
  const lists: [string, string[]][] = [["PALETTE", useCase.palette], ["TYPE", useCase.type], ["ASSETS", useCase.assets], ["RULES", useCase.rules]];
  return <div className="brand-system">
    <FilterChips label="Use case" options={useCases.map(item => item.name)} selected={useCase.name} onSelect={setSelected}/>
    <HudPanel className="guide-recipe">
      <span className="section-caption">USE CASE</span><h3>{useCase.name}</h3><p>{useCase.summary}</p>
      <div className="guide-recipe-meta">
        <div><span className="section-caption">FORMATS</span><div className="asset-labels">{useCase.formats.length ? useCase.formats.map(id => <Tag key={id}>{formats[id].label.toUpperCase()} · {formats[id].width}×{formats[id].height}</Tag>) : <Tag>NOT A STUDIO EXPORT</Tag>}</div></div>
        <div><span className="section-caption">START FROM</span><div className="asset-labels">{useCase.startTemplates.length ? useCase.startTemplates.map(id => <Tag key={id}>{(names.get(id) ?? id).toUpperCase()}</Tag>) : <Tag>DESIGN-SYSTEM COMPONENTS</Tag>}</div></div>
      </div>
      <div className="guide-recipe-lists">{lists.map(([title, items]) => <div key={title}><span className="section-caption">{title}</span><ul className="guide-list">{items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</div>
      <span className="section-caption">CHECKLIST</span><ul className="guide-checklist">{useCase.checklist.map(item => <li key={item}><Icon name="check" size={15}/>{item}</li>)}</ul>
    </HudPanel>
  </div>;
}

export function DoDontSection() {
  return <div className="guide-dodont">{doDont.map(item => <article key={item.topic}>
    <span className="section-caption">{item.topic.toUpperCase()}</span>
    <div className="is-do"><strong>DO</strong><p>{item.do}</p></div>
    <div className="is-dont"><strong>DON’T</strong><p>{item.dont}</p></div>
  </article>)}</div>;
}
