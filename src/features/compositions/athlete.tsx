import type { ReactNode } from "react";

/**
 * SVG port of the StatOz athlete rig, the way `GrandPrixCar` ports the Grand Prix
 * car painter. The source is statoz_web's canvas rigs:
 * `games/final-over/components/renderer/rig.ts` (cricket) and
 * `games/basketball/components/renderer/rig.ts` (court sports), which are
 * themselves ports of the Flutter app's `rigLimb` primitives.
 *
 * No sprites. Only the hip, shoulder and head are ever stored; limbs are
 * two-segment round-cap strokes whose knee or elbow is the midpoint pushed along
 * the segment normal. Every pose here is a plain value, so a composition frame
 * stays a pure function of scene time.
 *
 * Lengths are metres from the feet, scaled by `px` (pixels per metre). Hand
 * positions are the one exception, matching the source: they are screen offsets
 * from the shoulder, so +y reaches down.
 */

export type Point = { x: number; y: number };
export type RigPose = { hip: number; lean: number; footNear: Point; footFar: Point; handNear: Point; handFar: Point; headBob: number };
/** Clothing. Never a real club's colours: every kit here is invented for StatOz. */
export type Kit = { primary: string; secondary: string; accent: string };
/** The person under the kit — skin and hair are never a team colour. */
export type Look = { skin: string; hair: string };

export const pt = (x: number, y: number): Point => ({ x, y });
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
/** The source's `Curves.easeInOutCubic`, used by every swing between two poses. */
const easeInOut = (n: number) => { const t = clamp01(n); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const swing = (a: number, b: number, t: number) => a + (b - a) * easeInOut(t);
const easeInCubic = (n: number) => { const t = clamp01(n); return t * t * t; };

/** Multiplies a hex colour toward black, standing in for the source's palette-aware `darken`. */
export function shade(hex: string, amount: number) {
  const value = Number.parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel * (1 - amount));
  return `#${[mix(value >> 16 & 255), mix(value >> 8 & 255), mix(value & 255)].map(c => c.toString(16).padStart(2, "0")).join("")}`;
}

/* --------------------------------------------------------------- Kits and looks */

/** Final Over's house kit (`voltage`) and the StatOz court livery. Both invented. */
export const kits = {
  cricket: { primary: "#1b48d6", secondary: "#eff3ff", accent: "#35e0ff" },
  cricketAway: { primary: "#6a2bd9", secondary: "#e9ddff", accent: "#ffd24a" },
  court: { primary: "#0b4f5c", secondary: "#061018", accent: "#35e0ff" },
  courtAway: { primary: "#37415c", secondary: "#9aa8c7", accent: "#ff3d77" },
  football: { primary: "#17579f", secondary: "#eff3ff", accent: "#5cdfff" },
  tennis: { primary: "#67dcff", secondary: "#20314a", accent: "#51ff94" },
  tennisAway: { primary: "#e87722", secondary: "#14243d", accent: "#fff0c2" },
} as const satisfies Record<string, Kit>;
/** The source's five looks, picked by index instead of its id hash. */
export const looks: readonly Look[] = [
  { skin: "#6b4423", hair: "#17110d" }, { skin: "#8d5524", hair: "#1c1310" }, { skin: "#c68642", hair: "#2b1d14" },
  { skin: "#e0ac69", hair: "#4a2f1b" }, { skin: "#f1c27d", hair: "#6b4a2a" },
];
const bat = { handle: "#23282f", bladeEdge: "#6b4a22", blade: "#f3e6c8", spine: "#fff9ea", outline: "#5a3e1c" };
export const cricketBallColor = "#c4342b";

/* ------------------------------------------------------------------- Primitives */

