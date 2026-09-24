"use client";
import { useState, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Icon } from "./ui";

/**
 * The StatOz action family, ported from statoz_web's `Button` and card_game's
 * cyber CTAs (`HudCtaButton`, `HudHoldCtaButton`, `CyberFuseCtaButton`,
 * `HudPagerButton`, `CyberObjectiveAction`, the confirm-dialog actions, the
 * stake stepper, `SelectableTile`, and the game control pads).
 *
 * Every chamfered action is the same construction: the element itself stays
 * unclipped (so a glow `filter` and focus handling survive), and two clipped
 * layers paint the accent edge and the fill inset inside it. Styles live in
 * `actions.css`; the accent is a CSS color passed as `--action-accent`.
 */

export type ActionVariant = "solid" | "tonal" | "surface" | "ghost";
export type ActionSize = "sm" | "md" | "lg";

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");
const accentStyle = (accent: string | undefined, style?: CSSProperties) => ({ ...(accent ? { "--action-accent": accent } : {}), ...style }) as CSSProperties;

type ActionLook = {
  /** `solid` is the primary action, `tonal` a tinted secondary, `surface` a neutral plate, `ghost` a bare label. */
  variant?: ActionVariant;
  size?: ActionSize;
  /** CSS color for the fill, edge and label. Defaults to cyan. */
  accent?: string;
  /** Blooms the accent. For the one focal action on a surface. */
  glow?: boolean;
  /** Shows a spinner in place of the trailing icon and blocks input. */
  pending?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
};

function lookClass({ variant = "solid", size = "md", glow, pending, fullWidth }: ActionLook, className?: string) {
  return cx("action", `action-${variant}`, `action-${size}`, glow && "is-glow", pending && "is-pending", fullWidth && "is-full", className);
}

function ActionContent({ leadingIcon, trailingIcon, pending, children }: ActionLook & { children: ReactNode }) {
  return <>
    {leadingIcon && <span className="action-icon" aria-hidden>{leadingIcon}</span>}
    <span className="action-label">{children}</span>
    {pending ? <span className="action-spinner" aria-hidden/> : trailingIcon && <span className="action-icon" aria-hidden>{trailingIcon}</span>}
  </>;
}

/** The chamfered action plate: primary, secondary, neutral and tertiary actions at three sizes. */
export function ActionButton({ variant, size, accent, glow, pending, leadingIcon, trailingIcon, fullWidth, className, style, children, disabled, type = "button", ...props }: ActionLook & ButtonHTMLAttributes<HTMLButtonElement>) {
  const look = { variant, size, glow, pending, fullWidth };
  return <button {...props} type={type} disabled={disabled || pending} aria-busy={pending || undefined} className={lookClass(look, className)} style={accentStyle(accent, style)}>
    <ActionContent leadingIcon={leadingIcon} trailingIcon={trailingIcon} pending={pending}>{children}</ActionContent>
  </button>;
}

/** An action that navigates or downloads: an anchor wearing the action plate. */
export function ActionLink({ variant, size, accent, glow, leadingIcon, trailingIcon, fullWidth, className, style, children, ...props }: Omit<ActionLook, "pending"> & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} className={lookClass({ variant, size, glow, fullWidth }, className)} style={accentStyle(accent, style)}>
    <ActionContent leadingIcon={leadingIcon} trailingIcon={trailingIcon}>{children}</ActionContent>
  </a>;
}

/**
 * The hero call to action (card_game `HudCtaButton`): a bright HUD plate with a
 * chevron compartment, a hairline divider and a centred label, breathing a halo
 * while it waits. Give it `pressedLabel` and the press callbacks for a
 * hold-to-charge action (`HudHoldCtaButton`): the copy says what releasing does.
 */
