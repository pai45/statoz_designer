"use client";
import { useEffect, useRef, useState } from "react";
import { espnSports, type EspnLeague, type EspnSport, type NewsArticle } from "@/domain/espn";
import type { Scene, Sport } from "@/domain/project";
import { Button, FilterChips, Icon } from "@/design-system/components/ui";
import { api } from "@/shared/api";
import "@/features/studio/match-picker.css";
import "./news-picker.css";

const sportLabels = Object.entries(espnSports).map(([id, s]) => ({ id: id as EspnSport, label: s.label }));
const when = (iso: string) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };

/**
 * Picks a story from a league's ESPN news feed for a News flash. The server imports the
 * story's photo as a reference asset; the headline, summary, credit and photo come back
 * as ordinary scene fields, which the editor applies as one undoable edit.
 */
export function NewsPicker({ sport, onPick, onClose, notify }: {
  sport: Sport;
  onPick: (change: Partial<Scene>) => void;
  onClose: () => void;
  notify: (message: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [leagues, setLeagues] = useState<EspnLeague[]>([]);
  const [chosenSport, setChosenSport] = useState<EspnSport>(sport in espnSports ? sport as EspnSport : "football");
  const [leagueId, setLeagueId] = useState("eng.1");
  const [stories, setStories] = useState<NewsArticle[] | null>(null);
  const [selected, setSelected] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);

  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => { void api<EspnLeague[]>("espn/leagues").then(setLeagues).catch(() => setLeagues([])); }, []);
  const forSport = leagues.filter(l => l.sport === chosenSport);
  const activeLeague = forSport.some(l => l.id === leagueId) ? leagueId : (forSport[0]?.id ?? leagueId);

  async function load() {
    setLoading(true); setError(""); setSelected(null); setStories(null);
    try { setStories(await api<NewsArticle[]>(`espn/news?leagueId=${encodeURIComponent(activeLeague)}`)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function use() {
    if (!selected) return;
    setBusy(true);
    try {
      const fields = await api<Pick<Scene, "assetId" | "headline" | "body" | "credit">>("espn/news-photo", { method: "POST", body: JSON.stringify({ leagueId: activeLeague, articleId: selected.id }) });
      // A fresh photo starts centred and slightly high, where faces usually sit.
      onPick({ ...fields, crop: "cover", cropX: 50, cropY: 35 });
      notify("Story added. Shorten the headline so it reads at a glance.");
    } catch (e) { notify((e as Error).message); }
    finally { setBusy(false); }
  }

  return <dialog ref={dialog} className="modal match-modal news-modal" onCancel={onClose}>
    <div className="modal-heading">
      <div>
        <span className="section-caption">NEWS FROM ESPN</span>
        <h2>Pick a story</h2>
      </div>
      <Button variant="ghost" aria-label="Close story picker" onClick={onClose}><Icon name="close"/></Button>
    </div>

    <FilterChips label="Sport" options={sportLabels.map(s => s.label)} selected={sportLabels.find(s => s.id === chosenSport)!.label}
      onSelect={label => { const next = sportLabels.find(s => s.label === label)!.id; setChosenSport(next); setLeagueId(leagues.find(l => l.sport === next)?.id ?? ""); setStories(null); setSelected(null); }}/>

    <div className="match-controls news-controls">
      <label className="field"><span>Competition</span>
        <select value={activeLeague} onChange={e => { setLeagueId(e.target.value); setStories(null); setSelected(null); }}>
          {forSport.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      <Button variant="secondary" onClick={() => void load()} disabled={loading}>{loading ? "Loading…" : "Load stories"}</Button>
    </div>

    {error && <p className="match-error"><Icon name="close" size={15}/>{error}</p>}
    {stories && !stories.length && <p className="muted-note">This competition has no stories right now. Try another.</p>}
    {stories && stories.length > 0 && <div className="news-list">
      {stories.map(story => <button key={story.id} className={selected?.id === story.id ? "selected" : ""} disabled={!story.image} onClick={() => setSelected(story)}>
        <span className="news-thumb">{story.image ? <img src={story.image.url} alt="" loading="lazy"/> : <Icon name="image" size={18}/>}</span>
        <span className="news-story">
          <b>{story.headline}</b>
          <small>{[when(story.published), story.image ? story.image.credit || "Uncredited photo" : "No photo"].filter(Boolean).join(" · ")}</small>
        </span>
      </button>)}
    </div>}

    <p className="muted-note">Headlines and photos are ESPN&rsquo;s reporting. Photos belong to their agencies and import as reference media with the credit printed on the design; check you may use one before you publish.</p>

    <div className="modal-footer">
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button disabled={!selected || busy} onClick={() => void use()}><Icon name="spark" size={16}/>{busy ? "Importing photo…" : "Use this story"}</Button>
    </div>
  </dialog>;
}
