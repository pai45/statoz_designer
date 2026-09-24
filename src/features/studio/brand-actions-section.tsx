import { useState, type ReactNode } from "react";
import { actionCatalog, actionHierarchy, actionStates, elementCatalog, type CatalogEntry } from "@/domain/brand-guide";
import { ActionButton, ActionChip, ActionLink, ControlPad, DialogActions, FuseCta, HeroCta, IconButton, PagerButton, SelectableTile, Stepper } from "@/design-system/components/actions";
import { AccentPanel, Badge, DeltaChip, Progress, SignalPanel, StatusPill, StepMeter, UnderlineTabs } from "@/design-system/components/elements";
import { Icon } from "@/design-system/components/ui";
import { apiResource } from "@/shared/api";

/**
 * Live specimens for the Brand tab's Actions and Components sections. Each
 * catalog entry in `src/domain/brand-guide.ts` has a demo here, keyed by its id.
 */

const noop = () => {};
const accent = (name: string) => `var(--ds-color-accent-${name})`;
const danger = "var(--ds-color-danger)";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="catalog-row"><span className="section-caption">{label}</span><div>{children}</div></div>;
}

function HeldPads() {
  const [held, setHeld] = useState<string | null>(null);
  return <div className="catalog-inline">
    <ControlPad icon="left" label="Move left" onPressStart={() => setHeld("LEFT")} onPressEnd={() => setHeld(null)}/>
    <ControlPad icon="chevron" label="Move right" accent={accent("gold")} onPressStart={() => setHeld("RIGHT")} onPressEnd={() => setHeld(null)}/>
    <span className="catalog-readout">{held ? `HOLDING ${held}` : "PRESS AND HOLD"}</span>
  </div>;
}

function StepperDemo() {
  const [stake, setStake] = useState(25);
  return <Stepper label="Stake" value={stake} onChange={setStake} step={5} min={5} max={100} unit="Oz"/>;
}

function TilesDemo() {
  const [picked, setPicked] = useState("football");
  const options = [["football", "Football", "cyan"], ["cricket", "Cricket", "white"], ["basketball", "Basketball", "gold"]] as const;
  return <div className="catalog-inline" role="radiogroup" aria-label="Favourite sport">
    {options.map(([id, name, color]) => <SelectableTile key={id} label={name} selected={picked === id} onSelect={() => setPicked(id)} accent={accent(color)} className="catalog-tile">
      <span style={{ color: accent(color) }}><Icon name="spark" size={26}/></span><strong>{name}</strong>
    </SelectableTile>)}
  </div>;
}

function ToggleDemo() {
  const [on, setOn] = useState(true);
  return <IconButton icon="spark" label={on ? "Turn highlights off" : "Turn highlights on"} variant="surface" pressed={on} onClick={() => setOn(!on)}/>;
}

function TabsDemo() {
  const [tab, setTab] = useState(0);
  return <UnderlineTabs label="Match sections" tabs={["Overview", "Stats", "Lineups", "Picks"]} active={tab} onChange={setTab}/>;
}

