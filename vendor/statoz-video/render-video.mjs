import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {spawn, execFileSync} from 'node:child_process';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const marker = '/*__STATOZ_SCENE_DATA__*/';
const presets = {
  reel: [1080, 1920], 'portrait-feed': [1080, 1350],
  square: [1080, 1080], landscape: [1920, 1080],
};
const aliases = {
  instagram: 'reel', 'instagram-reel': 'reel', reels: 'reel', short: 'reel',
  shorts: 'reel', 'youtube-short': 'reel', 'youtube-shorts': 'reel',
  mobile: 'reel', 'portrait-mobile': 'reel', 'instagram-feed': 'portrait-feed',
  linkedin: 'portrait-feed', 'linkedin-feed': 'portrait-feed', 'linkedin-portrait': 'portrait-feed',
  'square-social': 'square', 'instagram-square': 'square', 'linkedin-square': 'square',
  youtube: 'landscape', 'youtube-landscape': 'landscape', 'linkedin-landscape': 'landscape',
};
const sfxDurations = {whoosh: 0.45, impact: 0.6, tick: 0.08, rise: 1.2, shimmer: 0.8};
const mimeTypes = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.gif': 'image/gif', '.avif': 'image/avif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
};
const fallbackColors = {
  'background-primary': '#0d111a', 'background-secondary': '#0f172b',
  'background-elevated': '#1d293d', 'background-muted': '#070c1f',
  'text-default': '#ffffff', 'text-muted': '#90a1b9', 'text-subtle': '#cad5e2',
  'text-inverse': '#081019', 'border-default': '#314158',
  'accent-cyan': '#5cdfff', 'accent-white': '#ffffff', 'accent-violet': '#c27aff',
  'accent-orange': '#ff8904', 'accent-lime': '#51ff94', 'accent-gold': '#fdc700',
  'accent-blue': '#2b7fff', 'accent-racing': '#f42d29', 'accent-pink': '#ff94c1',
};

function ensure(condition, message) { if (!condition) throw new Error(message); }
async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }
async function file(p, label) {
  ensure(typeof p === 'string' && p.length > 0, `${label} must be a local file path.`);
  const stat = await fs.stat(p).catch(() => null);
  ensure(stat?.isFile(), `${label} file is missing: ${p}`);
  return p;
}
function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
export function resolveDimensions(spec) {
  if (spec.width !== undefined || spec.height !== undefined) {
    ensure([spec.width, spec.height].every(n => Number.isSafeInteger(n) && n > 0 && n % 2 === 0),
      'width and height must both be positive even-pixel integers.');
    return [spec.width, spec.height];
  }
  const key = String(spec.platform ?? '').trim().toLowerCase().replace(/[ _]+/g, '-');
  const dimensions = presets[aliases[key] ?? key];
  ensure(Array.isArray(dimensions), 'Provide width and height or a supported platform preset.');
  return [...dimensions];
}

