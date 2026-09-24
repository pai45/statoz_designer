import type { CSSProperties, ReactNode } from "react";
import { formats, type Format, type LaunchGame, type Scene } from "@/domain/project";
import { clamp, easeOut, smoothstep } from "./motion";
import { Athlete, CricketBat, Racket, batterLoft, batterStance, bowlerRelease, bowlerRunUp, celebratePose, jumpShotPose, kits, looks, stridePose, cricketBallColor } from "./athlete";

/**
 * Gameplay demos for the StatOz arcade games, drawn straight onto the canvas in the
 * same language as the Grand Prix demo. Each game owns one board and every value is a
 * pure function of scene time, so preview, seeking and export agree.
 *
 * The board is authored at 1:1 with the output pixel, and each ratio views its own
 * window onto it (`viewWindow`): landscape looks at the right of the board so the copy
 * column stays clear, and the taller ratios look straight down the middle and show more
 * of the scene. Backdrops therefore bleed to x -800 and y 1900, well past every window.
 * The focal action sits inside x 680–1240. Players, clubs, venues and numbers are invented.
 */

const dim = "#8495a9";
const lerp = (a: number, b: number, n: number) => a + (b - a) * n;
/** Quadratic Bézier value for a ball flight from `a` through `control` to `b`. */
const quad = (a: number, control: number, b: number, n: number) => (1 - n) * (1 - n) * a + 2 * (1 - n) * n * control + n * n * b;
const rand = (i: number) => { const value = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return value - Math.floor(value); };

/** The board window for one output ratio, anchored on the action rather than the centre. */
function viewWindow(format: Format) {
  const { width, height } = formats[format];
  const wide = width / height >= 1.4;
  const [anchorX, anchorY] = wide ? [.74, .5] : height / width >= 1.5 ? [.5, .34] : [.5, .44];
  return `${Math.round(960 - anchorX * width)} ${Math.round((wide ? 540 : 510) - anchorY * height)} ${width} ${height}`;
}

function Glow({ id, x, y, r, color, opacity = .5, squash = 1 }: { id: string; x: number; y: number; r: number; color: string; opacity?: number; squash?: number }) {
  return <><defs><radialGradient id={id}><stop offset="0" stopColor={color} stopOpacity={opacity}/><stop offset="1" stopColor={color} stopOpacity="0"/></radialGradient></defs><ellipse cx={x} cy={y} rx={r} ry={r * squash} fill={`url(#${id})`}/></>;
}
/** A lit stand behind the action, bleeding past every board window. */
function Crowd({ id, y, height, color }: { id: string; y: number; height: number; color: string }) {
  return <><defs><pattern id={id} width="34" height="27" patternUnits="userSpaceOnUse"><circle cx="9" cy="8" r="3.4" fill={dim} opacity=".2"/><circle cx="25" cy="20" r="2.8" fill={color} opacity=".13"/></pattern></defs>
    <rect x="-800" y={y} width="3520" height={height} fill="#080f1b"/><rect x="-800" y={y} width="3520" height={height} fill={`url(#${id})`}/>
    <rect x="-800" y={y + height - 4} width="3520" height="4" fill={color} opacity=".22"/></>;
}
/** The dashed flight line every game draws behind a travelling ball. */
function Trail({ d, color, on }: { d: string; color: string; on: number }) {
  return <path d={d} fill="none" stroke={color} strokeWidth="5" strokeDasharray="10 16" strokeLinecap="round" opacity={on * .66}/>;
}
/** Celebration sparks, kept inside the focal band so no ratio crops them oddly. */
function Sparks({ t, color, count = 16 }: { t: number; color: string; count?: number }) {
  return <g>{Array.from({ length: count }, (_, i) => <circle key={i} cx={710 + rand(i) * 500} cy={320 + rand(i + 31) * 330} r={3 + rand(i + 7) * 5} fill={i % 3 ? color : "#51ff94"} opacity={.28 + Math.sin(t * 2.4 + i) * .26}/>)}</g>;
}

type Beat = { index: number; t: number; p: number; total: number };
type Mark = "win" | "loss" | "open";
type Hud = { value: string; unit: string; right: string; rightUnit: string; meter: number; meterLabel: string; chip: string; chipOn: boolean };
type Frame = { accent: string; venue: [string, string]; hud: Hud; marks: { label: string; values: Mark[] }[]; toast: string; toastOn: boolean; controls: [string, string] | null; result: [string, string, string] | null; field: ReactNode };

/* ---------------------------------------------------------------- Penalty Shootout */

