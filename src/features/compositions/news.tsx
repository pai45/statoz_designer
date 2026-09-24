import type { CSSProperties } from "react";
import { sports, type Format, type Scene, type Sport } from "@/domain/project";
import type { Media } from "./composition";
import { SportDiagram } from "./sport-diagrams";

/**
 * News flash: one reported headline over its photo. Wire photos are usually 16:9, so the
 * photo sits across the top of the canvas and dissolves into a blurred, darkened copy of
 * itself instead of being stretched to fill a reel. `layout` picks the treatment:
 * editorial and centered bleed the photo, split frames it in a chamfered plate.
 */

// Orbitron 800 advance widths in 1/1000 em, measured in Chromium from the embedded font.
const glyphs: Record<string, number> = { A: 836, B: 832, C: 822, D: 834, E: 766, F: 723, G: 830, H: 851, I: 214, J: 780, K: 797, L: 779, M: 928, N: 832, O: 828, P: 791, Q: 884, R: 825, S: 827, T: 759, U: 828, V: 1003, W: 1179, X: 812, Y: 806, Z: 821, 0: 834, 1: 391, 2: 830, 3: 826, 4: 730, 5: 830, 6: 820, 7: 660, 8: 834, 9: 828, " ": 315, ".": 230, ",": 236, "'": 247, "’": 227, "‘": 229, '"': 392, "“": 451, "”": 451, "-": 517, "–": 708, "—": 822, ":": 242, ";": 255, "!": 220, "?": 678, "&": 938, "%": 966, "/": 521, "(": 291, ")": 294, "@": 818, "#": 797, "+": 452, $: 788, "£": 734, "€": 799, "₹": 500 };
/** Matches the headline's `letter-spacing: -.035em`. */
const tracking = 35;
const lineHeight = 1.04;
const emWidth = (word: string) => [...word.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()].reduce((sum, ch) => sum + (glyphs[ch] ?? 830) - tracking, 0) / 1000;

export type HeadlineBox = { width: number; height: number; max: number; min: number };
type NewsFormat = "square" | "portrait" | "reel" | "landscape";
type Budget = HeadlineBox & { dek: number; cta: number };
/** Headline column and height budget per ratio, full-bleed and framed. `dek` is returned to the headline when the body is empty. */
const budgets: Record<NewsFormat, { full: Budget; framed: Budget }> = {
  reel: { full: { width: 842, height: 560, max: 112, min: 46, dek: 150, cta: 72 }, framed: { width: 842, height: 290, max: 92, min: 40, dek: 110, cta: 72 } },
  portrait: { full: { width: 908, height: 400, max: 104, min: 42, dek: 100, cta: 64 }, framed: { width: 908, height: 280, max: 88, min: 38, dek: 70, cta: 64 } },
  square: { full: { width: 908, height: 300, max: 88, min: 36, dek: 60, cta: 56 }, framed: { width: 908, height: 200, max: 68, min: 32, dek: 60, cta: 56 } },
  landscape: { full: { width: 800, height: 480, max: 100, min: 42, dek: 110, cta: 64 }, framed: { width: 760, height: 480, max: 92, min: 40, dek: 110, cta: 64 } },
};

/** `*word*` marks the one highlighted phrase; everything else is plain. */
export function headlineRuns(text: string) {
  return text.split(/(\*[^*\n]+\*)/g).filter(Boolean).map(part => part.length > 2 && part.startsWith("*") && part.endsWith("*") ? { text: part.slice(1, -1), lit: true } : { text: part, lit: false });
}

/**
 * The largest size at which the uppercase headline wraps inside the box, found by
 * greedy word wrap over measured glyph widths. Pure, so preview and export agree.
 */
