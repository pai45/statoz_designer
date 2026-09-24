"use client";
import { useState } from "react";
import { isLineArt, type Asset, type Scene, type Sport } from "@/domain/project";
import { Button, Icon, InputField } from "@/design-system/components/ui";
import { NewsPicker } from "./news-picker";

/** The story, photo and credit of a News flash. The credit always prints on the artwork. */
export function NewsFields({ scene, sport, assets, onChange, onPicked, onAssetsChanged, notify }: {
  scene: Scene; sport: Sport; assets: Asset[];
  onChange: (change: Partial<Scene>) => void;
  /** A reported story replaces the sample one, so the editor also clears the sample label. */
  onPicked: (change: Partial<Scene>) => void;
  onAssetsChanged: () => void;
  notify: (message: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const photos = assets.filter(a => a.mime.startsWith("image/") && !isLineArt(a));
  const photo = assets.find(a => a.id === scene.assetId);
  return <>
    <div className="inspector-divider"/>
    <div className="section-caption">THE STORY</div>
    <p className="muted-note">Pull a reported headline, summary and photo from ESPN, or write your own and credit the photo.</p>
    <Button variant="secondary" className="news-pick" onClick={() => setPicking(true)}><Icon name="spark" size={16}/>Pick an ESPN story</Button>
    <InputField label="Photo & story credit" value={scene.credit} maxLength={200} placeholder="PHOTO: AGENCY · STORY: SOURCE" onChange={e => onChange({ credit: e.target.value })}/>
    <label className="field"><span>Photo</span><select value={scene.assetId} onChange={e => onChange({ assetId: e.target.value })}>
      <option value="">No photo — sport board</option>
      {photos.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>{photo?.approval === "reference" && <small>Reference media: confirm you may use this photo before you publish.</small>}</label>
    {scene.assetId && <>
      <label className="field"><span>Horizontal focal point · {scene.cropX}%</span><input type="range" min={0} max={100} value={scene.cropX} onChange={e => onChange({ cropX: +e.target.value })}/></label>
      <label className="field"><span>Vertical focal point · {scene.cropY}%</span><input type="range" min={0} max={100} value={scene.cropY} onChange={e => onChange({ cropY: +e.target.value })}/></label>
    </>}
    {picking && <NewsPicker sport={sport} notify={notify} onClose={() => setPicking(false)} onPick={change => { setPicking(false); onPicked(change); onAssetsChanged(); }}/>}
  </>;
}
