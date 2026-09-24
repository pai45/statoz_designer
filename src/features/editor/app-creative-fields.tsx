import { fitsPhoneCapture, iconMasterIssues } from "@/domain/app-creatives";
import { appGameplayFor, appScreenFor, appScreenGroups, appScreenPrefill } from "@/domain/app-screens";
import type { Asset, Scene } from "@/domain/project";

const stillImages = (assets: Asset[]) => assets.filter(asset => asset.mime.startsWith("image/") && asset.category !== "line-art");

function CaptureFit({ scene, onChange }: { scene: Scene; onChange: (change: Partial<Scene>) => void }) {
  return <><label className="field"><span>Capture fit</span><select value={scene.crop} onChange={event => onChange({ crop: event.target.value as Scene["crop"] })}><option value="contain">Fit entire capture</option><option value="cover">Fill and crop</option></select></label><label className="field"><span>Horizontal focal point · {scene.cropX}%</span><input type="range" min={0} max={100} value={scene.cropX} onChange={event => onChange({ cropX: +event.target.value })}/></label><label className="field"><span>Vertical focal point · {scene.cropY}%</span><input type="range" min={0} max={100} value={scene.cropY} onChange={event => onChange({ cropY: +event.target.value })}/></label></>;
}

/**
 * App showcase captures, shown first in the inspector. The phone picker lists only
 * phone-shaped stills, grouped by app section; choosing a curated screen fills the
 * page copy that still holds a prompt or the previous screen's default.
 */
export function AppCaptureFields({ scene, assets, onChange }: { scene: Scene; assets: Asset[]; onChange: (change: Partial<Scene>) => void }) {
  const images = stillImages(assets);
  const phones = images.filter(fitsPhoneCapture);
  const current = assets.find(asset => asset.id === scene.assetId);
  const misfit = current && !fitsPhoneCapture(current) ? current : undefined;
  const others = phones.filter(asset => !appScreenFor(asset.id));
  const chooseScreen = (assetId: string) => onChange({ assetId, ...appScreenPrefill(scene, scene.assetId, assetId) });
  const gameplay = appGameplayFor(scene.assetId);
  const pair = gameplay && gameplay.id !== scene.assetId && phones.some(asset => asset.id === gameplay.id) ? gameplay : undefined;
  return <>
    <div className="section-caption">APP SCREEN</div>
    <label className="field"><span>Phone capture</span><select value={scene.assetId} onChange={event => chooseScreen(event.target.value)}>
      <option value="">Choose an app screen</option>
      {misfit && <option value={misfit.id}>{misfit.name} (not phone-shaped)</option>}
      {appScreenGroups.map(group => {
        const options = phones.filter(asset => appScreenFor(asset.id)?.group === group);
        return options.length > 0 && <optgroup key={group} label={group}>{options.map(asset => <option key={asset.id} value={asset.id}>{appScreenFor(asset.id)?.name ?? asset.name}</option>)}</optgroup>;
      })}
      {others.length > 0 && <optgroup label="Other phone captures">{others.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</optgroup>}
    </select><small>{phones.length ? "Only phone-shaped captures are listed. Picking an app screen fills this page's copy." : "No phone-shaped captures yet. Run npm run import:app-screens."}</small>{pair && <small>Gameplay capture available: {pair.name} (under Gameplay).</small>}</label>
    <label className="field"><span>Tablet capture</span><select value={scene.tabletAssetId} onChange={event => onChange({ tabletAssetId: event.target.value })}><option value="">Choose a tablet image</option>{images.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select><small>Used only for the iPad and Google Play tablet outputs.</small></label>
    {(scene.assetId || scene.tabletAssetId) && <CaptureFit scene={scene} onChange={onChange}/>}
    <div className="inspector-divider"/>
  </>;
}

export function AppCreativeFields({ visual, scene, assets, onChange }: { visual: "play-feature" | "store-icon"; scene: Scene; assets: Asset[]; onChange: (change: Partial<Scene>) => void }) {
  const images = stillImages(assets);
  const selected = assets.find(asset => asset.id === scene.assetId);
  if (visual === "store-icon") {
    const issues = iconMasterIssues(selected);
    return <>
      <div className="section-caption">STORE ICON MASTER</div>
      <label className="field"><span>Opaque square PNG</span><select value={scene.assetId} onChange={event => onChange({ assetId: event.target.value })}><option value="">Choose icon artwork</option>{images.filter(asset => asset.mime === "image/png").map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
      <p className={issues.length ? "muted-note danger-text" : "muted-note"}>{issues.length ? issues.join(" ") : "Ready for 512 × 512 Google Play and 1024 × 1024 Apple exports."}</p>
      <p className="muted-note">Apple applies its final mask in Xcode or Icon Composer. Keep the source square and unmasked.</p>
    </>;
  }
  return <>
    <div className="inspector-divider"/>
    <div className="section-caption">PRODUCT CAPTURE</div>
    <label className="field"><span>Optional product visual</span><select value={scene.assetId} onChange={event => onChange({ assetId: event.target.value })}><option value="">Choose an image</option>{images.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
    {scene.assetId && <CaptureFit scene={scene} onChange={onChange}/>}
  </>;
}