/** A keeper set on the line, rotating into a dive. `side` is -1 to screen left. */
function Keeper({ x, y, dive, side, kit, glove }: { x: number; y: number; dive: number; side: 1 | -1; kit: string; glove: string }) {
  return <g transform={`translate(${x + side * dive * 132} ${y - dive * 42}) rotate(${side * dive * 74})`} strokeLinecap="round">
    <path d="M-20-62-46 4M20-62 46 4" stroke="#16202f" strokeWidth="20"/>
    <path d="M-30-128H30L36-56H-36Z" fill={kit}/>
    <path d="M-30-120-92-164M30-120 92-164" stroke={kit} strokeWidth="17"/>
    <circle cx="-98" cy="-168" r="14" fill={glove}/><circle cx="98" cy="-168" r="14" fill={glove}/>
    <circle cx="0" cy="-150" r="22" fill="#26303f"/>
  </g>;
}
function penaltyFrame({ index, t, p }: Beat): Frame {
  const accent = "#5cdfff";
  const sweep = Math.sin(t * 2.05);
  const aimX = 960 + sweep * 248, aimY = 388 - Math.abs(sweep) * 24;
  const shot = smoothstep(p / .58), save = smoothstep(p / .56);
  const scored = index === 1 && p > .6, stopped = index === 2 && p > .58;
  // The kick, the save and the celebration each move one ball along their own flight.
  const ball = index === 1 ? { x: quad(960, 1074, 1212, shot), y: quad(946, 628, 326, shot), r: lerp(24, 13, shot) }
    : index === 2 ? (p < .56 ? { x: quad(960, 852, 742, save), y: quad(930, 644, 400, save), r: lerp(24, 14, save) } : { x: lerp(742, 500, smoothstep((p - .56) / .42)), y: lerp(400, 206, smoothstep((p - .56) / .42)), r: 14 })
      : index === 3 ? { x: 1212, y: 470, r: 19 } : { x: 960, y: 946 + Math.sin(t * 1.7) * 2, r: 24 };
  const ripple = scored ? smoothstep((p - .6) / .34) : 0;
  const won: Mark[] = ["win", "win", "loss", "win", "win"], lost: Mark[] = ["win", "loss", "win", "win", "loss"];
  const pending: Mark[] = ["win", "win", "open", "open", "open"], chasing: Mark[] = ["win", "loss", "open", "open", "open"];
  return {
    accent,
    venue: ["HARBOUR PARK", "SUDDEN DEATH / 5 KICKS"],
    hud: {
      value: index === 3 ? "4-3" : "2-1", unit: "SHOOTOUT",
      right: index === 2 ? "SAVE" : index === 3 ? "5/5" : `${index + 3}/5`, rightUnit: index === 2 ? "YOUR TURN" : "KICK",
      meter: index === 0 ? (Math.sin(t * 3.05 - Math.PI / 2) + 1) / 2 : index === 1 ? .82 : index === 2 ? save : 1,
      meterLabel: index === 0 ? "POWER" : index === 2 ? "DIVE" : "STRUCK",
      chip: index === 2 ? "SAVED" : "GOAL", chipOn: scored || stopped,
    },
    marks: [{ label: "YOU", values: index === 3 ? won : pending }, { label: "CPU", values: index === 3 ? lost : chasing }],
    toast: index === 0 ? "PICK YOUR CORNER" : index === 1 ? "TOP CORNER" : index === 2 ? "PALMED AWAY" : "SHOOTOUT WON",
    toastOn: index === 0 ? t > .45 && t < 2.6 : index === 1 ? p > .62 : index === 2 ? p > .6 && p < .94 : p > .1 && p < .45,
    controls: index === 0 ? ["AIM", "STRIKE"] : index === 2 ? ["LEFT", "RIGHT"] : null,
    result: index === 3 && p > .46 ? ["FULL SHOOTOUT", "4-3", "+140 XP"] : null,
    field: <>
      <defs>
        <linearGradient id="ps-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a3120"/><stop offset=".5" stopColor="#06231a"/><stop offset="1" stopColor="#03120f"/></linearGradient>
        <pattern id="ps-net" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0v30" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity=".16"/></pattern>
      </defs>
      <rect x="-800" y="-400" width="3520" height="2300" fill="#040910"/>
      <Crowd id="ps-crowd" y={64} height={244} color={accent}/>
      <rect x="-800" y="300" width="3520" height="1600" fill="url(#ps-grass)"/>
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <rect key={i} x="-800" y={374 + i * 168} width="3520" height="82" fill="#ffffff" opacity=".018"/>)}
      <path d="M-800 660H2720M556 660 140 1900M1364 660 1780 1900" fill="none" stroke="#ffffff" strokeWidth="4" opacity=".22"/>
      <path d="M790 660V560H1130V660" fill="none" stroke="#ffffff" strokeWidth="4" opacity=".22"/>
      <rect x="640" y="240" width="640" height="420" fill="url(#ps-net)"/>
      <path d="M640 660V240H1280V660" fill="none" stroke="#e9eef4" strokeWidth="15" strokeLinejoin="round"/>
      {index !== 3 && <Keeper x={index === 0 ? 960 + Math.sin(t * 1.55) * 30 : 960} y={648} dive={index === 1 ? smoothstep((p - .26) / .34) : index === 2 ? smoothstep((p - .2) / .32) : 0} side={-1} kit={index === 2 ? "#0f3d52" : "#e07800"} glove={index === 2 ? accent : "#51ff94"}/>}
      {index === 0 && <g opacity={.85}>
        <Glow id="ps-aim" x={aimX} y={aimY} r={104} color={accent} opacity={.38}/>
        <circle cx={aimX} cy={aimY} r="50" fill="#0d111a99" stroke={accent} strokeWidth="4"/><circle cx={aimX} cy={aimY} r="19" fill="none" stroke={accent} strokeWidth="3"/>
        <path d={`M${aimX - 68} ${aimY}h28M${aimX + 40} ${aimY}h28M${aimX} ${aimY - 68}v28M${aimX} ${aimY + 40}v28`} stroke={accent} strokeWidth="3"/>
      </g>}
      {index === 1 && <Trail d={`M960 946Q1074 628 ${ball.x} ${ball.y}`} color={accent} on={shot}/>}
      {index === 2 && <Trail d="M960 930Q852 644 742 400" color="#ff5a4d" on={save}/>}
      {ripple > 0 && <circle cx="1212" cy="326" r={18 + ripple * 96} fill="none" stroke="#ffffff" strokeWidth={9 - ripple * 6} opacity={.7 - ripple * .66}/>}
      {index === 3 && <Sparks t={t} color={accent}/>}
      <Glow id="ps-ball" x={ball.x} y={ball.y} r={ball.r * 2.4} color="#ffffff" opacity={.26}/>
      <circle cx={ball.x} cy={ball.y} r={ball.r} fill="#ffffff"/>
      <path d={`M${ball.x} ${ball.y - ball.r * .46}l${ball.r * .42} ${ball.r * .32} -${ball.r * .16} ${ball.r * .46}h-${ball.r * .52}l-${ball.r * .16} -${ball.r * .46}Z`} fill="#16202f"/>
      {/* The striker shares the house rig, so all four demos draw one athlete design. */}
      <Athlete x={index === 3 ? 1150 : 744} y={946} px={128} kit={kits.football} look={looks[1]} build="court" gear="hair" legs="shorts" number={9}
        pose={index === 3 ? celebratePose(t) : index === 1 ? stridePose(smoothstep(p / .5) * 3.2, { lean: -.16, reach: .2 }) : stridePose(index === 0 ? Math.sin(t * 1.8) * 1.2 : .6)}/>
    </>,
  };
}

