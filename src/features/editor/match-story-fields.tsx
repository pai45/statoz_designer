import type { Asset, Scene, Sport } from "@/domain/project";
import { beatOf, graphOf, teamColors, winnerSide } from "@/domain/match-story";
import { Button, InputField } from "@/design-system/components/ui";

const beats: { value: Scene["beat"]; label: string }[] = [
  { value: "score", label: "1 · Score" }, { value: "stats", label: "2 · Key stats" }, { value: "graph", label: "3 · Match graph" }, { value: "pick", label: "4 · Pick your side" },
];
const graphs: { value: Scene["graph"]; label: string }[] = [
  { value: "auto", label: "Sport default" }, { value: "momentum", label: "Momentum (two-sided)" }, { value: "race", label: "Race (cumulative)" },
  { value: "lead", label: "Scoring run (stepped)" }, { value: "position", label: "Position track (P1 on top)" },
];
const seriesHint: Record<Exclude<Scene["graph"], "auto">, string> = {
  momentum: "Shots and corners per five minutes. Fill from a match counts them from ESPN's play-by-play.",
  race: "Running total per over or game. Fill from a limited-overs match draws ESPN's over-by-over worm.",
  lead: "Each side's score at each checkpoint. Fill from a match reads ESPN's play-by-play, four points a quarter.",
  position: "Running position per lap checkpoint (1 = leader).",
};

/**
 * Match-story inputs. The fixture (sides, score, stats, series, crowd share) is one match
 * told across the beats, so those edits apply to every scene; only the beat is per scene.
 */
