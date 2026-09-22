import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from "react";
export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return <button {...props} className={`button button-${variant} ${className}`} />;
}
export function HudPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`hud-shell ${className}`}><div className="hud-fill">{children}</div></div>;
}
export function InputField({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="field"><span>{label}</span><input {...props} /></label>;
}
export function FilterChips({ options, selected, onSelect, label }: { options: string[]; selected: string; onSelect: (v: string) => void; label: string }) {
  return <div className="filter-chips" role="tablist" aria-label={label}>{options.map((option, index) => <button key={option} role="tab" aria-selected={selected === option} tabIndex={selected === option ? 0 : -1} onClick={() => onSelect(option)} onKeyDown={e => {
    const next = e.key === "ArrowRight" ? (index + 1) % options.length : e.key === "ArrowLeft" ? (index - 1 + options.length) % options.length : e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : -1;
    if (next < 0) return; e.preventDefault(); onSelect(options[next]); (e.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
  }}><span>{option}</span></button>)}</div>;
}
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    layers: <><path d="m12 3 10 5-10 5L2 8Z"/><path d="m2 12 10 5 10-5M2 16l10 5 10-5"/></>,
    deck: <><rect x="4" y="4" width="14" height="16" rx="1"/><path d="M8 1h12v16M7 9h8M7 13h6"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>, search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>, back: <path d="M19 12H5m5-5-5 5 5 5"/>,
    play: <path d="m8 5 12 7-12 7Z"/>, pause: <><path d="M8 5v14M16 5v14"/></>,
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/></>,
    folder: <path d="M3 6h7l2 3h9v11H3Z"/>, check: <path d="m5 12 4 4L19 6"/>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>, refresh: <><path d="M20 11a8 8 0 1 0 2 5"/><path d="M20 4v7h-7"/></>, undo: <><path d="M8 5 3 10l5 5M3 10h10a7 7 0 0 1 7 7"/></>,
    redo: <><path d="m16 5 5 5-5 5m5-5H11a7 7 0 0 0-7 7"/></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="1"/><path d="M16 8V3H3v13h5"/></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/></>,
    share: <><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4m-7.6 6.8 7.6 4.4"/></>,
    brand: <><path d="m12 2 9 5v10l-9 5-9-5V7Z"/><path d="m7 14 10-4m-8-3 6 10"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.spark}</svg>;
}
export function Tag({ children, color }: { children: ReactNode; color?: string }) { return <span className="tag" style={{ "--tag-accent": color } as CSSProperties}>{children}</span>; }