/* -------------------------------------------------------------------- Final Over */

function Stumps({ x, y, scale, color = "#d6dee6" }: { x: number; y: number; scale: number; color?: string }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} fill={color}>
    <rect x="-34" y="0" width="13" height="150" rx="4"/><rect x="-6" y="0" width="13" height="150" rx="4"/><rect x="22" y="0" width="13" height="150" rx="4"/>
    <rect x="-36" y="-11" width="34" height="8" rx="4"/><rect x="4" y="-11" width="34" height="8" rx="4"/>
  </g>;
}
function finalOverFrame({ index, t, p }: Beat): Frame {
  const accent = "#fdc700";
  const runUp = index === 0 ? easeOut(p / .82) : 1;
  const delivery = index === 1 ? smoothstep(p / .72) : 0;
  const flight = index === 2 ? smoothstep(p / .94) : 0;
  const ball = index === 0 ? { x: 960, y: lerp(320, 404, runUp), r: lerp(5, 8, runUp) }
    : index === 1 ? { x: lerp(960, 944, delivery), y: lerp(404, 852, delivery), r: lerp(8, 21, delivery) }
      : index === 2 ? { x: quad(944, 1256, 1584, flight), y: quad(846, 246, 32, flight), r: lerp(21, 7, flight) }
        : { x: 960, y: 404, r: 8 };
  // Stance, then the coil and the lofted drive that sends the last ball into the crowd.
  const batter = index === 0 ? batterStance(t) : index === 1 ? batterLoft(smoothstep((p - .66) / .34) * .55) : index === 2 ? batterLoft(clamp(.55 + smoothstep(p / .3) * .45)) : batterLoft(1);
  const balls: Mark[] = index === 3 ? ["win", "win", "loss", "win", "win", "win"] : ["win", "win", "loss", "open", "open", "open"];
  return {
    accent,
    venue: ["MERIDIAN OVAL", "LAST OVER / CHASING 54"],
    hud: {
      value: index === 3 ? "54/3" : "42/3", unit: "SCORE",
      right: index === 3 ? "WON" : "12", rightUnit: index === 3 ? "BY 7 WICKETS" : `OFF ${4 - index} BALLS`,
      meter: index === 1 ? clamp(p / .72) : index === 2 ? 1 : .12, meterLabel: index === 1 ? "TIMING" : index === 2 ? "MIDDLED" : index === 3 ? "CHASED" : "READY",
      chip: "SIX", chipOn: index === 2 && p > .2,
    },
    marks: [{ label: "OVER", values: balls }],
    toast: index === 0 ? "FINAL OVER" : index === 1 ? "PERFECT TIMING" : index === 2 ? "SIX / +6 RUNS" : "CHASE COMPLETE",
    toastOn: index === 0 ? t > .4 && t < 2.4 : index === 1 ? p > .6 : index === 2 ? p > .18 && p < .84 : p > .1 && p < .45,
    controls: index === 1 ? ["BLOCK", "SWING"] : null,
    result: index === 3 && p > .46 ? ["CHASE COMPLETE", "54/3", "+150 XP"] : null,
    field: <>
      <defs>
        <linearGradient id="fo-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a1a28"/><stop offset="1" stopColor="#030b15"/></linearGradient>
        <linearGradient id="fo-field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d3438"/><stop offset=".55" stopColor="#07242c"/><stop offset="1" stopColor="#03131a"/></linearGradient>
        <linearGradient id="fo-strip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5d4c33"/><stop offset="1" stopColor="#95794c"/></linearGradient>
      </defs>
      <rect x="-800" y="-400" width="3520" height="2300" fill="url(#fo-sky)"/>
      <Glow id="fo-flood" x={1320} y={20} r={420} color="#ffffff" opacity={.2} squash={.66}/>
      <g fill="#ffffff" opacity=".7">{[0, 1, 2, 3].map(i => <rect key={i} x={1282 + i * 24} y="26" width="17" height="13" rx="2"/>)}</g><path d="M1330 40V226" stroke="#0f2334" strokeWidth="8"/>
      <Crowd id="fo-crowd" y={212} height={124} color={accent}/>
      <rect x="-800" y="336" width="3520" height="1564" fill="url(#fo-field)"/>
      <path d="M-800 520Q960 452 2720 520" fill="none" stroke="#ffffff" strokeWidth="4" opacity=".12"/>
      <path d="M918 388H1002L1400 1900H620Z" fill="url(#fo-strip)" opacity=".92"/>
      <path d="M912 412H1008M818 900H1152" stroke="#ffffff" strokeWidth="5" opacity=".5"/>
      <Stumps x={960} y={330} scale={.38} color="#b9c2cd"/>
      {/* The bowler runs in from the far end, so his rig scales with the run-up. */}
      <Athlete x={1024} y={lerp(352, 392, runUp)} px={lerp(52, 74, runUp)} kit={kits.cricketAway} look={looks[1]} gear="cap" legs="trouser" number={11}
        pose={index === 0 ? bowlerRunUp(t * 5.2) : bowlerRelease(index === 1 ? clamp(p / .3) : 1)}/>
      {index === 1 && <Trail d={`M960 404 ${ball.x} ${ball.y}`} color={accent} on={delivery}/>}
      {index === 2 && <Trail d={`M944 846Q1256 246 ${ball.x} ${ball.y}`} color={accent} on={flight}/>}
      <Stumps x={1064} y={846} scale={1} color="#cbd4de"/>
      {/* Helmet, pads, gloves and a bleached-willow bat: the Final Over batter. */}
      <Athlete x={878} y={902} px={150} kit={kits.cricket} look={looks[3]} gear="helmet" legs="trouser" pads gloves number={7}
        pose={batter.pose} hand={grip => <CricketBat grip={grip} angle={batter.batAngle} px={150} kit={kits.cricket}/>}/>
      {index === 2 && p > .18 && <g opacity={clamp((p - .18) / .2) * (1 - smoothstep((p - .74) / .24))}>{Array.from({ length: 16 }, (_, i) => <circle key={i} cx={-200 + rand(i) * 2300} cy={232 + rand(i + 17) * 84} r={4 + rand(i + 5) * 4} fill={accent} opacity={.32 + Math.sin(t * 6 + i) * .3}/>)}</g>}
      {index === 3 && <Sparks t={t} color={accent} count={14}/>}
      <Glow id="fo-ball" x={ball.x} y={ball.y} r={ball.r * 3} color="#e24b3c" opacity={.4}/>
      <circle cx={ball.x} cy={ball.y} r={ball.r} fill={cricketBallColor}/>
      <path d={`M${ball.x - ball.r * .7} ${ball.y - ball.r * .25}q${ball.r * .7} ${ball.r * .55} ${ball.r * 1.4} 0`} fill="none" stroke="#ffffff" strokeWidth={Math.max(1, ball.r * .12)} opacity=".7"/>
    </>,
  };
}

