import { tabletShowcaseFormats } from "@/domain/app-creatives";
import type { Format, Scene } from "@/domain/project";

type Media = Record<string, { src: string; mime: string }>;

function Brand({ logo }: { logo: string }) {
  return <div className="app-creative-brand"><img src={logo} alt=""/><span>StatOz<span>.</span></span></div>;
}

function Capture({ scene, format, media }: { scene: Scene; format: Format; media: Media }) {
  const tablet = tabletShowcaseFormats.has(format), id = tablet ? scene.tabletAssetId : scene.assetId;
  const source = media[id];
  return <div className={`app-capture ${tablet ? "is-tablet" : "is-phone"}`}>
    <div className="app-capture-glass">
      {source ? <img src={source.src} alt="" style={{ objectFit: scene.crop, objectPosition: `${scene.cropX}% ${scene.cropY}%` }}/> : <div className="app-capture-empty"><span>{tablet ? "TABLET" : "PHONE"} CAPTURE</span><small>SELECT IN THE EDITOR</small></div>}
    </div>
  </div>;
}

function Showcase({ scene, index, total, format, media, logo }: { scene: Scene; index: number; total: number; format: Format; media: Media; logo: string }) {
  const tablet = tabletShowcaseFormats.has(format);
  return <div className={`app-showcase ${tablet ? "is-tablet-layout" : "is-phone-layout"}`}>
    <div className="app-creative-grid"/>
    <header className="app-showcase-header"><Brand logo={logo}/><span>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span></header>
    <section className="app-showcase-copy" data-safe>
      <div className="app-showcase-kicker"><i/>{scene.eyebrow}</div>
      <h1 data-overflow>{scene.headline}</h1>
      {!tablet && <p data-overflow>{scene.body}</p>}
    </section>
    <section className="app-showcase-art" data-safe><Capture scene={scene} format={format} media={media}/></section>
    <footer className="app-showcase-footer"><span>{tablet ? "PRODUCT EXPERIENCE" : "STATOZ / APP SHOWCASE"}</span><i/><b>{scene.showCta && scene.cta ? scene.cta : "PREDICT. PLAY. COLLECT."}</b></footer>
  </div>;
}

function FeatureGraphic({ scene, media, logo }: { scene: Scene; media: Media; logo: string }) {
  const source = media[scene.assetId];
  const screenTriptych = scene.layout === "split" && Boolean(source);
  return <div className={`play-feature-graphic ${scene.layout === "split" ? "is-screen-triptych" : ""}`}>
    <div className="app-creative-grid"/><div className="play-feature-signal"/>
    <section className="play-feature-copy"><Brand logo={logo}/><span>{scene.eyebrow}</span><h1 data-overflow>{scene.headline}</h1><p data-overflow>{scene.body}</p></section>
    <section className="play-feature-art">{source ? <img src={source.src} alt="" style={{ objectFit: scene.crop, objectPosition: `${scene.cropX}% ${scene.cropY}%` }}/> : <div className="play-feature-placeholder"><i/><span>OPTIONAL PRODUCT VISUAL</span></div>}
      {screenTriptych && <div className="play-feature-telemetry" aria-hidden="true">
        <div className="play-feature-plate plate-match"><div><span>MATCH / FT</span><strong>2 : 3</strong></div></div>
        <div className="play-feature-plate plate-games is-primary"><div><span>GAMES / 01</span><strong>PITCH DUEL</strong></div></div>
        <div className="play-feature-plate plate-reward"><div><span>PLAY / XP</span><strong>+50 XP</strong></div></div>
        <div className="play-feature-plate plate-stat"><div><span>POSSESSION</span><strong>61.5%</strong></div></div>
      </div>}
    </section>
    <div className="play-feature-rule"/>
  </div>;
}

function StoreIcon({ scene, media, guides }: { scene: Scene; media: Media; guides: boolean }) {
  const source = media[scene.assetId];
  return <div className="store-icon-canvas">
    {source ? <img src={source.src} alt=""/> : <div className="store-icon-empty">SELECT ICON MASTER</div>}
    {guides && <div className="store-icon-guide"><span>SAFE CONTENT</span></div>}
  </div>;
}

export function AppCreative({ visual, scene, index, total, format, media, logo, guides }: { visual: "app-showcase" | "play-feature" | "store-icon"; scene: Scene; index: number; total: number; format: Format; media: Media; logo: string; guides: boolean }) {
  if (visual === "store-icon") return <StoreIcon scene={scene} media={media} guides={guides}/>;
  if (visual === "play-feature") return <FeatureGraphic scene={scene} media={media} logo={logo}/>;
  return <Showcase scene={scene} index={index} total={total} format={format} media={media} logo={logo}/>;
}
