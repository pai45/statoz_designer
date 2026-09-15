import type { CSSProperties } from "react";
import { durationOf, formats, sceneAt, sports, type Project, type Scene } from "@/domain/project";
import { templateFor } from "@/features/templates/registry";

export type Media = { src: string; mime: string; duration?: number };
export type CompositionProps = { project: Project; time?: number; pageIndex?: number; media?: Record<string, Media>; logo?: string; guides?: boolean };
const clamp = (n: number) => Math.min(1, Math.max(0, n));

function StadiumDiagram() {
  return <svg className="pitch-diagram" viewBox="0 0 540 640" aria-hidden="true"><defs><pattern id="pitch-grid" width="54" height="64" patternUnits="userSpaceOnUse"><path d="M54 0H0v64" fill="none" stroke="currentColor" strokeWidth=".5" opacity=".3"/></pattern></defs><rect width="540" height="640" fill="url(#pitch-grid)"/><g fill="none" stroke="currentColor" strokeWidth="2"><rect x="40" y="40" width="460" height="560"/><path d="M40 320h460M170 40v100h200V40m-150 0v40h100V40M170 600V500h200v100m-150 0v-40h100v40"/><circle cx="270" cy="320" r="65"/></g><g fill="currentColor"><circle cx="270" cy="320" r="6"/><circle cx="170" cy="410" r="10"/><circle cx="375" cy="190" r="10"/><circle cx="280" cy="530" r="10"/></g><path d="m280 530-110-120 205-220" fill="none" stroke="currentColor" strokeDasharray="8 8" strokeWidth="2"/></svg>;
}
function CardArt({ scene, src }: { scene: Scene; src?: Media }) {
  return <div className="collectible-wrap"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="collectible"><div className="collectible-inner"><div className="card-rank"><b>{scene.statValue}</b><span>ATK</span></div><div className="card-tier">PLATINUM</div>{src ? <img className="card-portrait" src={src.src} alt="" style={{ objectFit: scene.crop, objectPosition: `${scene.cropX}% ${scene.cropY}%` }}/> : <svg className="player-silhouette" viewBox="0 0 200 260"><circle cx="102" cy="65" r="34"/><path d="m69 105-43 36-21 91 34 9 25-77-4 96h89l-11-103 32 75 31-15-34-87-34-26-30 22Z"/></svg>}<div className="card-name"><small>STATOZ / COLLECTION</small><h3>{scene.nameA}</h3><div className="card-metrics"><span>PACE <b>{scene.cardMetrics.pace}</b></span><span>SKILL <b>{scene.cardMetrics.skill}</b></span><span>FORM <b>{scene.cardMetrics.form}</b></span></div></div></div></div><span className="card-caption">{scene.statLabel}</span></div>;
}
function MatchArt({ scene, result }: { scene: Scene; result: boolean }) {
  return <div className="match-art"><div className="match-topline"><span>{result ? "FINAL WHISTLE" : "THE NEXT CHAPTER"}</span><span>STATOZ SPORTS</span></div><div className="versus"><div className="team"><div className="team-emblem"><span>{scene.nameA.substring(0, 2)}</span></div><h3>{scene.nameA}</h3></div><div className="score-display">{result ? <><b>{scene.scoreA}</b><span>:</span><b>{scene.scoreB}</b></> : <span className="vs">VS</span>}</div><div className="team away"><div className="team-emblem"><span>{scene.nameB.substring(0, 2)}</span></div><h3>{scene.nameB}</h3></div></div><div className="match-bottomline"><span>THE GAME. YOUR PERSPECTIVE.</span><i/></div></div>;
}
function StatsArt({ scene, comparison }: { scene: Scene; comparison: boolean }) {
  const a = Math.min(100, Math.max(3, Number.parseFloat(scene.scoreA) || 78));
  const b = Math.min(100, Math.max(3, Number.parseFloat(scene.scoreB) || 54));
  return <div className={`stats-art ${comparison ? "comparison-art" : ""}`}><span className="micro-label">{scene.statLabel}</span>{comparison ? <div className="comparison-values"><div><small>{scene.nameA}</small><strong>{scene.scoreA}</strong></div><span>/</span><div><small>{scene.nameB}</small><strong>{scene.scoreB}</strong></div></div> : <div className="hero-stat"><strong>{scene.statValue}</strong><span>IN FOCUS</span></div>}<div className="chart-bars">{(comparison ? [a, b] : scene.chartValues).map((n, i) => <div key={i} style={{ height: `${n}%`, opacity: .25 + i * .075 }}/>)}</div><div className="chart-baseline"><span>01</span><span>THE PERFORMANCE</span><span>10</span></div>{comparison && <div className="comparison-key"><span>{scene.nameA}</span><span>{scene.nameB}</span></div>}</div>;
}

