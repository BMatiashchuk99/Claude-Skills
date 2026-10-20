"""Shared helpers for the Motion Studio pipeline (standard library only)."""
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
SKILL = SCRIPTS.parent


_DIRS = re.compile(r"[A-Za-z]:[\\/](?:[^\\/\n\"]*[\\/])+|/(?:home|Users|sessions|root|tmp)/(?:[^/\n\"]*/)+")


def _demo(msg):
    """MS_DEMO=1 hides folders (and so user names) in console output, handy for screen recordings."""
    msg = str(msg)
    return _DIRS.sub("", msg) if os.environ.get("MS_DEMO") == "1" else msg


def log(msg):
    print(f"[motion-studio] {_demo(msg)}", flush=True)


def die(msg, code=1):
    print(f"[motion-studio] ERROR: {_demo(msg)}", file=sys.stderr, flush=True)
    sys.exit(code)


def run(cmd, check=True, capture=False, **kw):
    """Run a command list. Returns CompletedProcess."""
    res = subprocess.run(cmd, check=False, text=True,
                         stdout=subprocess.PIPE if capture else None,
                         stderr=subprocess.PIPE if capture else None, **kw)
    if check and res.returncode != 0:
        err = (res.stderr or "")[-2000:] if capture else ""
        die(f"command failed ({res.returncode}): {' '.join(map(str, cmd[:6]))} ...\n{err}")
    return res


def load_json(p):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(p, data):
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def ffprobe_duration(p):
    res = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "default=nw=1:nk=1", str(p)], capture=True)
    try:
        return float(res.stdout.strip())
    except ValueError:
        return 0.0


def has(binary):
    return shutil.which(binary) is not None


def slugify(s):
    s = re.sub(r"[^a-zA-Z0-9]+", "-", str(s)).strip("-").lower()
    return s or "video"


def env_flag(name):
    return os.environ.get(name, "").strip().lower() in ("1", "true", "yes")


def ffmpeg_major():
    """Major version of the ffmpeg on PATH (0 if unknown, e.g. git builds)."""
    try:
        out = subprocess.run(["ffmpeg", "-hide_banner", "-version"], text=True, capture_output=True).stdout
        m = re.search(r"ffmpeg version n?(\d+)\.", out)
        return int(m.group(1)) if m else 0
    except OSError:
        return 0
