// Deterministic motion primitives. Every function here is a pure function of its inputs,
// so any frame can be rendered in any order and always looks identical.

export const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const lerp = (a, b, k) => a + (b - a) * k;

// 0 → 1 as t moves through [start, start + dur], clamped.
export const prog = (t, start, dur) => clamp((t - start) / dur);

// 0 → 1 → 0 over [start, start + dur]; handy for presses, squishes and flashes.
export const bump = (t, start, dur) => Math.sin(Math.PI * prog(t, start, dur));

export const ease = {
  linear: k => k,
  inCubic: k => k * k * k,
  outCubic: k => 1 - (1 - k) ** 3,
  inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
  outQuint: k => 1 - (1 - k) ** 5,
  inExpo: k => (k <= 0 ? 0 : 2 ** (10 * k - 10)),
  outExpo: k => (k >= 1 ? 1 : 1 - 2 ** (-10 * k)),
  inOutExpo: k => (k <= 0 ? 0 : k >= 1 ? 1 : k < 0.5 ? 2 ** (20 * k - 10) / 2 : (2 - 2 ** (-20 * k + 10)) / 2),
};

// Closed-form damped spring from 0 to 1, `t` seconds after it was released.
// No simulation state: the value at any t is computed directly.
export function spring(t, { stiffness = 170, damping = 26, mass = 1, velocity = 0 } = {}) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const x0 = -1; // starts one unit away from the target
  let x;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    x = Math.exp(-zeta * w0 * t) * (x0 * Math.cos(wd * t) + ((velocity + zeta * w0 * x0) / wd) * Math.sin(wd * t));
  } else if (zeta === 1) {
    x = Math.exp(-w0 * t) * (x0 + (velocity + w0 * x0) * t);
  } else {
    const s = Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - s), r2 = -w0 * (zeta + s);
    const c2 = (velocity - r1 * x0) / (r2 - r1);
    x = (x0 - c2) * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
  }
  return 1 + x;
}

// Damping ratio (zeta) noted per preset: < 1 overshoots, 1 is critical, > 1 is sluggish.
export const SPRING = {
  snappy: { stiffness: 420, damping: 30 },            // ζ≈0.73  buttons, ticks, small UI
  ui: { stiffness: 260, damping: 26 },                // ζ≈0.81  very small overshoot
  card: { stiffness: 170, damping: 20 },              // ζ≈0.77  cards, panels, cursor
  heavy: { stiffness: 110, damping: 24, mass: 1.5 },  // ζ≈0.93  large typography
  text: { stiffness: 180, damping: 27 },              // ζ≈1.0   important text: no overshoot
};

// Chain of springs between keyframes: [[time, value, preset?], ...].
// Each segment adds its delta through its own spring, so a new move can start
// before the previous one settles and momentum carries through naturally.
export function chain(t, keys, preset = SPRING.ui) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [time, to, p = preset] = keys[i];
    v += (to - keys[i - 1][1]) * spring(t - time, p);
  }
  return v;
}

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
export function mixColor(a, b, k) {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(k)))).join(',')})`;
}

// Seeded PRNG (mulberry32). Never use Math.random in a composition.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
