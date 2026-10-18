#!/usr/bin/env python3
"""Voiceover: turns each scene's narration into a WAV file plus word timings.

Providers (storyboard "voice.provider", default "auto" = first that works):
  elevenlabs  needs ELEVENLABS_API_KEY (free plan works). Real word timings.
  edge        free Microsoft neural voices via `pip install edge-tts`. Real word timings. Needs internet.
  piper       offline neural TTS: `piper` binary + PIPER_MODEL=/path/voice.onnx. Estimated timings.
  say         macOS built-in voices. Estimated timings.
  espeak      espeak-ng / espeak (robotic, offline). Estimated timings.
  silent      no audio, durations estimated from word count (for layout previews).

Usage: python3 tts.py <project_dir>
Writes build/audio/<scene>.<hash>.wav and build/audio/vo.json
"""
import asyncio
import base64
import hashlib
import json
import os
import platform
import re
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import die, ffprobe_duration, has, load_json, log, run, save_json  # noqa: E402

EDGE_VOICES = {
    "en": "en-US-AndrewNeural", "uk": "uk-UA-OstapNeural", "de": "de-DE-ConradNeural", "es": "es-ES-AlvaroNeural",
    "fr": "fr-FR-HenriNeural", "pl": "pl-PL-MarekNeural", "it": "it-IT-DiegoNeural", "pt": "pt-BR-AntonioNeural",
    "nl": "nl-NL-MaartenNeural", "tr": "tr-TR-AhmetNeural", "ja": "ja-JP-KeitaNeural", "ko": "ko-KR-InJoonNeural",
    "zh": "zh-CN-YunxiNeural", "hi": "hi-IN-MadhurNeural", "ar": "ar-SA-HamedNeural", "cs": "cs-CZ-AntoninNeural",
}
ESPEAK_LANG = {"en": "en-us", "uk": "uk", "zh": "cmn"}
SR = 48000


def to_wav(src, dst):
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-ac", "1", "-ar", str(SR), str(dst)])


def speech_span(wav):
    """Return (start, end) of audible speech using ffmpeg silencedetect."""
    dur = ffprobe_duration(wav)
    res = run(["ffmpeg", "-hide_banner", "-i", str(wav), "-af", "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"],
              capture=True, check=False)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", res.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", res.stderr)]
    s0, s1 = 0.0, dur
    if starts and starts[0] < 0.05 and ends:
        s0 = ends[0]
    if starts and (len(ends) < len(starts) or (ends and abs(ends[-1] - dur) < 0.05)):
        s1 = starts[-1]
    if s1 - s0 < 0.2:
        s0, s1 = 0.0, dur
    return s0, s1


def estimate_words(text, start, end):
    """Spread words across [start, end] weighted by length, with pauses after punctuation."""
    toks = text.split()
    if not toks:
        return []
    weights = []
    for w in toks:
        wt = len(re.sub(r"\W", "", w)) + 2.0
        weights.append(wt)
    pauses = [4.0 if re.search(r"[.!?…]$", w) else 2.0 if re.search(r"[,;:—–-]$", w) else 0.0 for w in toks]
    total = sum(weights) + sum(pauses[:-1])
    span = max(0.1, end - start)
    t = start
    out = []
    for i, w in enumerate(toks):
        d = span * weights[i] / total
        out.append({"w": w, "start": round(t, 3), "end": round(t + d, 3)})
        t += d + (span * pauses[i] / total if i < len(toks) - 1 else 0)
    return out


def align_tokens(words, text):
    """Provider words often lose punctuation; put the original tokens back when counts match."""
    toks = text.split()
    if len(toks) == len(words):
        for w, tok in zip(words, toks):
            w["w"] = tok
    return words


# ---------------- providers ----------------

