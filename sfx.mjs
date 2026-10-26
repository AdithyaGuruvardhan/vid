#!/usr/bin/env node
// Procedural sound design: every effect is synthesized in code and placed on the
// cue list from src/timeline.js, so audio is locked to the picture.
//
//   node sfx.mjs                → out/sfx.wav
//   node sfx.mjs --out a.wav
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { CUES, DURATION } from './src/timeline.js';
import { rng } from './lib/motion.js';

const { values: opt } = parseArgs({ options: { out: { type: 'string', default: 'out/sfx.wav' } } });

const SR = 48000;
const TAU = Math.PI * 2;
const noise = rng(1234);
const white = () => noise() * 2 - 1;

// Each voice renders a mono buffer of `len` seconds from a per-sample function f(t, i).
function voice(len, f) {
  const out = new Float32Array(Math.ceil(len * SR));
  for (let i = 0; i < out.length; i++) out[i] = f(i / SR, i);
  return out;
}

// Pitch-swept sine: frequency is a function of time, phase is integrated so sweeps stay smooth.
function sweep(freq) {
  let phase = 0;
  return t => { phase += (TAU * freq(t)) / SR; return Math.sin(phase); };
}

const VOICES = {
  click: () => voice(0.03, t => white() * 0.5 * Math.exp(-t / 0.003) + Math.sin(TAU * 3200 * t) * 0.5 * Math.exp(-t / 0.008)),
  tick: () => voice(0.04, t => Math.sin(TAU * 1900 * t) * Math.exp(-t / 0.006)),
  pop: () => {
    const osc = sweep(t => 260 + 520 * Math.exp(-t / 0.02));
    return voice(0.14, t => osc(t) * Math.exp(-t / 0.035));
  },
  thump: () => {
    const osc = sweep(t => 50 + 90 * Math.exp(-t / 0.03));
    return voice(0.4, t => osc(t) * Math.exp(-t / 0.12));
  },
  impact: () => {
    const osc = sweep(t => 38 + 70 * Math.exp(-t / 0.05));
    let lp = 0;
    return voice(1.0, t => {
      lp += (white() - lp) * 0.08;
      return Math.tanh(1.6 * (osc(t) * Math.exp(-t / 0.35) + lp * 1.5 * Math.exp(-t / 0.05)));
    });
  },
  whoosh: () => {
    // band-passed noise whose brightness follows the envelope
    const len = 0.55;
    let a = 0, b = 0;
    return voice(len, t => {
      const x = t / len;
      const env = (x < 0.6 ? x / 0.6 : (1 - x) / 0.4) ** 2;
      const k = 0.02 + 0.25 * env;
      a += (white() - a) * k;
      b += (a - b) * k * 0.5;
      return (a - b) * env * 4;
    });
  },
  logo: () => {
    const hit = VOICES.impact();
    const chord = [220, 277.18, 329.63, 440];
    return voice(2.4, (t, i) => {
      const env = Math.min(1, t / 0.005) * Math.exp(-t / 0.9);
      const tone = chord.reduce((s, f) => s + Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t), 0);
      return (hit[i] ?? 0) * 0.8 + tone * 0.12 * env;
    });
  },
};

const N = Math.ceil(DURATION * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const pan = rng(99);
for (const { t, sfx, gain = 1 } of CUES) {
  const buf = VOICES[sfx]();
  const p = sfx === 'whoosh' ? (pan() - 0.5) * 0.8 : 0; // -1 left … 1 right
  const gl = gain * 0.5 * Math.cos(((p + 1) * Math.PI) / 4) * Math.SQRT2;
  const gr = gain * 0.5 * Math.sin(((p + 1) * Math.PI) / 4) * Math.SQRT2;
  const start = Math.round(t * SR);
  for (let i = 0; i < buf.length && start + i < N; i++) {
    if (start + i < 0) continue;
    L[start + i] += buf[i] * gl;
    R[start + i] += buf[i] * gr;
  }
}

// Soft-clip, then normalize to -1 dBFS.
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i]);
  R[i] = Math.tanh(R[i]);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = peak > 0 ? 0.89 / peak : 1;

const data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVE', 8);
data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write('data', 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(L[i] * norm * 32767), 44 + i * 4);
  data.writeInt16LE(Math.round(R[i] * norm * 32767), 46 + i * 4);
}
mkdirSync(dirname(opt.out), { recursive: true });
writeFileSync(opt.out, data);
console.log(`✓ ${opt.out}  (${CUES.length} cues, ${DURATION}s)`);
