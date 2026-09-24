"use client";
import { useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Status, feedback, surface and navigation elements ported from statoz_web's
 * design system (`Badge`, `Progress`, `StepMeter`, `SignalPanel`,
 * `AccentPanel`, `UnderlineTabs`) and card_game's cyber catalog
 * (`CyberStatusPill`, `CyberStatPill`, `CyberDeltaChip`). Styles live in
 * `elements.css`; the accent is a CSS color passed as `--el-accent`.
 */

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");
const accentStyle = (accent: string | undefined, style?: CSSProperties) => ({ ...(accent ? { "--el-accent": accent } : {}), ...style }) as CSSProperties;

/** A compact status label. `outlined` adds an edge and a dot; `pulse` marks genuinely live data. One outlined badge per surface. */
export function Badge({ children, accent, variant = "bare", pulse = false }: { children: ReactNode; accent?: string; variant?: "bare" | "outlined"; pulse?: boolean }) {
  return <span className={cx("el-badge", `el-badge-${variant}`, pulse && "is-pulse")} style={accentStyle(accent)}>{variant === "outlined" && <i aria-hidden/>}{children}</span>;
}

/** A state tag (CONFIRMED, STARTER, OWNED) as a tinted plate, optionally with a white tabular value. Never glows. */
export function StatusPill({ label, value, accent }: { label: string; value?: string; accent?: string }) {
  return <span className="el-pill" style={accentStyle(accent)}>{label}{value !== undefined && <b>{value}</b>}</span>;
}

/** Movement since a reference point: green ▲ up, red ▼ down, muted for no change. */
export function DeltaChip({ delta, suffix, decimals = 0 }: { delta: number; suffix?: string; decimals?: number }) {
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return <span className={`el-pill el-delta is-${direction}`}>{direction === "up" ? "▲" : direction === "down" ? "▼" : "■"}{Math.abs(delta).toFixed(decimals)}{suffix && ` ${suffix}`}</span>;
}

/** A thin accent meter for probabilities and completion. */
export function Progress({ value, label, accent, height = 4 }: { value: number; label: string; accent?: string; height?: number }) {
  const clamped = Math.min(1, Math.max(0, value));
  return <div className="el-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped * 100)} style={accentStyle(accent, { height })}><i style={{ width: `${clamped * 100}%` }}/></div>;
}

/** A paginated flow's position: green behind, amber here (the only glow), slate ahead. */
export function StepMeter({ total, active, label }: { total: number; active: number; label: string }) {
  const current = Math.min(Math.max(active, 0), total - 1);
  return <div className="el-steps" role="progressbar" aria-label={label} aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1} aria-valuetext={`Step ${current + 1} of ${total}`}>
    {Array.from({ length: total }, (_, index) => <i key={index} className={index < current ? "is-passed" : index === current ? "is-current" : undefined}/>)}
  </div>;
}

/**
 * The signature StatOz surface: a chamfered plate with a notched top edge, an
 * accent hairline, an accent lift beneath, a tag rail and an optional footer rail.
 */
export function SignalPanel({ accent, tag, meta, footer, lifted = true, children, className }: {
  accent?: string; tag?: ReactNode; meta?: ReactNode; footer?: ReactNode; lifted?: boolean; children?: ReactNode; className?: string;
}) {
  return <div className={cx("el-signal", lifted && "is-lifted", className)} style={accentStyle(accent)}>
    <div className="el-signal-body">
      <i className="el-signal-line" aria-hidden/>
      {(tag || meta) && <div className="el-signal-rail"><span>{tag}</span>{meta && <span>{meta}</span>}</div>}
      <div className="el-signal-content">{children}</div>
      {footer && <div className="el-signal-footer">{footer}</div>}
    </div>
  </div>;
}

/** A flat plate, square on top with both bottom corners cut, inside a one-pixel accent edge. `glow` for the one panel a screen wants seen first. */
export function AccentPanel({ accent, glow = false, children, className }: { accent?: string; glow?: boolean; children: ReactNode; className?: string }) {
  return <div className={cx("el-accent-panel", glow && "is-glow", className)} style={accentStyle(accent)}><div className="el-accent-shell"><div>{children}</div></div></div>;
}

/**
 * A flat tab strip whose only live element is a glowing underline. Lower-key than
 * FilterChips: for dense surfaces that already carry a focal element.
 */
export function UnderlineTabs({ tabs, active, onChange, label, accent }: { tabs: string[]; active: number; onChange: (index: number) => void; label: string; accent?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const cell = 100 / Math.max(tabs.length, 1);
  const go = (index: number) => { const next = (index + tabs.length) % tabs.length; refs.current[next]?.focus(); onChange(next); };
  return <div className="el-underline" role="tablist" aria-label={label} style={accentStyle(accent)}>
    {tabs.map((tab, index) => <button key={tab} ref={node => { refs.current[index] = node; }} type="button" role="tab" aria-selected={index === active} tabIndex={index === active ? 0 : -1} onClick={() => onChange(index)}
      onKeyDown={event => {
        const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
        if (next === null) return; event.preventDefault(); go(next);
      }}>{tab}</button>)}
    {active >= 0 && <i aria-hidden style={{ left: `${cell * active + cell * 0.18}%`, width: `${cell * 0.64}%` }}/>}
  </div>;
}
