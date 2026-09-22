"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { codexModelOptions, providerIds, providers, runStatusNote, type AgentRun, type AgentStatus, type Provider, type RunEvent } from "@/domain/agent";
import { Button, FilterChips, Icon } from "@/design-system/components/ui";
import { api } from "@/shared/api";
import "./assistant-panel.css";

type Props = {
  projectId: string;
  projectName: string;
  focusPageId: string;
  focusLabel: string;
  isVideo: boolean;
  blockedReason: string;
  onCompleted: () => void | Promise<void>;
  notify: (message: string) => void;
};

const examples = (focusLabel: string, isVideo: boolean) => [
  { label: "Content", prompt: `Rewrite ${focusLabel.toLowerCase()} with a sharper matchday hook and a clearer call to action.` },
  { label: "Style", prompt: "Give the whole template a premium, high-energy matchday look while keeping the copy intact." },
  ...(isVideo ? [{ label: "Audio", prompt: "Use an approved energetic audio track at a restrained volume and keep the transition SFX." }] : []),
];

export function AssistantPanel({ projectId, projectName, focusPageId, focusLabel, isVideo, blockedReason, onCompleted, notify }: Props) {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<Provider>("codex");
  const [model, setModel] = useState("");
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [transcript, setTranscript] = useState<{ runId: string; events: RunEvent[] }>({ runId: "", events: [] });
  const [starting, setStarting] = useState(false);
  const [startedRunId, setStartedRunId] = useState("");
  const handledRun = useRef("");

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ runs: AgentRun[]; assistant: AgentStatus }>("agents");
      setRuns(data.runs.filter(run => run.projectId === projectId && (!run.workflow || run.workflow === "creative")));
      setStatus(data.assistant);
    } catch { /* Keep the last useful status during a brief server restart. */ }
  }, [projectId]);

  const activeRun = runs.find(run => run.id === startedRunId) ?? runs.find(run => run.status === "queued" || run.status === "running");
  const latestRun = activeRun ?? runs[0];
  const latestRunId = latestRun?.id;
  const latestRunUpdatedAt = latestRun?.updatedAt;
  const events = transcript.runId === latestRunId ? transcript.events : [];

  useEffect(() => {
    if (!activeRun || !["queued", "running"].includes(activeRun.status)) return;
    const timer = setInterval(() => void refresh(), 2000);
    return () => clearInterval(timer);
  }, [activeRun, refresh]);

  useEffect(() => {
    if (!latestRunId) return;
    void api<RunEvent[]>(`agents/${latestRunId}/log`).then(events => setTranscript({ runId: latestRunId, events })).catch(() => setTranscript({ runId: latestRunId, events: [] }));
  }, [latestRunId, latestRunUpdatedAt]);

  useEffect(() => {
    if (!startedRunId || handledRun.current === startedRunId) return;
    const run = runs.find(item => item.id === startedRunId);
    if (!run || run.status === "queued" || run.status === "running") return;
    handledRun.current = startedRunId;
    if (run.status === "completed") void Promise.resolve(onCompleted()).then(() => notify("Revision applied. Review the refreshed template, then fine-tune content if needed."));
  }, [runs, startedRunId, onCompleted, notify]);

  const providerState = status?.providers[provider];
  const workerReady = status?.running === true;
  const busy = !!status?.activeRunId || runs.some(run => run.status === "queued" || run.status === "running");
  const unavailable = status ? (!workerReady ? "Assistant process is not running. Restart the studio." : !providerState?.ready ? providerState?.detail ?? `${providers[provider].label} is unavailable.` : "") : "";

  async function start() {
    if (blockedReason) { notify(blockedReason); return; }
    setStarting(true);
    try {
      const run = await api<AgentRun>("agents", { method: "POST", body: JSON.stringify({ provider, prompt, projectId, focusPageId, ...(provider === "codex" && model ? { model } : {}) }) });
      setStartedRunId(run.id);
      setPrompt("");
      notify(`${providers[provider].label} is designing ${projectName}.`);
      await refresh();
    } catch (error) { notify((error as Error).message); }
    finally { setStarting(false); }
  }

  async function stop() {
    if (!latestRun || !["queued", "running"].includes(latestRun.status)) return;
    try { await api(`agents/${latestRun.id}/cancel`, { method: "POST" }); await refresh(); }
    catch (error) { notify((error as Error).message); }
  }

  return <section className="brief-assistant" aria-label="AI creative assistant">
    <div className="brief-assistant-heading"><span className="section-caption">AI CREATIVE DIRECTION</span><h3>Design with your assistant</h3><p>Describe the outcome. Content changes start with {focusLabel.toLowerCase()}, while style and audio direction apply across the template.</p></div>
    <div className="brief-assistant-examples" aria-label="Command examples">{examples(focusLabel, isVideo).map(example => <button key={example.label} type="button" onClick={() => setPrompt(example.prompt)}><span>{example.label}</span>{example.label === "Content" ? focusLabel : example.label === "Style" ? "Whole template" : "Whole video"}</button>)}</div>
    {(unavailable || blockedReason) && <p className="assistant-panel-warning"><Icon name="close" size={14}/>{blockedReason || unavailable}</p>}
    <label className="field"><span>What should change?</span>
      <textarea rows={6} value={prompt} placeholder={`For example: Make ${focusLabel.toLowerCase()} feel more decisive, then give the entire template a refined editorial finish.`} onChange={event => setPrompt(event.target.value)}/>
      <small>Say “only this page” or “whole template” when you want to override the default scope.</small>
    </label>
    <Button disabled={!prompt.trim() || starting || busy || !!unavailable || !!blockedReason} onClick={() => void start()}>
      <Icon name="spark" size={16}/>{starting ? "Starting…" : busy ? "Revision in progress" : `Design with ${providers[provider].label}`}
    </Button>
    <p className="assistant-panel-footnote">Uses your local {providers[provider].label} sign-in. The completed revision is validated and applied automatically.</p>

    <details className="brief-assistant-settings">
      <summary>Assistant settings</summary>
      <div>
        <FilterChips label="Assistant" options={providerIds.map(id => providers[id].label)} selected={providers[provider].label}
          onSelect={label => setProvider(providerIds.find(id => providers[id].label === label) ?? "codex")}/>
        {provider === "codex" && <label className="field"><span>Codex model</span>
          <select value={model} onChange={event => setModel(event.target.value)}>{codexModelOptions.map(option => <option key={option.id || "default"} value={option.id}>{option.label}</option>)}</select>
          <small>CLI default is recommended. Other models depend on your Codex account.</small>
        </label>}
        <Button variant="ghost" onClick={() => void refresh()}><Icon name="refresh" size={14}/>Refresh assistant status</Button>
      </div>
    </details>

    {latestRun && <section className={`assistant-panel-run status-${latestRun.status}`} aria-live="polite">
      <div><strong>{latestRun.status === "running" ? "Designing your revision" : latestRun.status === "queued" ? "Waiting to start" : latestRun.status === "completed" ? "Revision applied" : "Revision needs attention"}</strong><span className={`job-status status-${latestRun.status}`}><i/>{latestRun.status}</span></div>
      {latestRun.provider === "codex" && <span className="assistant-panel-model">{latestRun.model ? codexModelOptions.find(option => option.id === latestRun.model)?.label ?? latestRun.model : "CLI default"}</span>}
      <p>{latestRun.error ?? latestRun.summary ?? runStatusNote[latestRun.status]}</p>
      {["queued", "running"].includes(latestRun.status) && <Button variant="ghost" onClick={() => void stop()}>Stop revision</Button>}
      {!!events.length && <ol className="assistant-panel-events">{events.slice(-6).map((entry, index) => <li key={`${entry.at}-${index}`} className={`run-${entry.kind}`}><span>{entry.kind}</span><p>{entry.text}</p></li>)}</ol>}
    </section>}
  </section>;
}
