import type { ReactNode } from "react";
import type { LaunchGame, Sport } from "@/domain/project";
import { GrandPrixCar } from "./grand-prix";

/**
 * Landscape gameplay art for the launch template, one drawing per game, staged
 * from that game's in-match screen in the StatOz app. The 1600 × 900 board is
 * sliced to fit every art frame, so the focal action stays inside x 380–1220.
 * Names and numbers are illustrative; nobody drawn here is a real athlete.
 */
const C = {
  bg: "#0D111A", bg2: "#070C1F", card: "#0F172B", panel: "#1D293D", cyan: "#5CDFFF", violet: "#C27AFF",
  lime: "#51FF94", amber: "#FF8904", gold: "#FDC700", danger: "#FF4D4D", f1Red: "#F42D29", pink: "#FF94C1",
  muted: "#90A1B9", white: "#EAF0F7",
};
const display = "Orbitron, sans-serif", body = "Onest, sans-serif";
const cut = (x: number, y: number, w: number, h: number, c = 12) => `M${x + c} ${y}H${x + w}V${y + h - c}L${x + w - c} ${y + h}H${x}V${y + c}Z`;
const rand = (i: number) => { const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };

type TextProps = { x: number; y: number; size?: number; color?: string; anchor?: "start" | "middle" | "end"; font?: string; weight?: number; spacing?: number; opacity?: number; rotate?: number; children: ReactNode };
function T({ x, y, size = 18, color = C.white, anchor = "middle", font = display, weight = 800, spacing = 2, opacity, rotate, children }: TextProps) {
  return <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} fontFamily={font} fontWeight={weight} letterSpacing={spacing} opacity={opacity} transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}>{children}</text>;
}
function Panel({ x, y, w, h, stroke = C.panel, fill = "#0F172Be6", c = 16 }: { x: number; y: number; w: number; h: number; stroke?: string; fill?: string; c?: number }) {
  return <path d={cut(x, y, w, h, c)} fill={fill} stroke={stroke} strokeWidth="2"/>;
}
function Chip({ x, y, w, h = 44, label, color = C.cyan, solid = false, size = 16 }: { x: number; y: number; w: number; h?: number; label: ReactNode; color?: string; solid?: boolean; size?: number }) {
  return <g><path d={cut(x, y, w, h, 10)} fill={solid ? color : "#0D111Ae6"} stroke={color} strokeWidth="2"/><T x={x + w / 2} y={y + h / 2 + size * .36} size={size} color={solid ? C.bg2 : color}>{label}</T></g>;
}
/** The collectible-card silhouette, centred on (x, y). */
function Silhouette({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) {
  return <g transform={`translate(${x - 102 * s} ${y - 150 * s}) scale(${s})`} fill={fill}><circle cx="102" cy="65" r="34"/><path d="m69 105-43 36-21 91 34 9 25-77-4 96h89l-11-103 32 75 31-15-34-87-34-26-30 22Z"/></g>;
}
function Lock({ x, y, s = 1, color }: { x: number; y: number; s?: number; color: string }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={color} strokeWidth="3"><rect x="-11" y="-3" width="22" height="17" rx="3" fill={color} fillOpacity=".15"/><path d="M-6-3v-6a6 6 0 0 1 12 0v6"/></g>;
}
function Glow({ id, x, y, rx, ry, color, opacity = .5 }: { id: string; x: number; y: number; rx: number; ry: number; color: string; opacity?: number }) {
  return <><defs><radialGradient id={id}><stop offset="0" stopColor={color} stopOpacity={opacity}/><stop offset="1" stopColor={color} stopOpacity="0"/></radialGradient></defs><ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${id})`}/></>;
}
/** Dark app surface with a faint HUD grid, shared by the puzzle and daily games. */
function UiBackdrop({ id, color }: { id: string; color: string }) {
  return <><defs><pattern id={`${id}-grid`} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0v40" fill="none" stroke={C.muted} strokeWidth=".6" opacity=".12"/></pattern><linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.bg2}/><stop offset="1" stopColor={C.bg}/></linearGradient></defs>
    <rect width="1600" height="900" fill={`url(#${id}-bg)`}/><rect width="1600" height="900" fill={`url(#${id}-grid)`}/><Glow id={`${id}-glow`} x={800} y={380} rx={640} ry={380} color={color} opacity={.22}/></>;
}
function Brackets({ x, y, w, h, color, len = 26 }: { x: number; y: number; w: number; h: number; color: string; len?: number }) {
  return <path d={`M${x} ${y + len}V${y}H${x + len}M${x + w - len} ${y}H${x + w}V${y + len}M${x + w} ${y + h - len}V${y + h}H${x + w - len}M${x + len} ${y + h}H${x}V${y + h - len}`} fill="none" stroke={color} strokeWidth="4"/>;
}
function Stadium({ id }: { id: string }) {
  return <><defs><pattern id={`${id}-crowd`} width="22" height="18" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="4" fill={C.muted} opacity=".35"/><circle cx="17" cy="14" r="3.5" fill={C.muted} opacity=".22"/></pattern></defs>
    <rect width="1600" height="300" fill={C.bg2}/><rect y="40" width="1600" height="230" fill={`url(#${id}-crowd)`} opacity=".7"/><rect y="268" width="1600" height="8" fill={C.cyan} opacity=".25"/>
    <Glow id={`${id}-flood-a`} x={260} y={20} rx={380} ry={220} color="#ffffff" opacity={.28}/><Glow id={`${id}-flood-b`} x={1340} y={20} rx={380} ry={220} color="#ffffff" opacity={.28}/></>;
}

function DuelCard({ x, y, w, h, rating, pos, name, stats, color }: { x: number; y: number; w: number; h: number; rating: string; pos: string; name: string; stats: string; color: string }) {
  return <g>
    <path d={cut(x, y, w, h, 22)} fill={C.card} stroke={color} strokeWidth="4"/>
    <path d={cut(x + 10, y + 10, w - 20, h - 20, 16)} fill={color} opacity=".07"/>
    <Silhouette x={x + w / 2} y={y + h * .5} s={.95} fill={color}/>
    <T x={x + 24} y={y + 62} size={48} anchor="start" color={C.white}>{rating}</T><T x={x + 26} y={y + 88} size={14} anchor="start" color={color}>{pos}</T>
    <rect x={x + 2} y={y + h - 92} width={w - 4} height={90} fill={C.bg2} opacity=".92"/>
    <T x={x + w / 2} y={y + h - 54} size={19}>{name}</T><T x={x + w / 2} y={y + h - 24} size={14} font={body} weight={600} spacing={1} color={C.muted}>{stats}</T>
  </g>;
}
function PitchDuel() {
  const actions = [["+12", "QUICK PASS", -12], ["+15", "FINISH", 0], ["+9", "PRESS", 12]] as const;
  return <>
    <defs><linearGradient id="pd-pitch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#073222"/><stop offset=".6" stopColor="#061B22"/><stop offset="1" stopColor="#08111D"/></linearGradient></defs>
    <rect width="1600" height="900" fill="url(#pd-pitch)"/>
    {[0, 1, 2, 3, 4, 5].map(i => <rect key={i} y={140 + i * 130} width="1600" height="65" fill="#ffffff" opacity=".025"/>)}
    <g fill="none" stroke="#ffffff" strokeWidth="3" opacity=".16"><path d="M520 140 260 900M1080 140 1340 900M520 140H1080M340 470H1260"/><ellipse cx="800" cy="470" rx="210" ry="64"/><path d="M660 140V190H940V140"/></g>
    <Glow id="pd-flood" x={800} y={0} rx={900} ry={300} color="#ffffff" opacity={.16}/>
    <Chip x={1130} y={70} w={230} label="ROUND 03 / 04" color={C.cyan} solid/><Chip x={1130} y={124} w={230} label="YOU 2 : 1 CPU" color={C.white}/>
    <Panel x={560} y={84} w={480} h={70} stroke={C.cyan}/><T x={590} y={126} size={13} anchor="start" color={C.muted}>SCENARIO</T><T x={1012} y={128} size={22} anchor="end" color={C.cyan}>COUNTER ATTACK</T>
    <DuelCard x={420} y={196} w={260} h={360} rating="92" pos="ATK" name="THE PLAYMAKER" stats="PACE 94 · SKILL 91" color={C.cyan}/>
    <DuelCard x={920} y={196} w={260} h={360} rating="88" pos="DEF" name="THE ANCHOR" stats="PACE 82 · FORM 90" color={C.danger}/>
    <Glow id="pd-vs" x={800} y={376} rx={130} ry={130} color={C.cyan} opacity={.35}/>
    <circle cx="800" cy="376" r="62" fill={C.bg2} stroke={C.cyan} strokeWidth="4"/><T x={800} y={392} size={42} color={C.white}>VS</T>
    <T x={550} y={606} size={13} color={C.muted}>YOUR POWER</T><T x={550} y={652} size={44} color={C.cyan}>128</T>
    <T x={1050} y={606} size={13} color={C.muted}>CPU POWER</T><T x={1050} y={652} size={44} color={C.danger}>117</T>
    {actions.map(([value, label, angle], i) => <g key={label} transform={`rotate(${angle} 800 980)`}>
      <path d={cut(730, 600, 140, 190, 14)} fill={C.card} stroke={i === 1 ? C.cyan : C.panel} strokeWidth="3"/>
      <T x={800} y={662} size={36} color={i === 1 ? C.cyan : C.white}>{value}</T><T x={800} y={694} size={12} color={C.muted} spacing={1}>{label}</T>
    </g>)}
  </>;
}

function Keeper({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinecap="round">
    <path d="M-24-80-54 0M24-80 54 0" stroke="#1B2233" strokeWidth="22"/>
    <path d="M-36-160H36L42-78H-42Z" fill={C.amber}/><path d="M-36-150-104-196M36-150 104-196" stroke={C.amber} strokeWidth="18"/>
    <circle cx="-110" cy="-200" r="15" fill={C.lime}/><circle cx="110" cy="-200" r="15" fill={C.lime}/>
    <circle cx="0" cy="-188" r="24" fill="#2A3346"/><T x={0} y={-102} size={26} color={C.bg2}>1</T>
  </g>;
}
function PenaltyShootout() {
  const targets = [[500, 300, "LEFT"], [800, 262, "CENTER"], [1100, 300, "RIGHT"]] as const;
  return <>
    <Stadium id="ps"/>
    <defs><linearGradient id="ps-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0B3A26"/><stop offset="1" stopColor="#06231A"/></linearGradient>
      <pattern id="ps-net" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0v30" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity=".22"/></pattern></defs>
    <rect y="276" width="1600" height="624" fill="url(#ps-grass)"/>
    {[0, 1, 2, 3].map(i => <rect key={i} y={560 + i * 90} width="1600" height="45" fill="#ffffff" opacity=".03"/>)}
    <path d="M360 170 300 250V540M1240 170 1300 250V540M300 250H1300" fill="none" stroke="#ffffff" strokeWidth="3" opacity=".25"/>
    <rect x="360" y="170" width="880" height="370" fill="url(#ps-net)"/>
    <path d="M360 540V170H1240V540" fill="none" stroke="#ffffff" strokeWidth="14" strokeLinejoin="round"/>
    <path d="M160 640 260 540H1340L1440 640Z" fill="none" stroke="#ffffff" strokeWidth="3" opacity=".3"/><path d="M0 540H1600" stroke="#ffffff" strokeWidth="3" opacity=".35"/>
    <ellipse cx="800" cy="782" rx="10" ry="4" fill="#ffffff" opacity=".7"/>
    <Keeper x={800} y={540}/>
    <path d="M800 760Q1040 640 1100 300" fill="none" stroke={C.cyan} strokeWidth="4" strokeDasharray="12 12" opacity=".8"/>
    {targets.map(([x, y, label], i) => <g key={label} opacity={i === 2 ? 1 : .42}>
      {i === 2 && <Glow id="ps-aim" x={x} y={y} rx={110} ry={110} color={C.cyan} opacity={.5}/>}
      <circle cx={x} cy={y} r="52" fill="#0D111A99" stroke={C.cyan} strokeWidth="4"/><circle cx={x} cy={y} r="20" fill="none" stroke={C.cyan} strokeWidth="3"/>
      <path d={`M${x - 70} ${y}H${x - 40}M${x + 40} ${y}H${x + 70}M${x} ${y - 70}V${y - 40}M${x} ${y + 40}V${y + 70}`} stroke={C.cyan} strokeWidth="3"/>
      <T x={x} y={y + 102} size={14} color={C.cyan}>{label}</T>
    </g>)}
    <circle cx="800" cy="762" r="21" fill="#ffffff"/><path d="M800 752l8 6-3 9h-10l-3-9Z" fill="#1B2233"/>
    <g strokeLinecap="round"><path d="M578 900 594 760M660 900 646 760" stroke="#1B2233" strokeWidth="34"/><path d="M548 780Q556 660 620 650Q684 660 692 780Z" fill="#12304A"/><circle cx="620" cy="620" r="34" fill="#2A3346"/><T x={620} y={742} size={40} color={C.cyan}>9</T></g>
    <T x={800} y={132} size={16} color={C.cyan}>{"// ATTACK — YOUR SHOT"}</T>
    <Chip x={1160} y={64} w={200} label="PEN 2-1" color={C.cyan} solid size={18}/>
    {[["YOU", [1, 1, 0]], ["CPU", [1, 0, 1]]].map(([side, kicks], row) => <g key={side as string}>
      <T x={1160} y={146 + row * 36} size={14} anchor="start" color={C.muted}>{side as string}</T>
      {(kicks as number[]).concat([2, 2]).map((k, i) => <circle key={i} cx={1234 + i * 28} cy={141 + row * 36} r="9" fill={k === 1 ? C.lime : k === 0 ? C.danger : "none"} stroke={k === 2 ? C.muted : "none"} strokeWidth="2"/>)}
    </g>)}
  </>;
}

function FootballChess() {
  const top = 110, bottom = 760, rows = 4, cols = 3;
  const edge = (t: number) => ({ y: top + t * (bottom - top), left: 560 - t * 220, right: 1040 + t * 220 });
  const cell = (r: number, c: number) => { const t = (r + .5) / rows, e = edge(t); return { x: e.left + (c + .5) / cols * (e.right - e.left), y: e.y, s: .7 + .4 * t }; };
  const squad = [
    { r: 3, c: 0, n: "HALE", v: "84", you: true }, { r: 3, c: 2, n: "FIORE", v: "87", you: true }, { r: 2, c: 2, n: "OSEI", v: "89", you: true }, { r: 2, c: 1, n: "VANCE", v: "92", you: true, ball: true },
    { r: 0, c: 0, n: "KORA", v: "85", you: false }, { r: 0, c: 2, n: "LUND", v: "83", you: false }, { r: 1, c: 0, n: "RIOS", v: "88", you: false }, { r: 1, c: 1, n: "MARL", v: "86", you: false },
  ];
  const from = cell(2, 1), to = cell(1, 2);
  const rowLines = [0, 1, 2, 3, 4].map(r => edge(r / rows));
  return <>
    <defs><linearGradient id="fc-pitch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#073222"/><stop offset=".6" stopColor="#061B22"/><stop offset="1" stopColor="#08111D"/></linearGradient></defs>
    <rect width="1600" height="900" fill={C.bg2}/><Glow id="fc-glow" x={800} y={450} rx={760} ry={460} color={C.cyan} opacity={.14}/>
    <path d={`M560 ${top}H1040L1260 ${bottom}H340Z`} fill="url(#fc-pitch)" stroke="#ffffff" strokeOpacity=".4" strokeWidth="3"/>
    {[0, 1, 2, 3].map(r => r % 2 === 0 && <path key={r} d={`M${rowLines[r].left} ${rowLines[r].y}H${rowLines[r].right}L${rowLines[r + 1].right} ${rowLines[r + 1].y}H${rowLines[r + 1].left}Z`} fill="#ffffff" opacity=".035"/>)}
    <g stroke="#ffffff" strokeWidth="2" opacity=".2" fill="none">
      {[1, 3].map(r => <path key={r} d={`M${rowLines[r].left} ${rowLines[r].y}H${rowLines[r].right}`} strokeDasharray="6 10"/>)}
      {[1, 2].map(c => <path key={c} d={`M${560 + c / 3 * 480} ${top}L${340 + c / 3 * 920} ${bottom}`} strokeDasharray="6 10"/>)}
    </g>
    <path d={`M${rowLines[2].left} ${rowLines[2].y}H${rowLines[2].right}`} stroke="#ffffff" strokeWidth="3" opacity=".45"/><ellipse cx="800" cy={rowLines[2].y} rx="120" ry="44" fill="none" stroke="#ffffff" strokeWidth="3" opacity=".35"/>
    <rect x="740" y={top - 22} width="120" height="22" fill="none" stroke="#ffffff" strokeWidth="3" opacity=".6"/><rect x="720" y={bottom} width="160" height="26" fill="none" stroke="#ffffff" strokeWidth="3" opacity=".6"/>
    <path d={`M${from.x} ${from.y}Q${(from.x + to.x) / 2 + 30} ${(from.y + to.y) / 2 - 60} ${to.x} ${to.y}`} fill="none" stroke={C.cyan} strokeWidth="4" strokeDasharray="12 10"/>
    <circle cx={to.x} cy={to.y} r={34 * to.s} fill="none" stroke={C.cyan} strokeWidth="3" strokeDasharray="6 6"/>
    {squad.map(p => { const at = cell(p.r, p.c), color = p.you ? C.cyan : C.danger; return <g key={p.n}>
      {p.ball && <Glow id="fc-sel" x={at.x} y={at.y} rx={90 * at.s} ry={90 * at.s} color={C.cyan} opacity={.55}/>}
      <ellipse cx={at.x} cy={at.y + 36 * at.s} rx={32 * at.s} ry={8 * at.s} fill="#000" opacity=".35"/>
      <circle cx={at.x} cy={at.y} r={34 * at.s} fill={C.bg2} stroke={color} strokeWidth={p.ball ? 6 : 4}/>
      <T x={at.x} y={at.y + 8 * at.s} size={22 * at.s} color={C.white}>{p.v}</T>
      <path d={cut(at.x - 44 * at.s, at.y + 44 * at.s, 88 * at.s, 24 * at.s, 6)} fill={C.bg2} stroke={color} strokeWidth="1.5"/>
      <T x={at.x} y={at.y + 61 * at.s} size={12 * at.s} spacing={1} color={color}>{p.n}</T>
      {p.ball && <><circle cx={at.x + 40 * at.s} cy={at.y - 30 * at.s} r={10} fill="#ffffff"/><Glow id="fc-ball" x={at.x + 40 * at.s} y={at.y - 30 * at.s} rx={26} ry={26} color="#ffffff" opacity={.6}/></>}
    </g>; })}
    <Chip x={250} y={300} w={210} label="YOU 1 : 0 CPU" color={C.white}/><Chip x={250} y={356} w={210} label="YOUR MOVE" color={C.lime}/>
    <rect x="1120" y="84" width="240" height="14" fill={C.panel}/><rect x="1120" y="84" width="168" height="14" fill={C.cyan}/><T x={1360} y={130} size={16} anchor="end" color={C.muted}>07s</T>
    {["DRIBBLE", "PASS", "SHOOT"].map((label, i) => <Chip key={label} x={1180} y={330 + i * 74} w={190} h={56} label={label} color={C.cyan} solid={i === 1} size={17}/>)}
  </>;
}

function FinalOver() {
  const tokens = [["1", C.white], ["4", C.cyan], ["W", C.danger], ["6", C.gold], ["", C.muted], ["", C.muted]] as const;
  return <>
    <defs>
      <linearGradient id="fo-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0B1C2B"/><stop offset=".6" stopColor="#07131F"/><stop offset="1" stopColor="#030912"/></linearGradient>
      <radialGradient id="fo-field" cx=".5" cy="1" r="1"><stop offset="0" stopColor="#174348"/><stop offset=".55" stopColor="#0C3338"/><stop offset="1" stopColor="#06262D"/></radialGradient>
      <linearGradient id="fo-strip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6E5A3C"/><stop offset="1" stopColor="#9C7F52"/></linearGradient>
      <pattern id="fo-crowd" width="20" height="16" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="3.5" fill={C.muted} opacity=".3"/><circle cx="15" cy="12" r="3" fill={C.cyan} opacity=".14"/></pattern>
    </defs>
    <rect width="1600" height="900" fill="url(#fo-sky)"/>
    <Glow id="fo-flood" x={1200} y={60} rx={320} ry={240} color="#ffffff" opacity={.3}/>
    <g fill="#ffffff" opacity=".85">{[0, 1, 2, 3].map(i => <rect key={i} x={1160 + i * 22} y="36" width="16" height="12" rx="2"/>)}</g><path d="M1204 50V250" stroke="#0F2334" strokeWidth="8"/>
    <path d="M0 250Q800 170 1600 250V330H0Z" fill="#0F2334"/><path d="M0 268Q800 190 1600 268V330H0Z" fill="url(#fo-crowd)"/>
    <ellipse cx="800" cy="1060" rx="1150" ry="740" fill="url(#fo-field)"/>
    <ellipse cx="800" cy="1060" rx="1080" ry="690" fill="none" stroke="#ffffff" strokeWidth="3" opacity=".18"/>
    <path d="M770 340H830L1010 900H590Z" fill="url(#fo-strip)"/>
    <path d="M760 362H840M630 740H970" stroke="#ffffff" strokeWidth="4" opacity=".75"/>
    <g fill="#D6DEE6"><rect x="793" y="332" width="3" height="22"/><rect x="799" y="332" width="3" height="22"/><rect x="805" y="332" width="3" height="22"/></g>
    <g strokeLinecap="round"><path d="M822 350 828 322M836 350 830 322" stroke="#E7ECF2" strokeWidth="6"/><path d="M818 324H842L838 296H822Z" fill="#E7ECF2"/><path d="M838 300 856 272" stroke="#E7ECF2" strokeWidth="5"/><circle cx="830" cy="286" r="8" fill="#C9A27A"/></g>
    <path d="M735 610Q900 330 1130 250" fill="none" stroke={C.gold} strokeWidth="5" strokeDasharray="4 14" opacity=".8"/>
    <Glow id="fo-ball" x={1140} y={246} rx={60} ry={60} color="#C4342B" opacity={.7}/><circle cx="1140" cy="246" r="14" fill="#C4342B"/><path d="M1130 240Q1140 248 1150 240" stroke="#ffffff" strokeWidth="2" fill="none" opacity=".7"/>
    <g strokeLinecap="round">
      <path d="M676 800 690 660M728 800 718 660" stroke="#E7ECF2" strokeWidth="30"/>
      <path d="M660 670Q664 560 704 548Q744 560 748 670Z" fill="#1E6FD9"/>
      <path d="M720 580 752 612 740 628" stroke="#1E6FD9" strokeWidth="18" fill="none"/>
      <path d="M744 628 700 560" stroke="#D8B27A" strokeWidth="16"/><rect x="734" y="612" width="12" height="40" rx="4" transform="rotate(-34 740 632)" fill="#2A3346"/>
      <circle cx="704" cy="518" r="30" fill="#0B2A5A"/><path d="M676 520H732" stroke={C.cyan} strokeWidth="4"/>
    </g>
    <g fill="#D6DEE6"><rect x="772" y="740" width="10" height="150"/><rect x="795" y="740" width="10" height="150"/><rect x="818" y="740" width="10" height="150"/><rect x="770" y="732" width="30" height="7" rx="3"/><rect x="800" y="732" width="30" height="7" rx="3"/></g>
    <T x={420} y={130} size={72} anchor="start" color={C.white} spacing={0}>42</T><T x={522} y={130} size={36} anchor="start" color={C.muted} spacing={0}>/3</T>
    <Chip x={600} y={90} w={150} label="OVER 1/1" color={C.cyan} solid size={15}/>
    <T x={1180} y={112} size={34} anchor="end">NEED 12</T><T x={1180} y={140} size={14} anchor="end" color={C.muted}>OFF 4 BALLS</T>
    {tokens.map(([label, color], i) => <g key={i}><circle cx={640 + i * 64} cy="190" r="22" fill={label ? "#0D111Ae6" : "none"} stroke={color} strokeWidth="3" opacity={label ? 1 : .5}/>{label && <T x={640 + i * 64} y={198} size={20} color={color} spacing={0}>{label}</T>}</g>)}
    <T x={1090} y={420} size={120} color={C.gold} rotate={-8} spacing={4}>SIX</T><T x={1150} y={470} size={24} color={C.white} rotate={-8}>+6 RUNS</T>
  </>;
}

function HoopDuel() {
  const towers = Array.from({ length: 16 }, (_, i) => ({ x: i * 104 - 20, w: 70 + rand(i) * 60, h: 140 + rand(i + 40) * 260 }));
  return <>
    <defs>
      <linearGradient id="hd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#050814"/><stop offset="1" stopColor="#141A33"/></linearGradient>
      <linearGradient id="hd-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4A2E16"/><stop offset="1" stopColor="#1A0F08"/></linearGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#hd-sky)"/>
    {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={rand(i + 90) * 1600} cy={rand(i + 140) * 260} r={1 + rand(i + 7) * 1.6} fill="#ffffff" opacity={.3 + rand(i + 3) * .5}/>)}
    {towers.map((t, i) => <g key={i}><rect x={t.x} y={580 - t.h} width={t.w} height={t.h} fill="#0B1222"/>
      {Array.from({ length: Math.floor(t.h / 34) * 3 }, (_, k) => rand(i * 50 + k) > .62 && <rect key={k} x={t.x + 12 + (k % 3) * (t.w - 30) / 2.4} y={600 - t.h + Math.floor(k / 3) * 34} width="10" height="14" fill={rand(k + i) > .5 ? C.gold : C.cyan} opacity=".5"/>)}</g>)}
    <path d="M0 560Q60 530 120 560T240 560T360 560T480 560T600 560T720 560T840 560T960 560T1080 560T1200 560T1320 560T1440 560T1560 560T1680 560V610H0Z" fill="#070B14"/>
    <rect y="600" width="1600" height="300" fill="url(#hd-floor)"/>
    {[0, 1, 2, 3, 4, 5, 6].map(i => <path key={i} d={`M0 ${630 + i * 42}H1600`} stroke="#000" strokeWidth="2" opacity=".25"/>)}
    <Glow id="hd-reflect" x={800} y={700} rx={320} ry={90} color={C.gold} opacity={.22}/>
    <g fill="none" stroke={C.cyan} strokeWidth="4" opacity=".7"><path d="M640 610 560 900M960 610 1040 900"/><path d="M200 900Q260 610 800 610Q1340 610 1400 900"/><ellipse cx="800" cy="760" rx="190" ry="44" strokeDasharray="14 12"/></g>
    <rect x="788" y="340" width="24" height="270" fill="#232B3D"/>
    <rect x="680" y="200" width="240" height="150" fill="#ffffff" fillOpacity=".08" stroke="#232B3D" strokeWidth="10"/><rect x="760" y="262" width="80" height="60" fill="none" stroke="#ffffff" strokeWidth="4" opacity=".65"/>
    <rect x="750" y="146" width="100" height="46" fill="#070B14" stroke="#232B3D" strokeWidth="4"/><T x={800} y={181} size={30} color={C.danger}>14</T>
    <path d="M744 362 760 432H840L856 362" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity=".7"/><path d="M752 390H848M760 414H840M770 362 780 432M800 362V432M830 362 820 432" stroke="#ffffff" strokeWidth="2" opacity=".5"/>
    <ellipse cx="800" cy="362" rx="58" ry="12" fill="none" stroke={C.amber} strokeWidth="7"/>
    <path d="M520 360Q640 80 790 350" fill="none" stroke={C.gold} strokeWidth="4" strokeDasharray="10 12" opacity=".75"/>
    <Glow id="hd-ball" x={640} y={196} rx={70} ry={70} color={C.amber} opacity={.4}/><circle cx="640" cy="196" r="28" fill="#D9731F" stroke="#5B2C07" strokeWidth="3"/><path d="M612 196H668M640 168V224M620 176Q640 196 620 216M660 176Q640 196 660 216" stroke="#5B2C07" strokeWidth="2.5" fill="none"/>
    <g strokeLinecap="round"><path d="M462 680 480 560M512 690 506 560" stroke="#1D293D" strokeWidth="26"/><path d="M458 570Q456 440 492 430Q530 440 530 570Z" fill="#1D293D" stroke={C.gold} strokeWidth="3"/><path d="M470 450 490 360M516 450 530 360" stroke="#1D293D" strokeWidth="20"/><circle cx="494" cy="400" r="28" fill="#2A3346"/><T x={494} y={530} size={30} color={C.gold}>23</T></g>
    <ellipse cx="490" cy="740" rx="70" ry="12" fill="#000" opacity=".4"/>
    <T x={870} y={484} size={26} anchor="start" color={C.lime} rotate={-6}>PERFECT RELEASE</T>
    <rect x="1280" y="270" width="36" height="360" fill={C.bg2} stroke={C.panel} strokeWidth="3"/><rect x="1283" y="320" width="30" height="52" fill={C.lime} opacity=".85"/><rect x="1283" y="372" width="30" height="255" fill={C.gold} opacity=".25"/><path d="M1268 344H1328" stroke="#ffffff" strokeWidth="4"/>
    <T x={1298} y={666} size={12} color={C.muted} spacing={1}>RELEASE IN LIME</T>
    <Panel x={540} y={50} w={520} h={78} stroke={C.gold}/><T x={570} y={102} size={30} anchor="start">YOU 18</T><T x={800} y={86} size={11} color={C.muted}>2ND HALF</T><T x={800} y={112} size={20} color={C.gold}>0:42</T><T x={1030} y={102} size={30} anchor="end">16 CPU</T>
    <Chip x={1080} y={66} w={170} label="ON FIRE" color={C.gold}/>
  </>;
}

function GrandPrixDash() {
  const track = "M800 980V600C800 420 940 380 940 180V-80";
  return <>
    <defs><pattern id="gp-check" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#ffffff"/><rect x="20" y="20" width="20" height="20" fill="#ffffff"/><rect x="20" width="20" height="20" fill="#000"/><rect y="20" width="20" height="20" fill="#000"/></pattern></defs>
    <rect width="1600" height="900" fill="#07230F"/>
    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <rect key={i} y={i * 120} width="1600" height="60" fill="#ffffff" opacity=".02"/>)}
    <path d={track} fill="none" stroke="#ffffff" strokeWidth="440"/><path d={track} fill="none" stroke={C.f1Red} strokeWidth="440" strokeDasharray="34 34"/>
    <path d={track} fill="none" stroke="#11161F" strokeWidth="404"/>
    <path d={track} fill="none" stroke={C.cyan} strokeWidth="396" opacity=".25"/><path d={track} fill="none" stroke="#11161F" strokeWidth="388"/>
    <path d={track} fill="none" stroke="#ffffff" strokeWidth="4" strokeDasharray="40 50" opacity=".25"/>
    <rect x="606" y="740" width="388" height="40" fill="url(#gp-check)"/>
    <g stroke={C.cyan} strokeWidth="3" opacity=".45" strokeLinecap="round"><path d="M930 360 870 470M965 370 915 500M900 350 830 450"/></g>
    <GrandPrixCar x={915} y={250} scale={.9} rotation={18} primary="#d8232a" accent="#ffe24a"/>
    <GrandPrixCar x={660} y={880} scale={.95} rotation={-2} primary="#ff8000" accent="#2a9df4"/>
    <GrandPrixCar x={818} y={560} scale={1.05} rotation={6} primary="#0a0e14" accent="#35e7ff" player/>
    <Chip x={920} y={520} w={110} h={40} label="TOW" color={C.cyan} solid size={15}/>
    <T x={330} y={170} size={96} anchor="start" spacing={0}>P3</T><T x={470} y={170} size={40} anchor="start" color={C.muted} spacing={0}>/10</T>
    <Panel x={1170} y={64} w={196} h={186} stroke={C.panel}/><T x={1340} y={140} size={60} anchor="end" spacing={0}>285</T><T x={1340} y={168} size={15} anchor="end" color={C.muted}>KPH</T>
    <Chip x={1194} y={188} w={148} label="LAP 1/3" color={C.f1Red} solid size={15}/>
    <T x={560} y={450} size={30} color={C.gold} rotate={-4}>OVERTAKE +1</T>
  </>;
}