export function Composition({ project, time = 0, pageIndex = 0, media = {}, logo = "/assets/brand/logo.png", guides = false }: CompositionProps) {
  const template = templateFor(project.templateId);
  const selected = project.kind === "video" ? sceneAt(project, time) : { scene: project.pages[pageIndex] ?? project.pages[0], index: pageIndex, localTime: 1, start: 0 };
  const { scene, index, localTime } = selected;
  const dimensions = formats[project.format];
  const isVideo = project.kind === "video";
  const entry = !isVideo || scene.motion === "none" || index === 0 ? 1 : 1 - Math.pow(1 - clamp(localTime / .5), 3);
  const exit = !isVideo || scene.transition === "cut" || index === project.pages.length - 1 ? 1 : clamp((scene.duration - localTime) / .25);
  const transform = scene.motion === "slide" ? `translateX(${(1 - entry) * 70}px)` : scene.motion === "zoom" ? `scale(${.92 + entry * .08})` : `translateY(${(1 - entry) * 40}px)`;
  const src = media[scene.assetId];
  const isClip = src?.mime.startsWith("video/");
  const style = { width: dimensions.width, height: dimensions.height, "--accent": sports[project.sport].accent } as CSSProperties;
  return <div id="composition" className={`composition format-${project.format} layout-${scene.layout} visual-${template.visual}`} style={style}>
    <div className="composition-grid"/><div className="composition-vignette"/>
    <div className="canvas-corner top"/><div className="canvas-corner bottom"/>
    <header className="composition-brand" data-safe>{scene.showLogo ? <div className="brand-lockup"><img src={logo} alt="StatOz"/><span>StatOz<span className="brand-dot">.</span></span></div> : <span/>}<span className="brand-edition">{sports[project.sport].label.toUpperCase()}<i/>{sports[project.sport].symbol}</span></header>
    <main className="composition-main" style={{ opacity: entry * exit, transform }}>
      <section className="composition-copy" data-safe><div className="eyebrow"><span/>{scene.eyebrow}</div><h1 data-overflow>{scene.headline}</h1><p data-overflow>{scene.body}</p><div className="copy-rule"/></section>
      <section className="composition-art" data-safe>
        {template.visual === "card" ? <CardArt scene={scene} src={isClip ? undefined : src}/> : template.visual === "match" ? <MatchArt scene={scene} result={project.templateId === "match-result"}/> : template.visual === "stats" || template.visual === "player" ? <StatsArt scene={scene} comparison={template.visual === "player"}/> : template.visual === "tutorial" ? <div className="tutorial-art"><div className="step-number">0{index + 1}<span>/ 0{project.pages.length}</span></div><div className="tutorial-plate"><div className="step-line"/><span>{index === 0 ? "THE PLAYBOOK" : index === project.pages.length - 1 ? "YOUR NEXT MOVE" : "STEP BY STEP"}</span><StadiumDiagram/></div></div> : <div className="feature-art">{src ? isClip ? <video data-scene-video muted playsInline preload="auto" src={src.src} style={{ objectFit: scene.crop, objectPosition: `${scene.cropX}% ${scene.cropY}%` }}/> : <img src={src.src} alt="" style={{ objectFit: scene.crop, objectPosition: `${scene.cropX}% ${scene.cropY}%` }}/> : <StadiumDiagram/>}<div className="art-shade"/><div className="art-caption"><span>{template.visual === "launch" ? "PITCH DUEL" : "PREDICT. PLAY. COLLECT."}</span><b>↗</b></div><div className="art-index">STATOZ / {sports[project.sport].symbol}</div></div>}
      </section>
    </main>
    <footer className="composition-footer" data-safe><div>{scene.showCta && <div className="composition-cta"><span>{scene.cta}</span><b>↗</b></div>}<span className="footer-note">{project.sample ? "SAMPLE CONTENT / STATOZ DESIGNER" : "MADE FOR THE LOVE OF THE GAME"}</span></div><div className="page-mark">{project.kind === "image" ? "STZ" : `${String(index + 1).padStart(2, "0")} / ${String(project.pages.length).padStart(2, "0")}`}</div></footer>
    {isVideo && <div className="motion-progress" style={{ transform: `scaleX(${clamp(time / durationOf(project))})` }}/>}
    {guides && <div className="safe-guide"><span>SAFE AREA</span></div>}
  </div>;
}