type Stroke = { color: string; width: number };
const shadowInk = "rgba(0,0,0,.15)";
function Line({ from, to, stroke, cap = "round" }: { from: Point; to: Point; stroke: Stroke; cap?: "round" | "butt" }) {
  return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap={cap}/>;
}
const lerpPoint = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const addPoints = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const scalePoint = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
/** Top half of a circle: the source's `arc(cx, cy, r, PI, PI * 2)`. */
const topArc = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}`;

/**
 * Two-segment limb. The joint is the midpoint pushed along the segment normal;
 * the sign of `bend` picks which way it buckles — negative for knees, positive
 * for elbows. A dark pass behind each segment gives the limb volume.
 */
function Limb({ from, to, bend, upper, lower, px, lowerOverlay, shoe, shoeAccent }: {
  from: Point; to: Point; bend: number; upper: Stroke; lower: Stroke; px: number;
  lowerOverlay?: string | null; shoe?: string | null; shoeAccent?: string | null;
}) {
  const mid = lerpPoint(from, to, .5);
  const dx = to.x - from.x, dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const normal: Point = length > .001 ? { x: -dy / length, y: dx / length } : { x: 1, y: 0 };
  const joint = addPoints(mid, scalePoint(normal, bend));
  const shoeRadius = px * .085;
  const angle = length > .001 ? Math.atan2(dy, dx) * 180 / Math.PI : 90;
  return <>
    <Line from={addPoints(from, scalePoint(normal, -upper.width * .2))} to={addPoints(joint, scalePoint(normal, -upper.width * .2))} stroke={{ color: shadowInk, width: upper.width * .25 }}/>
    <Line from={addPoints(joint, scalePoint(normal, -lower.width * .2))} to={addPoints(to, scalePoint(normal, -lower.width * .2))} stroke={{ color: shadowInk, width: lower.width * .25 }}/>
    <Line from={from} to={joint} stroke={upper}/>
    <Line from={joint} to={to} stroke={lower}/>
    {lowerOverlay && <Line from={joint} to={lerpPoint(joint, to, .5)} stroke={{ color: lowerOverlay, width: lower.width * 1.05 }}/>}
    {shoe
      ? <g transform={`translate(${to.x} ${to.y}) rotate(${angle})`}>
        <ellipse cx={shoeRadius * .3} cy={0} rx={shoeRadius * 1.1} ry={shoeRadius * .7} fill={shoe}/>
        {shoeAccent && <path d={`M${shoeRadius * 1.3} ${shoeRadius * .3}A${shoeRadius} ${shoeRadius * .4} 0 0 1 ${shoeRadius * -.7} ${shoeRadius * .3}`} fill="none" stroke={shoeAccent} strokeWidth={px * .03}/>}
      </g>
      : <circle cx={to.x} cy={to.y} r={px * .05} fill={lower.color}/>}
  </>;
}

/* ----------------------------------------------------------------------- The rig */

/** Cricket stands a shade shorter in the shoulder than the court sports. */
const builds = { cricket: { shoulder: .5, head: .23, headRadius: .15 }, court: { shoulder: .52, head: .24, headRadius: .155 } };
export type Gear = "helmet" | "cap" | "headband" | "hair";
export type AthleteProps = {
  x: number; y: number; px: number; pose: RigPose; kit: Kit; look: Look;
  build?: keyof typeof builds; gear?: Gear; legs?: "trouser" | "shorts";
  pads?: boolean; gloves?: boolean; sleeve?: boolean; number?: number; facing?: 1 | -1;
  /** Overrides the darkened-shirt default, for a kit whose shorts are their own colour. */
  shorts?: string;
  /** Drawn in the rig's local space after the near arm, for a bat or a racket. */
  hand?: (grip: Point, px: number) => ReactNode;
};

export function Athlete({ x, y, px, pose, kit, look, build = "cricket", gear = "hair", legs = "trouser", pads = false, gloves = false, sleeve = false, number, facing = 1, shorts, hand }: AthleteProps) {
  const shape = builds[build];
  const local = (xM: number, yM: number): Point => ({ x: xM * px, y: -yM * px });
  const hip = local(0, pose.hip);
  const shoulderY = pose.hip + shape.shoulder;
  const shoulder = local(Math.sin(pose.lean) * .3, shoulderY);
  const head = local(Math.sin(pose.lean) * .42, shoulderY + shape.head + pose.headBob);
  const handNear = addPoints(shoulder, scalePoint(pose.handNear, px));
  const handFar = addPoints(shoulder, scalePoint(pose.handFar, px));
  const r = shape.headRadius * px;

  const body: Stroke = { color: kit.primary, width: px * .19 };
  const skin: Stroke = { color: look.skin, width: px * .095 };
  const skinFar: Stroke = { color: shade(look.skin, .25), width: px * .095 };
  const cloth: Stroke = { color: shorts ?? shade(kit.primary, .15), width: px * .15 };
  const bare = legs === "shorts";

  return <g transform={`translate(${x} ${y}) scale(${facing} 1)`}>
    {/* Legs, far first and darker — the painter's algorithm gives depth for free. */}
    <Limb from={hip} to={local(pose.footFar.x, pose.footFar.y)} bend={-.22 * px} px={px}
      upper={cloth} lower={bare ? skinFar : pads ? { color: shade(kit.secondary, .25), width: px * .13 } : cloth}
      lowerOverlay={pads ? shade(kit.secondary, .32) : null} shoe={shade(kit.accent, .2)} shoeAccent={shade(kit.secondary, .2)}/>
    <Limb from={hip} to={local(pose.footNear.x, pose.footNear.y)} bend={-.26 * px} px={px}
      upper={cloth} lower={bare ? skin : pads ? { color: kit.secondary, width: px * .13 } : cloth}
      lowerOverlay={pads ? kit.secondary : null} shoe={kit.accent} shoeAccent={kit.secondary}/>
    {/* Far arm, behind the torso. */}
    <Limb from={shoulder} to={handFar} bend={.2 * px} px={px} upper={skinFar} lower={skinFar} lowerOverlay={bare ? null : shade(kit.secondary, .25)}/>
    {/* Torso, its volume pass and shirt trim. */}
    <Line from={hip} to={shoulder} stroke={body}/>
    <Line from={{ x: hip.x + px * .04, y: hip.y }} to={{ x: shoulder.x + px * .04, y: shoulder.y }} stroke={{ color: shadowInk, width: px * .05 }}/>
    <Line from={lerpPoint(hip, shoulder, .1)} to={lerpPoint(hip, shoulder, .9)} stroke={{ color: kit.secondary, width: px * .04 }}/>
    <Line from={lerpPoint(hip, shoulder, .15)} to={lerpPoint(hip, shoulder, .34)} stroke={{ color: kit.accent, width: px * .05 }}/>
    {/* The shoulder bar widens the silhouette into a T. */}
    <Line from={{ x: shoulder.x - .15 * px, y: shoulder.y }} to={{ x: shoulder.x + .15 * px, y: shoulder.y }} stroke={{ color: kit.primary, width: px * .15 }}/>
    {number !== undefined && <text x={lerpPoint(hip, shoulder, .55).x * facing} y={lerpPoint(hip, shoulder, .55).y} transform={facing === -1 ? `scale(-1 1)` : undefined}
      fontSize={px * .2} fill={kit.accent} textAnchor="middle" dominantBaseline="middle" fontFamily="Orbitron, sans-serif" fontWeight={800}>{number}</text>}
    {/* Head: skin, a dark crown arc for volume, then the gear. */}
    <circle cx={head.x} cy={head.y} r={r} fill={look.skin}/>
    <path d={`M${head.x} ${head.y - r}A${r} ${r} 0 0 1 ${head.x} ${head.y + r}`} fill="none" stroke={shadowInk} strokeWidth={r * .3}/>
    {gear === "helmet" ? <>
      <path d={topArc(head.x, head.y, r * 1.08)} fill="none" stroke={kit.primary} strokeWidth={r * .7}/>
      <Line from={{ x: head.x + r * .1, y: head.y - r * .42 }} to={{ x: head.x + r * 1.15, y: head.y - r * .3 }} stroke={{ color: shade(kit.primary, .3), width: r * .2 }}/>
      <Line from={{ x: head.x + r * .2, y: head.y + r * .05 }} to={{ x: head.x + r * 1.02, y: head.y + r * .05 }} stroke={{ color: kit.secondary, width: r * .16 }}/>
      <Line from={{ x: head.x + r * .24, y: head.y + r * .46 }} to={{ x: head.x + r * .96, y: head.y + r * .46 }} stroke={{ color: kit.secondary, width: r * .16 }}/>
    </> : gear === "cap" ? <>
      <path d={topArc(head.x, head.y, r * 1.06)} fill="none" stroke={look.hair} strokeWidth={r * .62}/>
      <Line from={{ x: head.x - r * .9, y: head.y - r * .35 }} to={{ x: head.x + r * .9, y: head.y - r * .35 }} stroke={{ color: kit.primary, width: r * .34 }}/>
      <Line from={{ x: head.x + r * .5, y: head.y - r * .42 }} to={{ x: head.x + r * 1.35, y: head.y - r * .42 }} stroke={{ color: shade(kit.primary, .25), width: r * .18 }}/>
    </> : <>
      <path d={topArc(head.x, head.y, r * .92)} fill="none" stroke={look.hair} strokeWidth={r * .48}/>
      {gear === "headband" && <Line from={{ x: head.x - r, y: head.y + r * .08 }} to={{ x: head.x + r, y: head.y + r * .08 }} stroke={{ color: kit.secondary, width: r * .25 }} cap="butt"/>}
      {/* A lit line across the face, never a glow. */}
      <Line from={{ x: head.x + r * .15, y: head.y + r * .42 }} to={{ x: head.x + r * .95, y: head.y + r * .42 }} stroke={{ color: "rgba(92,223,255,.85)", width: r * .2 }}/>
    </>}
    {/* Near arm, in front. */}
    <Limb from={shoulder} to={handNear} bend={.24 * px} px={px} upper={skin} lower={skin}
      lowerOverlay={gloves ? kit.secondary : sleeve ? kit.secondary : bare ? null : shade(kit.secondary, .1)}/>
    {hand?.(handNear, px)}
  </g>;
}

/* ----------------------------------------------------------------- Held equipment */

/** Three tones: a dark edge, a grip in the kit accent, and a blade that catches the light. */
export function CricketBat({ grip, angle, px, kit }: { grip: Point; angle: number; px: number; kit: Kit }) {
  const length = .62 * px, width = .115 * px, radius = width * .22;
  const bladeX = length * .3, bladeW = length * .7;
  return <g transform={`translate(${grip.x} ${grip.y}) rotate(${angle * 180 / Math.PI})`}>
    <Line from={{ x: -length * .16, y: 0 }} to={{ x: length * .3, y: 0 }} stroke={{ color: bat.handle, width: width * .38 }}/>
    <Line from={{ x: -length * .1, y: 0 }} to={{ x: length * .14, y: 0 }} stroke={{ color: kit.accent, width: width * .46 }}/>
    <rect x={bladeX} y={-width / 2 + width * .18} width={bladeW} height={width} rx={radius} fill={bat.bladeEdge}/>
    <rect x={bladeX} y={-width / 2} width={bladeW} height={width} rx={radius} fill={bat.blade}/>
    <Line from={{ x: length * .34, y: -width * .06 }} to={{ x: length * .94, y: -width * .06 }} stroke={{ color: bat.spine, width: width * .18 }}/>
    <rect x={bladeX} y={-width / 2} width={bladeW} height={width} rx={radius} fill="none" stroke={bat.outline} strokeWidth={width * .1}/>
  </g>;
}

/** The tennis racket: a butt-cap handle and a hooped head, ported from `actors.ts`. */
export function Racket({ grip, angle, px, color }: { grip: Point; angle: number; px: number; color: string }) {
  const length = .46 * px;
  return <g transform={`translate(${grip.x} ${grip.y}) rotate(${angle * 180 / Math.PI})`}>
    <Line from={{ x: 0, y: 0 }} to={{ x: length * .62, y: 0 }} stroke={{ color: "#c49c66", width: px * .045 }} cap="butt"/>
    <ellipse cx={length} cy={0} rx={length * .42} ry={length * .3} fill="none" stroke={color} strokeWidth={px * .035}/>
    <ellipse cx={length} cy={0} rx={length * .42} ry={length * .3} fill="rgba(255,255,255,.05)"/>
  </g>;
}

/* ---------------------------------------------------------------------- Poses */

/** Front-foot guard: crouched, hands gripping the handle out in front of the thigh. */
export function batterStance(t: number): { pose: RigPose; batAngle: number } {
  const breathe = Math.sin(t * 2.4) * .015;
  return { pose: { hip: .8 + breathe, lean: .3, footNear: pt(.28, 0), footFar: pt(-.2, 0), handNear: pt(.2, .6), handFar: pt(.16, .64), headBob: breathe }, batAngle: 1.45 };
}
/** The coil the swing animates from, so pressing to swing never jumps silhouettes. */
export function batterBacklift(k: number): { pose: RigPose; batAngle: number } {
  const t = clamp01(k);
  return { pose: { hip: .8, lean: .3 - t * .1, footNear: pt(.28, 0), footFar: pt(-.2, 0), handNear: pt(.2 - t * .16, .6 - t * 1.26), handFar: pt(.16 - t * .16, .64 - t * 1.36), headBob: 0 }, batAngle: swing(1.45, -2.35, t) };
}
/** Lofted straight drive: front leg braces, torso opens, hands finish high. */
export function batterLoft(k: number): { pose: RigPose; batAngle: number } {
  const t = clamp01(k);
  return {
    pose: {
      hip: swing(.86, .94, t), lean: swing(.14, -.3, t),
      footNear: pt(swing(.18, .38, t), swing(0, .1, t)), footFar: pt(-.26, 0),
      handNear: pt(swing(-.02, .3, t), swing(-.6, -.96, t)), handFar: pt(swing(-.06, .22, t), swing(-.66, -1, t)),
      headBob: t * .02,
    },
    batAngle: swing(-2.35, -1.15, t),
  };
}
/** Bowler run-up, driven by a stride phase rather than a clock. */
export function bowlerRunUp(runPhase: number): RigPose {
  const s = Math.sin(runPhase);
  return {
    hip: .9 + Math.abs(Math.sin(runPhase * 2)) * .03, lean: .3,
    footNear: pt(s * .44, Math.max(0, Math.sin(runPhase)) * .16), footFar: pt(-s * .44, Math.max(0, -Math.sin(runPhase)) * .16),
    handNear: pt(-s * .22 + .1, -.46), handFar: pt(s * .18 - .04, -.5), headBob: 0,
  };
}
/** The arm comes over the top; the snap is the whole point of the pose. */
export function bowlerRelease(k: number): RigPose {
  const snap = clamp01(k);
  const armAngle = -2.25 + 2.75 * easeInCubic(snap);
  return {
    hip: swing(.98, .88, snap), lean: swing(-.16, .42, snap),
    footNear: pt(swing(.16, .4, snap), swing(.4, 0, snap)), footFar: pt(swing(-.34, -.3, snap), 0),
    handNear: pt(Math.cos(armAngle) * .52, Math.sin(armAngle) * .52 - .36), handFar: pt(swing(-.34, .18, snap), swing(-.1, -.52, snap)), headBob: 0,
  };
}
/** A neutral athletic stance with a running stride, shared by the court sports. */
export function stridePose(phase: number, { hip = .86, lean = .12, reach = 0, lift = 0 } = {}): RigPose {
  const s = Math.sin(phase);
  return {
    hip: hip + Math.abs(Math.sin(phase * 2)) * .02, lean,
    footNear: pt(s * .3, Math.max(0, s) * .1 + lift), footFar: pt(-s * .3, Math.max(0, -s) * .1),
    handNear: pt(.22 + reach * .3, .18 - reach * .9), handFar: pt(-.2, .22 - reach * .2), headBob: 0,
  };
}
/** Gather, rise and release: the jump shot, with `k` running 0 → 1 through the shot. */
export function jumpShotPose(k: number): RigPose {
  const t = clamp01(k);
  return {
    hip: swing(.78, 1.02, t), lean: swing(.18, -.06, t),
    footNear: pt(swing(.22, .1, t), swing(0, .26, t)), footFar: pt(swing(-.22, -.12, t), swing(0, .22, t)),
    handNear: pt(swing(.2, .12, t), swing(.16, -.78, t)), handFar: pt(swing(-.18, .02, t), swing(.2, -.62, t)), headBob: 0,
  };
}
/** Both arms up: the celebration every game ends on. */
export function celebratePose(t: number): RigPose {
  const bounce = Math.abs(Math.sin(t * 3.2));
  return {
    hip: .84 + bounce * .06, lean: -.06,
    footNear: pt(.2, bounce * .08), footFar: pt(-.2, bounce * .04),
    handNear: pt(.34, -.72 - bounce * .1), handFar: pt(-.3, -.76 - bounce * .1), headBob: bounce * .02,
  };
}
