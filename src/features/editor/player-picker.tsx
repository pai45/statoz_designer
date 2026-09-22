"use client";
import { useEffect, useState } from "react";
import type { Player } from "@/domain/player";
import { sports, type Asset, type Scene, type Sport } from "@/domain/project";
import { Button, Icon, InputField } from "@/design-system/components/ui";
import { api } from "@/shared/api";

const emptyCard = { playerId: "", position: "", club: "", nation: "" };
const boundedRating = (value: string) => { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0; };

export function PlayerPicker({ scene, sport, assets, onChange, notify }: { scene: Scene; sport: Sport; assets: Asset[]; onChange: (change: Partial<Scene>) => void; notify: (message: string) => void }) {
  const [query, setQuery] = useState(""), [everySport, setEverySport] = useState(false), [revision, setRevision] = useState(0);
  const [results, setResults] = useState<Player[]>([]), [searching, setSearching] = useState(false), [saving, setSaving] = useState(false);
  const linked = scene.playerCard;
  useEffect(() => {
    if (!query.trim()) return;
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try { setResults(await api<Player[]>(`players?${new URLSearchParams({ q: query, ...(everySport ? {} : { sport }) })}`, { signal: abort.signal })); }
      catch { /* Keep the last result while the local library is unreachable. */ }
      finally { if (!abort.signal.aborted) setSearching(false); }
    }, 220);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [query, everySport, sport, revision]);
  function apply(player: Player) {
    onChange({ nameA: player.name, statValue: String(player.rating), cardMetrics: { ...player.metrics }, assetId: player.portraitAssetId, playerCard: { playerId: player.id, position: player.position, club: player.club, nation: player.nation } });
    notify(player.portraitAssetId ? `${player.name} is on the card.` : `${player.name} is on the card. Import a portrait and choose it under Visual media.`);
  }
  async function saveToLibrary(asNew: boolean) {
    if (!scene.nameA.trim()) { notify("Give the card a name before saving it to the player library."); return; }
    const body = { name: scene.nameA.trim().slice(0, 60), sport, rating: boundedRating(scene.statValue), metrics: scene.cardMetrics, portraitAssetId: scene.assetId, position: linked?.position ?? "", club: linked?.club ?? "", nation: linked?.nation ?? "" };
    setSaving(true);
    try {
      if (!asNew && linked?.playerId) { const updated = await api<Player>(`players/${linked.playerId}`, { method: "PUT", body: JSON.stringify(body) }); notify(`${updated.name} updated in the player library.`); }
      else { const created = await api<Player>("players", { method: "POST", body: JSON.stringify(body) }); onChange({ playerCard: { playerId: created.id, position: created.position, club: created.club, nation: created.nation } }); notify(`${created.name} added to the player library.`); }
      setRevision(n => n + 1);
    } catch (e) { notify((e as Error).message); } finally { setSaving(false); }
  }
  return <div className="player-picker">
    <div className="section-caption">PLAYER CARD</div>
    <label className="field player-search"><span>Search the player library</span><input value={query} placeholder="Name, position, club or nation" onChange={e => setQuery(e.target.value)}/></label>
    <label className="toggle-row player-scope"><span>Search every sport</span><input type="checkbox" checked={everySport} onChange={e => setEverySport(e.target.checked)}/></label>
    <div className="player-results">
      {!query.trim() ? <p className="muted-note">Start typing to search the local player library.</p> : searching && !results.length ? <p className="muted-note">Searching your library…</p> : results.length === 0 ? <p className="muted-note">No player matches that search. Build this card by hand, then save it to the library.</p> : results.slice(0, 8).map(player => {
        const portrait = assets.find(a => a.id === player.portraitAssetId);
        return <button key={player.id} className={`player-result ${linked?.playerId === player.id ? "selected" : ""}`} onClick={() => apply(player)}>
          <span className="player-face">{portrait ? <img src={`/api/assets/${portrait.id}`} alt=""/> : <Icon name="image" size={14}/>}</span>
          <span className="player-copy"><strong>{player.name}</strong><small>{[player.position, player.club, player.nation].filter(Boolean).join(" · ") || sports[player.sport].label}</small></span>
          <span className="player-rating">{player.rating}</span>
        </button>;
      })}
      {!!query.trim() && results.length > 8 && <p className="muted-note">{results.length - 8} more match. Narrow the search to see them.</p>}
    </div>
    {linked ? <>
      <div className="player-linked"><Icon name="check" size={14}/><span>{linked.playerId ? "Linked to a library player. Its club, position and nation print on the card." : "Card details print on the card. Save them to reuse this player."}</span><Button variant="ghost" onClick={() => onChange({ playerCard: null })}>Clear</Button></div>
      <InputField label="Position" value={linked.position} maxLength={60} onChange={e => onChange({ playerCard: { ...linked, position: e.target.value } })}/>
      <div className="field-row"><InputField label="Club" value={linked.club} maxLength={60} onChange={e => onChange({ playerCard: { ...linked, club: e.target.value } })}/><InputField label="Nation" value={linked.nation} maxLength={60} onChange={e => onChange({ playerCard: { ...linked, nation: e.target.value } })}/></div>
    </> : <Button variant="secondary" className="player-add" onClick={() => onChange({ playerCard: { ...emptyCard } })}><Icon name="plus" size={15}/>Add player details</Button>}
    <div className="player-actions">
      {linked?.playerId && <Button variant="secondary" className="player-add" disabled={saving} onClick={() => void saveToLibrary(false)}><Icon name="upload" size={15}/>{saving ? "Saving…" : "Update this player"}</Button>}
      <Button variant="secondary" className="player-add" disabled={saving} onClick={() => void saveToLibrary(true)}><Icon name="plus" size={15}/>{saving ? "Saving…" : linked?.playerId ? "Save as a new player" : "Save this card as a player"}</Button>
    </div>
    <p className="muted-note">The library is local sample data in your storage folder. The card name, rating, PACE/SKILL/FORM and the Visual media portrait are saved with the player.</p>
  </div>;
}