export function HeroCta({ label, helper, accent, icon = "chevrons", glow = true, outlined = false, disabled = false, onClick, pressedLabel, pressedHelper, onPressStart, onPressEnd, onPressCancel, className }: {
  label: string; helper?: string; accent?: string; icon?: string;
  /** The breathing halo. Turn it off on docks and setup flows that already have a focal element. */
  glow?: boolean;
  /** The calm secondary treatment: panel fill with accent content, no halo. */
  outlined?: boolean;
  disabled?: boolean; onClick?: () => void;
  pressedLabel?: string; pressedHelper?: string;
  onPressStart?: () => void; onPressEnd?: () => void; onPressCancel?: () => void;
  className?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const release = (commit: boolean) => { if (!pressed) return; setPressed(false); (commit ? onPressEnd : onPressCancel)?.(); };
  const shownLabel = pressed ? pressedLabel ?? label : label, shownHelper = pressed ? pressedHelper ?? helper : helper;
  return <button type="button" disabled={disabled} onClick={onClick}
    className={cx("hero-cta", outlined ? "is-outlined" : "is-filled", glow && !outlined && !disabled && "is-glow", pressed && "is-pressed", className)} style={accentStyle(accent)}
    onPointerDown={(event: PointerEvent<HTMLButtonElement>) => { if (disabled) return; if (onPressStart) event.currentTarget.setPointerCapture?.(event.pointerId); setPressed(true); onPressStart?.(); }}
    onPointerUp={() => release(true)} onPointerCancel={() => release(false)} onPointerLeave={() => release(false)}>
    <span className="hero-cta-icon" aria-hidden><Icon name={icon} size={26}/></span>
    <span className="hero-cta-divider" aria-hidden/>
    <span className="hero-cta-text"><strong>{shownLabel}</strong>{shownHelper && <small>{shownHelper}</small>}</span>
  </button>;
}

/**
 * A time-limited action (card_game `CyberFuseCtaButton`): a slanted accent core
 * carrying the icon, chasing chevrons, and a fuse along the bottom that burns
 * down to the time left. Use it when waiting has a cost.
 */
export function FuseCta({ label, helper, accent, icon = "flame", fuse, disabled = false, onClick, className }: {
  label: string; helper?: string; accent?: string; icon?: string;
  /** Remaining fraction, 0..1; omit to hide the fuse. */
  fuse?: number;
  disabled?: boolean; onClick?: () => void; className?: string;
}) {
  const remaining = fuse === undefined ? undefined : Math.min(1, Math.max(0, fuse));
  return <button type="button" disabled={disabled} onClick={onClick} className={cx("fuse-cta", !disabled && "is-glow", className)} style={accentStyle(accent)}>
    <span className="fuse-cta-core" aria-hidden><Icon name={icon} size={28}/></span>
    <span className="fuse-cta-text"><strong>{label}</strong>{helper && <small>{helper}</small>}</span>
    <span className="fuse-cta-chase" aria-hidden><Icon name="chevron" size={22}/><Icon name="chevron" size={22}/><Icon name="chevron" size={22}/></span>
    {remaining !== undefined && <span className="fuse-cta-fuse" role="meter" aria-label="Time left" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(remaining * 100)} style={{ "--fuse": remaining } as CSSProperties}><i/></span>}
  </button>;
}

/**
 * Step-flow navigation (card_game `HudPagerButton`): the forward action is the
 * focal bright plate, the backward one a calm dark plate. Use as a pair.
 */
