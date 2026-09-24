"use client";
import { useState } from "react";
import { isLineArt, sports, type Asset, type Scene, type Sport } from "@/domain/project";
import { apiResource } from "@/shared/api";

/**
 * Picks a piece of line art as the scene backdrop. It writes the same
 * `assetId` the media select uses, so the composition renders it through the
 * existing artwork slot — line art and photography are alternatives, not layers.
 *
 * Art without a sport suits any design and is always listed, mirroring how the
 * player picker scopes to the project's sport until you ask for everything.
 */
export function LineArtPicker({ assets, scene, sport, onChange }: {
  assets: Asset[]; scene: Scene; sport: Sport; onChange: (change: Partial<Scene>) => void;
}) {
  const [everySport, setEverySport] = useState(false);
  const library = assets.filter(isLineArt);
  if (!library.length) return null;
  const shown = everySport ? library : library.filter(a => !a.sport || a.sport === sport);
  const chosen = library.find(a => a.id === scene.assetId);
  // Fitting the whole drawing is almost always right: these are composed
  // illustrations, not photographs that survive a crop.
  const choose = (id: string) => onChange(id === scene.assetId ? { assetId: "" } : { assetId: id, crop: "contain" });

  return <div className="line-art">
    <div className="section-caption">LINE ART{chosen ? " · 1 SELECTED" : ""}</div>
    <p className="muted-note">StatOz drawings you can set behind the content. Choosing one replaces the visual media above.</p>
    <div className="line-art-grid">
      {shown.map(art => <button
        key={art.id}
        type="button"
        aria-pressed={art.id === scene.assetId}
        className={art.id === scene.assetId ? "selected" : ""}
        title={`${art.name}${art.sport ? ` · ${sports[art.sport].label}` : ""}`}
        onClick={() => choose(art.id)}
      ><img src={apiResource(`assets/${art.id}`)} alt={art.name}/><span>{art.name}</span></button>)}
    </div>
    {!shown.length && <p className="muted-note">No line art for {sports[sport].label}. Show every sport to see the rest.</p>}
    <label className="toggle-row"><span>Show every sport</span><input type="checkbox" checked={everySport} onChange={e => setEverySport(e.target.checked)}/></label>
    {chosen && <button type="button" className="line-art-clear" onClick={() => onChange({ assetId: "" })}>Clear {chosen.name}</button>}
  </div>;
}
