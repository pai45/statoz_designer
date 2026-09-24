import { useEffect, useState, type DragEvent } from "react";
import type { BrandKitItem } from "@/domain/brand-guide";
import { assetCategoryLabels, assetCategoryOf, sortAssetsForCategory } from "@/domain/asset-library";
import type { Asset, AssetCategory } from "@/domain/project";
import { Button, FilterChips, Icon, Tag } from "@/design-system/components/ui";
import { api, readableBytes } from "@/shared/api";
import "./brand-library.css";

export const assetTabs = ["Uploads", "Product captures", "Player portraits", "Team crests", "News photos", "Line art", "Audio & video", "Design kit"] as const;
export type AssetTab = typeof assetTabs[number];

/** Tabs backed by an asset category; the design kit is a fixed set of files instead. */
const tabCategories: Record<Exclude<AssetTab, "Design kit">, AssetCategory> = {
  Uploads: "uploads",
  "Product captures": "product-capture",
  "Player portraits": "player-portrait",
  "Team crests": "team-crest",
  "News photos": "news-photo",
  "Line art": "line-art",
  "Audio & video": "audio-video",
};

function AssetCard({ asset, onChanged, notify }: { asset: Asset; onChanged?: () => void; notify?: (message: string) => void }) {
  const category = assetCategoryOf(asset);
  return <article className="asset-card">
    <div className="asset-visual">
      {asset.mime.startsWith("image/") ? <img src={`/api/assets/${asset.id}`} alt={asset.name} loading="lazy"/>
        : asset.mime.startsWith("video/") ? <video controls src={`/api/assets/${asset.id}`} preload="metadata"/>
          : <div className="audio-asset"><Icon name="play" size={30}/><audio controls src={`/api/assets/${asset.id}`} preload="metadata"/></div>}
    </div>
    <div className="asset-info">
      <h3>{asset.name}</h3>
      <span>{asset.mime.split("/")[1].toUpperCase()} · {readableBytes(asset.bytes)}{asset.width ? ` · ${asset.width} × ${asset.height}` : ""}{asset.duration ? ` · ${asset.duration.toFixed(1)}s` : ""}</span>
      <p title={asset.source}>{asset.source}</p>
      <div className="asset-labels">
        <Tag>{assetCategoryLabels[category].toUpperCase()}</Tag>
        {asset.approval === "brand" ? <Tag>BRAND ASSET</Tag> : onChanged && notify ? <select aria-label={`Approval for ${asset.name}`} value={asset.approval} onChange={event => {
          void api(`assets/${asset.id}`, { method: "PATCH", body: JSON.stringify({ approval: event.target.value }) })
            .then(() => { onChanged(); notify(`${asset.name} approval updated.`); })
            .catch(error => notify(error.message));
        }}><option value="reference">Product reference</option><option value="approved">Campaign approved</option></select>
          : <Tag>{asset.approval === "approved" ? "CAMPAIGN APPROVED" : "PRODUCT REFERENCE"}</Tag>}
      </div>
    </div>
  </article>;
}

export function AssetGrid({ assets, onChanged, notify, empty }: { assets: Asset[]; onChanged?: () => void; notify?: (message: string) => void; empty: string }) {
  if (!assets.length) return <div className="empty-state library-empty"><Icon name="image" size={34}/><h2>Nothing here yet.</h2><p>{empty}</p></div>;
  return <div className="asset-grid">{assets.map(asset => <AssetCard key={asset.id} asset={asset} onChanged={onChanged} notify={notify}/>)}</div>;
}