export async function loadSpec(specPath, cwd = process.cwd()) {
  specPath = path.resolve(specPath);
  const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
  ensure(object(spec), 'Specification must be an object.');
  ensure(finite(spec.duration) && spec.duration >= 8 && spec.duration <= 60,
    'duration is required and must be from 8 through 60 seconds.');
  const fps = spec.fps ?? 30;
  ensure(Number.isInteger(fps) && fps >= 1 && fps <= 60, 'fps must be an integer from 1 through 60.');
  const frames = Math.round(spec.duration * fps);
  ensure(Math.abs(frames - spec.duration * fps) < 1e-7, 'duration must produce a whole frame count at this fps.');
  const [width, height] = resolveDimensions(spec);
  const base = path.dirname(specPath);
  const local = (p, label) => {
    ensure(typeof p === 'string' && p.length > 0 && !/^[a-z]+:\/\//i.test(p), `${label} must be a local file path.`);
    return path.resolve(base, p);
  };
  const scene = await file(local(spec.scene, 'scene'), 'scene');
  const html = await fs.readFile(scene, 'utf8');
  ensure(html.split(marker).length === 2, `Scene must contain exactly one ${marker} marker.`);
  const slug = String(spec.slug ?? 'statoz-video').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'statoz-video';
  ensure(spec.output === undefined || (typeof spec.output === 'string' && spec.output.length > 0), 'output must be a file path.');
  const output = path.resolve(cwd, spec.output ?? `build/statoz-video/${slug}-${width}x${height}-${spec.duration}s.mp4`);
  ensure(path.extname(output).toLowerCase() === '.mp4', 'output must end in .mp4.');
  ensure(!await exists(output), `Output already exists; choose a new filename: ${output}`);
  ensure(spec.assets === undefined || object(spec.assets), 'assets must map names to local file paths.');
  const assets = Object.create(null);
  for (const [name, value] of Object.entries(spec.assets ?? {})) assets[name] = await dataURI(await file(local(value, `asset ${name}`), `asset ${name}`));
  ensure(spec.silent === undefined || typeof spec.silent === 'boolean', 'silent must be boolean.');
  ensure(spec.sfx === undefined || Array.isArray(spec.sfx), 'sfx must be an array.');
  const sfx = (spec.sfx ?? []).map((event, index) => {
    ensure(object(event) && Object.hasOwn(sfxDurations, event.type), `Unknown SFX type at event ${index}.`);
    const duration = event.duration ?? sfxDurations[event.type], gain = event.gain ?? 0.25;
    ensure(finite(event.time) && event.time >= 0, `Invalid SFX time at event ${index}.`);
    ensure(finite(duration) && duration >= 0.01 && duration <= 8 && event.time + duration <= spec.duration + 1e-7,
      `SFX event ${index} duration must be 0.01-8 seconds and fit inside the video.`);
    ensure(finite(gain) && gain >= 0 && gain <= 1, `SFX gain must be 0-1 at event ${index}.`);
    return {type: event.type, time: event.time, duration, gain};
  });
  let audio;
  if (spec.audio !== undefined) {
    ensure(object(spec.audio), 'audio must contain path and optional gain.');
    const gain = spec.audio.gain ?? 1;
    ensure(finite(gain) && gain >= 0 && gain <= 1, 'audio gain must be 0-1.');
    audio = {path: await file(local(spec.audio.path, 'audio'), 'audio'), gain};
  }
  const brand = await loadBrand(spec.brandRoot === undefined ? undefined : local(spec.brandRoot, 'brandRoot'), cwd);
  return {scene, html, output, width, height, duration: spec.duration, fps, frames, assets, brand,
    sfx: spec.silent ? [] : sfx, audio: spec.silent ? undefined : audio};
}

async function dataURI(p) {
  const mime = mimeTypes[path.extname(p).toLowerCase()];
  ensure(mime, `Unsupported asset extension: ${p}`);
  return `data:${mime};base64,${(await fs.readFile(p)).toString('base64')}`;
}
async function loadBrand(explicit, cwd) {
  let root = explicit;
  if (!root) {
    let candidate = path.resolve(cwd);
    while (true) {
      if (await exists(path.join(candidate, 'src/design-system/styles/tokens.css')) &&
          await exists(path.join(candidate, 'public/assets/icons/app_logo.png'))) { root = candidate; break; }
      const parent = path.dirname(candidate);
      if (parent === candidate) break;
      candidate = parent;
    }
  }
  const colors = Object.fromEntries(Object.entries(fallbackColors).map(([key, value]) => [`--ds-color-${key}`, value]));
  if (root) {
    const cssPath = await file(path.join(root, 'src/design-system/styles/tokens.css'), 'brand tokens');
    const css = await fs.readFile(cssPath, 'utf8');
    for (const match of css.matchAll(/(--ds-color-[a-z0-9-]+)\s*:\s*([^;]+);/g)) colors[match[1]] = match[2].trim();
  }
  const logoPath = root ? path.join(root, 'public/assets/icons/app_logo.png') : path.join(SKILL, 'assets/logo.png');
  const fonts = {};
  for (const name of ['onest', 'orbitron']) {
    const p = root ? path.join(root, `src/app/fonts/${name}-latin-variable.woff2`) : path.join(SKILL, `assets/${name}-latin-variable.woff2`);
    fonts[name] = await dataURI(await file(p, `brand ${name} font`));
  }
  return {source: root ?? 'packaged', colors, logo: await dataURI(await file(logoPath, 'brand logo')), fonts};
}

export function resolveFFmpeg(env = process.env) {
  const check = p => {
    execFileSync(p, ['-version'], {stdio: 'pipe', windowsHide: true, timeout: 15000});
    const encoders = execFileSync(p, ['-hide_banner', '-encoders'], {encoding: 'utf8', windowsHide: true, timeout: 15000});
    ensure(/\blibx264\b/.test(encoders) && /\baac\b/.test(encoders), 'FFmpeg needs libx264 and AAC encoders.');
    return p;
  };
  if (env.FFMPEG_PATH) {
    try { return check(env.FFMPEG_PATH); } catch (error) { throw new Error(`Invalid FFMPEG_PATH: ${error.message}`); }
  }
  try { return check('ffmpeg'); } catch {}
  try {
    const executable = execFileSync(env.PYTHON_PATH || 'python', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],
      {encoding: 'utf8', windowsHide: true, timeout: 15000}).trim();
    return check(executable);
  } catch { throw new Error('FFmpeg unavailable. Set FFMPEG_PATH to FFmpeg with libx264/AAC, or use Python imageio_ffmpeg.'); }
}
async function loadPlaywright() {
  const candidates = process.env.PLAYWRIGHT_PATH ? [process.env.PLAYWRIGHT_PATH] : [
    'playwright', path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),
  ];
  for (const p of candidates) { try { return require(p); } catch {} }
  throw new Error('Playwright unavailable. Set PLAYWRIGHT_PATH to its package directory from load_workspace_dependencies.');
}

