// Run from a StatOz checkout for live-brand coverage; all generated artifacts use a unique OS temp directory.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {loadSpec, resolveDimensions, resolveFFmpeg, synthesizeSfx, render} from './render-video.mjs';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'statoz-video-test-'));
const specPath = path.join(temp, 'spec.json');
const scene = path.join(skill, 'assets/scene-template.html');
const base = {scene, output: path.join(temp, 'smoke.mp4'), width: 384, height: 682, duration: 8, fps: 3,
  assets: {hero: path.join(skill, 'assets/logo.png')},
  sfx: ['whoosh', 'impact', 'tick', 'rise', 'shimmer'].map((type, i) => ({type, time: i * 1.4}))};
async function spec(value, cwd = process.cwd()) {
  await fs.writeFile(specPath, JSON.stringify(value));
  return loadSpec(specPath, cwd);
}
let assertions = 0;
for (const [platform, expected] of [
  ['instagram-reel', [1080, 1920]], ['youtube-shorts', [1080, 1920]],
  ['LinkedIn portrait', [1080, 1350]], ['youtube', [1920, 1080]], ['square', [1080, 1080]],
]) { assert.deepEqual(resolveDimensions({platform}), expected); assertions++; }
assert.deepEqual(resolveDimensions({platform: 'reel', width: 800, height: 600}), [800, 600]); assertions++;
for (const [changes, expected] of [
  [{duration: undefined}, /duration is required/], [{duration: 7}, /duration/],
  [{duration: 61}, /duration/], [{width: 383}, /even-pixel/], [{height: 0}, /even-pixel/],
  [{width: undefined}, /even-pixel/], [{fps: 0}, /fps/], [{duration: 8.1}, /whole frame/],
  [{assets: {hero: path.join(temp, 'missing.png')}}, /asset hero file is missing/],
  [{sfx: [{type: 'music', time: 0}]}, /Unknown SFX/],
  [{sfx: [{type: 'rise', time: 7.9}]}, /fit inside/],
  [{brandRoot: temp}, /brand tokens file is missing/],
]) { await assert.rejects(() => spec({...base, ...changes}), expected); assertions++; }
const malformed = path.join(temp, 'malformed.html');
await fs.writeFile(malformed, '<html>Missing injection</html>');
await assert.rejects(() => spec({...base, scene: malformed}), /exactly one/); assertions++;
assert.throws(() => resolveFFmpeg({FFMPEG_PATH: path.join(temp, 'missing-ffmpeg.exe')}), /Invalid FFMPEG_PATH/); assertions++;
const audio = synthesizeSfx(base.sfx.map(e => ({...e, duration: 0.5, gain: 1})), 8);
assert.deepEqual(audio, synthesizeSfx(base.sfx.map(e => ({...e, duration: 0.5, gain: 1})), 8)); assertions++;
assert.equal(audio.readUInt32LE(24), 48000); assertions++;
let peak = 0;
for (let i = 44; i < audio.length; i += 2) peak = Math.max(peak, Math.abs(audio.readInt16LE(i)));
assert(peak > 0 && peak <= Math.ceil(0.85 * 32767)); assertions++;
const fallback = await spec(base, temp);
assert.equal(fallback.brand.source, 'packaged'); assertions++;
assert(fallback.brand.fonts.onest.startsWith('data:font/woff2;base64,')); assertions++;
assert(fallback.assets.hero.startsWith('data:image/png;base64,')); assertions++;
const normal = await spec(base);
if (normal.brand.source !== 'packaged') {
  const css = await fs.readFile(path.join(normal.brand.source, 'src/design-system/styles/tokens.css'), 'utf8');
  assert(css.includes(normal.brand.colors['--ds-color-accent-cyan'])); assertions++;
}
const incomplete = path.join(temp, 'incomplete.html');
await fs.writeFile(incomplete, '<script>const scene=/*__STATOZ_SCENE_DATA__*/;</script>');
await assert.rejects(() => spec({...base, scene: incomplete}).then(value => render(value)), /drawFrame/); assertions++;
const failing = path.join(temp, 'failing.html');
await fs.writeFile(failing, '<script>const scene=/*__STATOZ_SCENE_DATA__*/;window.drawFrame=()=>{throw new Error("intentional scene failure")};</script>');
await assert.rejects(() => spec({...base, scene: failing}).then(value => render(value)), /intentional scene failure/); assertions++;
assert(!await fs.stat(base.output).catch(() => null)); assertions++;
const preview = await render(normal, {previewDir: path.join(temp, 'preview-portrait')});
const result = await render(normal);
assert(result.bytes > 0 && result.audio && result.frames === 24); assertions++;
await assert.rejects(() => spec(base), /Output already exists/); assertions++;
const ffmpeg = resolveFFmpeg();
function verify(output, width, height, fps, frames, withAudio) {
  const decoded = spawnSync(ffmpeg, ['-hide_banner', '-i', output, '-progress', 'pipe:1', '-nostats', '-f', 'null', '-'],
    {encoding: 'utf8', windowsHide: true, timeout: 60000});
  assert.equal(decoded.status, 0, decoded.stderr);
  assert.match(decoded.stderr, /Video: h264/);
  assert.match(decoded.stderr, /yuv420p/);
  assert(decoded.stderr.includes(`${width}x${height}`));
  assert(decoded.stderr.includes(`${fps} fps`));
  assert(decoded.stderr.includes('Duration: 00:00:08.00'));
  assert.equal(/Audio: aac/.test(decoded.stderr), withAudio);
  if (withAudio) assert.match(decoded.stderr, /48000 Hz/);
  const counts = [...decoded.stdout.matchAll(/^frame=(\d+)/gm)].map(m => Number(m[1]));
  assert.equal(counts.at(-1), frames);
  assert.match(decoded.stdout, /progress=end/);
  assert(!/Error|corrupt|Invalid/i.test(decoded.stderr));
  return decoded.stderr;
}
const metadata = verify(result.output, 384, 682, 3, 24, true); assertions++;
await fs.writeFile(path.join(temp, 'metadata.txt'), metadata);
const silent = await spec({...base, output: path.join(temp, 'silent.mp4'), width: 320, height: 180, fps: 30, silent: true}, temp);
assert.equal(silent.sfx.length, 0); assertions++;
const silentResult = await render(silent);
verify(silentResult.output, 320, 180, 30, 240, false); assertions++;
const music = path.join(temp, 'approved-audio.wav');
await fs.writeFile(music, audio);
const mixed = await spec({...base, output: path.join(temp, 'mixed.mp4'), width: 180, height: 180, fps: 1, audio: {path: music, gain: 0.2}}, temp);
const mixedResult = await render(mixed);
verify(mixedResult.output, 180, 180, 1, 8, true); assertions++;
for (const [name, width, height] of [['square', 540, 540], ['landscape', 960, 540], ['feed', 432, 540]]) {
  const composition = await spec({...base, output: path.join(temp, `${name}.mp4`), width, height}, temp);
  await render(composition, {previewDir: path.join(temp, `preview-${name}`)});
}
assert(!(await fs.readdir(temp)).some(name => name.startsWith('.statoz-render-'))); assertions++;
// Keep QA artifacts only when explicitly requested; normal test runs remove their own temp directory.
console.log(JSON.stringify({passed: assertions, output: result.output, previews: preview.previews, artifacts: temp}, null, 2));
if (!process.argv.includes('--keep-artifacts')) await fs.rm(temp, {recursive: true, force: true});