/* ---------------------------------------------------------------------- Hoop Duel */

/** Height above the floor through one bounce, 0 at the boards and 1 at the apex. */
const bounceArc = (phase: number) => { const u = phase - Math.floor(phase); return 4 * u * (1 - u); };
/** A ball dropped from `top` onto `floor`: one accelerating fall, then two decaying bounces. */
function dropBounce(top: number, floor: number, n: number) {
  const fall = .46, drop = floor - top;
  if (n <= fall) return top + drop * (n / fall) ** 2;
  const after = n - fall;
  if (after < .3) return floor - drop * .26 * bounceArc(after / .3);
  return floor - drop * .09 * bounceArc(Math.min(1, (after - .3) / .18));
}
function Ball({ x, y, r, spin = 0 }: { x: number; y: number; r: number; spin?: number }) {
  return <g transform={`rotate(${spin} ${x} ${y})`}>
    <circle cx={x} cy={y} r={r} fill="#d9731f" stroke="#5b2c07" strokeWidth={Math.max(2, r * .1)}/>
    <path d={`M${x - r} ${y}h${r * 2}M${x} ${y - r}v${r * 2}M${x - r * .72} ${y - r * .7}q${r * .72} ${r * .7} 0 ${r * 1.4}M${x + r * .72} ${y - r * .7}q${-r * .72} ${r * .7} 0 ${r * 1.4}`} fill="none" stroke="#5b2c07" strokeWidth={Math.max(1.5, r * .09)}/>
  </g>;
}
function hoopDuelFrame({ index, t, p }: Beat): Frame {
  const accent = "#fdc700";
  const cross = Math.sin(t * 3.4);
  const rise = index === 1 ? smoothstep(p / .66) : 0;
  // Flight time is linear: a ball leaves the hand fast and the arc alone shapes it.
  const shot = index === 2 ? clamp(p / .52) : 0;
  const drop = index === 2 ? clamp((p - .52) / .48) : 0;
  const playerX = index === 0 ? 824 + cross * 58 : 860;
  // Floor contact for the ball's centre: the court under the player, and under the rim.
  const courtY = 850, rimFloorY = 664;
  const ball = index === 0 ? { x: playerX + 96 + cross * 34, y: courtY - bounceArc(t * 3.1) * 80, r: 30, spin: t * 190 }
    : index === 1 ? { x: lerp(900, 886, rise), y: lerp(792, 566, rise), r: 30, spin: rise * -60 }
      : index === 2 ? (drop > 0 ? { x: 960, y: dropBounce(322, rimFloorY, drop), r: 30, spin: 120 + drop * 300 }
        : { x: quad(886, 928, 960, shot), y: quad(566, 122, 322, shot), r: 30, spin: shot * -420 })
        : { x: 1034, y: courtY, r: 30, spin: 24 };
  return {
    accent,
    venue: ["EASTSIDE COURTS", "STREET 1-ON-1 / FIRST TO 21"],
    hud: {
      value: index === 3 ? "24" : "18", unit: index === 3 ? "FINAL" : "YOU",
      right: index === 3 ? "21" : "0:42", rightUnit: index === 3 ? "CPU" : "CLOCK",
      meter: index === 1 ? rise : index === 2 ? 1 : index === 3 ? 1 : .2,
      meterLabel: index === 0 ? "HANDLE" : index === 1 ? "RELEASE" : index === 2 ? "PURE" : "GAME",
      chip: "ON FIRE", chipOn: index >= 2,
    },
    marks: [],
    toast: index === 0 ? "SHAKE THE DEFENDER" : index === 1 ? "PERFECT RELEASE" : index === 2 ? "SWISH / +3" : "GAME WON",
    toastOn: index === 0 ? t > .45 && t < 2.5 : index === 1 ? p > .5 : index === 2 ? p > .5 && p < .94 : p > .1 && p < .45,
    controls: index === 0 ? ["DRIVE", "SHOOT"] : null,
    result: index === 3 && p > .46 ? ["FINAL BUZZER", "24-21", "+110 XP"] : null,
    field: <>
      <defs>
        <linearGradient id="hd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#030610"/><stop offset="1" stopColor="#101630"/></linearGradient>
        <linearGradient id="hd-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3d2613"/><stop offset=".6" stopColor="#1d1109"/><stop offset="1" stopColor="#0a0806"/></linearGradient>
      </defs>
      <rect x="-800" y="-400" width="3520" height="2300" fill="url(#hd-sky)"/>
      {Array.from({ length: 60 }, (_, i) => <circle key={i} cx={-780 + rand(i + 90) * 3400} cy={-340 + rand(i + 140) * 620} r={1 + rand(i + 7) * 1.8} fill="#ffffff" opacity={.2 + rand(i + 3) * .4}/>)}
      {Array.from({ length: 28 }, (_, i) => { const x = -790 + i * 132, w = 74 + rand(i) * 62, h = 150 + rand(i + 40) * 290; return <g key={i}>
        <rect x={x} y={640 - h} width={w} height={h} fill="#080e1b"/>
        {Array.from({ length: Math.floor(h / 40) * 2 }, (_, k) => rand(i * 50 + k) > .62 && <rect key={k} x={x + 14 + (k % 2) * (w - 34) / 1.5} y={664 - h + Math.floor(k / 2) * 40} width="11" height="15" fill={rand(k + i) > .5 ? accent : "#5cdfff"} opacity=".38"/>)}
      </g>; })}
      <rect x="-800" y="636" width="3520" height="1264" fill="url(#hd-floor)"/>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => <path key={i} d={`M-800 ${664 + i * 84}H2720`} stroke="#000000" strokeWidth="2" opacity=".2"/>)}
      <Glow id="hd-lamp" x={960} y={700} r={420} color={accent} opacity={.16} squash={.3}/>
      <g fill="none" stroke="#5cdfff" strokeWidth="4" opacity=".42"><path d="M772 646 520 1900M1148 646 1400 1900"/><path d="M-20 1900Q220 646 960 646Q1700 646 1940 1900"/><ellipse cx="960" cy="820" rx="212" ry="50" strokeDasharray="14 12"/></g>
      <rect x="946" y="330" width="28" height="316" fill="#232b3d"/>
      <rect x="836" y="156" width="248" height="156" fill="#ffffff" fillOpacity=".06" stroke="#232b3d" strokeWidth="10"/><rect x="918" y="220" width="84" height="62" fill="none" stroke="#ffffff" strokeWidth="4" opacity=".5"/>
      <path d={`M900 324 918 ${396 + drop * 20}H1002L1020 324`} fill="none" stroke="#ffffff" strokeWidth="2.6" opacity=".62"/>
      <path d="M910 356h100M918 380h84M928 324 938 396M960 324v78M992 324 982 396" stroke="#ffffff" strokeWidth="2" opacity=".42"/>
      <ellipse cx="960" cy="322" rx="60" ry="13" fill="none" stroke="#e07800" strokeWidth="8"/>
      {index === 2 && <Trail d={`M886 566Q928 122 ${shot < 1 ? ball.x : 960} ${shot < 1 ? ball.y : 322}`} color={accent} on={shot}/>}
      {index === 3 && <Sparks t={t} color={accent} count={14}/>}
      {/* Court build: shorts over bare lower legs, headband, and the lit face line. */}
      <Athlete x={1118} y={802} px={132} kit={kits.courtAway} look={looks[0]} build="court" gear="hair" legs="shorts" number={4}
        pose={index === 1 ? stridePose(2.4, { hip: .9, reach: rise * .8, lean: -.04 }) : stridePose(cross * .8, { lean: cross * .12 })}/>
      <Athlete x={playerX} y={880} px={140} kit={kits.court} look={looks[2]} build="court" gear="headband" legs="shorts" sleeve number={23}
        pose={index === 0 ? stridePose(t * 3.4, { reach: .15 }) : index === 1 ? jumpShotPose(rise) : index === 2 ? jumpShotPose(1) : celebratePose(t)}/>
      <Ball x={ball.x} y={ball.y} r={ball.r} spin={ball.spin}/>
    </>,
  };
}