function TennisRally() {
  const at = (t: number) => ({ y: 290 + t * 590, left: 600 - t * 300, right: 1000 + t * 300 });
  const net = at(.36), far = at(0), near = at(1);
  const inset = (e: ReturnType<typeof at>, f: number) => [e.left + (e.right - e.left) * f, e.right - (e.right - e.left) * f];
  const service = [at(.16), at(.64)];
  return <>
    <defs>
      <linearGradient id="tr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#101F2B"/><stop offset=".5" stopColor="#0D111A"/><stop offset="1" stopColor="#040814"/></linearGradient>
      <linearGradient id="tr-court" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#164B50"/><stop offset="1" stopColor="#0B303B"/></linearGradient>
      <pattern id="tr-crowd" width="18" height="34" patternUnits="userSpaceOnUse"><circle cx="9" cy="10" r="3.5" fill={C.cyan} opacity=".22"/></pattern>
      <pattern id="tr-net" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0v12" fill="none" stroke="#ffffff" strokeWidth="1" opacity=".3"/></pattern>
      <radialGradient id="tr-ball"><stop offset="0" stopColor="#F5FF8B"/><stop offset="1" stopColor="#A8D520"/></radialGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#tr-sky)"/><rect y="70" width="1600" height="136" fill="url(#tr-crowd)"/>
    <rect y="220" width="1600" height="50" fill="#0B1624"/><rect y="266" width="1600" height="4" fill={C.cyan} opacity=".35"/>
    <rect y="270" width="1600" height="630" fill="#0A2830"/>
    <path d={`M${far.left} ${far.y}H${far.right}L${near.right} ${near.y}H${near.left}Z`} fill="url(#tr-court)" stroke="#ffffff" strokeWidth="4" opacity=".95"/>
    <g stroke="#ffffff" strokeWidth="3" opacity=".8" fill="none">
      <path d={`M${inset(far, .12)[0]} ${far.y}L${inset(near, .12)[0]} ${near.y}M${inset(far, .12)[1]} ${far.y}L${inset(near, .12)[1]} ${near.y}`}/>
      {service.map((s, i) => <path key={i} d={`M${inset(s, .12)[0]} ${s.y}H${inset(s, .12)[1]}`}/>)}
      <path d={`M800 ${service[0].y}V${service[1].y}`}/>
    </g>
    <path d={`M${net.left - 20} ${net.y - 44}H${net.right + 20}V${net.y}H${net.left - 20}Z`} fill="url(#tr-net)"/><path d={`M${net.left - 20} ${net.y - 44}H${net.right + 20}`} stroke="#ffffff" strokeWidth="6"/>
    <path d={`M${net.left - 20} ${net.y + 4}V${net.y - 50}M${net.right + 20} ${net.y + 4}V${net.y - 50}`} stroke="#2A3346" strokeWidth="8"/>
    <g strokeLinecap="round"><path d="M880 296 874 262M894 296 898 262" stroke="#1D293D" strokeWidth="8"/><path d="M870 266Q870 232 886 228Q902 232 902 266Z" fill="#FF8E4F"/><circle cx="886" cy="218" r="10" fill="#8F5738"/><path d="M902 240 924 220" stroke="#8F5738" strokeWidth="5"/><ellipse cx="930" cy="212" rx="9" ry="12" fill="none" stroke={C.white} strokeWidth="3"/></g>
    <path d="M700 640Q800 180 990 380" fill="none" stroke={C.lime} strokeWidth="3" strokeDasharray="8 12" opacity=".7"/>
    <ellipse cx="930" cy="420" rx="16" ry="5" fill="#000" opacity=".4"/>
    <Glow id="tr-glow" x={870} y={318} rx={50} ry={50} color="#F5FF8B" opacity={.7}/><circle cx="870" cy="318" r="14" fill="url(#tr-ball)"/>
    <g strokeLinecap="round"><path d="M600 900 616 780M664 900 650 780" stroke="#E7ECF2" strokeWidth="30"/><path d="M580 790Q584 690 632 680Q680 690 684 790Z" fill="#1E6FD9"/><path d="M680 710 720 650" stroke="#C9A27A" strokeWidth="16"/><path d="M720 650 740 610" stroke="#2A3346" strokeWidth="8"/><ellipse cx="752" cy="580" rx="26" ry="36" transform="rotate(30 752 580)" fill="none" stroke={C.lime} strokeWidth="6"/><circle cx="632" cy="650" r="30" fill="#8F5738"/><path d="M604 640Q632 612 660 640" stroke={C.white} strokeWidth="8" fill="none"/></g>
    <Panel x={1060} y={50} w={310} h={116} stroke={C.lime}/>
    {[["YOU", "6", "4", "40"], ["CPU", "4", "4", "40"]].map((row, r) => <g key={row[0]}>{row.map((cellText, c) => <T key={c} x={c === 0 ? 1086 : 1210 + (c - 1) * 56} y={98 + r * 44} size={22} anchor={c === 0 ? "start" : "middle"} color={c === 3 ? C.lime : C.white} spacing={1}>{cellText}</T>)}</g>)}
    <Chip x={1060} y={180} w={130} h={40} label="DEUCE" color={C.lime} solid size={15}/>
    <rect x="1290" y="300" width="34" height="320" fill={C.bg2} stroke={C.panel} strokeWidth="3"/><rect x="1293" y="380" width="28" height="56" fill={C.lime} opacity=".85"/><path d="M1276 404H1338" stroke="#ffffff" strokeWidth="4"/>
    <T x={1307} y={656} size={12} color={C.muted} spacing={1}>RELEASE IN GREEN</T>
  </>;
}

