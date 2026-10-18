#!/usr/bin/env python3
"""Turns storyboard.json + voiceover timings into build/timeline.json.

The timeline is the single source of truth for the renderer and the audio mix:
absolute scene start/end times, transitions, caption chunks and sound-effect cues.

Usage: python3 plan.py <project_dir>
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import die, load_json, log, save_json  # noqa: E402

FORMATS = {"9:16": (1080, 1920), "16:9": (1920, 1080), "1:1": (1080, 1080), "4:5": (1080, 1350)}
SCENE_TYPES = {"kinetic", "stat", "list", "compare", "terminal", "three", "image", "cta", "custom"}
TRANSITIONS = {"cut", "fade", "slide-left", "slide-right", "slide-up", "slide-down", "push", "zoom", "whip", "blur", "iris", "wipe", "wipe-up"}
CAMERAS = {"none", "push-in", "pull-out", "pan-left", "pan-right", "pan-up", "drift", "orbit", "tilt", "shake"}
DEFAULT_DUR = {"kinetic": 2.6, "stat": 3.2, "list": 4.0, "compare": 4.5, "terminal": 5.0, "three": 3.6, "image": 3.5, "cta": 3.8, "custom": 3.5}

THEMES = {
    "midnight": {"bg": "#07070c", "fg": "#f5f5f7", "muted": "#9a9aae", "accent": "#8b5cf6", "accent2": "#22d3ee", "accent3": "#ec4899", "card": "#14141f", "background": "aurora"},
    "neon": {"bg": "#05060a", "fg": "#ffffff", "muted": "#8b93a7", "accent": "#a3ff12", "accent2": "#00e5ff", "accent3": "#ff2bd6", "card": "#10131c", "background": "grid"},
    "sunset": {"bg": "#120a12", "fg": "#fff7ed", "muted": "#c4a8a0", "accent": "#ff7a45", "accent2": "#ffcf5a", "accent3": "#ff3d7f", "card": "#22141d", "background": "aurora"},
    "ocean": {"bg": "#04111b", "fg": "#ecfeff", "muted": "#8fb3c2", "accent": "#38bdf8", "accent2": "#34d399", "accent3": "#818cf8", "card": "#0b1f2e", "background": "particles"},
    "paper": {"bg": "#f6f4ef", "fg": "#141414", "muted": "#6b6b6b", "accent": "#ff4d00", "accent2": "#2563eb", "accent3": "#16a34a", "card": "#ffffff", "background": "grid", "dark": False, "grain": 0.04, "bg_intensity": 0.22},
    "mono": {"bg": "#0a0a0a", "fg": "#fafafa", "muted": "#8a8a8a", "accent": "#fafafa", "accent2": "#a3a3a3", "accent3": "#525252", "card": "#171717", "background": "solid"},
}
BASE_THEME = {
    "font": "Inter, 'SF Pro Display', 'Segoe UI', Roboto, system-ui, sans-serif",
    "mono": "'JetBrains Mono', 'SF Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
    "grain": 0.07, "radius": 0.03, "progress_bar": False, "fonts": [],
}


def resolve_theme(t):
    if isinstance(t, str):
        t = {"preset": t}
    t = dict(t or {})
    preset = THEMES.get(t.pop("preset", "midnight"))
    if preset is None:
        die(f"unknown theme preset; choose one of {', '.join(THEMES)}")
    out = {**BASE_THEME, **preset, **t}
    if t.get("font") and "," not in t["font"]:
        out["font"] = f"'{t['font']}', {BASE_THEME['font']}"
    return out


def validate(sb):
    errs = []
    if not sb.get("scenes"):
        errs.append("storyboard has no scenes")
    ids = set()
    for i, s in enumerate(sb.get("scenes", [])):
        where = f"scenes[{i}]"
        sid = s.get("id")
        if not sid or not re.match(r"^[a-zA-Z0-9_-]+$", str(sid)):
            errs.append(f"{where}: needs an id made of letters, digits, - or _")
        elif sid in ids:
            errs.append(f"{where}: duplicate id '{sid}'")
        ids.add(sid)
        if s.get("type") not in SCENE_TYPES:
            errs.append(f"{where}: type must be one of {sorted(SCENE_TYPES)}")
        if s.get("type") == "custom" and not s.get("module"):
            errs.append(f"{where}: custom scenes need \"module\": \"scenes/your-scene.js\"")
        tr = s.get("transition")
        if tr:
            name = tr if isinstance(tr, str) else tr.get("type")
            if name not in TRANSITIONS:
                errs.append(f"{where}: transition must be one of {sorted(TRANSITIONS)}")
        if s.get("camera") and s["camera"] not in CAMERAS:
            errs.append(f"{where}: camera must be one of {sorted(CAMERAS)}")
    fmt = sb.get("format", "9:16")
    if isinstance(fmt, str) and fmt not in FORMATS:
        errs.append(f"format must be one of {list(FORMATS)} or {{\"width\":..,\"height\":..}}")
    if errs:
        die("storyboard problems:\n  - " + "\n  - ".join(errs))


def chunk_captions(words, max_words, max_chars, strip_punct):
    chunks, cur = [], []

    def flush():
        if cur:
            chunks.append(list(cur))
            cur.clear()

    for w in words:
        txt = w["w"]
        cur.append(w)
        n_chars = sum(len(x["w"]) + 1 for x in cur)
        if len(cur) >= max_words or n_chars >= max_chars or re.search(r"[.!?,;:—…]$", txt):
            flush()
    flush()
    out = []
    for c in chunks:
        ws = []
        for w in c:
            t = w["w"]
            if strip_punct:
                t = re.sub(r"^[\"'“”«(]+|[\"'“”»).,;:!?…—–-]+$", "", t) or t
                if w["w"].endswith(("?", "!")) and not t.endswith(("?", "!")):
                    t += w["w"][-1]
            ws.append({"w": t, "start": w["start"], "end": w["end"]})
        out.append({"start": ws[0]["start"], "end": ws[-1]["end"], "words": ws})
    for i, c in enumerate(out):  # hold each chunk until the next one starts (small gaps only)
        nxt = out[i + 1]["start"] if i + 1 < len(out) else c["end"] + 0.4
        c["end"] = round(min(nxt, max(c["end"] + 0.2, c["start"] + 0.4)), 3)
    return out


def main(project):
    project = Path(project).resolve()
    sb = load_json(project / "storyboard.json")
    validate(sb)
    vo_path = project / "build" / "audio" / "vo.json"
    vo = load_json(vo_path) if vo_path.exists() else {}

    fmt = sb.get("format", "9:16")
    W, H = FORMATS[fmt] if isinstance(fmt, str) else (int(fmt["width"]), int(fmt["height"]))
    W, H = W - W % 2, H - H % 2
    fps = int(sb.get("fps", 30))
    vertical = H > W
    theme = resolve_theme(sb.get("theme", "midnight"))
    lead = float(sb.get("voice_lead", 0.3))
    tail = float(sb.get("voice_tail", 0.45))
    default_tr = sb.get("transition", "push")
    default_tr_dur = float(sb.get("transition_duration", 0.5))

    scenes, t = [], 0.0
    sfx = []
    auto_sfx = sb.get("sfx", True) is not False
    for i, s in enumerate(sb["scenes"]):
        typ = s["type"]
        v = vo.get(s["id"])
        vo_dur = v["duration"] if v else 0.0
        need = lead + vo_dur + tail if v else 0.0
        dur = s.get("duration")
        if dur is None:
            dur = max(float(s.get("min_duration", DEFAULT_DUR[typ])), need)
        elif need > dur + 0.01:
            log(f"scene '{s['id']}': narration needs {need:.2f}s, duration {dur}s -> extended")
            dur = need
        dur = round(float(dur), 3)
        tr = s.get("transition", default_tr if i > 0 else None)
        if isinstance(tr, str):
            tr = {"type": tr, "duration": default_tr_dur if tr != "cut" else 0.0}
        elif isinstance(tr, dict):
            tr = {"type": tr.get("type", "fade"), "duration": float(tr.get("duration", default_tr_dur))}
        if i == 0:
            tr = None
        props = dict(s.get("props") or {})
        # shared timing between visuals and sound
        if typ == "list":
            n = len(props.get("items", []))
            if n:
                start, span = 0.55, max(0.6, min(dur * 0.62, (vo_dur or dur) * 0.85))
                gap = min(0.75, span / n)
                props["_item_times"] = [round(start + k * gap, 3) for k in range(n)]
        if typ == "stat":
            props["_count_start"] = props.get("count_start", 0.15)
            props["_count_dur"] = props.get("count_duration", min(1.6, dur * 0.45))
        if typ == "cta":
            props["_click_at"] = props.get("click_at", round(min(1.8, dur * 0.5), 3))
        scene = {"id": s["id"], "type": typ, "module": s.get("module"), "props": props, "start": round(t, 3), "end": round(t + dur, 3),
                 "camera": s.get("camera", "drift" if typ in ("kinetic", "stat", "cta") else "push-in"), "transition": tr,
                 "vo_offset": round(t + lead, 3) if v else None}
        scenes.append(scene)

        # sound cues (absolute seconds)
        if auto_sfx:
            if tr and tr["type"] != "cut":
                sfx.append({"name": "whoosh" if i % 2 else "whoosh2", "at": round(t - 0.28, 3), "gain_db": -9})
            elif tr and tr["type"] == "cut":
                sfx.append({"name": "impact", "at": round(t, 3), "gain_db": -10})
            if typ == "stat":
                sfx.append({"name": "riser", "at": round(t + props["_count_start"], 3), "gain_db": -16, "dur": props["_count_dur"]})
                sfx.append({"name": "ding", "at": round(t + props["_count_start"] + props["_count_dur"] * 0.8, 3), "gain_db": -12})
            if typ == "list":
                for k, it in enumerate(props.get("_item_times", [])):
                    sfx.append({"name": "pop", "at": round(t + it + 0.05, 3), "gain_db": -13})
            if typ == "compare":
                sfx.append({"name": "pop", "at": round(t + 0.35, 3), "gain_db": -12})
                sfx.append({"name": "ding", "at": round(t + 1.05, 3), "gain_db": -13})
            if typ == "cta":
                sfx.append({"name": "click", "at": round(t + props["_click_at"], 3), "gain_db": -6})
            if typ == "kinetic" and props.get("style") == "slam":
                sfx.append({"name": "impact", "at": round(t + 0.25, 3), "gain_db": -9})
            if typ == "three":
                sfx.append({"name": "riser", "at": round(t, 3), "gain_db": -18, "dur": min(1.2, dur * 0.4)})
        for cue in s.get("sfx", []) or []:
            sfx.append({"name": cue["name"], "at": round(t + float(cue.get("at", 0)), 3), "gain_db": float(cue.get("gain_db", -8))})
        t += dur

    total = round(t, 3)

    # captions
    caps_cfg = sb.get("captions", True)
    caps_cfg = {} if caps_cfg is True else ({"enabled": False} if caps_cfg is False else dict(caps_cfg))
    captions = []
    if caps_cfg.get("enabled", True):
        words = []
        for sc in scenes:
            v = vo.get(sc["id"])
            if not v:
                continue
            for w in v["words"]:
                words.append({"w": w["w"], "start": round(sc["vo_offset"] + w["start"], 3), "end": round(sc["vo_offset"] + w["end"], 3)})
        captions = chunk_captions(words, int(caps_cfg.get("max_words", 3 if vertical else 5)),
                                  int(caps_cfg.get("max_chars", 22 if vertical else 34)), caps_cfg.get("strip_punct", True))

    timeline = {
        "title": sb.get("title", "Untitled"),
        "format": {"width": W, "height": H, "fps": fps},
        "duration": total,
        "theme": theme,
        "base": "/project/",
        "scenes": scenes,
        "captions": captions,
        "caption_style": {k: v for k, v in caps_cfg.items() if k in ("size", "bottom", "uppercase", "highlight", "reveal")},
        "fade_in": sb.get("fade_in", 0.2),
        "fade_out": sb.get("fade_out", 0.35),
        "sfx": sorted(sfx, key=lambda x: x["at"]),
        "music": sb.get("music", {"generate": "pulse"}),
        "audio": {"lufs": sb.get("loudness_lufs", -14)},
    }
    save_json(project / "build" / "timeline.json", timeline)
    write_srt(project / "build" / "captions.srt", captions)
    log(f"plan   {len(scenes)} scenes, {total:.2f}s, {W}x{H}@{fps}, {len(captions)} caption chunks, {len(sfx)} sfx cues")
    return timeline


def write_srt(path, captions):
    def ts(x):
        ms = int(round(x * 1000))
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
    lines = []
    for i, c in enumerate(captions, 1):
        lines += [str(i), f"{ts(c['start'])} --> {ts(c['end'])}", " ".join(w["w"] for w in c["words"]), ""]
    Path(path).write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        die("usage: plan.py <project_dir>")
    main(sys.argv[1])
