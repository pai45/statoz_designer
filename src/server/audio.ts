import { durationOf, type Project } from "@/domain/project";
import { synthesizeSfx } from "../../vendor/statoz-video/core.mjs";

function pcmWav(samples: Float32Array, rate: number): Buffer {
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const scale = peak > .88 ? .88 / peak : 1;
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write("RIFF"); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) wav.writeInt16LE(Math.round(samples[i] * scale * 32767), 44 + i * 2);
  return wav;
}

/** Original, deterministic engine bed for the Grand Prix product demo. */
function grandPrixSfx(project: Project): Buffer {
  const rate = 48_000;
  const duration = durationOf(project);
  const samples = new Float32Array(Math.round(duration * rate));
  const boundaries: number[] = [];
  let cursor = 0;
  for (const page of project.pages.slice(0, -1)) { cursor += page.duration; boundaries.push(cursor); }
  const shifts = [1.8, 3, 5.1, 6.6, 9.1, 10.8, 13.2, 14.6];
  let seed = 0x75a2d901;
  let noiseBed = 0;
  let phase = 0;
  const noise = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 2147483648 - 1;
  };
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const launch = t < .95 ? .12 + t / .95 * .48 : 1;
    const scenePulse = .5 + .5 * Math.sin(t * .8 + Math.floor(t / 4) * .8);
    const hz = 58 + launch * 72 + scenePulse * 34 + (t > 30 ? 14 : 0);
    phase += 2 * Math.PI * hz / rate;
    let shiftDuck = 1;
    for (const shift of shifts) {
      const distance = Math.abs(t - shift);
      if (distance < .13) shiftDuck *= .5 + distance / .26;
    }
    noiseBed = noiseBed * .965 + noise() * .035;
    const engine = Math.sin(phase) * .075 + Math.sin(phase * 2.01) * .035 + Math.sin(phase * 3.98) * .014;
    const road = noiseBed * (.018 + launch * .026);
    const fade = Math.min(1, t / .7, (duration - t) / 1.2);
    samples[i] = (engine * shiftDuck + road) * Math.max(0, fade);
  }

  const addTone = (time: number, length: number, frequency: number, gain: number, falloff = 7) => {
    const start = Math.max(0, Math.round(time * rate));
    const count = Math.round(length * rate);
    for (let i = 0; i < count && start + i < samples.length; i++) {
      const u = i / Math.max(1, count - 1);
      const taper = Math.min(1, i / 120, (count - i) / 160);
      samples[start + i] += Math.sin(2 * Math.PI * frequency * i / rate) * Math.exp(-u * falloff) * Math.max(0, taper) * gain;
    }
  };
  for (let light = 1; light <= 5; light++) addTone(light * .18, .09, 920, .12, 9);
  addTone(.95, .38, 92, .17, 5);
  addTone(Math.max(0, duration - 4), 1.3, 1420, .035, 1.7);

  for (const boundary of boundaries) {
    const start = Math.round((boundary - .3) * rate);
    const count = Math.round(.6 * rate);
    let smooth = 0;
    for (let i = 0; i < count && start + i < samples.length; i++) {
      if (start + i < 0) continue;
      const u = i / Math.max(1, count - 1);
      smooth = smooth * .9 + noise() * .1;
      samples[start + i] += smooth * Math.sin(Math.PI * u) ** 2 * .16;
    }
  }
  return pcmWav(samples, rate);
}

export function soundtrackSfx(project: Project): Buffer {
  if (project.templateId === "grand-prix-demo") return grandPrixSfx(project);
  let cursor = 0;
  const events = project.pages.map((p, i) => {
    const time = cursor; cursor += p.duration;
    return { type: i === 0 ? "impact" : i === project.pages.length - 1 ? "shimmer" : "whoosh", time, duration: Math.min(.45, p.duration), gain: .16 };
  });
  return synthesizeSfx(events, durationOf(project));
}
