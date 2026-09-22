"use client";
import { useCallback, useEffect, useState } from "react";
import { codexModelOptions, providerIds, providers, runStatusNote, type AgentRun, type AgentStatus, type Provider, type RunEvent } from "@/domain/agent";
import { formats, sports, type Format, type ProjectEnvelope, type Sport } from "@/domain/project";
import type { Template } from "@/features/templates/registry";
import { Button, FilterChips, Icon, Tag } from "@/design-system/components/ui";
import { api } from "@/shared/api";
import "./agents.css";

const elapsed = (run: AgentRun) => {
  const from = Date.parse(run.startedAt ?? run.createdAt), to = Date.parse(run.finishedAt ?? run.updatedAt);
  const seconds = Math.max(0, Math.round((to - from) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

function Transcript({ runId }: { runId: string }) {
  const [events, setEvents] = useState<RunEvent[] | null>(null);
  useEffect(() => { void api<RunEvent[]>(`agents/${runId}/log`).then(setEvents).catch(() => setEvents([])); }, [runId]);
  if (!events) return <p className="muted-note">Loading the transcript…</p>;
  if (!events.length) return <p className="muted-note">This run produced no transcript.</p>;
  return <ol className="run-transcript">{events.map((e, i) => <li key={i} className={`run-event run-${e.kind}`}><span>{e.kind}</span><p>{e.text}</p></li>)}</ol>;
}

export function Assistant({ projects, templates, onOpen, notify, initialProjectId }: {
  projects: ProjectEnvelope[]; templates: Template[]; onOpen: (p: ProjectEnvelope) => void; notify: (m: string) => void;
  initialProjectId?: string;
}) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<Provider>("claude");
  const [model, setModel] = useState("");
  const [target, setTarget] = useState<string>(initialProjectId ?? "");
  const [templateId, setTemplateId] = useState("feature-promo");
  const [format, setFormat] = useState<Format>("reel");
  const [sport, setSport] = useState<Sport>("football");
  const [duration, setDuration] = useState("15");
  const [starting, setStarting] = useState(false);
  const [openRun, setOpenRun] = useState<string>("");

  const refresh = useCallback(async () => {
    try { const data = await api<{ runs: AgentRun[]; assistant: AgentStatus }>("agents"); setRuns(data.runs.filter(run => !run.workflow || run.workflow === "creative")); setStatus(data.assistant); }
    catch { /* Keep the last view while the studio is briefly unreachable. */ }
  }, []);
  const video = templates.filter(t => t.kind === "video");
  const chosen = templates.find(t => t.id === templateId);
  const ready = status?.providers[provider];
  const workerReady = status?.running === true;
  const busy = runs.some(r => r.status === "queued" || r.status === "running");
  const unavailable = status ? (!workerReady ? "Assistant process is not running. Restart the studio." : !ready?.ready ? ready?.detail ?? `${providers[provider].label} is unavailable.` : "") : "";

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => void refresh(), 3000);
    return () => clearInterval(timer);
  }, [busy, refresh]);

  async function start() {
    setStarting(true);
    try {
      const body = target
        ? { provider, prompt, projectId: target, ...(provider === "codex" && model ? { model } : {}) }
        : { provider, prompt, templateId, format, sport, ...(provider === "codex" && model ? { model } : {}), ...(chosen?.kind === "video" ? { duration: +duration } : {}) };
      await api<AgentRun>("agents", { method: "POST", body: JSON.stringify(body) });
      setPrompt("");
      notify(`${providers[provider].label} is working on it.`);
      await refresh();
    } catch (e) { notify((e as Error).message); }
    finally { setStarting(false); }
  }
  async function act(run: AgentRun, action: "cancel" | "retry") {
    try { await api(`agents/${run.id}/${action}`, { method: "POST" }); await refresh(); }
    catch (e) { notify((e as Error).message); }
  }

  return <>
    <div className="page-heading">
      <div>
        <div className="overline">DESCRIBE IT. WATCH IT BUILD.</div>
        <h1>Your <em>assistant.</em></h1>
        <p>Hand Claude or Codex a prompt. It develops the project on your computer, and you review before exporting.</p>
      </div>
    </div>

    <div className="assistant-grid">
      <section className="assistant-compose">
        <span className="section-caption">WHAT SHOULD IT MAKE?</span>
        <label className="field"><span>Prompt</span>
          <textarea rows={6} value={prompt} placeholder="A 15-second reel announcing Hoop Duel, our new 1v1 basketball game. Energetic, three beats, ends on Play now." onChange={e => setPrompt(e.target.value)}/>
        </label>

        <FilterChips label="Assistant" options={providerIds.map(p => providers[p].label)} selected={providers[provider].label}
          onSelect={label => setProvider(providerIds.find(p => providers[p].label === label) ?? "claude")}/>
        {provider === "codex" && <label className="field"><span>Codex model</span>
          <select value={model} onChange={event => setModel(event.target.value)}>{codexModelOptions.map(option => <option key={option.id || "default"} value={option.id}>{option.label}</option>)}</select>
          <small>CLI default is recommended. Other models depend on your Codex account.</small>
        </label>}
        {unavailable && <p className="assistant-missing"><Icon name="close" size={15}/>{unavailable}</p>}

        <label className="field"><span>Work on</span>
          <select value={target} onChange={e => setTarget(e.target.value)}>
            <option value="">A new video</option>
            {projects.filter(p => !p.project.archived).map(p => <option key={p.project.id} value={p.project.id}>{p.project.name}</option>)}
          </select>
        </label>

        {!target && <>
          <label className="field"><span>Starting template</span>
            <select value={templateId} onChange={e => { const next = templates.find(template => template.id === e.target.value); setTemplateId(e.target.value); if (next && !next.formats.includes(format)) setFormat(next.formats[0]); }}>
              {video.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              <optgroup label="Stills and carousels">{templates.filter(t => t.kind !== "video").map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
            </select>
            <small>The assistant may switch templates if another one fits your prompt better.</small>
          </label>
          <div className="field-row">
            <label className="field"><span>Format</span>
              <select value={format} onChange={e => setFormat(e.target.value as Format)}>{Object.entries(formats).filter(([id]) => chosen?.formats.includes(id as Format)).map(([id, f]) => <option key={id} value={id}>{f.label} · {f.ratio}</option>)}</select>
            </label>
            <label className="field"><span>Sport</span>
              <select value={sport} onChange={e => setSport(e.target.value as Sport)}>{Object.entries(sports).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}</select>
            </label>
          </div>
          {chosen?.kind === "video" && <label className="field"><span>Length (seconds)</span>
            <input type="number" min={8} max={60} step={1} value={duration} onChange={e => setDuration(e.target.value)}/>
            <small>Videos run 8 to 60 seconds at 30 fps.</small>
          </label>}
        </>}

        <Button disabled={!prompt.trim() || starting || busy || !!unavailable} onClick={() => void start()}>
          <Icon name="spark"/>{starting ? "Starting…" : busy ? "A run is in progress" : `Run ${providers[provider].label}`}
        </Button>
        <p className="muted-note">Runs use your own {providers[provider].label} sign-in and spend its quota. One at a time.</p>
      </section>

      <section className="assistant-runs">
        <div className="section-header"><h2>Run history</h2><div className="heading-actions">{status && <span className="muted-note">{status.running ? "Assistant ready." : "Assistant process is not running. Restart the studio."}</span>}<Button variant="ghost" onClick={() => void refresh()}><Icon name="refresh" size={14}/>Refresh</Button></div></div>
        {!runs.length && <div className="empty-state"><Icon name="spark" size={40}/><h2>No runs yet.</h2><p>Describe a video on the left to start one.</p></div>}
        {runs.map(run => {
          const project = projects.find(p => p.project.id === run.projectId);
          return <article key={run.id} className={`run-card status-${run.status}`}>
            <div className="run-head">
              <div>
                <h3>{run.projectName}</h3>
                <p className="run-prompt">{run.prompt}</p>
              </div>
              <div className={`job-status status-${run.status}`}><i/>{run.status}</div>
            </div>
            <p className="run-note" title={run.error ?? run.summary ?? runStatusNote[run.status]}>{run.error ?? run.summary ?? runStatusNote[run.status]}</p>
            <div className="run-meta">
              <Tag>{providers[run.provider].label}</Tag>
              {run.provider === "codex" && <span>{run.model ? codexModelOptions.find(option => option.id === run.model)?.label ?? run.model : "CLI default"}</span>}
              <span>{run.mode === "create" ? "New project" : "Revision"}</span>
              <span>{elapsed(run)}</span>
              {typeof run.turns === "number" && <span>{run.turns} steps</span>}
            </div>
            {!!run.outsideScope?.length && <p className="run-warning"><Icon name="close" size={15}/>Changed files outside storage: {run.outsideScope.join(", ")}. Review them before committing.</p>}
            <div className="run-actions">
              {project && <Button variant="secondary" onClick={() => onOpen(project)}>Open project<Icon name="arrow" size={16}/></Button>}
              {(run.status === "queued" || run.status === "running") && <Button variant="ghost" onClick={() => void act(run, "cancel")}>Stop</Button>}
              {["failed", "cancelled", "interrupted"].includes(run.status) && <Button variant="ghost" onClick={() => void act(run, "retry")}>Run again</Button>}
              <Button variant="ghost" onClick={() => setOpenRun(openRun === run.id ? "" : run.id)}>{openRun === run.id ? "Hide transcript" : "Transcript"}</Button>
            </div>
            {openRun === run.id && <Transcript runId={run.id}/>}
          </article>;
        })}
      </section>
    </div>
  </>;
}
