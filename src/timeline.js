// Single source of truth for timing. Imported by index.html (picture) and sfx.mjs (sound),
// so visuals and audio can never drift apart. Change a time here and both follow.

export const FPS = 60;
export const DURATION = 15;

export const T = {
  a: { start: 0.0, out: 2.2 },                              // HOOK      "MAKE IT MOVE."
  b: { wipe: 2.3, start: 2.6, out: 5.0 },                   // IDEA      "Every frame is a function of time."
  c: {                                                      // UI MORPH  button → loader → success → card
    start: 5.35, click: 6.4, loader: 6.6, success: 7.6,
    card: 8.2, type: 9.2, collapse: 9.95, cover: 10.15,
  },
  d: { start: 10.4, count: 10.6, countEnd: 11.9, out: 12.8 }, // FRAMES   contact-sheet grid + counter
  e: { start: 13.2 },                                       // END CARD
};

export const BARS = 14;
export const TYPE_LINE = '900 frames · 60 fps · CRF 16';

// Inverse of ease.outExpo, so counter ticks land exactly when the digits change.
const outExpoInv = k => (k >= 1 ? 1 : -Math.log2(1 - k) / 10);

export const CUES = [
  { t: 0.02, sfx: 'impact', gain: 0.9 },
  ...[0, 1, 2].map(i => ({ t: 0.08 + i * 0.14, sfx: 'tick', gain: 0.45 })),
  { t: T.a.out - 0.05, sfx: 'whoosh', gain: 0.45 },
  { t: T.b.wipe + 0.1, sfx: 'whoosh', gain: 0.8 },
  { t: T.b.start, sfx: 'thump', gain: 0.6 },
  { t: T.b.out, sfx: 'whoosh', gain: 0.4 },
  { t: T.c.start, sfx: 'pop', gain: 0.8 },
  { t: T.c.click, sfx: 'click', gain: 1 },
  { t: T.c.loader, sfx: 'whoosh', gain: 0.3 },
  { t: T.c.success, sfx: 'pop', gain: 1 },
  { t: T.c.card, sfx: 'whoosh', gain: 0.55 },
  ...Array.from({ length: BARS }, (_, i) => ({ t: T.c.card + 0.35 + i * 0.045, sfx: 'tick', gain: 0.22 })),
  ...[...TYPE_LINE].map((_, i) => ({ t: T.c.type + (i / TYPE_LINE.length) * 0.75, sfx: 'click', gain: 0.18 })),
  { t: T.c.cover - 0.12, sfx: 'whoosh', gain: 0.9 },
  { t: T.d.start, sfx: 'impact', gain: 0.75 },
  ...Array.from({ length: 18 }, (_, i) => ({
    t: T.d.count + outExpoInv((i + 1) / 18) * (T.d.countEnd - T.d.count), sfx: 'tick', gain: 0.3,
  })),
  { t: T.d.out, sfx: 'whoosh', gain: 0.6 },
  { t: T.e.start + 0.1, sfx: 'logo', gain: 1 },
];
