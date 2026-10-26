# Motion Studio Rules

Claude writes the animation code. This machine renders the video.
Pipeline: idea → `docs/shotlist.md` → `index.html` (`window.seek(t)`) → Playwright/Chromium frames → FFmpeg → `out/final.mp4`.

## Files

- `index.html` — the composition. One function per scene, each returns `draw(t)`. `window.seek(t)` calls them all.
- `src/timeline.js` — **single source of truth for timing**: scene times (`T`), `DURATION`, `FPS`, and the SFX `CUES`. Picture and sound both import it. Change timing here, never as magic numbers scattered in scenes.
- `lib/motion.js` — `spring`, `SPRING` presets, `chain` (keyframed springs), `ease`, `prog`, `bump`, `mixColor`, seeded `rng`.
- `render.mjs` — headless renderer. `sfx.mjs` — procedural audio. `beats.py` — music analysis → `beats.json`.
- `scripts/` — `mux.sh`, `contact.sh`, `phone.sh`, `strip.sh`, `loop.sh`.
- `docs/` — `style_guide.md`, `shotlist.md`, `review_log.md`. `refs/` — reference material. `assets/` — real brand assets. `audio/` — music.

## Rendering

Every animation must be deterministic. The entire visual state must be calculated from `t`.

Do not use: `setTimeout`, CSS transitions/animations, state that accumulates between frames, `Math.random`, `requestAnimationFrame` during rendering (the preview UI may use it; `?render` mode never does).
Use `rng(seed)` when randomness is needed. Seeking to any `t`, in any order, must produce the same frame.

Formats are layouts, not crops: `?format=9x16` (1080×1920, default), `1x1` (1080×1080), `16x9` (1920×1080). Size everything in `U` (1% of the short side) and branch on `PORTRAIT` / `LANDSCAPE` where composition should differ. Fit type with `fitSize`.

Export: H.264, yuv420p, CRF 16 (render.mjs defaults).

## Commands

```
npm run preview                 # live scrubber at http://127.0.0.1:5173 (space play, ←/→ frame step, ?t=6.4)
npm run render:draft            # fast 30fps check → out/draft.mp4
node render.mjs --still 6.4     # single frame → out/still_6.4.png
npm run build                   # 60fps, 4 sub-frames motion blur, SFX, mux, contact sheet → out/final.mp4
npm run render:all              # silent renders for all three formats
npm run contact | phone         # QC sheets from out/final.mp4
bash scripts/strip.sh 4.2       # 12 consecutive frames around 4.2s
MUSIC=audio/song.wav npm run mux
.venv/bin/python beats.py audio/song.wav
```

Python deps live in `.venv` (`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`).

## Visual Style

Avoid generic AI motion graphics. Do not use: centered text over gradients, excessive glow, random particle effects, unnecessary borders, corner labels, everything fading in.

Use: strong typography, deliberate composition, smooth camera movement, spring-based animation, clear visual hierarchy.

Springs (`SPRING` in `lib/motion.js`): `snappy` for buttons/ticks, `ui` for small UI (tiny overshoot), `card` for cards/panels/cursor, `heavy` for large type, `text` (critically damped, no overshoot) for important text. Use `chain` for objects that morph through several states so momentum carries between them.

Something visually meaningful should happen every 2–4 seconds. Hook in the first 2 seconds.

When given references in `refs/`, borrow motion language and pacing only — never logos, characters, brand assets or copyrighted content. For real products, use real assets in `assets/`; never invent product screens.

## Quality Control

Before final rendering:

1. Render a draft and generate a contact sheet (`npm run render:draft && bash scripts/contact.sh out/draft.mp4`)
2. Inspect the frames (open the PNG)
3. Check phone readability (`scripts/phone.sh` — every important word legible at 360px wide)
4. Check animation quality (`scripts/strip.sh <t>` on fast moments: popping, collisions, broken morphs)
5. Check composition
6. Check pacing
7. Check sound synchronization

Act as a strict motion director. Score 1–10: hook, typography, phone readability, composition, motion quality, variety, pacing, brand accuracy, sound sync, polish. Identify the 3 biggest problems with exact timestamps. Fix them. Re-render. Repeat until every important category is ≥ 8. Log each pass in `docs/review_log.md`.