export function fitHeadline(text: string, box: HeadlineBox): number {
  const lines = text.replace(/\*/g, "").split("\n");
  const space = (glyphs[" "] - tracking) / 1000;
  for (let size = box.max; size > box.min; size -= 2) {
    // A small allowance covers kerning the table ignores.
    const width = box.width * .97 / size;
    let count = 0, fits = true;
    for (const line of lines) {
      const words = line.trim().split(/\s+/).filter(Boolean);
      count++;
      let current = 0;
      for (const word of words) {
        const w = emWidth(word);
        if (w > width) { fits = false; break; }
        if (!current) current = w;
        else if (current + space + w <= width) current += space + w;
        else { count++; current = w; }
      }
      if (!fits) break;
    }
    if (fits && count * size * lineHeight + size * .12 <= box.height) return size;
  }
  return box.min;
}

const newsFormat = (format: Format): NewsFormat => format === "square" || format === "reel" || format === "landscape" ? format : "portrait";

export function headlineBudget(scene: Scene, format: Format): HeadlineBox {
  const budget = budgets[newsFormat(format)][scene.layout === "split" ? "framed" : "full"];
  return { ...budget, height: budget.height + (scene.body.trim() ? 0 : budget.dek) - (scene.showCta && scene.cta.trim() ? budget.cta : 0) };
}

function Photo({ src, scene }: { src?: Media; scene: Scene }) {
  return src ? <img src={src.src} alt="" style={{ objectFit: scene.crop, objectPosition: `${scene.cropX}% ${scene.cropY}%` }}/> : null;
}

export function NewsFlash({ scene, format, sport, media, logo, sample }: { scene: Scene; format: Format; sport: Sport; media: Record<string, Media>; logo: string; sample: boolean }) {
  const found = media[scene.assetId];
  // Video clips belong to feature and launch visuals; a news flash is a still.
  const src = found?.mime.startsWith("image/") ? found : undefined;
  const framed = scene.layout === "split";
  const box = headlineBudget(scene, format);
  const size = fitHeadline(scene.headline, box);
  const credit = scene.credit.trim();
  const style = { "--news-size": `${size}px`, "--news-height": `${box.height}px` } as CSSProperties;
  return <>
    <div className="news-ambient" aria-hidden="true">{src && <img src={src.src} alt=""/>}</div>
    {!framed && <div className="news-photo">{src ? <Photo src={src} scene={scene}/> : <SportDiagram sport={sport}/>}</div>}
    <div className="news-scrim" aria-hidden="true"/>
    <div className="composition-grid news-grid"/>
    <div className="canvas-corner top"/><div className="canvas-corner bottom"/>
    <header className="composition-brand" data-safe>{scene.showLogo ? <div className="brand-lockup"><img src={logo} alt="StatOz"/><span>StatOz<span className="brand-dot">.</span></span></div> : <span/>}<span className="brand-edition">{sports[sport].label.toUpperCase()}<i/>{sports[sport].symbol}</span></header>
    {framed && <figure className="news-frame" data-safe>
      <div className="news-frame-photo">{src ? <Photo src={src} scene={scene}/> : <SportDiagram sport={sport}/>}</div>
      {credit && <figcaption>{credit}</figcaption>}
    </figure>}
    <section className="news-copy" style={style} data-safe>
      {scene.eyebrow.trim() && <div className="news-tag"><span><i/>{scene.eyebrow}</span></div>}
      <h1 data-overflow>{headlineRuns(scene.headline).map((run, i) => run.lit ? <em key={i}>{run.text}</em> : <span key={i}>{run.text}</span>)}</h1>
      <div className="news-rule" aria-hidden="true"><i/><span/></div>
      {scene.body.trim() && <p>{scene.body}</p>}
      {scene.showCta && scene.cta.trim() && <div className="composition-cta"><span>{scene.cta}</span><b>↗</b></div>}
      {(!framed && credit || sample) && <div className="news-credit">{!framed && credit ? <span>{credit}</span> : <span/>}{sample ? <b>SAMPLE CONTENT</b> : <b>STZ</b>}</div>}
    </section>
  </>;
}
