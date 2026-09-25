"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { durationOf, formats, sceneAt, sports, type Format, type Project, type Sport } from "@/domain/project";
import { Button, FilterChips, Icon, Tag } from "@/design-system/components/ui";
import { Composition, type Media } from "@/features/compositions/composition";
import { studioTemplates, templateFor, type Template } from "@/features/templates/registry";
import { publicAsset } from "@/shared/api";
import { BrandLibrary, type BrandTab } from "./brand-library";
import { createDemoProject, demoAssets, demoAssetUrl, demoMedia, defaultDemoFormat } from "./demo-data";
import "./demo-studio.css";

export type DemoConnectionState = "disconnected" | "connecting" | "expired" | "error";
type DemoView = "Templates" | "Video demos" | "Assets & brand" | "Pitch deck";

const nav: { label: DemoView; icon: string }[] = [
  { label: "Templates", icon: "layers" },
  { label: "Video demos", icon: "play" },
  { label: "Assets & brand", icon: "brand" },
  { label: "Pitch deck", icon: "deck" },
];
const standardDemoFormats = ["square", "portrait", "reel", "landscape"] as const satisfies Format[];
const sportIds = Object.keys(sports) as Sport[];

function DemoCompositionFrame({ project, time = 0, pageIndex = 0, media = demoMedia(), className = "" }: { project: Project; time?: number; pageIndex?: number; media?: Record<string, Media>; className?: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 560, height: 500 });
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    if (holder.current) observer.observe(holder.current);
    return () => observer.disconnect();
  }, []);
  const dimensions = formats[project.format];
  const scale = Math.max(.04, Math.min(size.width / dimensions.width, size.height / dimensions.height));
  return <div ref={holder} className={`demo-composition-frame ${className}`}>
    <div style={{ width: dimensions.width * scale, height: dimensions.height * scale }}>
      <div style={{ width: dimensions.width, height: dimensions.height, transform: `scale(${scale})`, transformOrigin: "0 0", pointerEvents: "none" }}>
        <Composition project={project} time={time} pageIndex={pageIndex} media={media} logo={publicAsset("/assets/brand/logo.png")}/>
      </div>
    </div>
  </div>;
}

function ViewHeading({ overline, title, children }: { overline: string; title: string; children: React.ReactNode }) {
  return <header className="page-heading demo-page-heading"><div><div className="overline">{overline}</div><h1>{title}</h1><p>{children}</p></div><Tag>READ ONLY</Tag></header>;
}

function TemplatePreview({ template, onClose }: { template: Template; onClose: () => void }) {
  const [format, setFormat] = useState<Format>(defaultDemoFormat(template.id));
  const [page, setPage] = useState(0);
  const project = useMemo(() => createDemoProject(template.id, format, template.sport ?? "football"), [template, format]);
  return <div className="demo-overlay" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="demo-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="demo-preview-title">
      <div className="demo-dialog-heading"><div><div className="section-caption">TEMPLATE PREVIEW</div><h2 id="demo-preview-title">{template.name}</h2><p>{template.description}</p></div><Button variant="ghost" aria-label="Close preview" onClick={onClose}><Icon name="close"/></Button></div>
      <div className="demo-dialog-body">
        <DemoCompositionFrame project={project} pageIndex={page}/>
        <aside className="demo-preview-meta">
          <label className="field"><span>Format</span><select value={format} onChange={event => { setFormat(event.target.value as Format); setPage(0); }}>{template.formats.map(id => <option key={id} value={id}>{formats[id].label} · {formats[id].ratio}</option>)}</select></label>
          <dl><div><dt>Family</dt><dd>{template.category}</dd></div><div><dt>Media</dt><dd>{template.kind}</dd></div><div><dt>Sport</dt><dd>{sports[project.sport].label}</dd></div></dl>
          {project.pages.length > 1 && project.kind !== "video" && <div className="demo-page-controls"><span>PAGE {String(page + 1).padStart(2, "0")} / {String(project.pages.length).padStart(2, "0")}</span><div><Button variant="secondary" onClick={() => setPage(value => Math.max(0, value - 1))} disabled={page === 0}><Icon name="left"/>Previous</Button><Button variant="secondary" onClick={() => setPage(value => Math.min(project.pages.length - 1, value + 1))} disabled={page === project.pages.length - 1}>Next<Icon name="chevron"/></Button></div></div>}
          <p className="demo-readonly-note"><Icon name="lock" size={16}/>Connect the local companion to create, edit and export this template.</p>
        </aside>
      </div>
      {project.kind !== "video" && project.pages.length > 1 && <div className="demo-dialog-pages">{project.pages.map((scene, index) => <button key={scene.id} className={page === index ? "active" : ""} onClick={() => setPage(index)}>{String(index + 1).padStart(2, "0")}</button>)}</div>}
    </section>
  </div>;
}

