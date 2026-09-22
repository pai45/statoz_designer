import type { ReactNode } from "react";
import type { Sport } from "@/domain/project";

/**
 * Top-down playing surfaces drawn as a coach's board: a faint grid, the markings
 * in 2px strokes, a few player dots and one dashed route. Each sport gets its own
 * grid id so several boards can share a page.
 */
function Board({ sport, children }: { sport: Sport; children: ReactNode }) {
  const grid = `grid-${sport}`;
  return <svg className="pitch-diagram" viewBox="0 0 540 640" aria-hidden="true"><defs><pattern id={grid} width="54" height="64" patternUnits="userSpaceOnUse"><path d="M54 0H0v64" fill="none" stroke="currentColor" strokeWidth=".5" opacity=".3"/></pattern></defs><rect width="540" height="640" fill={`url(#${grid})`}/>{children}</svg>;
}

// The circuit is one centreline, stroked wide and hollowed by a mask so the track reads as two edges.
const circuit = "M440 500V150Q440 80 370 80H250Q190 80 190 140Q190 200 250 220L320 245Q370 262 350 310Q330 350 270 340L150 320Q90 310 90 370V500Q90 560 150 560H380Q440 560 440 500Z";

const drawings: Record<Sport, () => ReactNode> = {
  football: () => <><g fill="none" stroke="currentColor" strokeWidth="2"><rect x="40" y="40" width="460" height="560"/><path d="M40 320h460M170 40v100h200V40m-150 0v40h100V40M170 600V500h200v100m-150 0v-40h100v40"/><circle cx="270" cy="320" r="65"/></g><g fill="currentColor"><circle cx="270" cy="320" r="6"/><circle cx="170" cy="410" r="10"/><circle cx="375" cy="190" r="10"/><circle cx="280" cy="530" r="10"/></g><path d="m280 530-110-120 205-220" fill="none" stroke="currentColor" strokeDasharray="8 8" strokeWidth="2"/></>,
  cricket: () => <><g fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="270" cy="320" rx="230" ry="280"/><ellipse cx="270" cy="320" rx="140" ry="175" strokeDasharray="4 10"/><rect x="250" y="250" width="40" height="140"/><path d="M240 272h60M240 368h60M262 262h16M262 378h16"/></g><g fill="currentColor"><circle cx="270" cy="252" r="10"/><circle cx="270" cy="384" r="10"/><circle cx="410" cy="200" r="10"/><circle cx="150" cy="470" r="10"/></g><path d="M270 384Q420 340 465 190" fill="none" stroke="currentColor" strokeDasharray="8 8" strokeWidth="2"/></>,
  basketball: () => <><g fill="none" stroke="currentColor" strokeWidth="2"><rect x="40" y="40" width="460" height="560"/><path d="M40 320h460M205 40v150h130V40M205 600V450h130v150M100 40v40a170 170 0 0 0 340 0V40M100 600v-40a170 170 0 0 1 340 0v40M240 58h60M240 582h60"/><circle cx="270" cy="320" r="50"/><circle cx="270" cy="190" r="55"/><circle cx="270" cy="450" r="55"/><circle cx="270" cy="70" r="12"/><circle cx="270" cy="570" r="12"/></g><g fill="currentColor"><circle cx="420" cy="430" r="10"/><circle cx="160" cy="300" r="10"/><circle cx="340" cy="230" r="10"/></g><path d="M420 430 160 300Q200 170 262 82" fill="none" stroke="currentColor" strokeDasharray="8 8" strokeWidth="2"/></>,
  tennis: () => <><g fill="none" stroke="currentColor" strokeWidth="2"><rect x="130" y="40" width="280" height="560"/><path d="M165 40v560M375 40v560M165 169h210M165 471h210M270 169v302M270 40v12M270 600v-12M100 320h340"/></g><g fill="currentColor"><circle cx="100" cy="320" r="5"/><circle cx="440" cy="320" r="5"/><circle cx="205" cy="585" r="10"/><circle cx="355" cy="62" r="10"/><circle cx="340" cy="110" r="6"/></g><path d="M205 580 340 110" fill="none" stroke="currentColor" strokeDasharray="8 8" strokeWidth="2"/></>,
  motorsport: () => <><defs><mask id="circuit-edges" maskUnits="userSpaceOnUse" x="0" y="0" width="540" height="640"><rect width="540" height="640" fill="white"/><path d={circuit} fill="none" stroke="black" strokeWidth="42"/></mask></defs><path d={circuit} fill="none" stroke="currentColor" strokeWidth="46" strokeLinejoin="round" mask="url(#circuit-edges)"/><g fill="none" stroke="currentColor" strokeWidth="2"><path d="M417 420h46M420 440h14M446 460h14"/></g><g fill="currentColor"><circle cx="440" cy="300" r="10"/><circle cx="300" cy="80" r="10"/><circle cx="90" cy="440" r="10"/></g><path d={circuit} fill="none" stroke="currentColor" strokeDasharray="8 8" strokeWidth="2"/></>,
};

export function SportDiagram({ sport }: { sport: Sport }) {
  return <Board sport={sport}>{drawings[sport]()}</Board>;
}