const quizzes: Record<Sport, { q: string[]; answers: string[]; locked: number }> = {
  football: { q: ["HOW MANY PLAYERS START", "FOR EACH SIDE?"], answers: ["9", "10", "11", "12"], locked: 2 },
  cricket: { q: ["HOW MANY LEGAL BALLS", "MAKE ONE OVER?"], answers: ["4", "5", "6", "8"], locked: 2 },
  basketball: { q: ["HOW MANY PLAYERS PER", "SIDE ARE ON COURT?"], answers: ["4", "5", "6", "7"], locked: 1 },
  tennis: { q: ["WHAT COMES AFTER 30", "IN A TENNIS GAME?"], answers: ["35", "40", "45", "50"], locked: 1 },
  motorsport: { q: ["WHICH FLAG ENDS", "THE RACE?"], answers: ["RED", "YELLOW", "CHEQUERED", "BLUE"], locked: 2 },
};
function Quiz({ sport }: { sport: Sport }) {
  const quiz = quizzes[sport];
  return <>
    <UiBackdrop id="qz" color={C.violet}/>
    <Panel x={440} y={60} w={720} h={70} stroke={C.panel}/>
    {[["QUESTION", "04/10"], ["STREAK", "3"], ["XP EARNED", "240"]].map(([label, value], i) => <g key={label}>
      {i > 0 && <path d={`M${440 + i * 240} 76V114`} stroke={C.panel} strokeWidth="2"/>}
      <T x={560 + i * 240} y={90} size={11} color={C.muted}>{label}</T><T x={560 + i * 240} y={118} size={22} color={i === 1 ? C.violet : C.white}>{value}</T>
    </g>)}
    <Panel x={440} y={156} w={720} h={200} stroke={C.panel} fill="#0F172Bf0"/><Brackets x={452} y={168} w={696} h={176} color={C.violet}/>
    <T x={800} y={204} size={12} color={C.violet}>ANSWER LOCKED</T>
    {quiz.q.map((line, i) => <T key={i} x={800} y={262 + i * 44} size={30}>{line}</T>)}
    {quiz.answers.map((answer, i) => { const x = 440 + (i % 2) * 370, y = 382 + Math.floor(i / 2) * 118, on = i === quiz.locked; return <g key={answer}>
      {on && <Glow id="qz-lock" x={x + 175} y={y + 50} rx={240} ry={90} color={C.violet} opacity={.4}/>}
      <path d={cut(x, y, 350, 100, 14)} fill={on ? "#2A1D40" : C.card} stroke={on ? C.violet : C.panel} strokeWidth={on ? 4 : 2}/>
      <path d={cut(x + 20, y + 26, 48, 48, 8)} fill={on ? C.violet : C.panel}/><T x={x + 44} y={y + 58} size={20} color={on ? C.bg2 : C.muted}>{"ABCD"[i]}</T>
      <T x={x + 94} y={y + 62} size={26} anchor="start" color={on ? C.violet : C.white}>{answer}</T>
      {on && <path d={`M${x + 300} ${y + 50}l12 12 22-24`} fill="none" stroke={C.violet} strokeWidth="5" strokeLinecap="round"/>}
    </g>; })}
    <Chip x={690} y={630} w={220} h={52} label="NEXT" color={C.violet} solid size={18}/>
  </>;
}