export function synthesizeSfx(events, duration) {
  const rate = 48000, samples = new Float32Array(Math.round(duration * rate));
  for (const [eventIndex, event] of events.entries()) {
    let seed = (0x6d2b79f5 ^ (eventIndex * 2654435761)) >>> 0;
    const noise = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2147483648 - 1; };
    const length = Math.round(event.duration * rate), start = Math.round(event.time * rate);
    let smooth = 0, phase = 0;
    for (let i = 0; i < length && start + i < samples.length; i++) {
      const t = i / rate, u = i / Math.max(1, length - 1), n = noise();
      smooth = smooth * 0.88 + n * 0.12;
      const taper = Math.min(1, i / 240, (length - 1 - i) / 480);
      let signal;
      switch (event.type) {
        case 'whoosh': signal = smooth * 3 * Math.sin(Math.PI * u) ** 2; break;
        case 'impact':
          phase += 2 * Math.PI * (55 + 100 * Math.exp(-t * 18)) / rate;
          signal = (Math.sin(phase) * Math.exp(-u * 7) + n * 0.25 * Math.exp(-u * 22)); break;
        case 'tick': signal = (n * 0.6 + Math.sin(2 * Math.PI * 1700 * t) * 0.4) * Math.exp(-u * 14); break;
        case 'rise':
          phase += 2 * Math.PI * (150 + 1700 * u * u) / rate;
          signal = (Math.sin(phase) * 0.22 + smooth * 2) * Math.sin(Math.PI * u / 2); break;
        case 'shimmer': signal = (Math.sin(2 * Math.PI * 1600 * t) + Math.sin(2 * Math.PI * 2377 * t) + Math.sin(2 * Math.PI * 3311 * t)) / 3 * Math.sin(Math.PI * u) * Math.exp(-u * 2); break;
      }
      samples[start + i] += signal * Math.max(0, taper) * event.gain;
    }
  }
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const scale = peak > 0.85 ? 0.85 / peak : 1;
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) wav.writeInt16LE(Math.round(samples[i] * scale * 32767), 44 + i * 2);
  return wav;
}

async function makePage(browser, spec) {
  const page = await browser.newPage({viewport: {width: spec.width, height: spec.height}, deviceScaleFactor: 1});
  page.setDefaultTimeout(30000);
  let sceneError;
  page.on('pageerror', error => { sceneError = error; });
  await page.route('**/*', route => route.abort());
  const {width, height, duration, fps, frames, assets, brand} = spec;
  const data = JSON.stringify({width, height, duration, fps, frames, assets, brand}).replace(/</g, '\\u003c');
  await page.setContent(spec.html.replace(marker, () => data), {waitUntil: 'load'});
  if (sceneError) throw sceneError;
  const timeoutGuard = fn => page.evaluate(async fnText => {
    const action = (0, eval)(`(${fnText})`);
    let timer;
    try { return await Promise.race([action(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Scene readiness timed out.')), 30000); })]); }
    finally { clearTimeout(timer); }
  }, fn.toString());
  await timeoutGuard(async () => {
    await window.ready;
    await document.fonts.ready;
    await Promise.all([...document.images].map(async img => {
      try { await img.decode(); }
      catch { throw new Error(`Image failed to decode: ${img.id || img.alt || '(unnamed)'}; source ${img.currentSrc.slice(0, 60)}`); }
    }));
    if (typeof window.drawFrame !== 'function') throw new Error('Scene must define window.drawFrame(context).');
  });
  if (sceneError) throw sceneError;
  return {page, check: () => { if (sceneError) throw sceneError; }};
}
async function draw(page, spec, frame) {
  const {width, height, duration, fps, frames} = spec;
  await page.evaluate(async context => {
    let timer;
    try { await Promise.race([Promise.resolve().then(() => window.drawFrame(context)), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('drawFrame timed out.')), 30000);
    })]); } finally { clearTimeout(timer); }
  }, {frame, time: frame / fps, progress: frames === 1 ? 1 : frame / (frames - 1), width, height, duration, fps, frames});
}

