# Claude Skills

Free, open-source skills for Claude Code and other AI coding agents.

## 🎬 Motion Studio

**Type one prompt. Get a finished motion-graphics video.** A free, open-source skill that
turns Claude Code (or Codex, Cursor and other coding agents) into a motion designer, editor
and sound mixer. No After Effects, no Premiere, no timeline.

🇺🇦 [Українською](README.uk.md)

<!-- Put your demo here: upload out/*.mp4 to a GitHub release or drag it into this README on github.com -->

## What it does

- ✍️ **Script and storyboard** from a single prompt
- 🎞️ **Animated scenes**: kinetic typography, counters, lists, before/after, terminal typing, screenshots in device frames, real-time **3D** (Three.js)
- 🎥 **Transitions and camera moves**: push, whip, zoom, iris, wipe, blur · drift, orbit, tilt, pan
- 🗣️ **Voiceover**: ElevenLabs, free Microsoft neural voices (edge-tts), Piper (offline), macOS `say`, espeak
- 💬 **Captions** synced word by word to the voice, burned in + `.srt` file
- 🔊 **Sound design**: auto whooshes, pops, risers, clicks (synthesized, copyright-free), music bed with ducking
- 🎚️ **Loudness-normalized mix** (-14 LUFS, streaming standard)
- 📐 **1080p MP4** in 9:16, 16:9, 1:1, 4:5 or any size
- 🔁 **Frame-accurate**: every frame is rendered deterministically, no dropped frames

## Requirements (all free)

- [Node.js 18+](https://nodejs.org)
- [FFmpeg](https://ffmpeg.org/download.html) (`brew install ffmpeg` · `winget install ffmpeg` · `sudo apt install ffmpeg`)
- Python 3.9+
- Recommended for natural voices: `pip install edge-tts` (free) or an ElevenLabs API key (free plan works)

## Install

```bash
git clone https://github.com/BMatiashchuk99/Claude-Skills.git
cd Claude-Skills
./install.sh            # installs to ~/.claude/skills/motion-studio
```

Options: `./install.sh --project` (current project only) or `./install.sh --dir PATH` (other agents).

**Windows / manual install:** copy `skills/motion-studio` to `%USERPROFILE%\.claude\skills\`, then:
```bash
cd %USERPROFILE%\.claude\skills\motion-studio\scripts
npm install
npx playwright install chromium
pip install edge-tts
python doctor.py
```

**Codex, Cursor, Antigravity and others:** see [AGENTS.md](AGENTS.md).

## Use

In Claude Code just ask:

> Make a 30-second vertical promo video for my app *Plantly*: it reminds you to water plants. Use green colors and end with "Download free".

The agent writes the script and `storyboard.json`, previews stills, checks them, renders and gives you the MP4.

### Manual use

```bash
python3 ~/.claude/skills/motion-studio/scripts/build.py examples/launch-teaser --stills   # quick frame check
python3 ~/.claude/skills/motion-studio/scripts/build.py examples/launch-teaser            # full video -> out/
```

Flags: `--preview` (half resolution), `--no-audio`, `--workers 4`, `--voice edge|elevenlabs|piper|say|espeak|silent`, `--out file.mp4`.

## How it works

```
storyboard.json ─► tts.py ─► plan.py ─► render.mjs (headless Chromium, frame by frame) ─► video.mp4
                   voice      timeline      HTML/CSS/Three.js scenes                          │
                                                                    sfx.py + mix.py ◄─────────┘
                                                        ducking, loudnorm ─► out/<title>.mp4
```

Scenes are plain JavaScript modules whose appearance is a pure function of time, so the
agent can also write completely **custom scenes** — see
[`references/scene-api.md`](skills/motion-studio/references/scene-api.md).

## Storyboard example

```json
{
  "title": "My launch",
  "format": "9:16",
  "theme": "midnight",
  "scenes": [
    { "id": "hook", "type": "kinetic", "narration": "Type one prompt. Get a finished video.",
      "props": { "lines": ["Type *one*", "prompt."], "sub": "Get a finished video." } },
    { "id": "free", "type": "stat", "narration": "And it costs zero dollars.",
      "props": { "value": 0, "from": 99, "prefix": "$", "label": "Free and open source" } },
    { "id": "cta", "type": "cta", "narration": "Grab it on GitHub.",
      "props": { "title": "Make your\n*first video*", "button": "Get it on GitHub" } }
  ]
}
```

Full reference: [`references/storyboard.md`](skills/motion-studio/references/storyboard.md).
Themes: `midnight`, `neon`, `sunset`, `ocean`, `paper`, `mono` — or your own colors and fonts.

## FAQ

**Do I need any paid software?** No. ElevenLabs is optional.
**Can I use my own music?** Yes: `"music": {"file": "assets/track.mp3"}`. Use tracks you have the rights to.
**It's slow.** Rendering is CPU-only by default. Use `--preview` while iterating; 3D scenes are the slowest.
**Chromium won't start.** `cd skills/motion-studio/scripts && npx playwright install chromium`, or set `CHROME_PATH`.

## License

MIT — use it for anything, including commercial videos. Contributions welcome!