function Shield({ x, y, colors, star = false }: { x: number; y: number; colors: [string, string]; star?: boolean }) {
  return <g transform={`translate(${x} ${y})`}><path d="M-38-44H38V6Q38 36 0 52Q-38 36-38 6Z" fill={colors[0]} stroke="#ffffff" strokeWidth="3" strokeOpacity=".5"/><path d="M-38-10H38V8H-38Z" fill={colors[1]}/>{star && <path d="m0-34 6 12 13 2-9 9 2 13L0-4l-12 6 2-13-9-9 13-2Z" fill="#ffffff" opacity=".85"/>}</g>;
}
function Flag({ x, y, colors }: { x: number; y: number; colors: [string, string, string] }) {
  return <g transform={`translate(${x} ${y})`}>{colors.map((color, i) => <rect key={i} x={-44} y={-30 + i * 20} width="88" height="20" fill={color}/>)}<rect x="-44" y="-30" width="88" height="60" fill="none" stroke="#ffffff" strokeWidth="2" opacity=".4"/></g>;
}
function FootballBingo() {
  const cx = (c: number) => 690 + c * 144, cy = (r: number) => 340 + r * 144;
  const cells = [["VANCE", "", "OSEI"], ["", "active", "BRANDT"], ["FIORE", "", "HALE"]];
  return <>
    <UiBackdrop id="fb" color={C.amber}/>
    <Panel x={470} y={56} w={660} h={60} stroke={C.amber}/><T x={500} y={95} size={20} anchor="start" color={C.amber}>BINGO GRID</T><T x={880} y={95} size={20} color={C.white}>01:24</T><T x={1100} y={95} size={16} anchor="end" color={C.muted}>6 / 9</T>
    {([["#1E6FD9", "#ffffff"], [C.danger, C.bg2], ["#0B7A4B", C.gold]] as [string, string][]).map((colors, c) => <Shield key={c} x={cx(c)} y={196} colors={colors} star={c === 1}/>)}
    {([["#ffffff", C.danger, "#ffffff"], [C.gold, "#1E6FD9", C.danger], ["#0B7A4B", "#ffffff", C.amber]] as [string, string, string][]).map((colors, r) => <Flag key={r} x={544} y={cy(r)} colors={colors}/>)}
    {cells.map((row, r) => row.map((name, c) => { const x = cx(c) - 64, y = cy(r) - 64; return <g key={`${r}-${c}`}>
      {name === "active" ? <><Glow id="fb-active" x={cx(c)} y={cy(r)} rx={120} ry={120} color={C.amber} opacity={.4}/><path d={cut(x, y, 128, 128, 12)} fill="#2A1A0A" stroke={C.amber} strokeWidth="4" strokeDasharray="10 8"/><T x={cx(c)} y={cy(r) + 8} size={16} color={C.amber}>PLACE</T></>
        : name ? <><path d={cut(x, y, 128, 128, 12)} fill={C.card} stroke={C.amber} strokeWidth="2.5"/><Silhouette x={cx(c)} y={cy(r) + 18} s={.34} fill={C.amber}/><rect x={x + 2} y={y + 94} width="124" height="32" fill={C.bg2}/><T x={cx(c)} y={y + 116} size={13} spacing={1}>{name}</T></>
          : <><path d={cut(x, y, 128, 128, 12)} fill={C.bg2} stroke={C.panel} strokeWidth="2"/><T x={cx(c)} y={cy(r) + 6} size={13} color={C.muted}>EMPTY</T></>}
    </g>; }))}
    <Panel x={1090} y={264} w={240} h={290} stroke={C.amber}/><T x={1210} y={300} size={12} color={C.muted}>ACTIVE PLAYER</T>
    <Silhouette x={1210} y={420} s={.62} fill={C.amber}/><T x={1210} y={504} size={20}>R. MARLOWE</T><T x={1210} y={532} size={13} color={C.muted} font={body} weight={600} spacing={1}>MIDFIELDER</T>
  </>;
}

