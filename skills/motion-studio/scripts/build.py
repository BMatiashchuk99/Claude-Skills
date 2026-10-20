#!/usr/bin/env python3
"""One command from storyboard to finished MP4.

  python3 build.py <project_dir>                 full render -> <project>/out/<title>.mp4
  python3 build.py <project_dir> --stills        QA frames + contact sheet only (fast)
  python3 build.py <project_dir> --preview       half-resolution full render (fast check)
  python3 build.py <project_dir> --no-audio      silent video, captions timed by estimate
Options: --workers N  --out path.mp4  --voice edge|elevenlabs|piper|say|espeak|silent
"""
import argparse
import os
import shutil
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SCRIPTS, die, ffprobe_duration, has, load_json, log, run, slugify  # noqa: E402
import mix as mix_mod  # noqa: E402
import plan as plan_mod  # noqa: E402
import sfx as sfx_mod  # noqa: E402
import tts as tts_mod  # noqa: E402


def ensure_node_deps():
    if not has("node"):
        die("Node.js 18+ is required (https://nodejs.org)")
    if not (SCRIPTS / "node_modules" / "playwright").exists() or not (SCRIPTS / "node_modules" / "three").exists():
        log("installing renderer dependencies (first run only)...")
        run([shutil.which("npm") or "npm", "install", "--no-audit", "--no-fund", "--loglevel=error"], cwd=str(SCRIPTS))


def render(timeline, project, out=None, stills=None, workers=None, scale=None):
    cmd = ["node", str(SCRIPTS / "render.mjs"), str(timeline), "--project", str(project)]
    if stills:
        cmd += ["--stills", str(stills)]
    else:
        cmd += ["--out", str(out)]
    if workers:
        cmd += ["--workers", str(workers)]
    if scale:
        cmd += ["--scale", str(scale)]
    run(cmd)


def contact_sheet(stills_dir, out_png, cols=4):
    files = sorted(stills_dir.glob("*.png"))
    if not files:
        return None
    rows = (len(files) + cols - 1) // cols
    run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "1", "-pattern_type", "glob", "-i", str(stills_dir / "*.png"),
         "-vf", f"scale=360:-2,pad=iw+12:ih+12:6:6:color=0x222222,tile={cols}x{rows}", "-frames:v", "1", str(out_png)])
    return out_png


def main():
    ap = argparse.ArgumentParser(description="Motion Studio: storyboard.json -> MP4")
    ap.add_argument("project")
    ap.add_argument("--stills", action="store_true")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--no-audio", action="store_true")
    ap.add_argument("--workers", type=int)
    ap.add_argument("--out")
    ap.add_argument("--voice")
    ap.add_argument("--gpu", action="store_true", help="hardware-accelerated Chromium (faster blur/scale on a real GPU)")
    ap.add_argument("--nvenc", action="store_true", help="encode with NVIDIA NVENC (falls back to libx264 if unavailable)")
    a = ap.parse_args()

    project = Path(a.project).resolve()
    if (project / "storyboard.json").exists() is False:
        die(f"no storyboard.json in {project}")
    if not has("ffmpeg") or not has("ffprobe"):
        die("FFmpeg is required (https://ffmpeg.org/download.html)")
    ensure_node_deps()
    t0 = time.time()
    build = project / "build"
    build.mkdir(parents=True, exist_ok=True)

    if a.gpu:
        os.environ["MS_GPU"] = "1"
    if a.nvenc:
        os.environ["MS_NVENC"] = "1"
    if a.voice:
        os.environ["MOTION_STUDIO_VOICE"] = a.voice
    if a.no_audio:
        os.environ["MOTION_STUDIO_VOICE"] = "silent"

    tts_mod.main(project)
    tl = plan_mod.main(project)
    timeline = build / "timeline.json"

    if a.stills:
        sdir = build / "stills"
        render(timeline, project, stills=sdir)
        sheet = contact_sheet(sdir, build / "contact_sheet.png")
        log(f"stills -> {sdir}")
        if sheet:
            log(f"contact sheet -> {sheet}")
        return

    sb = load_json(project / "storyboard.json")
    name = slugify(sb.get("title", "video"))
    final = Path(a.out).resolve() if a.out else project / "out" / (f"{name}-preview.mp4" if a.preview else f"{name}.mp4")
    video = build / "video.mp4"
    render(timeline, project, out=video, workers=a.workers, scale=0.5 if a.preview else None)

    if a.no_audio:
        final.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(video, final)
    else:
        sfx_mod.main(project)
        mix_mod.main(project, video, final)

    size = final.stat().st_size / 1e6
    log(f"done   {final}  ({ffprobe_duration(final):.2f}s, {size:.1f} MB, built in {time.time() - t0:.0f}s)")
    log(f"captions file -> {build / 'captions.srt'}")


if __name__ == "__main__":
    main()
