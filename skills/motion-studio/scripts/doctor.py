#!/usr/bin/env python3
"""Checks that everything Motion Studio needs is installed and says how to fix what is missing."""
import importlib.util
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
OK, WARN, BAD = "✓", "!", "✗"
problems = 0


def check(label, ok, fix="", required=True):
    global problems
    mark = OK if ok else (BAD if required else WARN)
    print(f" {mark} {label}" + ("" if ok else f"\n     → {fix}"))
    if not ok and required:
        problems += 1


def version(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=20).stdout.strip().splitlines()[0]
    except Exception:
        return ""


print("Motion Studio doctor\n")
node = shutil.which("node")
nv = version(["node", "-v"]) if node else ""
major = int(nv.lstrip("v").split(".")[0]) if nv.startswith("v") else 0
check(f"Node.js {nv or '(missing)'}", major >= 18, "install Node.js 18+ from https://nodejs.org")
check("FFmpeg " + (version(["ffmpeg", "-version"]).split(" ")[2] if shutil.which("ffmpeg") else "(missing)"),
      bool(shutil.which("ffmpeg") and shutil.which("ffprobe")),
      "macOS: brew install ffmpeg · Windows: winget install ffmpeg · Linux: sudo apt install ffmpeg")
check(f"Python {platform.python_version()}", sys.version_info >= (3, 9), "install Python 3.9+")
deps = (SCRIPTS / "node_modules" / "playwright").exists() and (SCRIPTS / "node_modules" / "three").exists()
check("renderer packages (playwright, three)", deps, f"cd \"{SCRIPTS}\" && npm install")
if deps:
    code = "import('playwright').then(async ({chromium})=>{const b=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});await b.close();console.log('ok')}).catch(e=>{console.log('fail');})"
    res = subprocess.run(["node", "-e", code], cwd=str(SCRIPTS), capture_output=True, text=True, timeout=120)
    check("headless Chromium", "ok" in res.stdout, f"cd \"{SCRIPTS}\" && npx playwright install chromium")

print("\nVoiceover (one is enough):")
check("ElevenLabs (ELEVENLABS_API_KEY)", bool(os.environ.get("ELEVENLABS_API_KEY")), "optional: export ELEVENLABS_API_KEY=... (free plan works)", required=False)
check("edge-tts (free neural voices)", importlib.util.find_spec("edge_tts") is not None, "recommended: pip install edge-tts", required=False)
check("piper (offline)", bool(shutil.which("piper") and os.environ.get("PIPER_MODEL")), "optional: pip install piper-tts and set PIPER_MODEL", required=False)
check("macOS say", platform.system() == "Darwin" and bool(shutil.which("say")), "macOS only", required=False)
check("espeak-ng (robotic fallback)", bool(shutil.which("espeak-ng") or shutil.which("espeak")), "optional: apt install espeak-ng / brew install espeak-ng", required=False)

print("\n" + ("All set. Render with: python3 build.py <project>" if problems == 0 else f"{problems} required item(s) missing."))
sys.exit(1 if problems else 0)
