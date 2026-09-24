import type { JSX } from "react";
import type { AppScreenTheme } from "@/domain/app-screens";

/**
 * Category backgrounds for the App showcase, drawn behind the phone in the theme's
 * accent. Every mark is static, so preview and export match at any frame. The
 * 1000 × 1000 drawing is centred on the phone and sliced to fill each ratio. Tall
 * placements get a taller viewBox, so the full width shows instead of a cropped middle
 * and the drawing still centres on the phone, about 59% down the frame.
 */
const cx = 500, cy = 590;

/** Stadium tiers and two floodlight beams meeting on the phone. */
function Arena() {
  return <>
    <path className="beam" d="M40 -20L150 -20L520 590L470 590Z"/>
    <path className="beam" d="M960 -20L850 -20L480 590L530 590Z"/>
    {[160, 250, 340, 430, 520].map((rx, i) => <ellipse key={rx} cx={cx} cy={cy + 250} rx={rx} ry={rx * .3} className={i === 0 ? "strong" : undefined}/>)}
    {Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (i / 12); return <line key={i} x1={cx + Math.cos(a) * 160} y1={cy + 250 + Math.sin(a) * 48} x2={cx + Math.cos(a) * 520} y2={cy + 250 + Math.sin(a) * 156}/>; })}
  </>;
}

/** A full pitch plan with mown stripes, running under the phone. */
function Pitch() {
  return <>
    {Array.from({ length: 8 }, (_, i) => i % 2 === 0 && <rect key={i} className="fill" x="170" y={130 + i * 115} width="660" height="115"/>)}
    <rect className="strong" x="170" y="130" width="660" height="920"/>
    <line x1="170" y1={cy} x2="830" y2={cy}/>
    <circle cx={cx} cy={cy} r="105"/><circle className="dot" cx={cx} cy={cy} r="5"/>
    <rect x="330" y="130" width="340" height="150"/><rect x="415" y="130" width="170" height="55"/>
    <path d="M430 280A80 80 0 0 0 570 280"/><circle className="dot" cx={cx} cy="235" r="4"/>
    <rect x="330" y="900" width="340" height="150"/><rect x="415" y="995" width="170" height="55"/>
    <path d="M430 900A80 80 0 0 1 570 900"/><circle className="dot" cx={cx} cy="945" r="4"/>
  </>;
}

/** Game cards fanned beside the phone, a tactics route, and an arcade dot field. */
function Arcade() {
  const card = "M0 0H190L220 30V300H30L0 270Z";
  return <>
    {Array.from({ length: 7 }, (_, row) => Array.from({ length: 11 }, (_, col) => <circle key={`${row}-${col}`} className="dot faint" cx={50 + col * 90} cy={200 + row * 120} r="2.5"/>))}
    <path className="strong" d={card} transform="translate(40 330) rotate(-14)"/>
    <path d={card} transform="translate(90 610) rotate(-6)"/>
    <path className="strong" d={card} transform="translate(745 280) rotate(12)"/>
    <path d={card} transform="translate(720 590) rotate(5)"/>
    <polyline points="120 220 250 160 360 230 470 150" className="route"/>
    {[[120, 220], [250, 160], [360, 230], [470, 150]].map(([x, y], i) => <circle key={i} className={i === 3 ? "node hot" : "node"} cx={x} cy={y} r="11"/>)}
  </>;
}

/** Speed lines through the frame and a dotted delivery arc landing on the phone. */
function Motion() {
  const lines = [[60, 250, 360], [0, 320, 300], [120, 400, 250], [30, 480, 330], [80, 700, 280], [0, 780, 350], [140, 860, 220]];
  return <>
    {lines.map(([x, y, length], i) => <line key={i} className={i % 3 === 0 ? "strong" : undefined} x1={x} y1={y} x2={x + length} y2={y - length * .36}/>)}
    {lines.map(([x, y, length], i) => <line key={`r${i}`} x1={1000 - x} y1={y + 60} x2={1000 - x - length} y2={y + 60 + length * .36}/>)}
    <path className="route" d="M90 160Q420 20 600 470"/>
    {[0, 1, 2].map(i => <circle key={i} className={i === 0 ? "strong" : undefined} cx="600" cy="470" r={24 + i * 30}/>)}
  </>;
}