def p_elevenlabs(text, cfg, out):
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY not set")
    voice = cfg.get("voice_id") or os.environ.get("ELEVENLABS_VOICE_ID") or "21m00Tcm4TlvDq8ikWAM"
    body = json.dumps({
        "text": text,
        "model_id": cfg.get("model", "eleven_multilingual_v2"),
        "voice_settings": {"stability": cfg.get("stability", 0.45), "similarity_boost": 0.8, "style": cfg.get("style", 0.2)},
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128",
        data=body, headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.loads(r.read())
    mp3 = out.with_suffix(".mp3")
    mp3.write_bytes(base64.b64decode(data["audio_base64"]))
    to_wav(mp3, out)
    mp3.unlink(missing_ok=True)
    al = data.get("alignment") or {}
    chars = al.get("characters") or []
    st = al.get("character_start_times_seconds") or []
    en = al.get("character_end_times_seconds") or []
    words, cur, ws, we = [], "", None, None
    for c, a, b in zip(chars, st, en):
        if c.isspace():
            if cur:
                words.append({"w": cur, "start": round(ws, 3), "end": round(we, 3)})
            cur, ws = "", None
        else:
            if ws is None:
                ws = a
            cur += c
            we = b
    if cur:
        words.append({"w": cur, "start": round(ws, 3), "end": round(we, 3)})
    return words


def p_edge(text, cfg, out):
    import edge_tts  # noqa: F401  (raises ImportError when missing)

    voice = cfg.get("voice") or EDGE_VOICES.get(cfg.get("_lang", "en"), EDGE_VOICES["en"])
    rate = cfg.get("rate", "+0%")
    pitch = cfg.get("pitch", "+0Hz")
    mp3 = out.with_suffix(".mp3")

    async def go():
        try:
            comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
        except TypeError:  # edge-tts < 7
            comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        words = []
        with open(mp3, "wb") as f:
            async for ch in comm.stream():
                if ch["type"] == "audio":
                    f.write(ch["data"])
                elif ch["type"] == "WordBoundary":
                    s = ch["offset"] / 1e7
                    words.append({"w": ch["text"], "start": round(s, 3), "end": round(s + ch["duration"] / 1e7, 3)})
        return words

    words = asyncio.run(go())
    if mp3.stat().st_size < 1000:
        raise RuntimeError("edge-tts returned no audio")
    to_wav(mp3, out)
    mp3.unlink(missing_ok=True)
    return align_tokens(words, text) if words else None


def p_piper(text, cfg, out):
    model = cfg.get("piper_model") or os.environ.get("PIPER_MODEL")
    if not (has("piper") and model):
        raise RuntimeError("piper binary or PIPER_MODEL missing")
    raw = out.with_suffix(".raw.wav")
    run(["piper", "--model", model, "--output_file", str(raw)], input=text, capture=True)
    to_wav(raw, out)
    raw.unlink(missing_ok=True)
    return None


def p_say(text, cfg, out):
    if platform.system() != "Darwin" or not has("say"):
        raise RuntimeError("macOS `say` not available")
    aiff = out.with_suffix(".aiff")
    cmd = ["say", "-o", str(aiff)]
    if cfg.get("say_voice"):
        cmd += ["-v", cfg["say_voice"]]
    run(cmd + [text])
    to_wav(aiff, out)
    aiff.unlink(missing_ok=True)
    return None


def p_espeak(text, cfg, out):
    exe = "espeak-ng" if has("espeak-ng") else "espeak" if has("espeak") else None
    if not exe:
        raise RuntimeError("espeak not installed")
    lang = cfg.get("_lang", "en")
    raw = out.with_suffix(".raw.wav")
    run([exe, "-v", ESPEAK_LANG.get(lang, lang), "-s", str(cfg.get("espeak_speed", 165)), "-w", str(raw), text])
    to_wav(raw, out)
    raw.unlink(missing_ok=True)
    return None


def p_silent(text, cfg, out):
    n = max(1, len(text.split()))
    dur = n / 2.6 + 0.2
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", f"{dur:.3f}", str(out)])
    return estimate_words(text, 0.1, dur - 0.1)


PROVIDERS = {"elevenlabs": p_elevenlabs, "edge": p_edge, "piper": p_piper, "say": p_say, "espeak": p_espeak, "silent": p_silent}
AUTO_ORDER = ["elevenlabs", "edge", "piper", "say", "espeak", "silent"]


def synth(text, cfg, out):
    want = cfg.get("provider", "auto")
    order = AUTO_ORDER if want == "auto" else [want]
    errors = []
    for name in order:
        try:
            words = PROVIDERS[name](text, cfg, out)
            if not out.exists() or out.stat().st_size < 1000:
                raise RuntimeError("no audio written")
            if not words:
                s0, s1 = speech_span(out)
                words = estimate_words(text, s0, s1)
            return name, words
        except Exception as e:  # try the next provider
            errors.append(f"{name}: {e}")
            if want != "auto":
                break
    die("voiceover failed:\n  " + "\n  ".join(errors))


def main(project):
    project = Path(project).resolve()
    sb = load_json(project / "storyboard.json")
    cfg = dict(sb.get("voice") or {})
    cfg["_lang"] = sb.get("language", "en")
    if os.environ.get("MOTION_STUDIO_VOICE"):
        cfg["provider"] = os.environ["MOTION_STUDIO_VOICE"]
    adir = project / "build" / "audio"
    adir.mkdir(parents=True, exist_ok=True)
    index_path = adir / "vo.json"
    result = {}
    used = set()
    for sc in sb["scenes"]:
        text = (sc.get("narration") or "").strip()
        if not text:
            continue
        key = json.dumps({k: v for k, v in cfg.items()}, sort_keys=True) + "|" + text
        hsh = hashlib.sha1(key.encode()).hexdigest()[:10]
        out = adir / f"{sc['id']}.{hsh}.wav"
        meta = out.with_suffix(".json")
        if out.exists() and meta.exists():
            m = load_json(meta)
            log(f"voice  {sc['id']}: cached ({m['provider']})")
        else:
            name, words = synth(text, cfg, out)
            m = {"provider": name, "words": words}
            save_json(meta, m)
            log(f"voice  {sc['id']}: {name}, {ffprobe_duration(out):.2f}s")
        used.add(m["provider"])
        result[sc["id"]] = {"file": str(out.relative_to(project)), "duration": round(ffprobe_duration(out), 3),
                            "provider": m["provider"], "words": m["words"]}
    save_json(index_path, result)
    if used:
        log("voice providers used: " + ", ".join(sorted(used)))
        if used & {"espeak", "silent"}:
            log("tip: for natural voices run `pip install edge-tts` (free) or set ELEVENLABS_API_KEY")
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        die("usage: tts.py <project_dir>")
    main(sys.argv[1])
