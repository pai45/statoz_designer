import { iconMasterIssues } from "@/domain/app-creatives";
import type { Asset, Scene } from "@/domain/project";

export function AppCreativeFields({ visual, scene, assets, onChange }: { visual: "app-showcase" | "play-feature" | "store-icon"; scene: Scene; assets: Asset[]; onChange: (change: Partial<Scene>) => void }) {
  const images = assets.filter(asset => asset.mime.startsWith("image/") && asset.category !== "line-art");
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
    <label className="field"><span>{visual === "app-showcase" ? "Phone capture" : "Optional product visual"}</span><select value={scene.assetId} onChange={event => onChange({ assetId: event.target.value })}><option value="">Choose an image</option>{images.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
    {visual === "app-showcase" && <label className="field"><span>Tablet capture</span><select value={scene.tabletAssetId} onChange={event => onChange({ tabletAssetId: event.target.value })}><option value="">Choose a tablet image</option>{images.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select><small>Used only for the iPad and Google Play tablet outputs.</small></label>}
    {(scene.assetId || scene.tabletAssetId) && <><label className="field"><span>Capture fit</span><select value={scene.crop} onChange={event => onChange({ crop: event.target.value as Scene["crop"] })}><option value="contain">Fit entire capture</option><option value="cover">Fill and crop</option></select></label><label className="field"><span>Horizontal focal point · {scene.cropX}%</span><input type="range" min={0} max={100} value={scene.cropX} onChange={event => onChange({ cropX: +event.target.value })}/></label><label className="field"><span>Vertical focal point · {scene.cropY}%</span><input type="range" min={0} max={100} value={scene.cropY} onChange={event => onChange({ cropY: +event.target.value })}/></label></>}
  </>;
}
