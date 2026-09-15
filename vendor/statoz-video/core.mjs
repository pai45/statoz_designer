// Extracted unchanged algorithms from the inspected StatOz video skill.
// The full upstream reference remains in render-video.mjs.
import { execFileSync } from 'node:child_process';
function ensure(condition, message) { if (!condition) throw new Error(message); }
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
    const executable = execFileSync(/* turbopackIgnore: true */ env.PYTHON_PATH || 'python', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],
      {encoding: 'utf8', windowsHide: true, timeout: 15000}).trim();
    return check(executable);
  } catch { throw new Error('FFmpeg unavailable. Set FFMPEG_PATH to FFmpeg with libx264/AAC, or use Python imageio_ffmpeg.'); }
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