export function MatchStoryFields({ scene, index, total, sport, assets, onChange, onChangeAll, notify }: {
  scene: Scene; index: number; total: number; sport: Sport; assets: Asset[];
  onChange: (change: Partial<Scene>) => void; onChangeAll: (change: Partial<Scene>) => void; notify: (message: string) => void;
}) {
  const beat = beatOf(scene, index, total), graph = graphOf(scene, sport), race = sport === "motorsport";
  const [fallbackA, fallbackB] = teamColors({ ...scene, colorA: "", colorB: "" }, sport);
  const images = assets.filter(asset => asset.mime.startsWith("image/"));
  const series = (key: "seriesA" | "seriesB") => <InputField key={`${key}-${scene[key].join(",")}`} label={`${key === "seriesA" ? scene.nameA || "Side A" : scene.nameB || "Side B"} series`} defaultValue={scene[key].join(", ")} placeholder="e.g. 20, 35, 50, 30"
    onBlur={event => {
      const text = event.target.value.trim(), values = text ? text.split(",").map(part => Number(part.trim())) : [];
      if (values.length <= 60 && values.every(n => Number.isFinite(n) && n >= 0 && n <= 999)) onChangeAll({ [key]: values });
      else { notify("Enter up to 60 comma-separated numbers from 0 to 999."); event.target.value = scene[key].join(", "); }
    }}/>;
  return <>
    <div className="inspector-divider"/><div className="section-caption">MATCH STORY BEAT</div>
    <label className="field"><span>This scene plays</span><select value={scene.beat} onChange={event => onChange({ beat: event.target.value as Scene["beat"] })}><option value="">Scene order ({beats.find(b => b.value === beat)?.label})</option>{beats.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>

    <div className="inspector-divider"/><div className="section-caption">THE MATCH · SHARED BY EVERY SCENE</div>
    <div className="field-row"><InputField label="Side A" value={scene.nameA} onChange={event => onChangeAll({ nameA: event.target.value })}/><InputField label="Side B" value={scene.nameB} onChange={event => onChangeAll({ nameB: event.target.value })}/></div>
    <div className="field-row"><InputField label={race ? "Result A" : "Score A"} value={scene.scoreA} onChange={event => onChangeAll({ scoreA: event.target.value })}/><InputField label={race ? "Result B" : "Score B"} value={scene.scoreB} onChange={event => onChangeAll({ scoreB: event.target.value })}/></div>
    <label className="field"><span>Winner</span><select value={scene.winner} onChange={event => onChangeAll({ winner: event.target.value as Scene["winner"] })}>
      <option value="">{sport === "cricket" ? "Not set" : "From the score"} · {winnerSide({ ...scene, winner: "" }, sport) === "A" ? scene.nameA || "Side A" : winnerSide({ ...scene, winner: "" }, sport) === "B" ? scene.nameB || "Side B" : "none"}</option>
      <option value="A">{scene.nameA || "Side A"}</option><option value="B">{scene.nameB || "Side B"}</option><option value="none">No winner (draw, tie or no result)</option>
    </select><small>The score beat lights the winner&apos;s plate.{sport === "cricket" ? " A cricket scoreline cannot say who won, so choose here." : ""}</small></label>
    <div className="field-row">{(["A", "B"] as const).map(side => { const key = side === "A" ? "colorA" : "colorB"; return <label className="field" key={side}><span>Colour {side}{scene[key] ? "" : " · sport default"}</span><input type="color" value={scene[key] || (side === "A" ? fallbackA : fallbackB)} onChange={event => onChangeAll({ [key]: event.target.value })}/>{scene[key] && <Button type="button" variant="ghost" onClick={() => onChangeAll({ [key]: "" })}>Use sport default</Button>}</label>; })}</div>
    <div className="field-row">{(["A", "B"] as const).map(side => { const key = side === "A" ? "emblemA" : "emblemB"; return <label className="field" key={side}><span>Crest {side}</span><select value={scene[key]} onChange={event => onChangeAll({ [key]: event.target.value })}><option value="">Team badge</option>{images.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>; })}</div>
    <label className="field"><span>{race ? "Classification · driver | qualified | finished, up to six" : "Key stats · label | A | B, up to six"}</span><textarea rows={6} value={scene.matchStats.map(row => `${row.label} | ${row.a} | ${row.b}`).join("\n")} onChange={event => onChangeAll({ matchStats: event.target.value.split("\n").filter(line => line.trim()).slice(0, 6).map(line => { const [label = "", a = "", b = ""] = line.split("|").map(part => part.trim()); return { label: label.slice(0, 40), a: a.slice(0, 20), b: b.slice(0, 20) }; }) })}/><small>{race ? "Reported positions only, e.g. “Driver A | P4 | P1”. The top three make the podium." : "Reported figures only. Values count up and the split bar shows each side’s share."}</small></label>

    <label className="field"><span>Graph</span><select value={scene.graph} onChange={event => onChangeAll({ graph: event.target.value as Scene["graph"] })}>{graphs.map(option => <option key={option.value} value={option.value}>{option.value === "auto" ? `${option.label} · ${graphs.find(g => g.value === graph)?.label}` : option.label}</option>)}</select><small>{seriesHint[graph]} Enter what happened; the graph never projects.</small></label>
    {series("seriesA")}{series("seriesB")}
    <label className="field"><span>Markers · side | point | label</span><textarea rows={3} value={scene.markers.map(m => `${m.side} | ${m.at + 1} | ${m.label}`).join("\n")} onChange={event => onChangeAll({ markers: event.target.value.split("\n").flatMap(line => { const [side = "", at = "", label = ""] = line.split("|").map(part => part.trim()); const point = Math.round(Number(at)); return /^[AB]$/i.test(side) && point >= 1 && point <= 60 ? [{ side: side.toUpperCase() as "A" | "B", at: point - 1, label: label.slice(0, 12) }] : []; }).slice(0, 20) })}/><small>Goals, wickets or lead changes, e.g. “A | 6 | 27&apos;”. Point 1 is the first series value.</small></label>

    <div className="field-row"><InputField label={`Crowd pick % for ${scene.nameA || "side A"}`} type="number" min={0} max={100} value={scene.pickShare ?? ""} onChange={event => onChangeAll({ pickShare: event.target.value === "" ? null : Math.min(100, Math.max(0, +event.target.value)) })}/><InputField label="Votes label" value={scene.pickVotes} maxLength={20} placeholder="1,204 VOTES" onChange={event => onChangeAll({ pickVotes: event.target.value })}/></div>
    <p className="muted-note">Crowd bars appear only when a share is set. Enter a real poll result; sample projects label it as an example.</p>
  </>;
}