/** A possession gauge behind the phone, a trend line, and bars along the floor. */
function Data() {
  const bars = [34, 52, 41, 68, 57, 80, 62, 90, 71, 58, 76, 64];
  const trend = [[70, 520], [180, 470], [290, 500], [400, 400], [510, 430], [620, 330], [730, 360], [840, 270], [950, 300]];
  return <>
    {[260, 380, 500, 620, 740, 860].map(y => <line key={y} className="faint" x1="0" y1={y} x2="1000" y2={y}/>)}
    <circle cx={cx} cy={cy} r="330"/>
    <path className="strong" d={`M${cx} ${cy - 330}A330 330 0 1 1 ${cx - 330 * Math.sin(Math.PI * .22)} ${cy + 330 * Math.cos(Math.PI * .22)}`}/>
    {Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; return <line key={i} x1={cx + Math.sin(a) * 350} y1={cy - Math.cos(a) * 350} x2={cx + Math.sin(a) * (i % 3 ? 362 : 375)} y2={cy - Math.cos(a) * (i % 3 ? 362 : 375)}/>; })}
    <polyline className="route" points={trend.map(point => point.join(" ")).join(" ")}/>
    {trend.map(([x, y], i) => <circle key={i} className="node" cx={x} cy={y} r="6"/>)}
    {bars.map((height, i) => <rect key={i} className="fill" x={40 + i * 80} y={1000 - height * 2.2} width="46" height={height * 2.2}/>)}
  </>;
}

/** Radar rings and crosshair around the phone, one sweep, and a few called points. */
function Radar() {
  return <>
    {[140, 240, 340, 440].map((r, i) => <circle key={r} className={i === 3 ? "strong" : undefined} cx={cx} cy={cy} r={r}/>)}
    <line x1={cx} y1={cy - 480} x2={cx} y2={cy + 480}/><line x1={cx - 480} y1={cy} x2={cx + 480} y2={cy}/>
    <path className="sweep" d={`M${cx} ${cy}L${cx + 440} ${cy}A440 440 0 0 0 ${cx + 440 * Math.cos(Math.PI / 5)} ${cy - 440 * Math.sin(Math.PI / 5)}Z`}/>
    {[[cx + 300, cy - 150], [cx - 260, cy - 250], [cx - 350, cy + 180], [cx + 200, cy + 330]].map(([x, y], i) => <g key={i}><circle className={i === 0 ? "node hot" : "node"} cx={x} cy={y} r="9"/><circle cx={x} cy={y} r="22"/></g>)}
  </>;
}

/** A friends constellation with hex level badges. */
function Network() {
  const nodes = [[110, 230], [260, 160], [180, 400], [90, 590], [240, 720], [120, 880], [890, 210], [760, 150], [820, 400], [920, 560], [770, 700], [880, 870]];
  const links = [[0, 1], [0, 2], [2, 3], [3, 4], [4, 5], [2, 4], [6, 7], [6, 8], [8, 9], [9, 10], [10, 11], [8, 10], [1, 7], [4, 10]];
  const hex = (x: number, y: number, r: number) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return `${x + Math.cos(a) * r} ${y + Math.sin(a) * r}`; }).join(" ");
  return <>
    <ellipse cx={cx} cy={cy} rx="440" ry="170" transform={`rotate(-18 ${cx} ${cy})`}/>
    {links.map(([a, b], i) => <line key={i} className={i === 12 || i === 13 ? "faint" : undefined} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}/>)}
    {nodes.map(([x, y], i) => <circle key={i} className={i === 2 || i === 8 ? "node hot" : "node"} cx={x} cy={y} r={i % 4 === 0 ? 12 : 8}/>)}
    <polygon className="strong" points={hex(180, 400, 44)}/><polygon className="strong" points={hex(820, 400, 44)}/>
  </>;
}

/** Collectible cards fanned from behind the phone, with a few coins. */
function Vault() {
  const card = "M-95 -150H65L95 -120V150H-65L-95 120Z";
  return <>
    {[-38, -24, -10, 10, 24, 38].map((angle, i) => <path key={angle} className={i === 0 || i === 5 ? "strong" : undefined} d={card} transform={`rotate(${angle} ${cx} ${cy + 520}) translate(${cx} ${cy - 30})`}/>)}
    <path className="sheen" d="M0 760L1000 360V430L0 830Z"/>
    {[[140, 250, 26], [860, 220, 20], [110, 820, 18], [900, 760, 28]].map(([x, y, r], i) => <g key={i}><circle className="strong" cx={x} cy={y} r={r}/><circle cx={x} cy={y} r={r * .62}/></g>)}
  </>;
}

const motifs: Record<AppScreenTheme, () => JSX.Element> = { arena: Arena, pitch: Pitch, arcade: Arcade, motion: Motion, data: Data, radar: Radar, network: Network, vault: Vault };

export function ShowcaseThemeBackdrop({ theme, tall }: { theme: AppScreenTheme; tall: boolean }) {
  const Motif = motifs[theme];
  return <svg className="app-showcase-motif" viewBox={tall ? "0 -370 1000 1600" : "0 0 1000 1000"} preserveAspectRatio="xMidYMid slice" aria-hidden="true"><Motif/></svg>;
}
