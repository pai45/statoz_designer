"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formats, sports, type Asset, type Format, type ProjectEnvelope, type RenderJob, type Sport } from "@/domain/project";
import { Button, FilterChips, Icon, Tag } from "@/design-system/components/ui";
import { createProject as createProjectBase, studioTemplates, templates, type Template } from "@/features/templates/registry";
import { Thumbnail } from "@/features/editor/preview";
import { Editor } from "@/features/editor/editor";
import { api, apiResource, currentPagePath, publicAsset, readableBytes } from "@/shared/api";
import type { PublisherStatus, PublishList, PublishRecord } from "@/domain/publish";
import { PostDialog, PublishStatus, SocialAccounts } from "./publish";
import { Assistant } from "./agents";
import { MatchPicker } from "./match-picker";
import { PitchDecks } from "./pitch-decks";
import { ProjectDeleteDialog } from "./project-delete-dialog";
import { AssetLibrary, type AssetTab } from "./asset-library";
import { BrandLibrary, type BrandTab } from "./brand-library";

type View = "Projects" | "Pitch decks" | "Templates" | "Assistant" | "Assets & brand" | "Exports";
type RefreshScope = { projects?: boolean; assets?: boolean; exports?: boolean; publish?: boolean };
const projectFolder = "storage/projects";
const navigation: { name: View; icon: string; caption?: string }[] = [{ name: "Projects", icon: "grid" }, { name: "Pitch decks", icon: "deck" }, { name: "Templates", icon: "layers" }, { name: "Assistant", icon: "spark" }, { name: "Assets & brand", icon: "brand" }, { name: "Exports", icon: "download" }];
function createProject(templateId: string, format: Format, sport: Sport = "football", duration?: number) {
  const template = templates.find(value => value.id === templateId);
  return createProjectBase(templateId, template && !template.formats.includes(format) ? template.formats[0] : format, sport, duration);
}
const formatSummary = (template: Template) => template.formats.map(id => formats[id].ratio).filter((ratio, index, all) => all.indexOf(ratio) === index).join(" · ");
export function Studio() {
  const [view, setView] = useState<View>("Projects");
  const [projects, setProjects] = useState<ProjectEnvelope[]>([]), [assets, setAssets] = useState<Asset[]>([]), [jobs, setJobs] = useState<RenderJob[]>([]);
  const [opened, setOpened] = useState<ProjectEnvelope | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [search, setSearch] = useState(""), [filter, setFilter] = useState("All designs"), [showArchived, setShowArchived] = useState(false);
  const [category, setCategory] = useState("All templates"), [kindFilter, setKindFilter] = useState("All media"), [formatFilter, setFormatFilter] = useState("All formats"), [sportFilter, setSportFilter] = useState<Sport>("football");
  const [toast, setToast] = useState(""); const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [newTemplate, setNewTemplate] = useState<Template | null>(null), [newFormat, setNewFormat] = useState<Format>("portrait"), [newSport, setNewSport] = useState<Sport>("football"), [newDuration, setNewDuration] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false), [approvedImport, setApprovedImport] = useState(false);
  const [matchPicker, setMatchPicker] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectEnvelope | null>(null), [deleting, setDeleting] = useState(false);
  const [runtime, setRuntime] = useState<{ name: string; ok: boolean; detail: string }[]>([]), [checking, setChecking] = useState(false);
  const [librarySection, setLibrarySection] = useState("Assets"), [assetTab, setAssetTab] = useState<AssetTab>("Uploads"), [brandTab, setBrandTab] = useState<BrandTab>("Overview"), [previewJob, setPreviewJob] = useState<RenderJob | null>(null);
  const [publishes, setPublishes] = useState<PublishRecord[]>([]), [publisher, setPublisher] = useState<PublisherStatus | null>(null), [postJob, setPostJob] = useState<RenderJob | null>(null);
  const newDialog = useRef<HTMLDialogElement>(null), mediaDialog = useRef<HTMLDialogElement>(null), upload = useRef<HTMLInputElement>(null);
  const notify = useCallback((message: string) => { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 5500); }, []);
  const refresh = useCallback(async (scope: unknown = { projects: true, assets: true }) => {
    // Passing this callback directly to a mutation refreshes only the media list;
    // explicit callers choose exactly which local resources they need.
    const requested: RefreshScope = typeof scope === "object" && scope !== null && ["projects", "assets", "exports", "publish"].some(key => key in scope)
      ? scope as RefreshScope : { assets: true };
    const { projects: loadProjects = false, assets: loadAssets = false, exports: loadExports = false, publish: loadPublish = false } = requested;
    try {
      const [data, media, exportList, posts] = await Promise.all([
        loadProjects ? api<{ projects: ProjectEnvelope[]; errors: string[] }>("projects") : Promise.resolve(null),
        loadAssets ? api<Asset[]>("assets") : Promise.resolve(null),
        loadExports ? api<RenderJob[]>("exports") : Promise.resolve(null),
        loadPublish ? api<PublishList>("publish") : Promise.resolve(null),
      ]);
      if (data) { setProjects(data.projects); setFileErrors(data.errors); }
      if (media) setAssets(media);
      if (exportList) setJobs(exportList);
      if (posts) { setPublishes(posts.records); setPublisher(posts.publisher); }
      setError("");
    } catch (e) { setError((e as Error).message); } finally { if (loadProjects) setLoading(false); }
  }, []);
  const openProject = useCallback((value: ProjectEnvelope) => { setOpened(value); window.history.replaceState(null, "", `${currentPagePath()}?project=${value.project.id}`); }, []);
  useEffect(() => {
    const first = setTimeout(() => {
      const id = new URLSearchParams(window.location.search).get("project");
      if (id) {
        void refresh({ assets: true });
        void api<ProjectEnvelope>(`projects/${id}`).then(openProject).catch(e => { notify(e.message); void refresh({ projects: true }); });
      } else void refresh({ projects: true, assets: true });
    }, 0);
    return () => clearTimeout(first);
  }, [refresh, openProject, notify]);
  useEffect(() => {
    const next = setTimeout(() => {
      if (opened || view === "Projects" || view === "Pitch decks" || view === "Templates" || view === "Assistant") return;
      if (view === "Exports") void refresh({ exports: true, publish: true });
      if (librarySection === "Social accounts") void refresh({ publish: true });
    }, 0);
    return () => clearTimeout(next);
  }, [opened, view, librarySection, refresh]);
  const activeJobs = jobs.filter(j => ["running", "queued"].includes(j.status));
  const rendering = activeJobs.length > 0;
  // A queued or running export is user-started work, so the list follows it to completion.
  // Without this the view keeps the "queued" it loaded on open and never offers the download.
  useEffect(() => {
    if (!rendering) return;
    const timer = setInterval(() => void refresh({ exports: true }), 2000);
    return () => clearInterval(timer);
  }, [rendering, refresh]);
  useEffect(() => { const dialog = newDialog.current; if (!dialog) return; if (newTemplate && !dialog.open) dialog.showModal(); else if (!newTemplate && dialog.open) dialog.close(); }, [newTemplate]);
  useEffect(() => { const dialog = mediaDialog.current; if (!dialog) return; if (previewJob && !dialog.open) dialog.showModal(); else if (!previewJob && dialog.open) dialog.close(); }, [previewJob]);
  useEffect(() => { return () => clearTimeout(toastTimer.current); }, []);
  const refreshPublish = useCallback(() => { void refresh({ publish: true }); }, [refresh]);
  const closePost = useCallback(() => setPostJob(null), []);
  const navigate = (next: View) => { setView(next); setSearch(""); };
  const chooseTemplate = (template: Template) => { setNewTemplate(template); setNewFormat(template.defaultFormat ?? (template.formats.includes(template.kind === "video" ? "reel" : "portrait") ? (template.kind === "video" ? "reel" : "portrait") : template.formats[0])); setNewDuration(""); setNewSport(sportFilter); };
  async function create() {
    if (!newTemplate) return; setCreating(true);
    try { const p = await api<ProjectEnvelope>("projects", { method: "POST", body: JSON.stringify({ templateId: newTemplate.id, format: newFormat, sport: newSport, ...(newTemplate.kind === "video" ? { duration: +newDuration } : {}) }) }); setNewTemplate(null); openProject(p); }
    catch (e) { notify((e as Error).message); } finally { setCreating(false); }
  }
  const closeEditor = () => { setOpened(null); window.history.replaceState(null, "", currentPagePath()); void refresh({ projects: true }); };
  async function duplicate(value: ProjectEnvelope) { try { const p = await api<ProjectEnvelope>("projects", { method: "POST", body: JSON.stringify({ copy: value.project }) }); await refresh({ projects: true }); notify("Project duplicated."); openProject(p); } catch (e) { notify((e as Error).message); } }
  async function archive(value: ProjectEnvelope) { try { await api(`projects/${value.project.id}`, { method: "PUT", headers: { "If-Match": value.etag }, body: JSON.stringify({ ...value.project, archived: !value.project.archived }) }); await refresh({ projects: true }); notify(value.project.archived ? "Project restored." : "Project archived."); } catch (e) { notify((e as Error).message); } }
  async function deleteSelected() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`projects/${deleteTarget.project.id}`, { method: "DELETE", headers: { "If-Match": deleteTarget.etag } });
      setDeleteTarget(null);
      await refresh({ projects: true });
      notify(`${deleteTarget.project.pitchDeck ? "Pitch deck" : "Project"} deleted. Existing exports were kept.`);
    } catch (e) { notify((e as Error).message); }
    finally { setDeleting(false); }
  }
  async function importFiles(files: FileList | null) {
    if (!files?.length) return; setImporting(true);
    try {
      const imported: Asset[] = [];
      for (const file of files) { const body = new FormData(); body.set("file", file); body.set("approved", String(approvedImport)); imported.push(await api<Asset>("assets", { method: "POST", body })); }
      setAssetTab(imported.every(asset => asset.category === "audio-video") ? "Audio & video" : "Uploads");
      await refresh({ assets: true }); notify(`${files.length} asset${files.length > 1 ? "s" : ""} imported.`);
    }
    catch (e) { notify((e as Error).message); } finally { setImporting(false); if (upload.current) upload.current.value = ""; }
  }
  async function checkRuntime() { setChecking(true); try { setRuntime(await api("doctor")); } catch (e) { notify((e as Error).message); } finally { setChecking(false); } }
  async function jobAction(job: RenderJob, action: "cancel" | "retry") { try { await api(`exports/${job.id}/${action}`, { method: "POST" }); await refresh({ exports: true }); notify(action === "cancel" ? "Cancellation requested." : "Export queued again from its saved snapshot."); } catch (e) { notify((e as Error).message); } }
  const filteredProjects = projects.filter(({ project: p }) => !p.pitchDeck && p.archived === showArchived && p.name.toLowerCase().includes(search.toLowerCase()) && (filter === "All designs" || p.kind === ({ Images: "image", Videos: "video", Carousels: "carousel" } as Record<string, string>)[filter]));
  const filteredTemplates = studioTemplates.filter(t => (category === "All templates" || t.category === category) && (kindFilter === "All media" || t.kind === kindFilter) && (formatFilter === "All formats" || t.formats.includes(formatFilter as Format)) && `${t.name} ${t.description}`.toLowerCase().includes(search.toLowerCase()));
  const recent = projects.find(p => !p.project.archived && !p.project.pitchDeck)?.project;
  return <>
    {matchPicker && <MatchPicker mode="create" notify={notify} onClose={() => setMatchPicker(false)}
      onDone={project => { setMatchPicker(false); void refresh(); void api<ProjectEnvelope>(`projects/${project.id}`).then(openProject).catch(() => {}); }}/>}
    {opened ? <Editor key={opened.project.id} initial={opened} assets={assets} onOpen={openProject} onClose={closeEditor} onExports={() => { closeEditor(); setView("Exports"); }} onAssetsChanged={() => void refresh({ assets: true })} notify={notify} projectFolder={projectFolder}/> : <div className="studio-shell">
      <aside className="navigation"><Link className="studio-logo" href="/" aria-label="StatOz Designer home"><img src={publicAsset("/assets/brand/logo.png")} alt=""/><div>StatOz<span>DESIGNER</span></div></Link><div className="workspace-label">YOUR WORKSPACE</div><nav aria-label="Main navigation">{navigation.map(item => <button key={item.name} aria-label={item.name} title={item.name} className={view === item.name ? "active" : ""} onClick={() => navigate(item.name)}><Icon name={item.icon}/><span>{item.name}</span>{item.name === "Exports" && activeJobs.length > 0 && <b>{activeJobs.length}</b>}</button>)}</nav><div className="nav-bottom"><div className="assistant-card"><Icon name="spark" size={22}/><strong>Your ideas.<br/>Your assistants.</strong><p>Built to create with<br/>Codex & Claude.</p><button onClick={() => { void navigator.clipboard.writeText(`Open ${projectFolder.replace(/[\\/]storage[\\/]projects$/, "")} and read AGENTS.md to create StatOz content.`).then(() => notify("Project handoff copied.")).catch(() => notify(projectFolder)); }}>Copy project handoff <Icon name="arrow" size={15}/></button></div><div className="local-status"><i className="status-dot"/><span>LOCAL COMPANION<small>Files stay on this computer</small></span></div></div></aside>
      <div className="studio-main"><header className="topbar"><div className="breadcrumb">WORKSPACE <span>/</span> <b>{view.toUpperCase()}</b></div><div className="topbar-right"><label className="search-box"><Icon name="search" size={17}/><input aria-label="Search studio" placeholder={view === "Templates" ? "Search templates…" : view === "Pitch decks" ? "Search pitch decks…" : "Search your workspace…"} value={search} onChange={e => setSearch(e.target.value)}/><kbd>⌕</kbd></label><span className="profile-avatar">ST</span></div></header>
      <main className="page-content">
        {error && <div className="error-banner" role="alert">{error}<Button variant="secondary" onClick={() => void refresh()}>Retry</Button></div>}
        {view === "Projects" && <><div className="page-heading"><div><div className="overline">THE STATOZ CREATIVE WORKSPACE</div><h1>Make your next <em>moment.</em></h1><p>From the first idea to the final frame. All in your brand.</p></div><div className="heading-actions"><Button variant="secondary" onClick={() => setMatchPicker(true)}><Icon name="spark"/>From a match</Button><Button onClick={() => navigate("Templates")}><Icon name="plus"/>New design</Button></div></div>
          <div className="welcome-grid"><div className="welcome-hero"><div className="hero-grid"/><div className="hero-copy"><div className="eyebrow-label"><i/>MADE FOR THE LOVE OF THE GAME</div><h2>Your game.<br/>Your story.<br/><span>Your studio.</span></h2><p>Branded images, carousels, and motion.<br/>One place to bring StatOz to life.</p><Button variant="secondary" onClick={() => navigate("Templates")}>Explore templates<Icon name="arrow" size={17}/></Button></div><div className="hero-designs"><div className="hero-orbit"/><div className="hero-design-back"><Thumbnail project={createProject("stat-breakdown", "portrait", "basketball")} assets={assets}/></div><div className="hero-design-front"><Thumbnail project={recent || createProject("feature-spotlight", "portrait")} assets={assets}/></div><span className="hero-corner-label">CREATE SOMETHING<br/>WORTH SHARING ↗</span></div><span className="hero-index">STZ — DESIGN SYSTEM / 01</span></div><div className="quick-start"><span className="section-caption">START WITH A FORMAT</span>{[{ icon: "image", title: "Social image", note: "One frame. All the impact.", id: "feature-spotlight" }, { icon: "play", title: "Short video", note: "Give your story some motion.", id: "feature-promo" }, { icon: "layers", title: "Carousel", note: "A story worth swiping through.", id: "explainer" }].map(item => <button key={item.id} onClick={() => chooseTemplate(templates.find(t => t.id === item.id)!)}><span className="quick-icon"><Icon name={item.icon}/></span><span><strong>{item.title}</strong><small>{item.note}</small></span><Icon name="arrow" size={16}/></button>)}<div className="quick-footer"><Icon name="brand" size={17}/><span>StatOz brand, built in.</span></div></div></div>
          <section className="project-section"><div className="section-header"><div><h2>{showArchived ? "Archived projects" : "Your projects"}<span className="count-label">{filteredProjects.length.toString().padStart(2, "0")}</span></h2><p>{showArchived ? "Bring a past idea back into play." : "Pick up where you left off, or start something new."}</p></div><label className="archive-toggle"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)}/>Show archived</label></div><div className="project-filter-row"><FilterChips label="Project media type" options={["All designs", "Images", "Videos", "Carousels"]} selected={filter} onSelect={setFilter}/><span className="sort-label">LAST EDITED ↓</span></div>
          {fileErrors.length > 0 && <div className="error-banner">{fileErrors.map(e => <p key={e}>{e}</p>)}</div>}
          {loading ? <div className="empty-state">Opening your local workspace…</div> : <div className="design-grid">{filteredProjects.map(value => <article className="design-card" key={value.project.id}><button className="design-cover" onClick={() => openProject(value)}><Thumbnail project={value.project} assets={assets}/><span className="cover-tag">{value.project.kind === "video" ? <Icon name="play" size={12}/> : <Icon name="image" size={12}/>} {formats[value.project.format].ratio}</span><span className="cover-open"><Icon name="arrow"/></span></button><div className="design-card-info"><button className="design-name" onClick={() => openProject(value)}>{value.project.name}</button><div className="design-meta"><span>{value.project.kind.toUpperCase()} <i/> {new Date(value.project.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</span><div><button title="Duplicate project" aria-label={`Duplicate ${value.project.name}`} onClick={() => void duplicate(value)}><Icon name="copy" size={15}/></button><button title={showArchived ? "Restore project" : "Archive project"} aria-label={`${showArchived ? "Restore" : "Archive"} ${value.project.name}`} onClick={() => void archive(value)}><Icon name="folder" size={15}/></button><button className="danger-action" title="Delete permanently" aria-label={`Delete ${value.project.name}`} onClick={() => setDeleteTarget(value)}><Icon name="trash" size={15}/></button></div></div></div></article>)}<button className="new-design-card" onClick={() => navigate("Templates")}><span><Icon name="plus" size={25}/></span><strong>A new idea starts here</strong><small>Create your next design</small></button></div>}</section></>}
        {view === "Pitch decks" && <PitchDecks projects={projects} assets={assets} search={search} onOpen={openProject} onRefresh={refresh} onExports={() => setView("Exports")} onDelete={setDeleteTarget} notify={notify}/>}
        {view === "Templates" && <><div className="page-heading"><div><div className="overline">DESIGNED FOR STATOZ</div><h1>A head start on <em>great content.</em></h1><p>{studioTemplates.length} starting points. Your story makes them yours.</p></div><Tag>{studioTemplates.length} TEMPLATE FAMILIES</Tag></div><div className="template-toolbar"><FilterChips label="Template category" options={["All templates", "Product", "Sports", "Education"]} selected={category} onSelect={setCategory}/><div className="template-selects"><select aria-label="Template media type" value={kindFilter} onChange={e => setKindFilter(e.target.value)}><option>All media</option><option value="image">Images</option><option value="video">Videos</option><option value="carousel">Carousels</option></select><select aria-label="Template format" value={formatFilter} onChange={e => setFormatFilter(e.target.value)}><option>All formats</option>{Object.entries(formats).map(([id, f]) => <option key={id} value={id}>{f.label}</option>)}</select><select aria-label="Template sport theme" value={sportFilter} onChange={e => setSportFilter(e.target.value as Sport)}>{Object.entries(sports).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}</select></div></div><div className="template-grid">{filteredTemplates.map(t => <article className="template-card" key={t.id}><button className="template-cover" aria-label={`Use ${t.name} template`} onClick={() => chooseTemplate(t)}><Thumbnail project={createProject(t.id, formatFilter === "All formats" ? "portrait" : formatFilter as Format, sportFilter, t.kind === "video" ? 12 : undefined)} assets={assets}/><span className="cover-tag"><Icon name={t.kind === "video" ? "play" : t.kind === "carousel" ? "layers" : "image"} size={12}/>{t.kind.toUpperCase()}</span><span className="template-use">Use template <Icon name="arrow" size={16}/></span></button><div className="template-info"><span className="template-category">{t.category.toUpperCase()}</span><h3>{t.name}</h3><p>{t.description}</p><span className="template-ratios">{formatSummary(t)}</span></div></article>)}</div>{!filteredTemplates.length && <div className="empty-state">No templates match these filters.</div>}</>}
        {view === "Assistant" && <Assistant projects={projects} templates={studioTemplates} onOpen={openProject} notify={notify}/>}
        {view === "Assets & brand" && <>
          <div className="page-heading"><div><div className="overline">ONE RECOGNIZABLE IDENTITY</div><h1>Always <em>StatOz.</em></h1><p>Your brand essentials and creative assets, together.</p></div>{librarySection === "Assets" && <Button onClick={() => { setAssetTab("Uploads"); upload.current?.click(); }} disabled={importing}><Icon name="upload"/>{importing ? "Importing…" : "Import media"}</Button>}</div>
          <input type="file" ref={upload} hidden multiple accept=".png,.jpg,.jpeg,.webp,.svg,.mp4,.webm,.mp3,.wav,.m4a,.ogg" onChange={event => void importFiles(event.target.files)}/>
          <div className="library-primary-tabs"><FilterChips label="Assets and brand section" options={["Assets", "Brand", "Social accounts"]} selected={librarySection} onSelect={setLibrarySection}/></div>
          {librarySection === "Assets" ? <AssetLibrary assets={assets} search={search} selected={assetTab} onSelect={setAssetTab} approvedImport={approvedImport} onApprovedImport={setApprovedImport} importing={importing} onBrowse={() => upload.current?.click()} onDrop={files => void importFiles(files)} onChanged={() => void refresh({ assets: true })} notify={notify}/>
            : librarySection === "Brand" ? <BrandLibrary assets={assets} search={search} selected={brandTab} onSelect={setBrandTab}/>
              : <SocialAccounts publisher={publisher} records={publishes} notify={notify}/>}
        </>}
        {view === "Exports" && <><div className="page-heading"><div><div className="overline">FROM STUDIO TO SOCIAL</div><h1>Ready to <em>share.</em></h1><p>Every export has its own saved snapshot. Your next edit can wait for no one.</p></div><div className="heading-actions"><Button variant="secondary" onClick={() => void refresh({ exports: true, publish: true })}><Icon name="refresh"/>Refresh exports</Button><Button variant="secondary" onClick={() => void checkRuntime()} disabled={checking}><Icon name="check"/>{checking ? "Checking…" : "Check render setup"}</Button></div></div>{runtime.length > 0 && <div className="runtime-checks">{runtime.map(c => <div key={c.name} className={c.ok ? "ok" : "missing"}><Icon name={c.ok ? "check" : "close"} size={17}/><div><strong>{c.name}</strong><p>{c.detail}</p></div></div>)}</div>}<div className="export-summary"><div><span>{jobs.filter(j => j.status === "completed").length.toString().padStart(2, "0")}</span><small>COMPLETED</small></div><div><span>{activeJobs.length.toString().padStart(2, "0")}</span><small>IN THE QUEUE</small></div><div><span>{jobs.filter(j => ["failed", "interrupted"].includes(j.status)).length.toString().padStart(2, "0")}</span><small>NEED ATTENTION</small></div><p>Rendered locally.<br/>Made to look exactly like your preview.</p></div><div className="export-list">{jobs.filter(j => j.projectName.toLowerCase().includes(search.toLowerCase())).map(job => <article className="export-row" key={job.id}><div className="export-thumb">{job.status === "completed" ? <button aria-label={`Preview ${job.projectName}`} onClick={() => setPreviewJob(job)}><img src={apiResource(`exports/${job.id}/poster`)} alt=""/>{job.outputType === "mp4" && <Icon name="play"/>}</button> : <Icon name={job.outputType === "mp4" ? "play" : "image"} size={25}/>}</div><div className="export-details"><h3>{job.projectName}</h3><p>{job.width} × {job.height} <i/> {job.outputType.toUpperCase()} {job.duration ? `· ${job.duration.toFixed(1)}s` : ""} <i/> Revision {job.revision}</p>{job.status === "running" && <div className="render-progress" role="progressbar" aria-valuenow={Math.round(job.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Rendering progress"><span style={{ width: `${job.progress * 100}%` }}/></div>}{job.error && <p className="export-error">{job.error}</p>}<PublishStatus records={publishes.filter(r => r.jobId === job.id)} notify={notify} onChange={refreshPublish}/></div><div className={`job-status status-${job.status}`}><i/>{job.status === "running" ? `Rendering ${Math.round(job.progress * 100)}%` : job.status}</div><div className="export-actions">{job.status === "completed" ? <><span>{readableBytes(job.bytes || 0)}</span><a className="button button-secondary" href={apiResource(`exports/${job.id}/file?download`)}><Icon name="download" size={17}/>Download</a><Button variant="secondary" onClick={() => setPostJob(job)}><Icon name="share" size={17}/>Post</Button></> : ["running", "queued"].includes(job.status) ? <Button variant="ghost" onClick={() => void jobAction(job, "cancel")}>Cancel</Button> : <Button variant="secondary" onClick={() => void jobAction(job, "retry")}>Retry export</Button>}</div></article>)}</div>{!jobs.length && <div className="empty-state export-empty"><Icon name="download" size={40}/><h2>Your next finished piece goes here.</h2><p>Open a project and choose Export to create your first file.</p><Button onClick={() => navigate("Projects")}>Go to projects<Icon name="arrow" size={17}/></Button></div>}</>}
        <footer className="page-footer"><span>STATOZ DESIGNER <i/> YOUR LOCAL CONTENT STUDIO</span><span>MAKE YOUR NEXT MOMENT.</span></footer>
      </main></div>
    </div>}
    <dialog ref={newDialog} className="modal new-project-modal" onCancel={() => setNewTemplate(null)}>
      <div className="modal-heading"><div><span className="section-caption">YOUR NEXT CREATION</span><h2>{newTemplate?.name}</h2></div><Button variant="ghost" aria-label="Close new project dialog" onClick={() => setNewTemplate(null)}><Icon name="close"/></Button></div>
      <p className="muted-note">{newTemplate?.description}</p>
      <label className="field"><span>Output format</span><select value={newFormat} onChange={e => setNewFormat(e.target.value as Format)}>{Object.entries(formats).filter(([id]) => newTemplate?.formats.includes(id as Format)).map(([id, f]) => <option value={id} key={id}>{f.label} · {f.width} × {f.height}</option>)}</select></label>
      <label className="field"><span>Sport identity</span><select value={newTemplate?.sport ?? newSport} disabled={!!newTemplate?.sport} onChange={e => setNewSport(e.target.value as Sport)}>{Object.entries(sports).map(([id, s]) => <option value={id} key={id}>{s.label}</option>)}</select>{newTemplate?.sport && <small>This template demonstrates one game, so it always carries {sports[newTemplate.sport].label}.</small>}</label>
      {newTemplate?.kind === "video" && <label className="field"><span>Video duration</span><input type="number" min={8} max={60} step={1} placeholder="Choose 8–60 seconds" value={newDuration} onChange={e => setNewDuration(e.target.value)}/><small>Required. Your four starting scenes will share this duration.</small></label>}
      <div className="modal-footer"><Button variant="secondary" onClick={() => setNewTemplate(null)}>Cancel</Button><Button disabled={creating || (newTemplate?.kind === "video" && (!newDuration || +newDuration < 8 || +newDuration > 60))} onClick={() => void create()}>{creating ? "Creating…" : "Create design"}<Icon name="arrow" size={17}/></Button></div>
    </dialog>
    <dialog ref={mediaDialog} className="modal media-preview-modal" onCancel={() => setPreviewJob(null)}><div className="modal-heading"><h2>{previewJob?.projectName}</h2><Button variant="ghost" aria-label="Close media preview" onClick={() => setPreviewJob(null)}><Icon name="close"/></Button></div>{previewJob && (previewJob.outputType === "mp4" ? <video controls src={apiResource(`exports/${previewJob.id}/file`)} autoPlay/> : <img src={apiResource(["zip", "pdf", "pptx"].includes(previewJob.outputType) ? `exports/${previewJob.id}/poster` : `exports/${previewJob.id}/file`)} alt={previewJob.projectName}/>)}{previewJob && ["zip", "pdf", "pptx"].includes(previewJob.outputType) && <p className="muted-note">Cover preview. Download the finished {previewJob.outputType.toUpperCase()} to inspect every slide.</p>}</dialog>
    <ProjectDeleteDialog target={deleteTarget} deleting={deleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void deleteSelected()}/>
    {postJob && <PostDialog key={postJob.id} job={postJob} publisher={publisher} notify={notify} onClose={closePost} onQueued={refreshPublish}/>}
    {toast && <div className="toast" role="status"><Icon name="check" size={18}/><span>{toast}</span><button aria-label="Dismiss notification" onClick={() => setToast("")}><Icon name="close" size={16}/></button></div>}
  </>;
}