function TemplatesView() {
  const [category, setCategory] = useState("All");
  const [ratio, setRatio] = useState("All ratios");
  const [sport, setSport] = useState("All sports");
  const [preview, setPreview] = useState<Template | null>(null);
  const categories = ["All", ...new Set(studioTemplates.map(template => template.category))];
  const visible = studioTemplates.filter(template => category === "All" || template.category === category).filter(template => ratio === "All ratios" || template.formats.includes(ratio as Format)).filter(template => sport === "All sports" || !template.sport || template.sport === sport);
  return <>
    <ViewHeading overline="PUBLIC TEMPLATE LIBRARY" title="Explore every Studio template.">Open a larger composition preview, filter by ratio or sport, and connect locally when you are ready to make it yours.</ViewHeading>
    <div className="demo-filter-stack">
      <FilterChips label="Template family" options={categories} selected={category} onSelect={setCategory}/>
      <div className="demo-select-filters"><label>RATIO<select aria-label="Ratio" value={ratio} onChange={event => setRatio(event.target.value)}><option>All ratios</option>{standardDemoFormats.map(id => <option key={id} value={id}>{formats[id].label} · {formats[id].ratio}</option>)}</select></label><label>SPORT<select aria-label="Sport" value={sport} onChange={event => setSport(event.target.value)}><option>All sports</option>{sportIds.map(id => <option key={id} value={id}>{sports[id].label}</option>)}</select></label></div>
    </div>
    <div className="demo-template-grid">{visible.map(template => {
      const project = createDemoProject(template.id, defaultDemoFormat(template.id), template.sport ?? (sport !== "All sports" ? sport as Sport : "football"));
      return <button className="demo-template-card" key={template.id} onClick={() => setPreview(template)}>
        <DemoCompositionFrame project={project}/><div className="demo-template-copy"><span>{template.category} / {template.kind.toUpperCase()}</span><h2>{template.name}</h2><p>{template.description}</p><small>{template.formats.map(id => formats[id].ratio).filter((value, index, list) => list.indexOf(value) === index).join(" · ")}</small></div>
      </button>;
    })}</div>
    {!visible.length && <div className="empty-state"><Icon name="layers" size={34}/><h2>No templates match these filters.</h2><p>Try another ratio or sport.</p></div>}
    {preview && <TemplatePreview template={preview} onClose={() => setPreview(null)}/>} 
  </>;
}