function GuessPlayer() {
  const guesses = [["J. MARLOWE", "POSITION ✓"], ["T. ADEYEMI", "CLUB ✓"]];
  return <>
    <UiBackdrop id="gpl" color={C.pink}/>
    <defs><pattern id="gpl-scan" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="3" fill={C.pink} opacity=".25"/></pattern></defs>
    <Chip x={600} y={56} w={290} label="GUESS THE PLAYER" color={C.pink}/><Chip x={906} y={56} w={100} label="LIVE" color={C.lime} solid size={15}/>
    <Panel x={380} y={130} w={380} h={500} stroke={C.pink}/><Brackets x={396} y={146} w={348} h={468} color={C.pink} len={22}/>
    <T x={570} y={186} size={14} color={C.pink}>IDENTITY ENCRYPTED</T>
    <Glow id="gpl-glow" x={570} y={400} rx={170} ry={200} color={C.pink} opacity={.35}/>
    <Silhouette x={570} y={420} s={1.25} fill={C.pink}/><Silhouette x={570} y={420} s={1.25} fill="url(#gpl-scan)"/>
    <Chip x={500} y={566} w={140} h={40} label="HARD" color={C.pink} solid size={14}/>
    <T x={820} y={170} size={13} anchor="start" color={C.muted}>CAREER PATH</T>
    <path d="M856 232H1234" stroke={C.pink} strokeWidth="3" strokeDasharray="8 8"/>
    {[0, 1, 2, 3].map(i => <g key={i}><circle cx={856 + i * 126} cy="232" r="36" fill={C.bg2} stroke={i === 0 ? C.pink : C.panel} strokeWidth="3"/>{i === 0 ? <Shield x={856} y={234} colors={[C.pink, C.bg2]}/> : <Lock x={856 + i * 126} y={230} s={1.2} color={C.muted}/>}</g>)}
    <Chip x={820} y={300} w={220} h={44} label="POSITION · 50 OZ" color={C.pink} size={13}/><Chip x={1056} y={300} w={214} h={44} label="NATION · 80 OZ" color={C.pink} size={13}/>
    <Panel x={820} y={380} w={450} h={68} stroke={C.pink}/><circle cx="858" cy="412" r="12" fill="none" stroke={C.pink} strokeWidth="3"/><path d="M867 421 878 432" stroke={C.pink} strokeWidth="3"/>
    <T x={896} y={421} size={16} anchor="start" color={C.muted} font={body} weight={600} spacing={1}>SEARCH PLAYER</T>
    {guesses.map(([name, hint], i) => <g key={name}><Panel x={820} y={474 + i * 70} w={450} h={56} stroke={C.panel} c={10}/><T x={848} y={510 + i * 70} size={18} anchor="start" color={C.danger}>✕</T><T x={884} y={510 + i * 70} size={17} anchor="start">{name}</T><T x={1250} y={509 + i * 70} size={12} anchor="end" color={C.lime}>{hint}</T></g>)}
  </>;
}