/* -------------------------------------------------------------------- Tennis Rally */

/** Court perspective: `n` runs 0 at the far baseline to 1 at the near baseline. */
const court = (n: number) => ({ y: 356 + n * 600, left: 810 - n * 300, right: 1110 + n * 300 });
function tennisRallyFrame({ index, t, p }: Beat): Frame {
  const accent = "#51ff94";
  const net = court(.36), far = court(0), near = court(1);
  const inset = (edge: ReturnType<typeof court>, f: number) => [edge.left + (edge.right - edge.left) * f, edge.right - (edge.right - edge.left) * f];
  const serve = index === 0 ? smoothstep((p - .34) / .5) : 0;
  const toss = index === 0 ? Math.sin(clamp(p / .4) * Math.PI) : 0;
  // The rally plays three exchanges, each an arc across the net with its own hop.
  const leg = index === 1 ? clamp(p / .94) * 3 : 0, phase = Math.min(2, Math.floor(leg)), swingOn = leg - phase;
  const lane = [[1066, 856], [828, 1094], [1084, 846]][phase];
  const outbound = phase % 2 === 0;
  const winner = index === 2 ? smoothstep(p / .6) : 0;
  const ball = index === 0 ? (p < .34 ? { x: 1072, y: 818 - toss * 190, r: 15 } : { x: quad(1066, 986, 884, serve), y: quad(756, 508, 396, serve), r: lerp(15, 8, serve) })
    : index === 1 ? { x: quad(lane[0], (lane[0] + lane[1]) / 2, lane[1], swingOn), y: outbound ? quad(902, 484, 398, swingOn) : quad(398, 484, 902, swingOn), r: outbound ? lerp(15, 8, swingOn) : lerp(8, 15, swingOn) }
      : index === 2 ? { x: quad(1012, 1140, 1212, winner), y: quad(904, 576, 376, winner), r: lerp(15, 8, winner) }
        : { x: 1060, y: 836, r: 15 };
  const nearX = index === 1 ? 1000 + Math.sin(p * Math.PI * 2.6) * 150 : index === 2 ? 1012 : 1060;
  const farX = index === 1 ? 930 + Math.sin(p * Math.PI * 2.6 + 2) * 74 : index === 2 ? lerp(940, 1042, winner) : 930;
  return {
    accent,
    venue: ["CENTRE COURT 3", "BEST OF THREE / HARD COURT"],
    hud: {
      value: index === 3 ? "6-4" : index === 2 ? "40-30" : index === 1 ? "30-30" : "15-0", unit: index === 3 ? "SET" : "GAME",
      right: index === 3 ? "WON" : `x${index === 1 ? 3 + phase * 3 : index === 2 ? 9 : 1}`, rightUnit: index === 3 ? "SET ONE" : "RALLY",
      meter: index === 0 ? clamp(p / .34) : index === 1 ? clamp(leg / 3) : 1,
      meterLabel: index === 0 ? "SERVE" : index === 1 ? "RALLY" : index === 2 ? "WINNER" : "SET",
      chip: index === 2 ? "WINNER" : "IN", chipOn: index === 0 ? serve > .9 : index === 2 ? winner > .8 : index === 3,
    },
    marks: [],
    toast: index === 0 ? "FIRST SERVE IN" : index === 1 ? `RALLY x${3 + phase * 3}` : index === 2 ? "WINNER DOWN THE LINE" : "SET WON",
    toastOn: index === 0 ? p > .5 : index === 1 ? p > .2 : index === 2 ? p > .55 && p < .94 : p > .1 && p < .45,
    controls: index === 1 ? ["SLICE", "DRIVE"] : null,
    result: index === 3 && p > .46 ? ["SET ONE", "6-4", "+130 XP"] : null,
    field: <>
      <defs>
        <linearGradient id="tr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d1c27"/><stop offset="1" stopColor="#030711"/></linearGradient>
        <linearGradient id="tr-court" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#113f47"/><stop offset="1" stopColor="#082630"/></linearGradient>
        <pattern id="tr-mesh" width="13" height="13" patternUnits="userSpaceOnUse"><path d="M13 0H0v13" fill="none" stroke="#ffffff" strokeWidth="1" opacity=".22"/></pattern>
        <radialGradient id="tr-ball"><stop offset="0" stopColor="#f5ff8b"/><stop offset="1" stopColor="#a8d520"/></radialGradient>
      </defs>
      <rect x="-800" y="-400" width="3520" height="2300" fill="url(#tr-sky)"/>
      <Crowd id="tr-crowd" y={64} height={150} color={accent}/>
      <rect x="-800" y="214" width="3520" height="1686" fill="#082027"/>
      <path d={`M${far.left} ${far.y}H${far.right}L${near.right} ${near.y}H${near.left}Z`} fill="url(#tr-court)" stroke="#ffffff" strokeWidth="5" opacity=".9"/>
      <g stroke="#ffffff" strokeWidth="3.5" opacity=".66" fill="none">
        <path d={`M${inset(far, .12)[0]} ${far.y}L${inset(near, .12)[0]} ${near.y}M${inset(far, .12)[1]} ${far.y}L${inset(near, .12)[1]} ${near.y}`}/>
        {[court(.16), court(.64)].map((line, i) => <path key={i} d={`M${inset(line, .12)[0]} ${line.y}H${inset(line, .12)[1]}`}/>)}
        <path d={`M960 ${court(.16).y}V${court(.64).y}`}/>
      </g>
      <Athlete x={farX} y={far.y + 22} px={52} kit={kits.tennisAway} look={looks[4]} build="court" gear="hair" legs="shorts" shorts={kits.tennisAway.secondary} facing={-1}
        pose={stridePose(index === 1 ? p * 7 : 1.2, { reach: index === 2 ? winner * .9 : .35, lean: index === 2 ? winner * .2 : 0 })}
        hand={(grip, px) => <Racket grip={grip} angle={-.5} px={px} color={kits.tennisAway.accent}/>}/>
      {index === 0 && <Trail d={`M1066 756Q986 508 ${ball.x} ${ball.y}`} color={accent} on={serve}/>}
      {index === 2 && <Trail d={`M1012 904Q1140 576 ${ball.x} ${ball.y}`} color={accent} on={winner}/>}
      <path d={`M${net.left - 24} ${net.y - 52}H${net.right + 24}V${net.y}H${net.left - 24}Z`} fill="url(#tr-mesh)"/>
      <path d={`M${net.left - 24} ${net.y - 52}H${net.right + 24}`} stroke="#ffffff" strokeWidth="7" opacity=".9"/>
      <path d={`M${net.left - 24} ${net.y + 6}V${net.y - 58}M${net.right + 24} ${net.y + 6}V${net.y - 58}`} stroke="#2a3346" strokeWidth="9"/>
      {index === 3 && <Sparks t={t} color={accent} count={14}/>}
      <Glow id="tr-ball-glow" x={ball.x} y={ball.y} r={ball.r * 3.2} color="#f5ff8b" opacity={.45}/>
      <circle cx={ball.x} cy={ball.y} r={ball.r} fill="url(#tr-ball)"/>
      {/* The near player carries the racket, so the swing angle rides the shot. */}
      <Athlete x={nearX} y={996} px={128} kit={kits.tennis} look={looks[2]} build="court" gear="hair" legs="shorts" shorts={kits.tennis.secondary} number={1}
        pose={stridePose(index === 1 ? p * 8 : 1.6, { hip: .84, reach: index === 0 ? clamp(p / .4) * 1.1 : index === 2 ? winner : .45, lean: index === 1 ? Math.sin(p * Math.PI * 2.6) * .12 : 0 })}
        hand={(grip, px) => <Racket grip={grip} px={px} color={accent}
          angle={index === 0 ? lerp(-1.5, .3, clamp(p / .5)) : lerp(-.9, .5, index === 1 ? swingOn : winner)}/>}/>
    </>,
  };
}