function VideoPlayer({ project, onFormat, onSport }: { project: Project; onFormat: (format: Format) => void; onSport: (sport: Sport) => void }) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const timeRef = useRef(0);
  const frame = useRef<number | null>(null);
  const total = durationOf(project);
  const updateTime = (next: number) => { timeRef.current = next; setTime(next); };
  useEffect(() => {
    if (!playing) return;
    let started = performance.now() - timeRef.current * 1000;
    const tick = (now: number) => {
      const elapsed = (now - started) / 1000;
      if (elapsed >= total) { started = now; timeRef.current = 0; setTime(0); }
      else { timeRef.current = elapsed; setTime(elapsed); }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => { if (frame.current !== null) cancelAnimationFrame(frame.current); };
  }, [playing, project.id, total]);
  const active = sceneAt(project, Math.min(time, total - 1 / 30));
  const sceneStarts = project.pages.map((_, index) => project.pages.slice(0, index).reduce((sum, scene) => sum + scene.duration, 0));
  return <div className="demo-video-layout">
    <div className="demo-video-stage"><DemoCompositionFrame project={project} time={time}/></div>
    <aside className="demo-video-controls">
      <div className="demo-video-actions"><Button variant="secondary" onClick={() => setPlaying(value => !value)}><Icon name={playing ? "pause" : "play"}/>{playing ? "Pause" : "Play"}</Button><span>{time.toFixed(1)}s / {total.toFixed(1)}s</span><Tag>LOOPS</Tag></div>
      <input className="demo-scrubber" aria-label="Video time" type="range" min="0" max={Math.max(0, total - 1 / 30)} step={1 / 30} value={time} onChange={event => updateTime(Number(event.target.value))}/>
      <div className="demo-scene-list" aria-label="Video scenes">{project.pages.map((scene, index) => <button key={scene.id} className={active.index === index ? "active" : ""} onClick={() => updateTime(sceneStarts[index])}><span>{String(index + 1).padStart(2, "0")}</span><b>{scene.eyebrow}</b><small>{scene.duration.toFixed(1)}s</small></button>)}</div>
      <div className="demo-video-fields"><label className="field"><span>Format</span><select value={project.format} onChange={event => onFormat(event.target.value as Format)}>{templateFor(project.templateId).formats.map(id => <option key={id} value={id}>{formats[id].label} · {formats[id].ratio}</option>)}</select></label>{!templateFor(project.templateId).sport && <label className="field"><span>Sport</span><select value={project.sport} onChange={event => onSport(event.target.value as Sport)}>{sportIds.map(id => <option key={id} value={id}>{sports[id].label}</option>)}</select></label>}</div>
      <p className="demo-readonly-note"><Icon name="play" size={16}/>Animation uses the same composition and deterministic frame time as Studio export.</p>
    </aside>
  </div>;
}

function VideoDemosView() {
  const videoTemplates = studioTemplates.filter(template => template.kind === "video");
  const [templateId, setTemplateId] = useState(videoTemplates[0].id);
  const [format, setFormat] = useState<Format>(defaultDemoFormat(templateId));
  const [sport, setSport] = useState<Sport>("football");
  const selected = templateFor(templateId);
  const project = useMemo(() => createDemoProject(templateId, format, selected.sport ?? sport), [templateId, format, sport, selected.sport]);
  const choose = (template: Template) => { setTemplateId(template.id); setFormat(defaultDemoFormat(template.id)); if (template.sport) setSport(template.sport); };
  return <>
    <ViewHeading overline="MOTION TEMPLATE THEATRE" title="Play the compositions, frame by frame.">Preview checked-in video templates with timeline scrubbing, scene navigation, format switching and predictable looping.</ViewHeading>
    <div className="demo-video-picker">{videoTemplates.map(template => <button key={template.id} className={template.id === templateId ? "active" : ""} onClick={() => choose(template)}><Icon name="play" size={15}/><span>{template.name}</span><small>{template.sport ? sports[template.sport].label : template.category}</small></button>)}</div>
    <div className="demo-section-title"><div><span>NOW PLAYING</span><h2>{selected.name}</h2></div><Tag>SAMPLE · 12 SEC</Tag></div>
    <VideoPlayer key={project.id} project={project} onFormat={setFormat} onSport={setSport}/>
  </>;
}

function AssetsBrandView() {
  const [area, setArea] = useState("Demo assets");
  const [brandTab, setBrandTab] = useState<BrandTab>("Overview");
  return <>
    <ViewHeading overline="APPROVED PUBLIC CONTENT" title="Assets and the complete brand system.">Only the explicit demo allowlist is published. No project storage, imported media, renders, credentials or browser profiles leave the computer.</ViewHeading>
    <div className="demo-primary-tabs"><FilterChips label="Assets and brand" options={["Demo assets", "Brand guide"]} selected={area} onSelect={setArea}/></div>
    {area === "Demo assets" ? <div className="demo-assets-grid">{demoAssets.map(asset => <article className="demo-asset-card" key={asset.id}><div><img src={demoAssetUrl(asset)} alt={asset.name}/><span>{asset.id === "statoz-logo" ? "BRAND" : "REFERENCE"}</span></div><section><h2>{asset.name}</h2><p>{asset.source}</p><div><Tag>{asset.approval === "brand" ? "BRAND ASSET" : "PRODUCT REFERENCE"}</Tag><small>{asset.width} × {asset.height}</small></div></section></article>)}</div>
      : <BrandLibrary assets={demoAssets} search="" selected={brandTab} onSelect={setBrandTab} resourceUrl={demoAssetUrl} readOnlyDemo/>}
  </>;
}

