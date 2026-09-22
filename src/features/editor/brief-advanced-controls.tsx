"use client";
import type { Asset, Project, Scene } from "@/domain/project";
import { sports } from "@/domain/project";
import { Button, Icon, InputField } from "@/design-system/components/ui";

type Props = {
  project: Project;
  scene: Scene;
  assets: Asset[];
  isPitch: boolean;
  isVideo: boolean;
  total: number;
  onProjectChange: (change: (project: Project) => Project) => void;
  onSceneChange: (change: Partial<Scene>) => void;
  onCopyBrief: () => void;
};

export function BriefAdvancedControls({ project, scene, assets, isPitch, isVideo, total, onProjectChange, onSceneChange, onCopyBrief }: Props) {
  const approvedAudio = assets.filter(asset => asset.mime.startsWith("audio/") && asset.approval === "approved");
  return <details className="brief-advanced">
    <summary>Advanced manual controls</summary>
    <div className="brief-advanced-body">
      {isPitch ? <><div className="section-caption">PITCH DECK SYSTEM</div><p className="muted-note">Pitch decks are locked to the StatOz investor presentation system and 16:9 landscape output. Edit slide structure and evidence under Content.</p><label className="toggle-row"><span>Label as sample content</span><input type="checkbox" checked={project.sample} onChange={event => onProjectChange(value => ({ ...value, sample: event.target.checked }))}/></label></> : <><div className="section-caption">DESIGN LANGUAGE</div><label className="field"><span>Sport identity</span><select value={project.sport} onChange={event => onProjectChange(value => ({ ...value, sport: event.target.value as Project["sport"] }))}>{Object.entries(sports).map(([id, sport]) => <option value={id} key={id}>{sport.label}</option>)}</select></label><label className="field"><span>Layout for selected scene</span><select value={scene.layout} onChange={event => onSceneChange({ layout: event.target.value as Scene["layout"] })}><option value="editorial">Editorial</option><option value="centered">Centered</option><option value="split">Split composition</option></select></label><label className="toggle-row"><span>Show StatOz logo</span><input type="checkbox" checked={scene.showLogo} onChange={event => onSceneChange({ showLogo: event.target.checked })}/></label><label className="toggle-row"><span>Show call to action</span><input type="checkbox" checked={scene.showCta} onChange={event => onSceneChange({ showCta: event.target.checked })}/></label><label className="toggle-row"><span>Label as sample content</span><input type="checkbox" checked={project.sample} onChange={event => onProjectChange(value => ({ ...value, sample: event.target.checked }))}/></label>{isVideo && <><div className="inspector-divider"/><div className="section-caption">MOTION & TIMING</div><InputField label="Scene duration (seconds)" type="number" min={.5} max={60} step={.1} value={Math.round(scene.duration * 1000) / 1000} onChange={event => onSceneChange({ duration: Math.round(+event.target.value * 30) / 30 })}/><p className="muted-note">Total {total.toFixed(1)} seconds. Videos must be 8–60 seconds.</p><label className="field"><span>Entrance motion</span><select value={scene.motion} onChange={event => onSceneChange({ motion: event.target.value as Scene["motion"] })}><option value="rise">Rise</option><option value="slide">Slide</option><option value="zoom">Zoom</option><option value="none">None</option></select></label><label className="field"><span>Transition to next scene</span><select value={scene.transition} onChange={event => onSceneChange({ transition: event.target.value as Scene["transition"] })}><option value="fade">Fade</option><option value="cut">Cut</option></select></label></>}</>}
      {isVideo && <><div className="inspector-divider"/><div className="section-caption">SOUNDTRACK</div><label className="toggle-row"><span>Silent export</span><input type="checkbox" checked={project.audio.silent} onChange={event => onProjectChange(value => ({ ...value, audio: { ...value.audio, silent: event.target.checked } }))}/></label><label className="toggle-row"><span>Original transition SFX</span><input type="checkbox" disabled={project.audio.silent} checked={project.audio.sfx} onChange={event => onProjectChange(value => ({ ...value, audio: { ...value.audio, sfx: event.target.checked } }))}/></label><label className="field"><span>Music or voiceover</span><select disabled={project.audio.silent} value={project.audio.assetId} onChange={event => onProjectChange(value => ({ ...value, audio: { ...value.audio, assetId: event.target.value } }))}><option value="">No audio track</option>{approvedAudio.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select><small>Only media explicitly approved for campaigns is available to the assistant and manual controls.</small></label><label className="field"><span>Track volume · {Math.round(project.audio.gain * 100)}%</span><input type="range" min={0} max={1} step={.01} value={project.audio.gain} onChange={event => onProjectChange(value => ({ ...value, audio: { ...value.audio, gain: +event.target.value } }))}/></label><p className="muted-note">Audio begins at zero and is padded or trimmed to the video. Approved tracks and original transition SFX play in preview and export.</p></>}
      <div className="inspector-divider"/><Button variant="secondary" onClick={onCopyBrief}><Icon name="copy" size={15}/>Copy creative brief</Button>
    </div>
  </details>;
}
