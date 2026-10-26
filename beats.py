#!/usr/bin/env python3
"""Analyze a music track and write beats.json so the timeline can sync to it.

Usage:
    .venv/bin/python beats.py audio/song.wav [-o beats.json]

Output: {"bpm", "duration", "beats", "downbeats", "peaks"} — all times in seconds.
Import it from src/timeline.js and snap scene changes to downbeats, clicks to peaks.
"""
import argparse
import json

import librosa
import numpy as np

HOP = 512


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("audio")
    p.add_argument("-o", "--out", default="beats.json")
    p.add_argument("--peaks", type=int, default=24, help="max number of strong peaks to keep")
    args = p.parse_args()

    y, sr = librosa.load(args.audio, sr=None, mono=True)
    onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
    onset = onset / (onset.max() or 1)

    tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=HOP)
    beats = librosa.frames_to_time(beat_frames, sr=sr, hop_length=HOP)

    # Downbeats: assume 4/4 and take the beat phase that carries the most onset energy.
    strength = onset[np.minimum(beat_frames, len(onset) - 1)]
    phase = int(np.argmax([strength[i::4].sum() for i in range(4)])) if len(beats) >= 4 else 0
    downbeats = beats[phase::4]

    # Peaks: the strongest transients, at least 0.25s apart.
    frames = librosa.util.peak_pick(onset, pre_max=3, post_max=3, pre_avg=10, post_avg=10,
                                    delta=0.2, wait=int(0.25 * sr / HOP))
    frames = sorted(frames, key=lambda f: -onset[f])[: args.peaks]
    peaks = sorted(librosa.frames_to_time(np.array(frames, dtype=int), sr=sr, hop_length=HOP))

    r = lambda xs: [round(float(x), 3) for x in xs]
    result = {
        "source": args.audio,
        "duration": round(len(y) / sr, 3),
        "bpm": round(float(np.atleast_1d(tempo)[0]), 2),
        "beats": r(beats),
        "downbeats": r(downbeats),
        "peaks": r(peaks),
    }
    with open(args.out, "w") as f:
        json.dump(result, f, indent=2)
    print(f"✓ {args.out}  {result['bpm']} BPM, {len(beats)} beats, {len(downbeats)} downbeats, {len(peaks)} peaks")


if __name__ == "__main__":
    main()