export async function render(spec, {previewDir} = {}) {
  const ffmpeg = resolveFFmpeg();
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({headless: true});
  let temp, encoder, done;
  try {
    const {page, check} = await makePage(browser, spec);
    if (previewDir) {
      await fs.mkdir(previewDir, {recursive: true});
      const paths = [];
      for (const [name, frame] of [['first', 0], ['middle', Math.floor(spec.frames / 2)], ['final', spec.frames - 1]]) {
        await draw(page, spec, frame); check();
        const p = path.resolve(previewDir, `${name}.png`);
        ensure(!await exists(p), `Preview exists: ${p}`);
        await fs.writeFile(p, await page.screenshot({type: 'png'}), {flag: 'wx'}); paths.push(p);
      }
      return {previews: paths, brandSource: spec.brand.source};
    }
    await fs.mkdir(path.dirname(spec.output), {recursive: true});
    temp = await fs.mkdtemp(path.join(path.dirname(spec.output), '.statoz-render-'));
    const args = ['-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(spec.fps), '-i', 'pipe:0'];
    const tracks = [];
    if (spec.sfx.length) {
      const audioPath = path.join(temp, 'sfx.wav');
      await fs.writeFile(audioPath, synthesizeSfx(spec.sfx, spec.duration));
      args.push('-i', audioPath); tracks.push({gain: 1});
    }
    if (spec.audio) { args.push('-i', spec.audio.path); tracks.push(spec.audio); }
    args.push('-map', '0:v:0');
    if (tracks.length) {
      const filters = tracks.map((track, i) => `[${i + 1}:a:0]aresample=48000,asetpts=PTS-STARTPTS,volume=${track.gain},apad,atrim=duration=${spec.duration}[a${i}]`);
      filters.push(`${tracks.map((_, i) => `[a${i}]`).join('')}amix=inputs=${tracks.length}:normalize=0,alimiter=limit=0.9:level=0:latency=1[outa]`);
      args.push('-filter_complex', filters.join(';'), '-map', '[outa]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
    } else args.push('-an');
    const partial = path.join(temp, 'video.mp4');
    args.push('-t', String(spec.duration), '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p',
      '-vf', 'setsar=1', '-r', String(spec.fps), '-threads', '4', '-movflags', '+faststart', partial);
    encoder = spawn(ffmpeg, args, {stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true});
    let stderr = '', encoderError;
    encoder.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-12000); });
    encoder.stdin.on('error', error => { encoderError = error; });
    done = new Promise(resolve => {
      encoder.on('error', error => { encoderError = error; });
      encoder.on('close', code => resolve({code, error: encoderError}));
    });
    for (let frame = 0; frame < spec.frames; frame++) {
      ensure(!encoderError && encoder.exitCode === null, `FFmpeg stopped: ${stderr || encoderError?.message}`);
      await draw(page, spec, frame); check();
      const buffer = await page.screenshot({type: 'png'});
      await new Promise((resolve, reject) => encoder.stdin.write(buffer, error => error ? reject(error) : resolve()));
      if (frame % spec.fps === 0) process.stderr.write(`Rendered ${frame + 1}/${spec.frames} frames\n`);
    }
    encoder.stdin.end();
    const result = await done;
    ensure(result.code === 0 && !result.error, `FFmpeg encoding failed: ${stderr || result.error?.message}`);
    const stat = await fs.stat(partial);
    ensure(stat.size > 0, 'FFmpeg produced an empty file.');
    // Same-volume hard link publishes a complete file atomically and refuses collisions.
    await fs.link(partial, spec.output);
    return {output: spec.output, width: spec.width, height: spec.height, duration: spec.duration,
      fps: spec.fps, frames: spec.frames, bytes: stat.size, audio: tracks.length > 0, brandSource: spec.brand.source};
  } finally {
    if (encoder && encoder.exitCode === null) { encoder.kill(); await done; }
    await browser.close();
    if (temp) await fs.rm(temp, {recursive: true, force: true});
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node render-video.mjs <spec.json> [--check | --preview-dir <directory>]'); return;
  }
  ensure(args.length === 1 || (args.length === 2 && args[1] === '--check') ||
    (args.length === 3 && args[1] === '--preview-dir'), 'Invalid arguments; use --help.');
  const spec = await loadSpec(args[0]);
  if (args[1] === '--check') {
    const ffmpeg = resolveFFmpeg(); await loadPlaywright();
    console.log(JSON.stringify({valid: true, width: spec.width, height: spec.height, duration: spec.duration,
      fps: spec.fps, frames: spec.frames, output: spec.output, ffmpeg, brandSource: spec.brand.source}));
  } else console.log(JSON.stringify(await render(spec, {previewDir: args[1] === '--preview-dir' ? args[2] : undefined})));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
}