function Helmet({ x, y, color }: { x: number; y: number; color: string }) {
  return <g transform={`translate(${x} ${y})`} opacity=".18"><path d="M-150 60Q-160-120 20-130Q160-128 170 20L160 70H-140Z" fill={color}/><path d="M-40-40H150Q160 0 150 20H-30Z" fill={C.bg2}/></g>;
}
function Trophy({ x, y, color }: { x: number; y: number; color: string }) {
  return <g transform={`translate(${x} ${y})`} opacity=".18" fill={color}><path d="M-90-140H90Q90 10 0 40Q-90 10-90-140Z"/><path d="M-90-110Q-150-110-140-50Q-130-10-80 0M90-110Q150-110 140-50Q130-10 80 0" fill="none" stroke={color} strokeWidth="16"/><rect x="-16" y="40" width="32" height="60"/><rect x="-70" y="100" width="140" height="30"/></g>;
}
function CaseFile({ variant }: { variant: "driver" | "winner" }) {
  const driver = variant === "driver", accent = driver ? C.pink : C.cyan;
  const words = driver ? [5, 7] : [6, 6];
  const clues = driver ? ["YEAR", "TRACK", "COUNTRY"] : ["YEAR", "TOURNAMENT", "CATEGORY"];
  const blockW = 52, gap = 10, wordGap = 40;
  const total = words.reduce((sum, n) => sum + n * (blockW + gap) - gap, 0) + wordGap * (words.length - 1);
  let cursor = 800 - total / 2;
  const blocks = words.flatMap((n, w) => { const start = cursor; cursor += n * (blockW + gap) - gap + wordGap; return Array.from({ length: n }, (_, i) => ({ x: start + i * (blockW + gap), key: `${w}-${i}` })); });
  return <>
    <UiBackdrop id={`cf-${variant}`} color={accent}/>
    {driver ? <Helmet x={1330} y={640} color={accent}/> : <Trophy x={1330} y={620} color={accent}/>}
    <Panel x={380} y={70} w={840} h={580} stroke={accent}/>
    <rect x="382" y="72" width="836" height="52" fill={accent} opacity=".14"/>
    <T x={410} y={106} size={15} anchor="start" color={accent}>{driver ? "PIT WALL // ENCRYPTED" : "COURT INTEL // ENCRYPTED"}</T><T x={1190} y={106} size={15} anchor="end" color={C.muted}>CASE 214</T>
    <T x={800} y={186} size={34}>{driver ? "GRAND PRIX WINNER" : "GRAND SLAM CHAMPION"}</T><T x={800} y={220} size={13} color={C.muted}>ATTEMPT 3 / 10</T>
    {blocks.map((b, i) => <g key={b.key}><path d={cut(b.x, 254, blockW, 64, 8)} fill={i === 0 || i === 7 ? "#1D293D" : C.bg2} stroke={i === 0 || i === 7 ? accent : C.panel} strokeWidth="2.5"/><T x={b.x + blockW / 2} y={296} size={22} color={i === 0 || i === 7 ? accent : C.panel}>?</T></g>)}
    {clues.map((clue, i) => <g key={clue}><Panel x={420 + i * 262} y={352} w={236} h={104} stroke={i === 0 ? accent : C.panel} c={12}/><T x={538 + i * 262} y={390} size={12} color={C.muted}>{clue}</T>
      {i === 0 ? <T x={538 + i * 262} y={428} size={22} color={accent}>HINT 1</T> : <Lock x={538 + i * 262} y={420} s={1.3} color={C.muted}/>}</g>)}
    <Panel x={420} y={494} w={500} h={68} stroke={C.panel}/><circle cx="458" cy="526" r="12" fill="none" stroke={C.muted} strokeWidth="3"/><path d="M467 535 478 546" stroke={C.muted} strokeWidth="3"/>
    <T x={494} y={535} size={15} anchor="start" color={C.muted} font={body} weight={600} spacing={1}>SEARCH CHAMPION DATABASE</T>
    <Chip x={940} y={494} w={240} h={68} label="LOCK WINNER" color={accent} solid size={17}/>
  </>;
}

export function GameArt({ game, sport }: { game: LaunchGame; sport: Sport }) {
  const art = game === "pitch-duel" ? <PitchDuel/> : game === "penalty-shootout" ? <PenaltyShootout/> : game === "football-chess" ? <FootballChess/>
    : game === "final-over" ? <FinalOver/> : game === "hoop-duel" ? <HoopDuel/> : game === "grand-prix-dash" ? <GrandPrixDash/> : game === "tennis-rally" ? <TennisRally/>
      : game === "quiz" ? <Quiz sport={sport}/> : game === "football-bingo" ? <FootballBingo/> : game === "guess-player" ? <GuessPlayer/> : <CaseFile variant={game === "guess-driver" ? "driver" : "winner"}/>;
  return <svg className="game-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{art}</svg>;
}