export const catalogDemos: Record<string, () => ReactNode> = {
  "action-button": () => <>
    <Row label="VARIANTS"><ActionButton glow trailingIcon={<Icon name="arrow" size={16}/>}>Play now</ActionButton><ActionButton>Primary</ActionButton><ActionButton variant="tonal">Tonal</ActionButton><ActionButton variant="surface" leadingIcon={<Icon name="share" size={16}/>}>Surface</ActionButton><ActionButton variant="ghost">Ghost</ActionButton></Row>
    <Row label="SIZES"><ActionButton size="sm">Small</ActionButton><ActionButton size="md">Medium</ActionButton><ActionButton size="lg">Large</ActionButton></Row>
    <Row label="STATES"><ActionButton disabled>Disabled</ActionButton><ActionButton pending>Saving</ActionButton><ActionButton variant="tonal" accent={danger} leadingIcon={<Icon name="trash" size={16}/>}>Delete</ActionButton></Row>
    <Row label="ACCENTS"><ActionButton accent={accent("gold")}>Claim reward</ActionButton><ActionButton variant="tonal" accent={accent("lime")}>Lock pick</ActionButton><ActionButton variant="tonal" accent={accent("racing")}>Race</ActionButton><ActionButton variant="tonal" accent={accent("violet")}>Elite</ActionButton></Row>
  </>,
  "action-link": () => <Row label="LINKS"><ActionLink href={apiResource("brand-kit/logo")} download="statoz-logo.png" variant="tonal" leadingIcon={<Icon name="download" size={16}/>}>Download the mark</ActionLink><ActionLink href="#top" variant="ghost" trailingIcon={<Icon name="arrow" size={16}/>}>View all</ActionLink></Row>,
  "hero-cta": () => <div className="catalog-stack">
    <HeroCta label="PLAY MATCH" helper="Squad ready · 5 cards" onClick={noop}/>
    <HeroCta label="HOLD TO LOCK" helper="Press and hold" pressedLabel="RELEASE TO LOCK" pressedHelper="Releases at 72% power" accent={accent("lime")} glow={false} onPressStart={noop} onPressEnd={noop} onPressCancel={noop}/>
    <HeroCta label="CONTINUE" outlined onClick={noop}/>
    <HeroCta label="PLAY MATCH" helper="Pick a squad first" disabled/>
  </div>,
  "fuse-cta": () => <div className="catalog-stack">
    <FuseCta label="SAVE YOUR STREAK" helper="Closes in 02:14" fuse={0.35} accent={accent("orange")} onClick={noop}/>
    <FuseCta label="OPEN DAILY DROP" helper="Free pack ready" icon="spark" onClick={noop}/>
  </div>,
  pager: () => <Row label="STEP FLOW"><PagerButton label="Previous" leadingIcon="left" onClick={noop}/><PagerButton label="Next" trailingIcon="chevron" focal onClick={noop}/><PagerButton label="Submit" trailingIcon="check" focal disabled/></Row>,
  "action-chip": () => <Row label="INLINE"><ActionChip label="CLAIM" icon="check" accent={accent("gold")} onClick={noop}/><ActionChip label="VIEW" icon="arrow" onClick={noop}/><ActionChip label="RETRY" icon="refresh" accent={accent("orange")} onClick={noop}/><ActionChip label="LOCKED" icon="lock" disabled/></Row>,
  "icon-button": () => <Row label="ICON ONLY"><IconButton icon="search" label="Search"/><IconButton icon="share" label="Share" variant="surface"/><IconButton icon="close" label="Close" variant="tonal"/><ToggleDemo/><IconButton icon="trash" label="Delete" variant="tonal" accent={danger}/></Row>,
  "dialog-actions": () => <div className="catalog-dialogs">
    <div className="catalog-dialog"><div><strong>Leave the match?</strong><p>Your picks so far are kept.</p></div><DialogActions confirmLabel="Leave" onConfirm={noop} onCancel={noop}/></div>
    <div className="catalog-dialog"><div><strong>Delete this deck?</strong><p>This cannot be undone.</p></div><DialogActions confirmLabel="Delete" destructive onConfirm={noop} onCancel={noop}/></div>
  </div>,
  stepper: () => <StepperDemo/>,
  "selectable-tile": () => <TilesDemo/>,
  "control-pad": () => <HeldPads/>,
  badge: () => <Row label="STATUS"><Badge>FEATURED</Badge><Badge variant="outlined" accent={danger} pulse>LIVE</Badge><Badge variant="outlined" accent={accent("gold")}>REWARD</Badge></Row>,
  "status-pill": () => <Row label="STATE TAGS"><StatusPill label="Confirmed" accent="var(--ds-color-success)"/><StatusPill label="Owned" accent={accent("gold")}/><StatusPill label="Starter"/><StatusPill label="XP" value="1,240" accent={accent("violet")}/></Row>,
  "delta-chip": () => <Row label="MOVEMENT"><DeltaChip delta={6} suffix="TODAY"/><DeltaChip delta={-3} suffix="THIS WEEK"/><DeltaChip delta={0} suffix="NO CHANGE"/></Row>,
  progress: () => <div className="catalog-stack is-narrow"><Progress label="Home win probability" value={0.62}/><Progress label="Season progress" value={0.35} accent={accent("gold")} height={6}/></div>,
  "step-meter": () => <div className="catalog-stack is-narrow"><StepMeter label="Setup progress" total={6} active={2}/></div>,
  "signal-panel": () => <div className="catalog-panels">
    <SignalPanel tag={<Badge>FOOTBALL</Badge>} meta={<Badge variant="outlined" accent={danger} pulse>LIVE</Badge>} footer={<span className="catalog-footer">12.4K PICKS · SAMPLE</span>}>
      <strong className="catalog-panel-title">Harbor FC vs Northgate</strong><p className="catalog-panel-copy">Who takes the derby? Lock a pick before kick-off.</p>
    </SignalPanel>
    <SignalPanel accent={accent("gold")} tag={<Badge accent={accent("gold")}>REWARDS</Badge>} meta={<span className="catalog-footer">DAY 4</span>}>
      <strong className="catalog-panel-title">Daily drop</strong><p className="catalog-panel-copy">A calm panel: no footer, gold accent.</p>
    </SignalPanel>
  </div>,
  "accent-panel": () => <div className="catalog-panels">
    <AccentPanel><strong className="catalog-panel-title">Standard</strong><p className="catalog-panel-copy">Flat plate, both bottom corners cut.</p></AccentPanel>
    <AccentPanel glow accent={accent("violet")}><strong className="catalog-panel-title">Featured</strong><p className="catalog-panel-copy">The one panel that glows.</p></AccentPanel>
  </div>,
  "underline-tabs": () => <TabsDemo/>,
};

function CatalogCard({ entry }: { entry: CatalogEntry }) {
  const Demo = catalogDemos[entry.id];
  return <article className="catalog-card">
    <header><div><h3>{entry.name}</h3><code>{entry.component}</code></div><small>From {entry.from}</small></header>
    <div className="catalog-stage">{Demo?.()}</div>
    <p>{entry.use}</p>
    <ul className="guide-list">{entry.rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
  </article>;
}

export function ActionsSection() {
  return <div className="brand-system">
    <section><div className="section-header"><h2>Which action</h2><span className="muted-note">One focal action per surface.</span></div><ul className="guide-list">{actionHierarchy.map(rule => <li key={rule}>{rule}</li>)}</ul></section>
    <section><div className="section-header"><h2>States</h2><span className="muted-note">Every action shows all of these without losing its label.</span></div>
      <div className="guide-states">{actionStates.map(item => <div key={item.state}><strong>{item.state}</strong><small>{item.rule}</small></div>)}</div>
    </section>
    <div className="catalog-grid">{actionCatalog.map(entry => <CatalogCard key={entry.id} entry={entry}/>)}</div>
  </div>;
}

export function ComponentsSection() {
  return <div className="brand-system">
    <p className="muted-note">Status, feedback, surfaces and navigation from statoz_web and card_game, rebuilt on the studio tokens.</p>
    <div className="catalog-grid">{elementCatalog.map(entry => <CatalogCard key={entry.id} entry={entry}/>)}</div>
  </div>;
}