export function PagerButton({ label, focal = false, leadingIcon, trailingIcon, accent, className, style, type = "button", ...props }: {
  label: string; focal?: boolean; leadingIcon?: string; trailingIcon?: string; accent?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return <button {...props} type={type} className={cx("pager-button", focal ? "is-focal" : "is-calm", className)} style={accentStyle(accent, style)}>
    {leadingIcon && <Icon name={leadingIcon} size={20}/>}<span>{label}</span>{trailingIcon && <Icon name={trailingIcon} size={20}/>}
  </button>;
}

/** A compact inline action with an icon (card_game `CyberObjectiveAction`): claim, view, retry. */
export function ActionChip({ label, icon, accent, className, style, type = "button", ...props }: {
  label: string; icon: string; accent?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return <button {...props} type={type} className={cx("action-chip", className)} style={accentStyle(accent, style)}><span><Icon name={icon} size={14}/>{label}</span></button>;
}

/** An icon-only action with a 44px target. The label is required: it is the accessible name and the tooltip. */
export function IconButton({ icon, label, variant = "ghost", accent, pressed, className, style, type = "button", ...props }: {
  icon: string; label: string; variant?: "ghost" | "surface" | "tonal"; accent?: string;
  /** Makes it a toggle: sets aria-pressed and lights the plate while on. */
  pressed?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return <button {...props} type={type} aria-label={label} title={label} aria-pressed={pressed} className={cx("icon-action", `icon-action-${variant}`, pressed && "is-on", className)} style={accentStyle(accent, style)}><Icon name={icon} size={20}/></button>;
}

/** The split action bar that closes a confirm dialog: cancel on the left, the accent confirm on the right. */
export function DialogActions({ confirmLabel, cancelLabel = "Cancel", onConfirm, onCancel, destructive = false, accent }: {
  confirmLabel: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void;
  /** Paints the confirm action in the danger color. */
  destructive?: boolean; accent?: string;
}) {
  return <div className="dialog-actions" style={accentStyle(destructive ? "var(--ds-color-danger)" : accent)}>
    <button type="button" className="dialog-action is-cancel" onClick={onCancel}>{cancelLabel}</button>
    <span aria-hidden/>
    <button type="button" className="dialog-action is-confirm" onClick={onConfirm}>{confirmLabel}<Icon name="chevron" size={14}/></button>
  </div>;
}

/** A bounded number with a step either way (statoz_web stake stepper). */
export function Stepper({ value, onChange, label, step = 1, min = 0, max = Number.POSITIVE_INFINITY, unit, accent }: {
  value: number; onChange: (value: number) => void; label: string;
  step?: number; min?: number; max?: number; unit?: string; accent?: string;
}) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  return <div className="stepper" role="group" aria-label={label} style={accentStyle(accent)}>
    <button type="button" className="stepper-button" aria-label={`Lower ${label.toLowerCase()} by ${step}`} disabled={value - step < min} onClick={() => set(value - step)}><Icon name="minus" size={18}/></button>
    <span className="stepper-value"><small>{label}</small><strong aria-live="polite">{value}{unit && <em>{unit}</em>}</strong></span>
    <button type="button" className="stepper-button" aria-label={`Raise ${label.toLowerCase()} by ${step}`} disabled={value + step > max} onClick={() => set(value + step)}><Icon name="plus" size={18}/></button>
  </div>;
}

/**
 * A picture-first choice (statoz_web `SelectableTile`, card_game
 * `CyberSelectableCard` / toss call buttons): a plate that takes an accent edge,
 * a soft glow and a corner seal once chosen.
 */
export function SelectableTile({ children, label, selected, onSelect, role = "radio", accent, dimmed = false, className }: {
  children: ReactNode; label: string; selected: boolean; onSelect: () => void;
  /** `radio` for one-of-many, `checkbox` for an independent on/off, `button` when it only sets focus. */
  role?: "radio" | "checkbox" | "button"; accent?: string;
  /** Calms a tile that is selectable but not yet in play. */
  dimmed?: boolean; className?: string;
}) {
  return <button type="button" role={role} aria-checked={role === "button" ? undefined : selected} aria-label={label} onClick={onSelect}
    className={cx("selectable-tile", selected && "is-selected", dimmed && "is-dimmed", className)} style={accentStyle(accent)}>
    {children}
    {selected && <span className="selectable-tile-seal" aria-hidden><Icon name="check" size={18}/></span>}
  </button>;
}

/**
 * A press-and-hold game input (statoz_web Hoop Duel direction pads): lit while
 * held, released on pointer up, cancel or leave. For play, never for navigation.
 */
export function ControlPad({ icon, label, disabled = false, onPressStart, onPressEnd, accent }: {
  icon: string; label: string; disabled?: boolean; onPressStart?: () => void; onPressEnd?: () => void; accent?: string;
}) {
  const [down, setDown] = useState(false);
  const up = () => { if (!down) return; setDown(false); onPressEnd?.(); };
  return <button type="button" aria-label={label} aria-pressed={down} disabled={disabled} className={cx("control-pad", down && "is-down")} style={accentStyle(accent)}
    onPointerDown={event => { event.currentTarget.setPointerCapture?.(event.pointerId); setDown(true); onPressStart?.(); }}
    onPointerUp={up} onPointerCancel={up} onPointerLeave={up}><Icon name={icon} size={30}/></button>;
}