/** The files someone needs to work in the StatOz style outside the studio. */
function DesignKit({ search }: { search: string }) {
  const [items, setItems] = useState<BrandKitItem[] | null>(null), [error, setError] = useState("");
  useEffect(() => { api<BrandKitItem[]>("brand-kit").then(setItems).catch(reason => setError(reason.message)); }, []);
  const query = search.trim().toLowerCase();
  const visible = (items ?? []).filter(item => !query || `${item.name} ${item.fileName} ${item.description}`.toLowerCase().includes(query));
  if (error) return <div className="empty-state library-empty"><Icon name="download" size={34}/><h2>The design kit is unavailable.</h2><p>{error}</p></div>;
  return <>
    <p className="muted-note design-kit-note">Everything needed to work in the StatOz style in other tools: tokens, fonts, the mark and the guide. The guide and tokens are generated from the studio&apos;s live stylesheet, so they are always current.</p>
    {items && !visible.length ? <div className="empty-state library-empty"><Icon name="download" size={34}/><h2>Nothing here yet.</h2><p>No design kit files match “{search.trim()}”.</p></div>
      : <div className="design-kit-grid">{visible.map(item => <article className="design-kit-card" key={item.id}>
        <div className="design-kit-format">{item.format}</div>
        <div><h3>{item.name}</h3><span>{item.fileName} · {readableBytes(item.bytes)}</span><p>{item.description}</p></div>
        <a className="button button-secondary" href={`/api/brand-kit/${item.id}`} download={item.fileName}><Icon name="download" size={16}/>Download</a>
      </article>)}</div>}
  </>;
}

export function AssetLibrary({ assets, search, selected, onSelect, approvedImport, onApprovedImport, importing, onBrowse, onDrop, onChanged, notify }: {
  assets: Asset[]; search: string; selected: AssetTab; onSelect: (tab: AssetTab) => void;
  approvedImport: boolean; onApprovedImport: (approved: boolean) => void; importing: boolean;
  onBrowse: () => void; onDrop: (files: FileList) => void; onChanged: () => void; notify: (message: string) => void;
}) {
  const category = selected === "Design kit" ? undefined : tabCategories[selected], query = search.trim().toLowerCase();
  const visible = category ? sortAssetsForCategory(assets.filter(asset => assetCategoryOf(asset) === category && (!query || `${asset.name} ${asset.source}`.toLowerCase().includes(query))), category) : [];
  const descriptions: Record<AssetTab, string> = {
    Uploads: "Import campaign artwork and approved creative media to start this collection.",
    "Product captures": "Run npm run import:app-screens to bring in the curated app screens, or import your own screenshots.",
    "Player portraits": "Run the player importer to populate the managed portrait library.",
    "Team crests": "Crests imported from match data will appear here as product references.",
    "News photos": "Photos picked with a News flash story appear here. They belong to their agencies, so they stay references.",
    "Line art": "Run npm run import:line-art to refresh StatOz composition artwork.",
    "Audio & video": "Import footage, music, or voiceover to start this collection.",
    "Design kit": "",
  };
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); if (event.dataTransfer.files.length) onDrop(event.dataTransfer.files); };
  return <section className="library-section" aria-label="Asset library">
    <div className="asset-toolbar">
      <FilterChips label="Asset category" options={[...assetTabs]} selected={selected} onSelect={value => onSelect(value as AssetTab)}/>
      {selected === "Uploads" && <label className="archive-toggle"><input type="checkbox" checked={approvedImport} onChange={event => onApprovedImport(event.target.checked)}/>Imported media is approved for campaigns</label>}
    </div>
    {selected === "Uploads" && <div className="import-dropzone" onDragOver={event => event.preventDefault()} onDrop={drop}><Icon name="upload" size={27}/><div><strong>Drop your next great asset here</strong><p>Images and vectors · Audio and video are filed in their own tab · Up to 150 MB per file</p></div><Button variant="secondary" onClick={onBrowse} disabled={importing}>Browse files</Button></div>}
    {selected === "Line art" && <p className="muted-note line-art-note">StatOz drawings imported from statoz_web. Run <code>npm run import:line-art</code> to refresh them. Pick one in an editor scene under Line art.</p>}
    {category ? <AssetGrid assets={visible} onChanged={onChanged} notify={notify} empty={query ? `No ${selected.toLowerCase()} match “${search.trim()}”.` : descriptions[selected]}/> : <DesignKit search={search}/>}
  </section>;
}
