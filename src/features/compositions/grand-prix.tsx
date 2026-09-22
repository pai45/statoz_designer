import type { CSSProperties } from "react";
import type { Scene } from "@/domain/project";

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const smoothstep = (n: number) => {
  const value = clamp(n);
  return value * value * (3 - 2 * value);
};
const easeOut = (n: number) => 1 - Math.pow(1 - clamp(n), 3);

type CarProps = {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  primary: string;
  accent: string;
  player?: boolean;
};

/** SVG port of the Grand Prix game's Formula-car painter. */
function GrandPrixCar({ x, y, scale = 1, rotation = 0, primary, accent, player = false }: CarProps) {
  const edge = primary === "#0a0e14" ? "#03060a" : "#111923";
  return <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale}) translate(-50 -95)`}>
    {player && <ellipse cx="50" cy="96" rx="57" ry="102" fill={accent} opacity=".13"/>}
    {player && <ellipse cx="50" cy="99" rx="45" ry="88" fill="none" stroke={accent} strokeWidth="2" opacity=".34"/>}
    <ellipse cx="50" cy="101" rx="45" ry="88" fill="#00040a" opacity=".54"/>
    <g fill="none" stroke="#344051" strokeWidth="3" strokeLinecap="round">
      <path d="M42 38 10 35M58 38 90 35M38 139 10 145M62 139 90 145"/>
      <path d="M42 47 10 49M58 47 90 49M38 151 10 155M62 151 90 155"/>
    </g>
    <g fill="#03070d">
      <rect x="0" y="27" width="19" height="31" rx="6"/><rect x="81" y="27" width="19" height="31" rx="6"/>
      <rect x="-1" y="132" width="22" height="36" rx="6"/><rect x="79" y="132" width="22" height="36" rx="6"/>
    </g>
    <g fill="#697482"><rect x="6" y="35" width="7" height="15" rx="3"/><rect x="87" y="35" width="7" height="15" rx="3"/><rect x="6" y="141" width="8" height="17" rx="3"/><rect x="86" y="141" width="8" height="17" rx="3"/></g>
    <rect x="5" y="4" width="7" height="22" rx="2" fill="#050a11"/><rect x="88" y="4" width="7" height="22" rx="2" fill="#050a11"/>
    <rect x="9" y="7" width="82" height="6" rx="2" fill={accent} opacity=".72"/><rect x="4" y="14" width="92" height="9" rx="3" fill={accent}/>
    <path d="M50 3Q58 9 59 31L62 63Q81 70 82 88Q79 113 66 130L63 164H37L34 130Q21 113 18 88Q19 70 38 63L41 31Q42 9 50 3Z" fill={primary} stroke={edge} strokeWidth="2.2"/>
    <path d="M48 12H52L54 42H46Z" fill={accent}/><path d="M47 109H53L56 159H44Z" fill={accent}/>
    <rect x="22" y="82" width="13" height="7" rx="3" fill="#040910"/><rect x="65" y="82" width="13" height="7" rx="3" fill="#040910"/>
    <rect x="32" y="68" width="36" height="42" rx="17" fill="#050b13"/>
    <ellipse cx="50" cy="87" rx="18" ry="21" fill="none" stroke="#9aa4b1" strokeWidth="3"/>
    <path d="M50 66V84" stroke="#9aa4b1" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="50" cy="92" r="8" fill={accent}/><circle cx="47" cy="89" r="2.4" fill="#fff" opacity=".58"/>
    <rect x="28" y="162" width="44" height="13" rx="3" fill="#050a11"/>
    <path d="M39 165V173M50 165V173M61 165V173" stroke="#697482" strokeWidth="2"/>
    <rect x="6" y="166" width="7" height="21" rx="2" fill="#050a11"/><rect x="87" y="166" width="7" height="21" rx="2" fill="#050a11"/>
    <rect x="12" y="169" width="76" height="6" rx="2" fill={accent} opacity=".72"/><rect x="8" y="176" width="84" height="10" rx="3" fill={accent}/>
    <path d="M12 181H88" stroke="#050a11" strokeWidth="2"/>
    {player && <path d="M31 202 50 214 69 202" fill="none" stroke={accent} strokeWidth="4" opacity=".78"/>}
  </g>;
}

function Gameplay({ scene, index, localTime, total }: GrandPrixExperienceProps) {
  const progress = clamp(localTime / scene.duration);
  const launched = index > 0 || localTime >= .95;
  const launchProgress = index > 0 ? 1 : smoothstep((localTime - .95) / .85);
  const pace = [0, 242, 286, 304][index] ?? 280;
  const speed = Math.round(index === 0 ? 38 + launchProgress * 218 : pace + Math.sin(localTime * .72 + index) * 12);
  const startPosition = [20, 16, 9, 5][index] ?? 10;
  const gain = index === 0 ? Math.floor(launchProgress * 3) : index < 3 ? Math.floor(progress * 3) : Math.min(1, Math.floor(progress * 2));
  const position = Math.max(4, startPosition - gain);
  const lapProgress = clamp(([.02, .18, .52, .83][index] ?? .2) + progress * .18);
  const bend = Math.sin(localTime * .43 + index * 1.45);
  const roadDash = localTime * (launched ? 235 : 24);
  const weave = index === 2 ? Math.sin(smoothstep(progress) * Math.PI * 2.25) * 86 : index === 1 ? smoothstep((progress - .54) / .22) * 92 : 0;
  const playerLean = index === 2 ? Math.sin(progress * Math.PI * 2.25) * 7 : bend * 2.2;
  const playerX = 1370 + bend * 28 + weave;
  const playerY = 820 - (index === 0 ? launchProgress * 38 : 0) + Math.sin(localTime * 1.55) * 1.4;
  const lightCount = Math.min(5, Math.floor(localTime / .18));
  const go = localTime >= .95;
  const showResult = index === total - 1 && progress > .48;
  const toast = index === 0 ? "PERFECT LAUNCH" : index === 1 ? "SLIPSTREAM / TOW" : index === 2 ? "OVERTAKE +1" : "FINAL LAP";
  const toastWindow = index === 0 ? localTime > .95 && localTime < 2.45 : index === 1 ? localTime > .7 && localTime < 2.35 : index === 2 ? localTime > 1.75 && localTime < 3.25 : localTime > .35 && localTime < 1.45;
  const pass = smoothstep((progress - .34) / .34);
  const rivals = [
    { x: 1250 - bend * 18 - (index === 1 ? pass * 70 : 0), y: index === 1 ? 525 + pass * 370 : 560 + Math.sin(localTime * .5) * 24, primary: "#d8232a", accent: "#ffe24a" },
    { x: 1515 + bend * 24, y: 410 + Math.sin(localTime * .42 + 1) * 34, primary: "#ff8000", accent: "#2a9df4" },
    { x: 1360 - bend * 12, y: 270 + Math.sin(localTime * .36 + 2) * 28, primary: "#b9bfc6", accent: "#00d2be" },
    { x: 1630 + bend * 18, y: 170 + Math.sin(localTime * .31 + 3) * 24, primary: "#0b5b3c", accent: "#d4af37" },
    { x: 1135 + bend * 13, y: 335 + Math.sin(localTime * .39 + 4) * 22, primary: "#16265c", accent: "#35e7ff" },
  ];
  const finishY = 180 + smoothstep((localTime - .55) / 1.45) * 1040;
  const introWipe = index === 0 ? 0 : 1 - smoothstep(localTime / .28);
  const outroWipe = index === total - 1 ? 0 : smoothstep((localTime - scene.duration + .28) / .28);

  return <div className="grand-prix-world">
    <svg className="gp-race-canvas" viewBox="0 0 1920 1080" aria-hidden="true">
      <path d="M900-120C790 180 900 390 842 626C798 806 868 1016 940 1200H1772C1842 987 1767 807 1802 622C1844 402 1742 188 1835-120Z" fill="#5a2028" opacity=".64"/>
      <path d="M935-120C832 184 936 393 880 632C840 808 908 1002 978 1200H1732C1800 992 1728 810 1763 618C1802 399 1708 184 1799-120Z" fill="#111a2a"/>
      <path d="M956-120C856 185 958 395 904 636C864 812 930 1002 997 1200" fill="none" stroke="#f5f8fb" strokeWidth="14" strokeDasharray="30 34" strokeDashoffset={roadDash} opacity=".72"/>
      <path d="M1777-120C1689 184 1782 399 1740 617C1704 807 1776 990 1712 1200" fill="none" stroke="#f5f8fb" strokeWidth="14" strokeDasharray="30 34" strokeDashoffset={roadDash} opacity=".72"/>
      <path d="M1370-120C1288 185 1380 398 1334 630C1298 813 1364 1002 1388 1200" fill="none" stroke="#35e7ff" strokeWidth="4" strokeDasharray="42 54" strokeDashoffset={roadDash * .78} opacity=".31"/>
      <path d="M1054-120C964 182 1060 396 1008 632C970 808 1037 1004 1084 1200M1668-120C1584 185 1674 398 1634 625C1600 810 1669 996 1622 1200" fill="none" stroke="#0b111c" strokeWidth="3" opacity=".68"/>
      {[0, 1, 2, 3, 4, 5, 6].map(i => <path key={i} d={`M${1004 + i * 111} 1190 ${986 + i * 113} 1068`} stroke={i % 2 ? "#f4f7fa" : "#f42d29"} strokeWidth="28" opacity=".82"/>)}
      {index === 3 && <g opacity={smoothstep((localTime - 1) / .55)} transform={`translate(0 ${finishY - 180})`}><path d="M893 180H1758" stroke="#fff" strokeWidth="34" strokeDasharray="34 34"/><path d="M893 214H1758" stroke="#fff" strokeWidth="34" strokeDasharray="34 34" strokeDashoffset="34"/></g>}
      {rivals.map((car, rivalIndex) => <GrandPrixCar key={rivalIndex} x={car.x} y={car.y} scale={.54 + clamp((car.y - 130) / 900) * .45} rotation={Math.sin(localTime * .48 + rivalIndex) * 2.1} primary={car.primary} accent={car.accent}/>) }
      <ellipse cx={playerX} cy={playerY} rx="82" ry="132" fill="#35e7ff" opacity=".045"/>
      <ellipse cx={playerX} cy={playerY} rx="70" ry="118" fill="#35e7ff" opacity=".075"/>
      <GrandPrixCar x={playerX} y={playerY} scale={1.02} rotation={playerLean} primary="#0a0e14" accent="#35e7ff" player/>
      {index === 2 && progress > .3 && progress < .75 && <g fill="#fdc700">{[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx={playerX + 62 + i * 18} cy={playerY + 70 - i * 13} r={6 - i * .6} opacity={.82 - i * .1}/>)}</g>}
    </svg>
    <div className="gp-hud">
      <div className="gp-hud-row"><div className="gp-position"><strong>P{position}</strong><span>/20</span></div><div className="gp-speed"><strong>{Math.max(0, speed)}</strong><span>KPH</span></div></div>
      <div className="gp-lap"><span>{index < 2 ? "LAP 1/3" : index === 2 ? "LAP 2/3" : "LAP 3/3"}</span><i><b style={{ transform: `scaleX(${lapProgress})` }}/></i></div>
      <div className={`gp-tow ${index === 1 && progress > .2 && progress < .68 ? "is-active" : ""}`}>TOW</div>
    </div>
    <div className="gp-track-label"><span>EMERALD PARK</span><small>BALANCED / 20 CAR GRID</small></div>
    {index === 0 && !go && <div className="gp-start-lights">{[0, 1, 2, 3, 4].map(i => <i key={i} className={i < lightCount ? "is-on" : ""}/>)}</div>}
    {index === 0 && go && localTime < 1.8 && <div className="gp-go" style={{ opacity: 1 - smoothstep((localTime - 1.18) / .62) }}>GO</div>}
    {toastWindow && !showResult && <div className="gp-toast"><i/>{toast}</div>}
    {index === 2 && <div className="gp-controls"><div className="gp-control-group"><span>‹</span><span>›</span></div><div className="gp-control-group pedals"><b>BRAKE</b><b>ACCEL</b></div></div>}
    {showResult && <div className="gp-result"><small>CHEQUERED FLAG</small><strong>P4</strong><span>+120 XP</span></div>}
    {index > 0 && <div className="gp-scene-wipe gp-scene-wipe-in" style={{ transform: `translateX(${(1 - introWipe) * 115}%)` }}/>} 
    {index < total - 1 && <div className="gp-scene-wipe gp-scene-wipe-out" style={{ transform: `translateX(${-115 + outroWipe * 115}%)` }}/>} 
  </div>;
}

function Copy({ scene, localTime, index, total }: GrandPrixExperienceProps) {
  const out = index === total - 1 ? 1 : 1 - smoothstep((localTime - scene.duration + .34) / .34);
  const eyebrowIn = easeOut((localTime - .06) / .3);
  const bodyIn = easeOut((localTime - .55) / .38);
  const lines = scene.headline.split("\n");
  return <section className="composition-copy gp-copy" data-safe style={{ opacity: out }}>
    <div className="eyebrow gp-eyebrow" style={{ "--gp-reveal": eyebrowIn } as CSSProperties}><span/>{scene.eyebrow}</div>
    <h1 data-overflow>{lines.map((line, lineIndex) => {
      const reveal = easeOut((localTime - .18 - lineIndex * .08) / .38);
      return <span className="gp-headline-line" key={`${line}-${lineIndex}`}><span style={{ "--gp-reveal": reveal } as CSSProperties}>{line}</span></span>;
    })}</h1>
    <p data-overflow style={{ "--gp-reveal": bodyIn } as CSSProperties}>{scene.body}</p>
    <div className="copy-rule" style={{ "--gp-reveal": easeOut((localTime - .7) / .3) } as CSSProperties}/>
  </section>;
}

export type GrandPrixExperienceProps = { scene: Scene; index: number; localTime: number; total: number };

export function GrandPrixExperience(props: GrandPrixExperienceProps) {
  return <><Gameplay {...props}/><Copy {...props}/></>;
}
