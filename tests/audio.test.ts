import assert from "node:assert/strict";
import test from "node:test";
import { synthesizeSfx, resolveFFmpeg } from "../vendor/statoz-video/core.mjs";
import { synthesizeSfx as upstreamSfx } from "../vendor/statoz-video/render-video.mjs";

test("extracted sound synthesis preserves upstream output exactly", () => {
  const events = [{ type: "impact", time: 0, duration: .45, gain: .16 }, { type: "whoosh", time: 2, duration: .4, gain: .16 }];
  assert.deepEqual(synthesizeSfx(events, 8), upstreamSfx(events, 8));
  assert.equal(synthesizeSfx(events, 8).toString("ascii", 0, 4), "RIFF");
});
test("missing explicit FFmpeg runtime fails with an actionable error", () => {
  assert.throws(() => resolveFFmpeg({ ...process.env, FFMPEG_PATH: "Z:/missing-statoz-ffmpeg.exe" }), /Invalid FFMPEG_PATH/);
});
