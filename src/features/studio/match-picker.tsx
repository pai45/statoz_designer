"use client";
import { useEffect, useRef, useState } from "react";
import { espnSports, type EspnLeague, type EspnSport, type MatchFacts, type MatchListing } from "@/domain/espn";
import { formats, type Format, type ProjectEnvelope } from "@/domain/project";
import { standardFormats } from "@/domain/app-creatives";
import { Button, FilterChips, Icon, Tag } from "@/design-system/components/ui";
import { api } from "@/shared/api";
import "./match-picker.css";

const stamp = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
const toInput = (yyyymmdd: string) => `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
const sportLabels = Object.entries(espnSports).map(([id, s]) => ({ id: id as EspnSport, label: s.label }));
const graphNames = { momentum: "Match momentum", lead: "Scoring run", race: "Run worm" } as const;

/** The beats a match story will play for this match: a beat with no data is left out rather than exported empty. */
function storyBeats(facts: MatchFacts) {
  const stats = facts.sport === "motorsport" ? facts.classification?.length ? "Classification" : "" : facts.stats.length ? "Key stats" : "";
  const graph = facts.timeline ? graphNames[facts.timeline.graph] : "";
  const missing = [!stats && "stats", !graph && "graph"].filter(Boolean).join(" and ");
  return { beats: ["Result", stats, graph, "Pick your side"].filter(Boolean), missing };
}

/**
 * Picks a finished fixture from ESPN and turns it into a poster or a match story. Used two
 * ways: from Projects it creates a project, and from the editor it refills the open one.
 */
export function MatchPicker({ mode, story = false, projectId, pageIndex, onDone, onClose, notify }: {
  mode: "create" | "fill";
  /** Filling a match story, which takes the whole match rather than one featured stat. */
  story?: boolean;
  projectId?: string; pageIndex?: number;
  onDone: (project: ProjectEnvelope["project"]) => void;
  onClose: () => void;
  notify: (message: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [leagues, setLeagues] = useState<EspnLeague[]>([]);
  const [sport, setSport] = useState<EspnSport>("football");
  const [leagueId, setLeagueId] = useState("eng.1");
  const [date, setDate] = useState(stamp(new Date()));
  const [matches, setMatches] = useState<MatchListing[] | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState("");
  const [facts, setFacts] = useState<MatchFacts | null>(null), [statLabel, setStatLabel] = useState("");
  const [format, setFormat] = useState<Format>("portrait");
  const [output, setOutput] = useState<"poster" | "story">("poster"), [duration, setDuration] = useState(15);
  const [crests, setCrests] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => { void api<EspnLeague[]>("espn/leagues").then(setLeagues).catch(() => setLeagues([])); }, []);
  const forSport = leagues.filter(l => l.sport === sport);
  // Derived rather than synced: the catalogue arrives after the first render, and the
  // sport chips already reset the league.
  const activeLeague = forSport.some(l => l.id === leagueId) ? leagueId : (forSport[0]?.id ?? leagueId);

  async function load() {
    setLoading(true); setError(""); setFacts(null); setMatches(null);
    try { setMatches((await api<MatchListing[]>(`espn/matches?leagueId=${encodeURIComponent(activeLeague)}&date=${date}`)).filter(m => m.completed)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function choose(match: MatchListing) {
    setLoading(true); setError(""); setStatLabel("");
    try { setFacts(await api<MatchFacts>(`espn/match/${encodeURIComponent(match.eventId)}?leagueId=${encodeURIComponent(activeLeague)}&date=${date}`)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function build() {
    if (!facts) return;
    setBusy(true);
    try {
      const body = {
        leagueId: activeLeague, eventId: facts.eventId, date, crests,
        ...(statLabel ? { statLabel } : {}),
        ...(mode === "fill" ? { projectId, pageIndex: pageIndex ?? 0 } : { format, ...(output === "story" ? { templateId: "match-story", duration } : {}) }),
      };
      const result = await api<{ project: ProjectEnvelope["project"] }>("espn/poster", { method: "POST", body: JSON.stringify(body) });
      notify(mode === "fill" ? (story ? "Match story filled from the match." : "Scene filled from the match.") : output === "story" ? "Match story created from the match." : "Poster created from the match.");
      onDone(result.project);
    } catch (e) { notify((e as Error).message); }
    finally { setBusy(false); }
  }

  const shift = (days: number) => { const d = new Date(toInput(date)); d.setUTCDate(d.getUTCDate() + days); setDate(stamp(d)); setMatches(null); setFacts(null); };

  return <dialog ref={dialog} className="modal match-modal" onCancel={onClose}>
    <div className="modal-heading">
      <div>
        <span className="section-caption">MATCH DATA FROM ESPN</span>
        <h2>{mode === "fill" ? story ? "Fill this story from a match" : "Fill this scene from a match" : "Build from a match"}</h2>
      </div>
      <Button variant="ghost" aria-label="Close match picker" onClick={onClose}><Icon name="close"/></Button>
    </div>

    <FilterChips label="Sport" options={sportLabels.map(s => s.label)} selected={sportLabels.find(s => s.id === sport)!.label}
      onSelect={label => { const next = sportLabels.find(s => s.label === label)!.id; setSport(next); setLeagueId(leagues.find(l => l.sport === next)?.id ?? ""); setMatches(null); setFacts(null); }}/>

    <div className="match-controls">
      <label className="field"><span>Competition</span>
        <select value={activeLeague} onChange={e => { setLeagueId(e.target.value); setMatches(null); setFacts(null); }}>
          {forSport.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      <label className="field"><span>Date</span>
        <div className="date-row">
          <Button variant="secondary" aria-label="Previous day" onClick={() => shift(-1)}><Icon name="back" size={15}/></Button>
          <input type="date" value={toInput(date)} onChange={e => { setDate(e.target.value.replace(/-/g, "")); setMatches(null); setFacts(null); }}/>
          <Button variant="secondary" aria-label="Next day" onClick={() => shift(1)}><Icon name="arrow" size={15}/></Button>
        </div>
      </label>
      <Button variant="secondary" onClick={() => void load()} disabled={loading}>{loading ? "Loading…" : "Find matches"}</Button>
    </div>

    {error && <p className="match-error"><Icon name="close" size={15}/>{error}</p>}

    {matches && !matches.length && <p className="muted-note">No finished fixture in this competition on that date. Try another day.</p>}
    {matches && matches.length > 0 && <div className="match-list">
      {matches.map(m => <button key={m.eventId} className={facts?.eventId === m.eventId ? "selected" : ""} onClick={() => void choose(m)}>
        <span className="match-teams">{m.a.abbreviation || m.a.name} <b>{m.a.score}</b> — <b>{m.b.score}</b> {m.b.abbreviation || m.b.name}</span>
        <small>{m.shortName} · {m.detail}</small>
      </button>)}
    </div>}

    {facts && <div className="match-facts">
      <div className="facts-head">
        <div><h3>{facts.name}</h3><p>{facts.note || facts.detail}{facts.venue ? ` · ${facts.venue}` : ""}</p></div>
        <Tag>{facts.leagueName}</Tag>
      </div>
      {(story || (mode === "create" && output === "story")) ? (() => {
        const { beats, missing } = storyBeats(facts);
        return <div className="story-beats"><span className="section-caption">THE STORY WILL PLAY</span>
          <ol>{beats.map(beat => <li key={beat}>{beat}</li>)}</ol>
          {missing && <p className="muted-note">ESPN has no {missing} data for this match, so {missing.includes("and") ? "those beats are" : "that beat is"} left out and the others share the running time.</p>}
        </div>;
      })() : facts.stats.length > 0 ? <label className="field"><span>Feature this stat</span>
        <select value={statLabel} onChange={e => setStatLabel(e.target.value)}>
          <option value="">Best available ({facts.stats[0].label})</option>
          {facts.stats.map(s => <option key={s.label} value={s.label}>{s.label} · {s.a} — {s.b}</option>)}
        </select>
      </label> : <p className="muted-note">This sport reports no comparable team stat, so the poster leads with the result.</p>}
      {!!facts.highlights.length && <div className="fact-chips">{facts.highlights.map(h => <span key={h.label}><i>{h.label}</i>{h.value}</span>)}</div>}
      <label className="toggle-row"><span>Import team crests as assets</span><input type="checkbox" checked={crests} onChange={e => setCrests(e.target.checked)}/></label>
      {mode === "create" && <div className="match-output">
        <label className="field"><span>Make</span>
          <select value={output} onChange={e => setOutput(e.target.value as "poster" | "story")}><option value="poster">Match poster</option><option value="story">Match story video</option></select>
        </label>
        <label className="field"><span>Format</span>
          <select value={format} onChange={e => setFormat(e.target.value as Format)}>{standardFormats.map(id => <option key={id} value={id}>{formats[id].label} · {formats[id].ratio}</option>)}</select>
        </label>
        {output === "story" && <label className="field"><span>Length</span>
          <select value={duration} onChange={e => setDuration(Number(e.target.value))}>{[10, 12, 15, 20, 30].map(n => <option key={n} value={n}>{n} seconds</option>)}</select>
        </label>}
      </div>}
      <p className="muted-note">Figures are reported by ESPN. Crests are club trademarks, imported as product reference — they do not imply endorsement.</p>
    </div>}

    <div className="modal-footer">
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button disabled={!facts || busy} onClick={() => void build()}>
        <Icon name="spark" size={16}/>{busy ? "Working…" : mode === "fill" ? story ? "Fill this story" : "Fill this scene" : output === "story" ? "Create story" : "Create poster"}
      </Button>
    </div>
  </dialog>;
}
