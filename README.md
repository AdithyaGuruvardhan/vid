# Motion Studio

Professional motion graphics generated with Claude Code. **Claude writes the animation code; your machine renders the video.**

```
Idea → Claude Code → index.html (window.seek(t)) → Chromium/Playwright → frames → FFmpeg → out/final.mp4
```

Every frame is a pure function of time, so renders are deterministic, any frame can be inspected on its own, and edits are just code changes.

## Setup (macOS)

```bash
brew install node ffmpeg python          # Node 22+
npm install
npx playwright install chromium
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # only needed for beats.py
```

## Quick start

```bash
npm run preview         # scrub the starter showreel in the browser
npm run render:draft    # 30fps draft → out/draft.mp4 (~15s)
npm run build           # 60fps + motion blur + SFX + contact sheet → out/final.mp4
```

Then start Claude Code in this folder (`claude`). `CLAUDE.md` holds the permanent motion rules, so prompts can stay short.

## Layout

| Path | What it is |
|------|-----------|
| `index.html` | The composition: scenes, layout for 9:16 / 1:1 / 16:9, `window.seek(t)`, preview scrubber |
| `src/timeline.js` | Scene timings + SFX cue list (shared by picture and sound) |
| `lib/motion.js` | Closed-form springs, keyframe chains, easing, seeded RNG |
| `render.mjs` | Playwright renderer → FFmpeg (H.264, yuv420p, CRF 16). `--sub 4` = motion blur |
| `sfx.mjs` | Procedural click / tick / pop / thump / whoosh / impact / logo hit → `out/sfx.wav` |
| `beats.py` | BPM, beats, downbeats and peaks from a music track → `beats.json` |
| `scripts/` | `mux.sh`, `contact.sh`, `phone.sh`, `strip.sh`, `loop.sh` |
| `docs/` | Style guide, shot list, review log |
| `refs/` `assets/` `audio/` | Reference videos/frames, real brand assets, music |
| `out/` | Renders and QC images (git-ignored) |

## Renderer options

```bash
node render.mjs --format 16x9            # 9x16 (default) | 1x1 | 16x9 → out/silent_16x9.mp4
node render.mjs --sub 4 --shutter 0.5    # 4 sub-frame samples, 180° shutter
node render.mjs --from 6 --dur 2         # render a slice
node render.mjs --still 6.4              # one PNG
node render.mjs --frames                 # also keep PNG frames in out/frames/
node render.mjs --fps 30 --crf 18 --out out/x.mp4
```

## Audio

```bash
npm run sfx                                   # procedural SFX locked to src/timeline.js CUES
.venv/bin/python beats.py audio/song.wav      # → beats.json; snap T times to downbeats
MUSIC=audio/song.wav npm run mux              # mix music under the SFX
```

## Quality loop

```bash
npm run contact                 # out/contact.png — 2 fps sheet
npm run phone                   # out/phone.png — 360px readability
bash scripts/strip.sh 4.2       # 12 consecutive frames around 4.2s
npm run loop                    # out/loop_check.mp4 — inspect a loop seam
```

Ask Claude to act as a strict motion director: score the sheet, name the 3 biggest problems with timestamps, fix, re-render, repeat until every category is ≥ 8. Log passes in `docs/review_log.md`.

## Prompts that work

**New film**
> Create a 20-second 9:16 product film for [PRODUCT] ([URL]). Gather real brand assets into ./assets first — never invent product screens. Write docs/shotlist.md before any code: hook 0–2s, product 2–6s, three features 6–12s, metric 12–16s, logo + CTA 16–20s. Then build it in index.html, contact-sheet it, fix the 3 biggest problems, and render.

**From a reference**
> Study ./refs/reference.mp4. Extract frames every 0.5s with FFmpeg. Analyze typography, palette, pacing, shot duration, transitions, camera, texture, text entrance/exit. Write docs/style_guide.md and docs/shotlist.md. Use its motion language only — no logos, characters or brand assets.

**UI morph**
> Create one continuous UI morph: a single container transforms logo → CTA → email field → loader → success → dashboard card → chart → tooltip → command palette → notification → logo. No hard cuts. Animate width, height, radius, position and content with `chain` springs. A cursor drives the interactions. Last frame matches the first for a seamless loop.

**Music sync**
> Analyze ./audio/song.wav with beats.py. Move scene boundaries in src/timeline.js onto downbeats and put clicks/transitions on peaks.

**All formats**
> Make the same timeline work as 9:16, 1:1 and 16:9 — recompose type and UI for each, don't crop. Render all three.

## Remotion alternative

For a React-based, reusable template system: `npx create-video@latest launch-film`, then run Claude Code inside it. The same rules apply: animate from the frame number, springs over linear easing, contact-sheet review.
