#!/usr/bin/env python3
"""Audio mix: voiceover + sound effects + music with ducking, normalized to
streaming loudness (-14 LUFS, -1 dBTP by default), then muxed with the video.

Usage: python3 mix.py <project_dir> <video.mp4> <final.mp4>
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import die, load_json, log, run, ffmpeg_major  # noqa: E402
from sfx import cue_file  # noqa: E402


def main(project, video, final):
    project = Path(project).resolve()
    build = project / "build"
    tl = load_json(build / "timeline.json")
    vo = load_json(build / "audio" / "vo.json") if (build / "audio" / "vo.json").exists() else {}
    dur = tl["duration"]
    lufs = float(tl.get("audio", {}).get("lufs", -14))

    inputs, filters, labels = [], [], {"vo": [], "fx": []}

    def add_input(path, loop=False):
        if loop:
            inputs.extend(["-stream_loop", "-1"])
        inputs.extend(["-i", str(path)])
        return len([x for x in inputs if x == "-i"]) - 1

    # voiceover clips placed at their scene offsets
    for sc in tl["scenes"]:
        v = vo.get(sc["id"])
        if not v or sc.get("vo_offset") is None:
            continue
        idx = add_input(project / v["file"])
        ms = int(round(sc["vo_offset"] * 1000))
        lab = f"v{idx}"
        filters.append(f"[{idx}:a]aresample=48000,aformat=channel_layouts=mono,highpass=f=70,"
                       f"acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,adelay={ms}:all=1[{lab}]")
        labels["vo"].append(lab)

    # sound effects
    sdir = build / "sfx"
    for k, cue in enumerate(tl.get("sfx", [])):
        f = sdir / cue_file(cue)
        if not f.exists() or cue["at"] >= dur:
            continue
        at = cue["at"]
        trim = ""
        if at < 0:
            trim = f"atrim=start={-at:.3f},asetpts=PTS-STARTPTS,"
            at = 0
        idx = add_input(f)
        lab = f"s{idx}"
        filters.append(f"[{idx}:a]aresample=48000,aformat=channel_layouts=mono,{trim}volume={cue.get('gain_db', -8)}dB,"
                       f"adelay={int(round(at * 1000))}:all=1[{lab}]")
        labels["fx"].append(lab)

    # music bed
    music = tl.get("music")
    music_file = None
    music_gain = -17.0
    if isinstance(music, dict):
        music_gain = float(music.get("volume_db", -17 if music.get("file") else -15))
        if music.get("file"):
            music_file = project / music["file"]
            if not music_file.exists():
                die(f"music file not found: {music_file}")
        elif (build / "music.wav").exists():
            music_file = build / "music.wav"

    parts = []
    if labels["vo"]:
        n = len(labels["vo"])
        filters.append("".join(f"[{l}]" for l in labels["vo"]) + f"amix=inputs={n}:normalize=0:dropout_transition=0,"
                       f"apad=whole_dur={dur:.3f},atrim=0:{dur:.3f},aformat=channel_layouts=stereo[vobus]")
    if labels["fx"]:
        n = len(labels["fx"])
        filters.append("".join(f"[{l}]" for l in labels["fx"]) + f"amix=inputs={n}:normalize=0:dropout_transition=0,"
                       f"apad=whole_dur={dur:.3f},atrim=0:{dur:.3f},aformat=channel_layouts=stereo[fxbus]")
        parts.append("[fxbus]")
    if music_file:
        idx = add_input(music_file, loop=True)
        fade_out = max(0.0, dur - 1.6)
        filters.append(f"[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{dur:.3f},asetpts=PTS-STARTPTS,"
                       f"volume={music_gain}dB,afade=t=in:d=0.8,afade=t=out:st={fade_out:.3f}:d=1.6[mus]")
        if labels["vo"]:
            filters.append("[vobus]asplit=2[vo_a][vo_sc]")
            filters.append("[mus][vo_sc]sidechaincompress=threshold=0.025:ratio=9:attack=15:release=450:makeup=1[musd]")
            parts += ["[vo_a]", "[musd]"]
        else:
            parts.append("[mus]")
    elif labels["vo"]:
        parts.append("[vobus]")

    if not parts:
        log("mix    no audio sources, writing silent track")
        filters.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{dur:.3f}[out]")
    else:
        filters.append("".join(parts) + f"amix=inputs={len(parts)}:normalize=0:dropout_transition=0,"
                       f"aformat=channel_layouts=stereo,alimiter=limit=0.95:attack=3:release=60[out]")

    graph = build / "mix_graph.txt"
    graph.write_text(";\n".join(filters), encoding="utf-8")
    raw = build / "mix_raw.wav"
    # ffmpeg 7+ reads a filter graph file with "-/filter_complex"; "-filter_complex_script" is gone in ffmpeg 8+
    tail = ["-map", "[out]", "-ar", "48000", "-t", f"{dur:.3f}", str(raw)]
    major = ffmpeg_major()  # 0 = unknown (git build): try the new syntax first
    first, second = ["-/filter_complex"], ["-filter_complex_script"]
    if 0 < major < 7:
        first, second = second, first
    res = run(["ffmpeg", "-y", "-loglevel", "error", *inputs, *first, str(graph), *tail], check=False, capture=True)
    if res.returncode != 0:
        run(["ffmpeg", "-y", "-loglevel", "error", *inputs, *second, str(graph), *tail])

    # two-pass loudness normalization
    res = run(["ffmpeg", "-hide_banner", "-i", str(raw), "-af", f"loudnorm=I={lufs}:TP=-1.0:LRA=11:print_format=json",
               "-f", "null", "-"], capture=True)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", res.stderr, re.S)
    norm = build / "mix.wav"
    if m:
        j = json.loads(m.group(0))
        af = (f"loudnorm=I={lufs}:TP=-1.0:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
              f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    else:
        af = f"loudnorm=I={lufs}:TP=-1.0:LRA=11"
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", af, "-ar", "48000", str(norm)])

    Path(final).parent.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(video), "-i", str(norm), "-map", "0:v:0", "-map", "1:a:0",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(final)])
    log(f"mix    {len(labels['vo'])} voice clip(s), {len(labels['fx'])} sfx, music: {'yes' if music_file else 'no'}, target {lufs} LUFS")
    return final


if __name__ == "__main__":
    if len(sys.argv) < 4:
        die("usage: mix.py <project_dir> <video.mp4> <final.mp4>")
    main(*sys.argv[1:4])
