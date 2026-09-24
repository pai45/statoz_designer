import type { CSSProperties } from "react";
import { durationOf, formats, launchGames, sceneAt, sports, type Project, type Scene } from "@/domain/project";
import { templateFor } from "@/features/templates/registry";
import { PitchDeckSlide } from "./pitch-deck";
import { GrandPrixExperience } from "./grand-prix";
import { GameplayExperience, isGameplayDemoGame } from "./gameplay";
import { AppCreative } from "./app-creatives";
import { SportDiagram } from "./sport-diagrams";
import { GameArt } from "./game-art";
import { MatchStoryScene } from "./match-story";
import { NewsFlash } from "./news";
import { StatBreakdownArt } from "./stat-breakdown";

export type Media = { src: string; mime: string; duration?: number };
export type CompositionProps = { project: Project; time?: number; pageIndex?: number; media?: Record<string, Media>; logo?: string; guides?: boolean };
const clamp = (n: number) => Math.min(1, Math.max(0, n));

function CardArt({ scene, src }: { scene: Scene; src?: Media }) {
  // A linked player card supplies the club, position and nation; an unlinked card keeps the house line.
  const player = scene.playerCard;
  const identity = [player?.position, player?.nation].filter(Boolean);
  return <div className="collectible-wrap"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="collectible"><div className="collectible-inner"><div className="card-rank"><b>{scene.statValue}</b><span>ATK</span></div><div className="card-tier">PLATINUM</div>{src ? <img className="card-portrait" src={src.src} alt="" style={{ objectFit: scene.crop, objectPosition: `${scene.cropX}% ${scene.cropY}%` }}/> : <svg className="player-silhouette" viewBox="0 0 200 260"><circle cx="102" cy="65" r="34"/><path d="m69 105-43 36-21 91 34 9 25-77-4 96h89l-11-103 32 75 31-15-34-87-34-26-30 22Z"/></svg>}<div className="card-name"><small>{player?.club || "STATOZ / COLLECTION"}</small><h3>{scene.nameA}</h3>{identity.length > 0 && <div className="card-identity">{identity.map((part, i) => <span key={i}>{part}</span>)}</div>}<div className="card-metrics"><span>PACE <b>{scene.cardMetrics.pace}</b></span><span>SKILL <b>{scene.cardMetrics.skill}</b></span><span>FORM <b>{scene.cardMetrics.form}</b></span></div></div></div></div><span className="card-caption">{scene.statLabel}</span></div>;
}
function Emblem({ scene, side, media }: { scene: Scene; side: "A" | "B"; media: Record<string, Media> }) {
  const crest = media[side === "A" ? scene.emblemA : scene.emblemB];
  const name = side === "A" ? scene.nameA : scene.nameB;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "--";
  return <div className={`team-emblem ${crest ? "has-crest" : "is-fallback"}`}>{crest ? <img src={crest.src} alt={`${name} crest`}/> : <span aria-label={`${name} initials`}>{initials}</span>}</div>;
}
function MatchArt({ scene, result, media }: { scene: Scene; result: boolean; media: Record<string, Media> }) {
  const values = scene.statValue.split(/\s+[—–-]\s+/).map(value => value.trim()).filter(Boolean);
  const paired = values.length === 2;
  const chartA = Number(scene.chartValues[0]), chartB = Number(scene.chartValues[1]);
  const chartTotal = chartA + chartB;
  const shareA = Number.isFinite(chartTotal) && chartTotal > 0 ? clamp(chartA / chartTotal) * 100 : 50;
  const longestScore = Math.max(scene.scoreA.length, scene.scoreB.length);
  const scoreClass = longestScore > 5 ? " score-dense" : longestScore > 2 ? " score-compact" : "";
  return <div className="match-art">
    <div className="match-topline"><span>{result ? "FINAL WHISTLE" : "THE NEXT CHAPTER"}</span><span>STATOZ SPORTS</span></div>
    <div className="versus">
      <div className="team"><Emblem scene={scene} side="A" media={media}/><h3>{scene.nameA}</h3></div>
      <div className={`score-display${scoreClass}`}>{result ? <><b>{scene.scoreA}</b><span>:</span><b>{scene.scoreB}</b></> : <span className="vs">VS</span>}</div>
      <div className="team away"><Emblem scene={scene} side="B" media={media}/><h3>{scene.nameB}</h3></div>
    </div>
    <div className={`match-stat ${paired ? "is-paired" : "is-single"}`}>
      <div className="match-stat-head"><span>{scene.statLabel}</span><small>FEATURED STAT</small></div>
      <div className="match-stat-values">{paired ? <><strong>{values[0]}</strong><strong>{values[1]}</strong></> : <strong>{scene.statValue}</strong>}</div>
      <div className="match-stat-track" aria-hidden="true"><i style={{ width: `${shareA}%` }}/><i/></div>
    </div>
  </div>;
}
function ComparisonArt({ scene }: { scene: Scene }) {
  const a = Math.min(100, Math.max(3, Number.parseFloat(scene.scoreA) || 78));
  const b = Math.min(100, Math.max(3, Number.parseFloat(scene.scoreB) || 54));
  return <div className="stats-art comparison-art"><span className="micro-label">{scene.statLabel}</span><div className="comparison-values"><div><small>{scene.nameA}</small><strong>{scene.scoreA}</strong></div><span>/</span><div><small>{scene.nameB}</small><strong>{scene.scoreB}</strong></div></div><div className="chart-bars">{[a, b].map((n, i) => <div key={i} style={{ height: `${n}%`, opacity: .25 + i * .075 }}/>)}</div><div className="chart-baseline"><span>01</span><span>THE PERFORMANCE</span><span>10</span></div><div className="comparison-key"><span>{scene.nameA}</span><span>{scene.nameB}</span></div></div>;
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
  // Launch scenes draw the chosen game's gameplay art into the background unless media overrides it.
  const gameArt = template.visual === "launch" && scene.game ? scene.game : undefined;
  const style = { width: dimensions.width, height: dimensions.height, "--accent": sports[project.sport].accent } as CSSProperties;
  if (["app-showcase", "play-feature", "store-icon"].includes(template.visual)) return <div id="composition" className={`composition format-${project.format} visual-${template.visual}`} style={style}>
    <AppCreative visual={template.visual as "app-showcase" | "play-feature" | "store-icon"} scene={scene} index={index} total={project.pages.length} format={project.format} media={media} logo={logo} guides={guides}/>
    {guides && template.visual !== "store-icon" && <div className="safe-guide"><span>SAFE AREA</span></div>}
  </div>;
  if (template.visual === "news") return <div id="composition" className={`composition format-${project.format} visual-news news-${scene.layout}`} style={style}>
    <NewsFlash scene={scene} format={project.format} sport={project.sport} media={media} logo={logo} sample={project.sample}/>
    {guides && <div className="safe-guide"><span>SAFE AREA</span></div>}
  </div>;
  if (template.visual === "pitch") return <div id="composition" className={`composition format-${project.format} visual-pitch`} style={style}>
    <PitchDeckSlide scene={scene} index={index} total={project.pages.length} logo={logo} visualSrc={isClip ? undefined : src?.src}/>
    {guides && <div className="safe-guide"><span>SAFE AREA</span></div>}
  </div>;
  return <div id="composition" className={`composition format-${project.format} layout-${scene.layout} visual-${template.visual}`} style={style}>
    <div className="composition-grid"/><div className="composition-vignette"/>
    <div className="canvas-corner top"/><div className="canvas-corner bottom"/>
    {template.visual === "grand-prix" && <GrandPrixExperience key={`gp-${index}-${localTime.toFixed(6)}`} scene={scene} index={index} localTime={localTime} total={project.pages.length}/>}
    {/* Gameplay demos pick their game from the scene, so one visual covers the whole arcade family. */}
    {template.visual === "gameplay" && <GameplayExperience key={`gd-${index}-${localTime.toFixed(6)}`} game={isGameplayDemoGame(scene.game) ? scene.game : "penalty-shootout"} scene={scene} index={index} localTime={localTime} total={project.pages.length} format={project.format}/>}
    <header className="composition-brand" data-safe>{scene.showLogo ? <div className="brand-lockup"><img src={logo} alt="StatOz"/><span>StatOz<span className="brand-dot">.</span></span></div> : <span/>}<span className="brand-edition">{sports[project.sport].label.toUpperCase()}<i/>{sports[project.sport].symbol}</span></header>
    {/* Match stories choreograph their own entrances, so only the exit fade applies; still pages show the settled frame. */}
    {template.visual === "match-story" && <main className="composition-main" style={{ opacity: exit }}><MatchStoryScene scene={scene} index={index} total={project.pages.length} localTime={isVideo ? localTime : scene.duration} sport={project.sport} media={media} sample={project.sample}/></main>}
    {template.visual !== "grand-prix" && template.visual !== "gameplay" && template.visual !== "match-story" && <main className="composition-main" style={{ opacity: entry * exit, transform }}>
      <section className="composition-copy" data-safe><div className="eyebrow"><span/>{scene.eyebrow}</div><h1 data-overflow>{scene.headline}</h1><p data-overflow>{scene.body}</p><div className="copy-rule"/></section>
      <section className="composition-art" data-safe>
        {template.visual === "card" ? <CardArt scene={scene} src={isClip ? undefined : src}/> : template.visual === "match" ? <MatchArt scene={scene} result={project.templateId === "match-result"} media={media}/> : template.visual === "stats" ? <StatBreakdownArt scene={scene}/> : template.visual === "player" ? <ComparisonArt scene={scene}/> : template.visual === "tutorial" ? <div className="tutorial-art"><div className="step-number">0{index + 1}<span>/ 0{project.pages.length}</span></div><div className="tutorial-plate"><div className="step-line"/><span>{index === 0 ? "THE PLAYBOOK" : index === project.pages.length - 1 ? "YOUR NEXT MOVE" : "STEP BY STEP"}</span><SportDiagram sport={project.sport}/></div></div> : gameArt && !src ? <div className="game-scene"><GameArt game={gameArt} sport={project.sport}/></div> : <div className="feature-art">{src ? isClip ? <video data-scene-video muted playsInline preload="auto" src={src.src} style={{ objectFit: scene.crop, objectPosition: `${scene.cropX}% ${scene.cropY}%` }}/> : <img src={src.src} alt="" style={{ objectFit: scene.crop, objectPosition: `${scene.cropX}% ${scene.cropY}%` }}/> : <SportDiagram sport={project.sport}/>}<div className="art-shade"/><div className="art-caption"><span>{template.visual === "launch" ? (gameArt ? launchGames[gameArt].label.toUpperCase() : "PITCH DUEL") : "PREDICT. PLAY. COLLECT."}</span><b>↗</b></div><div className="art-index">STATOZ / {sports[project.sport].symbol}</div></div>}
      </section>
    </main>}
    <footer className="composition-footer" data-safe><div>{scene.showCta && <div className="composition-cta"><span>{scene.cta}</span><b>↗</b></div>}<span className="footer-note">{project.sample ? "SAMPLE CONTENT / STATOZ DESIGNER" : "MADE FOR THE LOVE OF THE GAME"}</span></div><div className="page-mark">{project.kind === "image" ? "STZ" : `${String(index + 1).padStart(2, "0")} / ${String(project.pages.length).padStart(2, "0")}`}</div></footer>
    {isVideo && <div className="motion-progress" style={{ transform: `scaleX(${clamp(time / durationOf(project))})` }}/>}
    {guides && <div className="safe-guide"><span>SAFE AREA</span></div>}
  </div>;
}
