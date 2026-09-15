import { durationOf, type Project } from "@/domain/project";
import { synthesizeSfx } from "../../vendor/statoz-video/core.mjs";
export function soundtrackSfx(project: Project): Buffer {
  let cursor = 0;
  const events = project.pages.map((p, i) => {
    const time = cursor; cursor += p.duration;
    return { type: i === 0 ? "impact" : i === project.pages.length - 1 ? "shimmer" : "whoosh", time, duration: Math.min(.45, p.duration), gain: .16 };
  });
  return synthesizeSfx(events, durationOf(project));
}