/* -------------------------------------------------------------------------- Shell */

const frames: Partial<Record<LaunchGame, (beat: Beat) => Frame>> = {
  "penalty-shootout": penaltyFrame,
  "final-over": finalOverFrame,
  "hoop-duel": hoopDuelFrame,
  "tennis-rally": tennisRallyFrame,
};
/** True when this game has a gameplay demo board of its own. */
export function isGameplayDemoGame(game: string): game is LaunchGame {
  return game in frames;
}

export type GameplayDemoProps = { game: LaunchGame; scene: Scene; index: number; localTime: number; total: number; format: Format };

function Copy({ scene, localTime, index, total, accent }: GameplayDemoProps & { accent: string }) {
  const out = index === total - 1 ? 1 : 1 - smoothstep((localTime - scene.duration + .34) / .34);
  return <section className="composition-copy gd-copy" data-safe style={{ opacity: out }}>
    <div className="eyebrow gd-eyebrow" style={{ "--gd-reveal": easeOut((localTime - .06) / .3) } as CSSProperties}><span/>{scene.eyebrow}</div>
    <h1 data-overflow>{scene.headline.split("\n").map((line, lineIndex) => <span className="gd-line" key={`${line}-${lineIndex}`}><span style={{ "--gd-reveal": easeOut((localTime - .18 - lineIndex * .08) / .38) } as CSSProperties}>{line}</span></span>)}</h1>
    <p data-overflow style={{ "--gd-reveal": easeOut((localTime - .55) / .38) } as CSSProperties}>{scene.body}</p>
    <div className="copy-rule" style={{ "--gd-reveal": easeOut((localTime - .7) / .3), "--gd-accent": accent } as CSSProperties}/>
  </section>;
}

