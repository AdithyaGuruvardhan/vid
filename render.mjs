#!/usr/bin/env node
// Deterministic renderer: headless Chromium seeks the composition to each frame time,
// screenshots it, and pipes the frames straight into FFmpeg (H.264, yuv420p, CRF 16).
//
//   node render.mjs                         9:16 full length       → out/silent.mp4
//   node render.mjs --format 16x9           landscape layout       → out/silent_16x9.mp4
//   node render.mjs --sub 4                 4 samples per frame, averaged (motion blur)
//   node render.mjs --draft                 fast 30fps JPEG pass   → out/draft.mp4
//   node render.mjs --from 4 --dur 2        render a slice
//   node render.mjs --still 14.2 --out out/poster.png
//   node render.mjs --frames                also keep every PNG in out/frames/
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { serve } from './lib/server.mjs';

const { values: opt } = parseArgs({
  options: {
    format: { type: 'string', default: '9x16' },
    page: { type: 'string', default: 'index.html' },
    fps: { type: 'string' },
    from: { type: 'string', default: '0' },
    dur: { type: 'string' },
    sub: { type: 'string', default: '1' },
    shutter: { type: 'string', default: '0.5' }, // fraction of a frame the "shutter" is open for motion blur
    crf: { type: 'string', default: '16' },
    out: { type: 'string' },
    still: { type: 'string' },
    draft: { type: 'boolean', default: false },
    frames: { type: 'boolean', default: false },
  },
});

const server = await serve(process.cwd());
const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text'] });

try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('[page error]', e.message); process.exitCode = 1; });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  await page.goto(`${server.url}/${opt.page}?render&format=${opt.format}`);
  await page.evaluate(() => window.ready);
  const comp = await page.evaluate(() => window.__comp);
  await page.setViewportSize({ width: comp.width, height: comp.height });
  const clip = { x: 0, y: 0, width: comp.width, height: comp.height };
  const seek = t => page.evaluate(t => window.seek(t), t);
  const shot = type => page.screenshot({ type, clip, ...(type === 'jpeg' ? { quality: 92 } : {}) });

  if (opt.still != null) {
    const out = opt.out ?? `out/still_${opt.still}.png`;
    mkdirSync(dirname(out), { recursive: true });
    await seek(Number(opt.still));
    writeFileSync(out, await shot('png'));
    console.log(`✓ ${out}`);
  } else {
    const fps = Number(opt.fps ?? (opt.draft ? 30 : comp.fps));
    const sub = opt.draft ? 1 : Math.max(1, Math.floor(Number(opt.sub)));
    const shutter = Number(opt.shutter);
    const from = Number(opt.from);
    const dur = Number(opt.dur ?? comp.duration - from);
    const total = Math.round(dur * fps);
    const suffix = comp.format === '9x16' ? '' : `_${comp.format}`;
    const out = opt.out ?? `out/${opt.draft ? 'draft' : 'silent'}${suffix}.mp4`;
    mkdirSync(dirname(out), { recursive: true });
    if (opt.frames) mkdirSync('out/frames', { recursive: true });

    // Sub-frames arrive at fps*sub; tmix averages each group and select keeps the last of each group.
    const vf = sub > 1 ? ['-vf', `tmix=frames=${sub},select='eq(mod(n,${sub}),${sub - 1})',setpts=N/(${fps}*TB)`] : [];
    const ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps * sub), '-i', '-', ...vf,
      '-r', String(fps), '-c:v', 'libx264', '-preset', opt.draft ? 'veryfast' : 'slow', '-crf', opt.draft ? '23' : opt.crf,
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((ok, fail) => ff.on('close', code => (code === 0 ? ok() : fail(new Error(`ffmpeg exited ${code}`)))));

    const started = Date.now();
    for (let f = 0; f < total; f++) {
      for (let s = 0; s < sub; s++) {
        // samples are centered on the frame time and spread across the open shutter
        const t = from + (f + (sub > 1 ? ((s + 0.5) / sub - 0.5) * shutter : 0)) / fps;
        await seek(t);
        const buf = await shot(opt.draft ? 'jpeg' : 'png');
        if (opt.frames && s === sub - 1) writeFileSync(`out/frames/${String(f).padStart(5, '0')}.png`, buf);
        if (!ff.stdin.write(buf)) await new Promise(ok => ff.stdin.once('drain', ok));
      }
      if (f % 15 === 0 || f === total - 1) {
        const el = (Date.now() - started) / 1000;
        process.stdout.write(`\r${comp.format} ${comp.width}×${comp.height} @${fps}fps sub${sub}  frame ${f + 1}/${total}  ${el.toFixed(0)}s  eta ${((el / (f + 1)) * (total - f - 1)).toFixed(0)}s   `);
      }
    }
    ff.stdin.end();
    await done;
    console.log(`\n✓ ${out}`);
  }
} finally {
  await browser.close();
  server.close();
}