function PitchDeckView() {
  const project = useMemo(() => createDemoProject("investor-pitch", "landscape"), []);
  const [page, setPage] = useState(0);
  const scene = project.pages[page];
  return <>
    <ViewHeading overline="SAMPLE INVESTOR NARRATIVE" title="The complete 12-slide StatOz deck.">Page through the checked-in sample. Claims remain labelled as repo-backed, illustrative, source-backed or proposed.</ViewHeading>
    <div className="demo-pitch-layout">
      <section className="demo-pitch-stage"><DemoCompositionFrame project={project} pageIndex={page}/></section>
      <aside className="demo-pitch-meta"><div><span>SLIDE {String(page + 1).padStart(2, "0")} / {String(project.pages.length).padStart(2, "0")}</span><Tag>{scene.presentation?.evidenceStatus.toUpperCase()}</Tag></div><h2>{scene.headline.replace("\n", " ")}</h2><p>{scene.presentation?.sourceNote}</p><div className="demo-pitch-actions"><Button variant="secondary" onClick={() => setPage(value => Math.max(0, value - 1))} disabled={page === 0}><Icon name="left"/>Previous</Button><Button variant="secondary" onClick={() => setPage(value => Math.min(project.pages.length - 1, value + 1))} disabled={page === project.pages.length - 1}>Next<Icon name="chevron"/></Button></div></aside>
    </div>
    <div className="demo-pitch-strip" aria-label="Pitch deck slides">{project.pages.map((slide, index) => <button key={slide.id} className={page === index ? "active" : ""} onClick={() => setPage(index)} aria-label={`Slide ${index + 1}: ${slide.headline.replace("\n", " ")}`}><DemoCompositionFrame project={project} pageIndex={index}/><span>{String(index + 1).padStart(2, "0")}</span></button>)}</div>
  </>;
}

export function DemoStudio({ connectionState, detail, onConnect }: { connectionState: DemoConnectionState; detail: string; onConnect: () => void }) {
  const [view, setView] = useState<DemoView>("Templates");
  const status = connectionState === "connecting" ? "Connecting to the local companion…" : connectionState === "expired" ? "The pairing link expired or was already used. The demo is still available." : connectionState === "error" ? detail || "The local companion could not be reached. The demo is still available." : "";
  return <div className="studio-shell demo-studio">
    <aside className="navigation" aria-label="Demo navigation">
      <div className="studio-logo"><img src={publicAsset("/assets/brand/logo.png")} alt=""/><div>StatOz<span>DESIGNER</span></div></div>
      <div className="workspace-label">PUBLIC DEMO</div>
      <nav>{nav.map(item => <button key={item.label} aria-label={item.label} className={view === item.label ? "active" : ""} onClick={() => setView(item.label)}><Icon name={item.icon}/><span>{item.label}</span></button>)}</nav>
      <div className="nav-bottom"><div className="local-status"><i className="status-dot demo-status-dot"/><span>DEMO MODE<small>READ-ONLY · NO LOCAL DATA</small></span></div></div>
    </aside>
    <main className="studio-main">
      <header className="topbar demo-topbar"><div className="breadcrumb">STATOZ DESIGNER <span>/</span><b>{view.toUpperCase()}</b></div><div className="topbar-right"><Tag>DEMO MODE</Tag><Button onClick={onConnect} disabled={connectionState === "connecting"}><Icon name="lock" size={16}/>{connectionState === "connecting" ? "Connecting…" : connectionState === "expired" || connectionState === "error" ? "Reconnect companion" : "Connect local companion"}</Button></div></header>
      {status && <div className={`demo-connect-notice ${connectionState === "connecting" ? "is-connecting" : ""}`} role="status"><Icon name={connectionState === "connecting" ? "refresh" : "lock"} size={16}/><span>{status}</span>{connectionState !== "connecting" && <button onClick={onConnect}>Try again</button>}</div>}
      <div className="page-content demo-page-content">
        {view === "Templates" && <TemplatesView/>}
        {view === "Video demos" && <VideoDemosView/>}
        {view === "Assets & brand" && <AssetsBrandView/>}
        {view === "Pitch deck" && <PitchDeckView/>}
        <footer className="page-footer"><span>PUBLIC DEMO · SAMPLE CONTENT</span><span>FILES STAY ON YOUR COMPUTER WHEN CONNECTED</span></footer>
      </div>
    </main>
  </div>;
}
