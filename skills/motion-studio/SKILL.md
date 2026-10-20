---
name: motion-studio
description: Turn one prompt into a finished motion-graphics video (MP4) - script, storyboard, animated scenes (kinetic type, 3D, transitions, camera moves), voiceover, synced captions, sound effects, music ducking and a loudness-normalized mix. Use when the user asks for a promo, explainer, launch teaser, TikTok/Reels/Shorts, product demo or any animated video.
---

# Motion Studio

You are the motion designer, editor and sound mixer. You write a `storyboard.json`;
the scripts in this folder render it frame by frame in headless Chromium, add voice,
captions, sound design and music, and output a finished MP4. No After Effects, no timeline.

All paths below are relative to this skill folder (`SKILL_DIR`). Run scripts with
`python3 SKILL_DIR/scripts/...`.

## Workflow

### 1. Brief (ask only what you can't infer)
Settle: goal and audience, platform/format (`9:16` TikTok/Reels/Shorts - default, `16:9`
YouTube, `1:1`, `4:5`), length (default 20-40 s), language, call to action, brand colors.
If the user gave enough, don't ask - state your assumptions in one line and continue.

### 2. Script
- Hook in the first 2 seconds: a bold claim, a question or a number.
- One idea per scene, 4-8 scenes. ~2.5 spoken words per second.
- Short spoken sentences. Write numbers the way they should be read aloud.
- End with one clear action (CTA).

### 3. Storyboard
Create a project folder (e.g. `./videos/<slug>/`) with `storyboard.json`.
Read `references/storyboard.md` for every field, scene type and prop.
Start from `templates/storyboard.vertical.json` or `templates/storyboard.horizontal.json`.

Rules of thumb (see `references/motion-design.md` for more):
- On-screen text is a headline, not the narration. 2-6 words per scene.
- Wrap the key word in `*asterisks*` to highlight it in the accent color.
- Vary scene types and transitions; avoid the same transition 3 times in a row.
- Put the user's screenshots/logos in `<project>/assets/` and use `image` scenes.
- Scene durations follow the voiceover automatically; set `duration` only for silent scenes.

### 4. Check setup (first time)
`python3 SKILL_DIR/scripts/doctor.py` - fix anything marked ✗. It installs nothing itself;
`build.py` runs `npm install` on first use. For natural free voices: `pip install edge-tts`.

### 5. Preview stills and look at them
`python3 SKILL_DIR/scripts/build.py <project> --stills`
Then open `<project>/build/contact_sheet.png` (and single frames in `build/stills/`)
with your image viewer/Read tool and check: text fits and is readable, nothing hides
behind captions, the hierarchy is clear, colors have contrast. Fix the storyboard and repeat.
Never skip this step - it is far faster than a full render.

### 6. Render
`python3 SKILL_DIR/scripts/build.py <project>` → `<project>/out/<title>.mp4`
(`--preview` renders at half resolution for a quick motion check, `--workers N` sets
parallel browser pages, `--voice edge|elevenlabs|piper|say|espeak|silent` forces a provider.)

### 7. Verify and deliver
- `ffprobe` the MP4: duration, resolution, an audio stream present.
- Extract 2-3 frames (`ffmpeg -ss 5 -i out.mp4 -frames:v 1 f.png`) and look at them.
- Tell the user where the file is, which voice provider was used, and that
  `build/captions.srt` exists for platforms that take subtitle files.
- If the voice fell back to `espeak` or `silent`, say so and how to get better voices.

## Custom scenes
When built-in types aren't enough, write a scene module in the project
(`<project>/scenes/my-scene.js`) and use `"type": "custom", "module": "scenes/my-scene.js"`.
API and an example: `references/scene-api.md`. Animations must be a pure function of
time - never use CSS transitions, `setTimeout`, `requestAnimationFrame` or `Date.now()`.

## Audio
- Voice providers, in auto order: ElevenLabs (`ELEVENLABS_API_KEY`) → edge-tts (free,
  online) → Piper (offline, `PIPER_MODEL`) → macOS `say` → espeak-ng → silent.
- Music: a generated bed by default (`"music": {"generate": "pulse"|"pad"}`); prefer a
  royalty-free track from the user: `"music": {"file": "assets/track.mp3", "volume_db": -16}`.
  Music is ducked under the voice automatically. `"music": "none"` disables it.
- Sound effects are placed automatically on transitions, list items, counters and the CTA
  click. Add more per scene with `"sfx": [{"name": "impact", "at": 0.4}]`. Built-in
  names: whoosh, whoosh2, pop, click, tick, impact, riser, ding. Override any by dropping
  `<project>/assets/sfx/<name>.wav`. Disable auto effects with `"sfx": false`.
- Final mix is normalized to -14 LUFS / -1 dBTP (`"loudness_lufs"` to change).

## Troubleshooting
- Chromium won't start → `cd SKILL_DIR/scripts && npx playwright install chromium`, or set
  `CHROME_PATH` to an installed Chrome.
- Text overflows → shorten it; headlines are auto-fitted, but long lists/terminal lines are not.
- 3D scene is black → the GPU is unavailable; the renderer already uses SwiftShader, just slower.
- Rendering slow → `--preview` while iterating; `--workers N` on machines with many cores; `--gpu --nvenc` on an NVIDIA GPU (Windows users: the `windows/render.cmd` helper sets all of this).
- Captions out of sync → the provider gave no word timings (piper/say/espeak); they're
  estimated. edge-tts and ElevenLabs give exact timings.
