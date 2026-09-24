"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { durationOf, formats, isLineArt, launchGames, sceneAt, sports, type Asset, type LaunchGame, type Format, type ProjectEnvelope, type RenderJob, type Scene } from "@/domain/project";
import { briefFor } from "@/domain/brief";
import { Button, Icon, InputField, Tag } from "@/design-system/components/ui";
import { templateFor } from "@/features/templates/registry";
import { api } from "@/shared/api";
import { LineArtPicker } from "./line-art-picker";
import { AssistantPanel } from "./assistant-panel";
import { BriefAdvancedControls } from "./brief-advanced-controls";
import { MatchPicker } from "@/features/studio/match-picker";
import { PlayerPicker } from "./player-picker";
import { PitchSlideFields } from "./pitch-slide-fields";
import { MatchStoryFields } from "./match-story-fields";
import { NewsFields } from "./news-fields";
import { AppCaptureFields, AppCreativeFields } from "./app-creative-fields";
import { appCreativeReadiness } from "@/domain/app-creatives";
import { Preview, Thumbnail } from "./preview";
import { useEditor } from "./use-editor";

export function Editor({ initial, assets, onClose, onOpen, onExports, onAssetsChanged = () => {}, notify, projectFolder }: { initial: ProjectEnvelope; assets: Asset[]; onClose: () => void; onOpen: (p: ProjectEnvelope) => void; onExports: () => void; onAssetsChanged?: () => void; notify: (m: string) => void; projectFolder: string }) {
  const editor = useEditor(initial);
  const { project, edit } = editor;
  const [pageIndex, setPageIndex] = useState(0), [time, setTime] = useState(0), [playing, setPlaying] = useState(false);
  const [guides, setGuides] = useState(false), [zoom, setZoom] = useState(1), [overflow, setOverflow] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false), [exporting, setExporting] = useState(false);
  const [outputType, setOutputType] = useState<RenderJob["outputType"]>(project.pitchDeck ? "pdf" : project.kind === "video" ? "mp4" : project.kind === "carousel" ? "zip" : "png");
  const [variants, setVariants] = useState<Format[]>(project.outputVariants);
  const [panel, setPanel] = useState<"Content" | "Style" | "Audio" | "Brief">(project.pitchDeck ? "Content" : "Brief");
  const [matchPicker, setMatchPicker] = useState(false);
  const exportDialog = useRef<HTMLDialogElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const sfxAudio = useRef<HTMLAudioElement>(null);
  const [sfxUrl, setSfxUrl] = useState("");
  const sfxProject = useRef(project);
  useEffect(() => { sfxProject.current = project; }, [project]);
  const audioTiming = project.pages.map(p => p.duration).join(",");
  const total = durationOf(project), isVideo = project.kind === "video", isPitch = Boolean(project.pitchDeck);
  const visibleIndex = isVideo ? sceneAt(project, time).index : Math.min(pageIndex, project.pages.length - 1);
  const scene = project.pages[visibleIndex];
  const selectedAsset = assets.find(a => a.id === scene.assetId);
  const template = templateFor(project.templateId);
  const isAppCreative = ["app-showcase", "play-feature", "store-icon"].includes(template.visual);
  const isStoreIcon = template.visual === "store-icon";
  const isNews = template.visual === "news";
  const exportReadiness = variants.flatMap(format => appCreativeReadiness(project, format, assets));
  const updateScene = (change: Partial<Scene>) => edit(p => { p.pages[visibleIndex] = { ...p.pages[visibleIndex], ...change }; return p; });
  const updateAllScenes = (change: Partial<Scene>) => edit(p => { p.pages = p.pages.map(page => ({ ...page, ...change })); return p; });
  const selectScene = (index: number) => { setPlaying(false); setPageIndex(index); if (isVideo) setTime(project.pages.slice(0, index).reduce((n, s) => n + s.duration, 0)); };
  useEffect(() => {
    if (!playing) return;
    let raf: number;
    const start = performance.now(), base = time;
    function tick(now: number) { const next = base + (now - start) / 1000; if (next >= total) { setTime(Math.max(0, total - 1 / 30)); setPlaying(false); return; } setTime(next); raf = requestAnimationFrame(tick); }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
    // The playback clock captures its starting position when playback begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, total]);
  useEffect(() => {
    for (const [player, gain, enabled] of [[audio.current, project.audio.gain, true], [sfxAudio.current, 1, project.audio.sfx]] as const) {
      if (!player) continue;
      player.volume = gain;
      if (Math.abs(player.currentTime - time) > .3) player.currentTime = Math.min(time, player.duration || time);
      if (playing && !project.audio.silent && enabled) void player.play().catch(() => {}); else player.pause();
    }
  }, [playing, time, project.audio.gain, project.audio.silent, project.audio.sfx]);
  useEffect(() => {
    if (!isVideo) return;
    const abort = new AbortController(); let url = "";
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/audio-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sfxProject.current), signal: abort.signal });
        if (!response.ok) return;
        const blob = await response.blob(); if (abort.signal.aborted) return;
        url = URL.createObjectURL(blob); setSfxUrl(url);
      } catch { /* The export endpoint still reports invalid timing; retain the last playable preview. */ }
    }, 300);
    return () => { clearTimeout(timer); abort.abort(); if (url) URL.revokeObjectURL(url); };
  }, [isVideo, audioTiming]);
  useEffect(() => {
    const dialog = exportDialog.current; if (!dialog) return;
    if (exportOpen && !dialog.open) dialog.showModal(); else if (!exportOpen && dialog.open) dialog.close();
  }, [exportOpen]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void editor.save(); }
      const typing = /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName);
      if (!typing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) editor.redo(); else editor.undo(); }
    };
    window.addEventListener("keydown", keyboard); return () => window.removeEventListener("keydown", keyboard);
  }, [editor]);
  const reportOverflow = useCallback((messages: string[]) => setOverflow(previous => JSON.stringify(previous) === JSON.stringify(messages) ? previous : messages), []);
  async function copyBrief() {
    // Same text an assistant run sends, so the manual and automated paths never drift.
    const folder = await api<{ projectFolder: string }>("config").then(value => value.projectFolder).catch(() => projectFolder);
    const brief = briefFor(project, assets, folder, scene);
    try { await navigator.clipboard.writeText(brief); notify("Creative brief copied. Paste it into Codex or Claude."); } catch { notify("Clipboard unavailable. Brief fields are saved in the project JSON."); }
  }
  async function saveCopy() { try { onOpen(await api<ProjectEnvelope>("projects", { method: "POST", body: JSON.stringify({ copy: project }) })); } catch (e) { notify((e as Error).message); } }
  async function exportProject() {
    setExporting(true);
    try {
      for (const format of variants) await api("exports", { method: "POST", body: JSON.stringify({ projectId: project.id, etag: editor.etag, format, outputType }) });
      setExportOpen(false); notify(`${variants.length} export${variants.length > 1 ? "s" : ""} queued.`); onExports();
    } catch (e) { notify((e as Error).message); } finally { setExporting(false); }
  }
  const canExport = !editor.dirty && !editor.saving && !editor.conflict && !editor.validationMessage && !overflow.length;
  const assistantBlocked = editor.conflict ? "Resolve the external-change conflict before starting a revision." : editor.validationMessage ? "Fix the project validation issue before starting a revision." : editor.saving ? "Waiting for your latest edits to save…" : editor.dirty ? "Waiting for your latest edits to save…" : "";
  const close = () => { if (editor.dirty) { notify("Your changes are still unsaved. Save, reload, or save a copy before leaving."); return; } onClose(); };
  const addScene = () => {
    if (project.pages.length >= (template.maxPages ?? 12)) return;
    edit(p => { const copy = { ...p.pages[visibleIndex], id: crypto.randomUUID() }; if (isVideo) { copy.duration = p.pages[visibleIndex].duration / 2; copy.duration = Math.round(copy.duration * 30) / 30; p.pages[visibleIndex].duration -= copy.duration; if (copy.duration < .5 || p.pages[visibleIndex].duration < .5) return project; } p.pages.splice(visibleIndex + 1, 0, copy); return p; });
    setPageIndex(visibleIndex + 1);
  };
  return <div className="editor">
    <header className="editor-topbar"><Button variant="ghost" aria-label="Back to projects" onClick={close}><Icon name="back"/></Button><div className="editor-project-title"><input aria-label="Project name" value={project.name} onChange={e => edit(p => ({ ...p, name: e.target.value }))}/><span className={editor.conflict ? "danger-text" : ""}>{editor.conflict ? "External changes detected" : editor.saving ? "Saving…" : editor.dirty ? "Unsaved changes" : "All changes saved locally"}</span></div><div className="editor-top-actions"><Button variant="ghost" title="Undo" aria-label="Undo" disabled={!editor.canUndo} onClick={editor.undo}><Icon name="undo"/></Button><Button variant="ghost" title="Redo" aria-label="Redo" disabled={!editor.canRedo} onClick={editor.redo}><Icon name="redo"/></Button><div className="toolbar-divider"/><Button variant="secondary" onClick={() => void copyBrief()}><Icon name="spark"/>Copy brief</Button><Button onClick={() => setExportOpen(true)} disabled={!canExport} title={canExport ? "Export this design" : "Resolve overflow and wait for changes to save"}><Icon name="download"/>Export</Button></div></header>
    {(editor.error || editor.validationMessage) && <div className="editor-alert" role="alert"><span>{editor.error || editor.validationMessage}</span>{editor.conflict && <><Button variant="secondary" onClick={() => void editor.reload()}>Reload file</Button><Button onClick={() => void saveCopy()}>Save my edits as copy</Button></>}{editor.error && !editor.conflict && <Button variant="secondary" onClick={() => void editor.save()}>Retry save</Button>}</div>}
    <div className="editor-body"><aside className="scene-sidebar"><div className="panel-heading"><span>{isVideo ? "SCENES" : "PAGES"}</span><Tag>{String(project.pages.length).padStart(2, "0")}</Tag></div><div className="scene-list">{project.pages.map((p, index) => <div className={`scene-item ${visibleIndex === index ? "selected" : ""}`} key={p.id}><button className="scene-select" aria-label={`Select ${isVideo ? "scene" : "page"} ${index + 1}`} onClick={() => selectScene(index)}><Thumbnail project={{ ...project, kind: "carousel" }} pageIndex={index} assets={assets}/><div><span>{String(index + 1).padStart(2, "0")}</span><span>{isVideo ? `${p.duration.toFixed(1)}s` : index === 0 ? "Cover" : index === project.pages.length - 1 ? "Closing" : "Content"}</span></div></button>{visibleIndex === index && project.pages.length > 1 && <div className="scene-tools"><button disabled={index === 0} aria-label="Move scene up" onClick={() => { edit(pr => { [pr.pages[index - 1], pr.pages[index]] = [pr.pages[index], pr.pages[index - 1]]; return pr; }); selectScene(index - 1); }}>↑</button><button disabled={index === project.pages.length - 1} aria-label="Move scene down" onClick={() => { edit(pr => { [pr.pages[index + 1], pr.pages[index]] = [pr.pages[index], pr.pages[index + 1]]; return pr; }); selectScene(index + 1); }}>↓</button><button aria-label="Remove scene" onClick={() => { edit(pr => { const removed = pr.pages.splice(index, 1)[0]; if (isVideo) pr.pages[Math.max(0, index - 1)].duration += removed.duration; return pr; }); setTime(0); setPageIndex(0); }}>Remove</button></div>}</div>)}</div>{project.kind !== "image" && <Button variant="secondary" onClick={addScene} disabled={project.pages.length >= (template.maxPages ?? 12)}><Icon name="plus" size={16}/>Duplicate {isVideo ? "scene" : "page"}</Button>}<div className="sidebar-footnote"><Icon name="layers" size={15}/><span>{template.name}<br/>Template v{project.templateVersion}</span></div></aside>
    <section className="editor-stage"><div className="stage-toolbar"><div className="stage-format"><Icon name={isVideo ? "play" : "image"} size={16}/><select aria-label="Output aspect ratio" value={project.format} disabled={isPitch} onChange={e => { const format = e.target.value as Format; setVariants([format]); edit(p => ({ ...p, format, outputVariants: [format] })); }}>{Object.entries(formats).filter(([id]) => template.formats.includes(id as Format)).map(([id, f]) => <option key={id} value={id}>{f.label} · {f.ratio}</option>)}</select><span>{formats[project.format].width} × {formats[project.format].height}</span></div><div className="stage-tools"><label><input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)}/>Safe areas</label><select aria-label="Preview zoom" value={zoom} onChange={e => setZoom(+e.target.value)}><option value={1}>Fit</option><option value={.75}>75% of fit</option><option value={1.25}>125% of fit</option><option value={1.5}>150% of fit</option></select></div></div>
      <Preview project={project} time={time} pageIndex={visibleIndex} guides={guides} zoom={zoom} onOverflow={reportOverflow}/>
      {overflow.length > 0 && <div className="overflow-warning" role="alert">{overflow.join(" ")}</div>}
      {isVideo ? <div className="timeline"><div className="timeline-controls"><Button variant="ghost" aria-label={playing ? "Pause preview" : "Play preview"} onClick={() => { if (time >= total - .04) setTime(0); setPlaying(!playing); }}><Icon name={playing ? "pause" : "play"}/></Button><span className="time-readout">{time.toFixed(1)} <em>/ {total.toFixed(1)}s</em></span><span className="timeline-meta">30 FPS <i/> {project.audio.silent ? "SILENT" : "AUDIO ON"}</span></div><input className="scrubber" type="range" aria-label="Video playhead" min={0} max={Math.max(0, total - 1 / 30)} step={1 / 30} value={time} onChange={e => { setPlaying(false); setTime(+e.target.value); }}/><div className="scene-timeline">{project.pages.map((s, i) => <button key={s.id} className={i === visibleIndex ? "active" : ""} style={{ flex: s.duration }} onClick={() => selectScene(i)}><span>{String(i + 1).padStart(2, "0")}</span><b>{s.eyebrow}</b><small>{s.duration.toFixed(1)}s</small></button>)}</div></div> : <div className="stage-bottom"><span><i className="status-dot"/>Same composition engine as export</span><span>{project.sample ? "Sample content" : "Campaign content"} · Revision {project.revision}</span></div>}
    </section>
    <aside className="inspector"><><div className="inspector-tabs">{(["Content", "Brief"] as typeof panel[]).map(p => <button key={p} onClick={() => setPanel(p)} aria-pressed={p === panel} className={p === panel ? "active" : ""}>{p}</button>)}</div><div className="inspector-content">
      {panel === "Content" && <>{template.visual === "app-showcase" && <AppCaptureFields scene={scene} assets={assets} onChange={updateScene}/>}{!isStoreIcon && <><div className="section-caption">{isVideo ? `SCENE ${visibleIndex + 1}` : `PAGE ${visibleIndex + 1}`} / CONTENT</div><InputField label={isNews ? "Tag" : "Eyebrow"} placeholder={isNews ? "BREAKING" : undefined} value={scene.eyebrow} onChange={e => updateScene({ eyebrow: e.target.value })}/><label className="field"><span>Headline</span><textarea rows={3} value={scene.headline} onChange={e => updateScene({ headline: e.target.value })}/><small>{isNews ? "Wrap one word in *asterisks* to light it up. The size fits itself; short headlines read best." : "Line breaks are preserved in your design."}</small></label><label className="field"><span>Supporting copy</span><textarea rows={3} value={scene.body} onChange={e => updateScene({ body: e.target.value })}/></label>{isPitch ? <PitchSlideFields scene={scene} onChange={updateScene}/> : <InputField label="Call to action" value={scene.cta} onChange={e => updateScene({ cta: e.target.value })}/>}</>} {/* Pitch metadata replaces the ordinary CTA. */}
        {isNews && <NewsFields scene={scene} sport={project.sport} assets={assets} onChange={updateScene} onPicked={change => edit(p => { p.pages[visibleIndex] = { ...p.pages[visibleIndex], ...change }; p.sample = false; return p; })} onAssetsChanged={onAssetsChanged} notify={notify}/>}
        {template.visual === "match-story" && <MatchStoryFields scene={scene} index={visibleIndex} total={project.pages.length} sport={project.sport} assets={assets} onChange={updateScene} onChangeAll={updateAllScenes} notify={notify}/>}
        {template.visual === "card" && <><div className="inspector-divider"/><PlayerPicker scene={scene} sport={project.sport} assets={assets} onChange={updateScene} notify={notify}/></>}
        {(["match", "player", "stats"].includes(template.visual) || template.visual === "card") && <><div className="inspector-divider"/><InputField label={template.visual === "card" ? "Card name" : "Team / player A"} value={scene.nameA} onChange={e => updateScene({ nameA: e.target.value })}/>{template.visual !== "card" && <InputField label="Team / player B" value={scene.nameB} onChange={e => updateScene({ nameB: e.target.value })}/>}</>}
        {["match", "player", "stats"].includes(template.visual) && <div className="field-row"><InputField label="Value A" value={scene.scoreA} onChange={e => updateScene({ scoreA: e.target.value })}/><InputField label="Value B" value={scene.scoreB} onChange={e => updateScene({ scoreB: e.target.value })}/></div>}
        {["card", "stats", "player", "match"].includes(template.visual) && <><InputField label="Stat label" value={scene.statLabel} onChange={e => updateScene({ statLabel: e.target.value })}/>{template.visual !== "player" && <InputField label={template.visual === "match" ? "Featured statistic" : "Hero statistic"} value={scene.statValue} onChange={e => updateScene({ statValue: e.target.value })}/>}</>}
        {template.visual === "stats" && <InputField key={`${scene.id}-${scene.chartValues.join(",")}`} label="Chart values (2–12 numbers, 0–100)" defaultValue={scene.chartValues.join(", ")} onBlur={e => { const values = e.target.value.split(",").map(s => Number(s.trim())); if (values.length >= 2 && values.length <= 12 && values.every(n => Number.isFinite(n) && n >= 0 && n <= 100)) updateScene({ chartValues: values }); else { notify("Enter 2–12 comma-separated chart values between 0 and 100."); e.target.value = scene.chartValues.join(", "); } }}/ >}
        {template.visual === "card" && <div className="field-row">{(["pace", "skill", "form"] as const).map(key => <InputField key={key} label={key.toUpperCase()} type="number" min={0} max={100} value={scene.cardMetrics[key]} onChange={e => updateScene({ cardMetrics: { ...scene.cardMetrics, [key]: +e.target.value } })}/>)}</div>}
        {["match", "player"].includes(template.visual) && <><div className="inspector-divider"/><div className="field-row"><label className="field"><span>{scene.nameA || "Side A"} crest</span><select value={scene.emblemA} onChange={e => updateScene({ emblemA: e.target.value })}><option value="">Use initials</option>{assets.filter(a => a.mime.startsWith("image/")).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label className="field"><span>{scene.nameB || "Side B"} crest</span><select value={scene.emblemB} onChange={e => updateScene({ emblemB: e.target.value })}><option value="">Use initials</option>{assets.filter(a => a.mime.startsWith("image/")).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div></>}
        {["match", "stats", "player", "match-story"].includes(template.visual) && <><div className="inspector-divider"/><div className="section-caption">MATCH DATA</div><p className="muted-note">{template.visual === "match-story" ? "Fill every scene with a finished fixture's sides, result, reported stats and colours. The graph comes from ESPN's play-by-play: football momentum, a basketball scoring run or a limited-overs run worm. A race gets its podium and classification. Beats a match has no data for are left out, and the crowd share is cleared for you to enter." : "Pull names, scores and a stat straight from a finished fixture."}</p><Button variant="secondary" onClick={() => setMatchPicker(true)}><Icon name="spark" size={16}/>Fill from a match</Button></>}
        {["feature", "launch", "card"].includes(template.visual) && <><div className="inspector-divider"/>{template.visual === "launch" && <label className="field"><span>Game art</span><select value={scene.game} onChange={e => updateScene(e.target.value ? { game: e.target.value as LaunchGame, assetId: "" } : { game: "" })}><option value="">None — use visual media</option>{Object.entries(sports).map(([sportId, sport]) => <optgroup key={sportId} label={sport.label}>{(Object.entries(launchGames) as [LaunchGame, (typeof launchGames)[LaunchGame]][]).filter(([, game]) => game.sport === sportId).map(([gameId, game]) => <option key={gameId} value={gameId}>{game.label}</option>)}</optgroup>)}</select><small>Drawn from the game’s own match screen and blended into the background. Visual media below replaces it.</small></label>}<label className="field"><span>Visual media</span><select value={isLineArt(selectedAsset) ? "" : scene.assetId} onChange={e => updateScene({ assetId: e.target.value })}><option value="">Use template artwork</option>{assets.filter(a => !isLineArt(a) && (a.mime.startsWith("image/") || (template.visual !== "card" && a.mime.startsWith("video/")))).map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label><LineArtPicker assets={assets} scene={scene} sport={project.sport} onChange={updateScene}/>{scene.assetId && !isLineArt(selectedAsset) && <><label className="field"><span>Image fit</span><select value={scene.crop} onChange={e => updateScene({ crop: e.target.value as Scene["crop"] })}><option value="cover">Fill and crop</option><option value="contain">Fit entire image</option></select></label><label className="field"><span>Horizontal focal point · {scene.cropX}%</span><input type="range" min={0} max={100} value={scene.cropX} onChange={e => updateScene({ cropX: +e.target.value })}/></label><label className="field"><span>Vertical focal point · {scene.cropY}%</span><input type="range" min={0} max={100} value={scene.cropY} onChange={e => updateScene({ cropY: +e.target.value })}/></label>{assets.find(a => a.id === scene.assetId)?.mime.startsWith("video/") && <div className="field-row"><InputField label="Clip in (seconds)" type="number" min={0} step={.1} value={scene.clipStart} onChange={e => updateScene({ clipStart: +e.target.value })}/><InputField label="Clip out (0 = end)" type="number" min={0} step={.1} value={scene.clipEnd} onChange={e => updateScene({ clipEnd: +e.target.value })}/></div>}</>}</>}
        {isAppCreative && template.visual !== "app-showcase" && <AppCreativeFields visual={template.visual as "play-feature" | "store-icon"} scene={scene} assets={assets} onChange={updateScene}/>}
      </>}
      {panel === "Style" && (isPitch ? <><div className="section-caption">PITCH DECK SYSTEM</div><p className="muted-note">Pitch decks are locked to the StatOz investor presentation system and 16:9 landscape output. Edit each slide’s structure and evidence state under Content.</p><label className="toggle-row"><span>Label as sample content</span><input type="checkbox" checked={project.sample} onChange={e => edit(p => ({ ...p, sample: e.target.checked }))}/></label></> : <><div className="section-caption">DESIGN LANGUAGE</div><label className="field"><span>Sport identity</span><select value={project.sport} onChange={e => edit(p => ({ ...p, sport: e.target.value as typeof p.sport }))}>{Object.entries(sports).map(([id, sport]) => <option value={id} key={id}>{sport.label}</option>)}</select></label><label className="field"><span>Layout</span><select value={scene.layout} onChange={e => updateScene({ layout: e.target.value as Scene["layout"] })}><option value="editorial">{isNews ? "Full-bleed photo" : "Editorial"}</option><option value="centered">{isNews ? "Full-bleed, centred" : "Centered"}</option><option value="split">{isNews ? "Framed photo" : "Split composition"}</option></select></label><label className="toggle-row"><span>Show StatOz logo</span><input type="checkbox" checked={scene.showLogo} onChange={e => updateScene({ showLogo: e.target.checked })}/></label><label className="toggle-row"><span>Show call to action</span><input type="checkbox" checked={scene.showCta} onChange={e => updateScene({ showCta: e.target.checked })}/></label><label className="toggle-row"><span>Label as sample content</span><input type="checkbox" checked={project.sample} onChange={e => edit(p => ({ ...p, sample: e.target.checked }))}/></label>{isVideo && <><div className="inspector-divider"/><div className="section-caption">MOTION & TIMING</div><InputField label="Scene duration (seconds)" type="number" min={.5} max={60} step={.1} value={Math.round(scene.duration * 1000) / 1000} onChange={e => updateScene({ duration: Math.round(+e.target.value * 30) / 30 })}/><p className="muted-note">Total {total.toFixed(1)} seconds. Videos must be 8–60 seconds.</p><label className="field"><span>Entrance motion</span><select value={scene.motion} onChange={e => updateScene({ motion: e.target.value as Scene["motion"] })}><option value="rise">Rise</option><option value="slide">Slide</option><option value="zoom">Zoom</option><option value="none">None</option></select></label><label className="field"><span>Transition to next scene</span><select value={scene.transition} onChange={e => updateScene({ transition: e.target.value as Scene["transition"] })}><option value="fade">Fade</option><option value="cut">Cut</option></select></label></>}</>)}
      {panel === "Audio" && <><div className="section-caption">SOUNDTRACK</div><label className="toggle-row"><span>Silent export</span><input type="checkbox" checked={project.audio.silent} onChange={e => edit(p => ({ ...p, audio: { ...p.audio, silent: e.target.checked } }))}/></label><label className="toggle-row"><span>Original transition SFX</span><input type="checkbox" disabled={project.audio.silent} checked={project.audio.sfx} onChange={e => edit(p => ({ ...p, audio: { ...p.audio, sfx: e.target.checked } }))}/></label><label className="field"><span>Music or voiceover</span><select disabled={project.audio.silent} value={project.audio.assetId} onChange={e => edit(p => ({ ...p, audio: { ...p.audio, assetId: e.target.value } }))}><option value="">No audio track</option>{assets.filter(a => a.mime.startsWith("audio/")).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label className="field"><span>Track volume · {Math.round(project.audio.gain * 100)}%</span><input type="range" min={0} max={1} step={.01} value={project.audio.gain} onChange={e => edit(p => ({ ...p, audio: { ...p.audio, gain: +e.target.value } }))}/></label><p className="muted-note">Audio starts at zero and is padded or trimmed to the video. Uploaded tracks and original transition SFX play in the preview and export.</p></>}
      {panel === "Brief" && <><div className="section-caption">TEMPLATE BRIEF</div><label className="field"><span>Objective</span><textarea rows={5} value={project.brief.objective} onChange={e => edit(p => ({ ...p, brief: { ...p.brief, objective: e.target.value } }))}/></label><InputField label="Audience" value={project.brief.audience} onChange={e => edit(p => ({ ...p, brief: { ...p.brief, audience: e.target.value } }))}/><AssistantPanel projectId={project.id} projectName={project.name} focusPageId={scene.id} focusLabel={`${isVideo ? "Scene" : "Page"} ${visibleIndex + 1}`} isVideo={isVideo} blockedReason={assistantBlocked} onCompleted={editor.reload} notify={notify}/><BriefAdvancedControls project={project} scene={scene} assets={assets} isPitch={isPitch} isVideo={isVideo} total={total} onProjectChange={edit} onSceneChange={updateScene} onCopyBrief={() => void copyBrief()}/></>}
    </div><div className="inspector-footer"><Icon name="brand" size={16}/><span>Built on the StatOz design system</span></div></></aside></div>
    {project.audio.assetId && <audio ref={audio} src={`/api/assets/${project.audio.assetId}`} preload="metadata"/>}
    {sfxUrl && <audio ref={sfxAudio} src={sfxUrl} preload="auto"/>}
    {matchPicker && <MatchPicker mode="fill" story={template.visual === "match-story"} projectId={project.id} pageIndex={visibleIndex} notify={notify}
      onClose={() => setMatchPicker(false)}
      onDone={next => { setMatchPicker(false); edit(() => next); }}/>}
    <dialog ref={exportDialog} className="modal export-modal" onCancel={() => setExportOpen(false)}>
      <div className="modal-heading"><div><span className="section-caption">READY FOR THE FEED</span><h2>Export your design</h2></div><Button variant="ghost" aria-label="Close export dialog" onClick={() => setExportOpen(false)}><Icon name="close"/></Button></div>
      <p className="muted-note">Each format uses the shared composition. Your saved revision is frozen for this export.</p>
      <div className="export-formats">{Object.entries(formats).filter(([id]) => template.formats.includes(id as Format)).map(([id, f]) => <label key={id} className={variants.includes(id as Format) ? "selected" : ""}><input type="checkbox" disabled={isPitch} checked={variants.includes(id as Format)} onChange={e => { const next = e.target.checked ? [...variants, id as Format] : variants.filter(x => x !== id); setVariants(next); if (next.length) edit(p => ({ ...p, outputVariants: next })); }}/><span>{f.label}<small>{f.width} × {f.height} · {f.ratio}</small></span></label>)}</div>
      {exportReadiness.length > 0 && <div className="editor-alert" role="alert">{[...new Set(exportReadiness)].join(" ")}</div>}
      <label className="field"><span>File type</span><select value={outputType} onChange={e => setOutputType(e.target.value as RenderJob["outputType"])}>{isPitch ? <><option value="pdf">PDF · Flattened 16:9 pages</option><option value="pptx">PPTX · Flattened widescreen slides</option><option value="zip">ZIP · Ordered PNG slides</option></> : isStoreIcon ? <option value="png">PNG · Store icon</option> : project.kind === "image" ? <><option value="png">PNG · Lossless image</option><option value="jpeg">JPEG · High quality</option></> : project.kind === "carousel" ? <option value="zip">ZIP · Ordered PNG pages</option> : <option value="mp4">MP4 · H.264 · 30 fps</option>}</select></label>
      <div className="modal-footer"><Button variant="secondary" onClick={() => setExportOpen(false)}>Back to editing</Button><Button disabled={!variants.length || exporting || !canExport || exportReadiness.length > 0} onClick={() => void exportProject()}><Icon name="download"/>{exporting ? "Preparing…" : `Export ${variants.length} format${variants.length !== 1 ? "s" : ""}`}</Button></div>
    </dialog>
  </div>;
}
