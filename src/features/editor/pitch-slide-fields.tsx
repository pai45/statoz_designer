import type { PresentationSlide, Scene } from "@/domain/project";

const layouts: { value: PresentationSlide["layout"]; label: string }[] = [
  { value: "problem-map", label: "Problem / staggered map" },
  { value: "cover", label: "Cover" }, { value: "cover-frame", label: "Cover / frame" }, { value: "statement", label: "Statement" }, { value: "device", label: "Product / device" },
  { value: "loop", label: "Connected loop" }, { value: "comparison", label: "Comparison" }, { value: "convergence", label: "Category convergence" },
  { value: "solution-stack", label: "Solution / journey stack" }, { value: "market", label: "Market scale" }, { value: "funds", label: "Use of funds" }, { value: "invite", label: "Invitation / contact" }, { value: "showcase", label: "Product showcase" }, { value: "team", label: "Founding team" },
  { value: "timeline", label: "Timeline" }, { value: "seasonality", label: "Season calendar" }, { value: "traction", label: "Traction" }, { value: "closing", label: "Closing" },
];
const visuals: { value: PresentationSlide["visual"]; label: string }[] = [
  { value: "none", label: "None" }, { value: "app-screen", label: "Actual app screen" }, { value: "sports-hub", label: "Sports Hub" }, { value: "trending-games", label: "Trending Games" }, { value: "predict-pick", label: "Predict / Pick" },
  { value: "pitch-duel", label: "Pitch Duel" }, { value: "deck-locker", label: "Deck Locker" }, { value: "leaderboard", label: "Leaderboard" },
  { value: "game-library", label: "Game Library" }, { value: "storefront", label: "Storefront" },
];

export function PitchSlideFields({ scene, onChange }: { scene: Scene; onChange: (change: Partial<Scene>) => void }) {
  const slide = scene.presentation;
  if (!slide) return null;
  const update = (change: Partial<PresentationSlide>) => onChange({ presentation: { ...slide, ...change } });
  return <>
    <div className="inspector-divider"/><div className="section-caption">PRESENTATION STRUCTURE</div>
    <label className="field"><span>Slide layout</span><select value={slide.layout} onChange={event => update({ layout: event.target.value as PresentationSlide["layout"] })}>{layouts.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
    <label className="field"><span>Product visual</span><select value={slide.visual} onChange={event => update({ visual: event.target.value as PresentationSlide["visual"] })}>{visuals.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
    <label className="field"><span>Evidence state</span><select value={slide.evidenceStatus} onChange={event => update({ evidenceStatus: event.target.value as PresentationSlide["evidenceStatus"] })}><option value="repo-backed">Repo-backed</option><option value="source-backed">Source-backed</option><option value="illustrative">Illustrative</option><option value="proposed">Proposed</option><option value="hypothesis">Hypothesis</option><option value="input-needed">Input needed</option></select></label>
    <label className="field"><span>Bullets · one per line, up to six</span><textarea rows={6} value={slide.bullets.join("\n")} onChange={event => update({ bullets: event.target.value.split("\n").slice(0, 6) })}/><small>Use “Label / detail” for a supporting line.</small></label>
    <label className="field"><span>Metrics · value | label | detail</span><textarea rows={6} value={slide.metrics.map(metric => `${metric.value} | ${metric.label} | ${metric.detail}`).join("\n")} onChange={event => update({ metrics: event.target.value.split("\n").filter(Boolean).slice(0, 6).map(line => { const [value = "", label = "", detail = ""] = line.split("|").map(part => part.trim()); return { value, label, detail }; }) })}/></label>
    <label className="field"><span>Source / provenance note</span><textarea rows={3} value={slide.sourceNote} onChange={event => update({ sourceNote: event.target.value })}/></label>
  </>;
}