export function GameplayExperience(props: GameplayDemoProps) {
  const { game, scene, index, localTime, total, format } = props;
  const build = frames[game] ?? penaltyFrame;
  const frame = build({ index, t: localTime, p: clamp(localTime / scene.duration), total });
  const { hud, result } = frame;
  const introWipe = index === 0 ? 1 : smoothstep(localTime / .28);
  const outroWipe = index === total - 1 ? 0 : smoothstep((localTime - scene.duration + .28) / .28);
  return <>
    <div className="gameplay-world" style={{ "--gd-accent": frame.accent } as CSSProperties}>
      <svg className="gd-field" viewBox={viewWindow(format)} preserveAspectRatio="xMidYMid slice" aria-hidden="true">{frame.field}</svg>
      <div className="gd-scrim"/>
      <div className="gd-hud">
        <div className="gd-hud-row">
          <div className="gd-primary"><strong>{hud.value}</strong><span>{hud.unit}</span></div>
          <div className="gd-secondary"><strong>{hud.right}</strong><span>{hud.rightUnit}</span></div>
        </div>
        <div className="gd-meter"><span>{hud.meterLabel}</span><i><b style={{ transform: `scaleX(${clamp(hud.meter)})` }}/></i></div>
        {frame.marks.map(row => <div className="gd-marks" key={row.label}><span>{row.label}</span>{row.values.map((mark, markIndex) => <i className={`is-${mark}`} key={markIndex}/>)}</div>)}
        <div className={`gd-chip ${hud.chipOn ? "is-active" : ""}`}>{hud.chip}</div>
      </div>
      <div className="gd-venue"><span>{frame.venue[0]}</span><small>{frame.venue[1]}</small></div>
      {frame.toastOn && !result && <div className="gd-toast"><i/>{frame.toast}</div>}
      {frame.controls && <div className="gd-controls"><div className="gd-pad"><span>‹</span><span>›</span></div><div className="gd-pad gd-actions"><b>{frame.controls[0]}</b><b className="is-primary">{frame.controls[1]}</b></div></div>}
      {result && <div className="gd-result"><small>{result[0]}</small><strong>{result[1]}</strong><span>{result[2]}</span></div>}
      {index > 0 && <div className="gd-wipe gd-wipe-in" style={{ transform: `translateX(${introWipe * 118}%)` }}/>}
      {index < total - 1 && <div className="gd-wipe gd-wipe-out" style={{ transform: `translateX(${-118 + outroWipe * 118}%)` }}/>}
    </div>
    <Copy {...props} accent={frame.accent}/>
  </>;
}
