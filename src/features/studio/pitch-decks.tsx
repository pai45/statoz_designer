"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Asset, ProjectEnvelope, RenderJob } from "@/domain/project";
import { Button, Icon, Tag } from "@/design-system/components/ui";
import { Thumbnail } from "@/features/editor/preview";
import { api } from "@/shared/api";
import { InvestorReviewDialog } from "./investor-review-dialog";

type Props = { projects: ProjectEnvelope[]; assets: Asset[]; search: string; onOpen: (value: ProjectEnvelope) => void; onRefresh: () => Promise<void>; onExports: () => void; onDelete: (value: ProjectEnvelope) => void; notify: (message: string) => void };

export function PitchDecks({ projects, assets, search, onOpen, onRefresh, onExports, onDelete, notify }: Props) {
  const decks = projects.filter(value => value.project.pitchDeck);
  const [showArchived, setShowArchived] = useState(false);
  const [source, setSource] = useState<ProjectEnvelope | null>(null);
  const [investorSource, setInvestorSource] = useState<ProjectEnvelope | null>(null);
  const [name, setName] = useState(""), [audience, setAudience] = useState("Pre-seed and seed investors"), [working, setWorking] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current; if (!node) return; if (source && !node.open) node.showModal(); else if (!source && node.open) node.close(); }, [source]);
  const families = useMemo(() => {
    const map = new Map<string, ProjectEnvelope[]>();
    for (const value of decks) { const id = value.project.pitchDeck!.familyId; map.set(id, [...(map.get(id) || []), value]); }
    return [...map.values()].map(items => ({ master: items.find(item => item.project.pitchDeck!.role === "master"), variants: items.filter(item => item.project.pitchDeck!.role === "variant").sort((a, b) => b.project.updatedAt.localeCompare(a.project.updatedAt)) })).filter(family => family.master || family.variants.length);
  }, [decks]);
  async function createMaster() { setWorking(true); try { const value = await api<ProjectEnvelope>("projects", { method: "POST", body: JSON.stringify({ templateId: "investor-pitch", format: "landscape", sport: "football" }) }); await onRefresh(); onOpen(value); } catch (error) { notify((error as Error).message); } finally { setWorking(false); } }
  async function createVariant() { if (!source || !name.trim() || !audience.trim()) return; setWorking(true); try { const value = await api<ProjectEnvelope>(`projects/${source.project.id}/variants`, { method: "POST", body: JSON.stringify({ name: name.trim(), audience: audience.trim() }) }); setSource(null); setName(""); await onRefresh(); notify("Pitch deck variant created from the saved revision."); onOpen(value); } catch (error) { notify((error as Error).message); } finally { setWorking(false); } }
  async function archive(value: ProjectEnvelope) { try { await api(`projects/${value.project.id}`, { method: "PUT", headers: { "If-Match": value.etag }, body: JSON.stringify({ ...value.project, archived: !value.project.archived }) }); await onRefresh(); notify(value.project.archived ? "Pitch deck restored." : "Pitch deck archived."); } catch (error) { notify((error as Error).message); } }
  async function rename(value: ProjectEnvelope) { const next = window.prompt("Pitch deck name", value.project.name)?.trim(); if (!next || next === value.project.name) return; try { await api(`projects/${value.project.id}`, { method: "PUT", headers: { "If-Match": value.etag }, body: JSON.stringify({ ...value.project, name: next.slice(0, 120) }) }); await onRefresh(); notify("Pitch deck renamed."); } catch (error) { notify((error as Error).message); } }
  async function exportDeck(value: ProjectEnvelope, outputType: RenderJob["outputType"]) { try { await api("exports", { method: "POST", body: JSON.stringify({ projectId: value.project.id, etag: value.etag, format: "landscape", outputType }) }); notify(`${outputType.toUpperCase()} export queued.`); onExports(); } catch (error) { notify((error as Error).message); } }
  const matches = (value: ProjectEnvelope) => `${value.project.name} ${value.project.pitchDeck?.variantName} ${value.project.brief.audience}`.toLowerCase().includes(search.toLowerCase());
  const Card = ({ value, master = false }: { value: ProjectEnvelope; master?: boolean }) => <article className={`pitch-deck-card ${master ? "master" : "variant"}`}>
    <button className="pitch-deck-cover" onClick={() => onOpen(value)}><Thumbnail project={value.project} assets={assets}/><span>{master ? "MASTER" : "VARIANT"}</span></button>
    <div className="pitch-deck-info"><div><Tag>{master ? "MASTER" : value.project.pitchDeck!.variantName.toUpperCase()}</Tag><button className="pitch-deck-name" onClick={() => onOpen(value)}>{value.project.name}</button><p>{value.project.brief.audience}</p>{!master && <small>From revision {value.project.pitchDeck!.basedOnRevision} · independent snapshot</small>}</div>
      <div className="pitch-deck-actions"><Button onClick={() => setInvestorSource(value)}><Icon name="spark" size={15}/>Review as investor</Button><Button variant="secondary" onClick={() => { setSource(value); setName(""); setAudience(value.project.brief.audience); }}><Icon name="copy" size={15}/>New variant</Button><Button variant="ghost" onClick={() => void rename(value)}>Rename</Button><Button variant="ghost" title="Export PDF" onClick={() => void exportDeck(value, "pdf")}>PDF</Button><Button variant="ghost" title="Export PowerPoint" onClick={() => void exportDeck(value, "pptx")}>PPTX</Button><Button variant="ghost" title="Export slide images" onClick={() => void exportDeck(value, "zip")}>PNG ZIP</Button><Button variant="ghost" title={value.project.archived ? "Restore" : "Archive"} aria-label={`${value.project.archived ? "Restore" : "Archive"} ${value.project.name}`} onClick={() => void archive(value)}><Icon name="folder" size={15}/></Button><Button className="danger-action" variant="ghost" title="Delete permanently" aria-label={`Delete ${value.project.name}`} onClick={() => onDelete(value)}><Icon name="trash" size={15}/></Button></div>
    </div>
  </article>;
  return <>
    <div className="page-heading"><div><div className="overline">INVESTOR STORY WORKSPACE</div><h1>Your pitch, with room to <em>evolve.</em></h1><p>Masters stay canonical. Named variants are independent snapshots for each audience.</p></div><Button onClick={() => void createMaster()} disabled={working}><Icon name="plus"/>New investor deck</Button></div>
    <div className="pitch-library-toolbar"><label className="archive-toggle"><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)}/>Show archived</label><span>{families.length} deck {families.length === 1 ? "family" : "families"}</span></div>
    <div className="pitch-families">{families.map((family, familyIndex) => {
      const visibleMaster = family.master && family.master.project.archived === showArchived && matches(family.master) ? family.master : null;
      const variants = family.variants.filter(value => value.project.archived === showArchived && matches(value));
      if (!visibleMaster && !variants.length) return null;
      return <section className="pitch-family" key={family.master?.project.pitchDeck!.familyId || familyIndex}><div className="pitch-family-heading"><div><span>DECK FAMILY {String(familyIndex + 1).padStart(2, "0")}</span><h2>{family.master?.project.name || family.variants[0].project.name}</h2></div><Tag>{family.variants.length} VARIANT{family.variants.length === 1 ? "" : "S"}</Tag></div>{visibleMaster && <Card value={visibleMaster} master/>}{variants.length > 0 && <div className="pitch-variant-list">{variants.map(value => <Card key={value.project.id} value={value}/>)}</div>}</section>;
    })}</div>
    {!families.some(family => (family.master && family.master.project.archived === showArchived && matches(family.master)) || family.variants.some(value => value.project.archived === showArchived && matches(value))) && <div className="empty-state"><Icon name="deck" size={40}/><h2>{showArchived ? "No archived pitch decks." : "No pitch decks match this search."}</h2><p>Create a fresh StatOz investor deck or adjust the search.</p></div>}
    <dialog ref={dialog} className="modal pitch-variant-modal" onCancel={() => setSource(null)}><div className="modal-heading"><div><span className="section-caption">SNAPSHOT A SAVED REVISION</span><h2>Create a pitch variant</h2></div><Button variant="ghost" aria-label="Close" onClick={() => setSource(null)}><Icon name="close"/></Button></div><p className="muted-note">This copies “{source?.project.name}” at revision {source?.project.revision}. Future edits never flow between the source and variant.</p><label className="field"><span>Variant name</span><input autoFocus maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="US angels · concise"/></label><label className="field"><span>Audience</span><textarea rows={3} maxLength={300} value={audience} onChange={event => setAudience(event.target.value)}/></label><div className="modal-footer"><Button variant="secondary" onClick={() => setSource(null)}>Cancel</Button><Button disabled={working || !name.trim() || !audience.trim()} onClick={() => void createVariant()}>{working ? "Creating…" : "Create independent variant"}<Icon name="arrow"/></Button></div></dialog>
    <InvestorReviewDialog source={investorSource} onClose={() => setInvestorSource(null)} onRefresh={onRefresh} onOpen={onOpen} notify={notify}/>
  </>;
}
