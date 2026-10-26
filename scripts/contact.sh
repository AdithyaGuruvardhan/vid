#!/usr/bin/env bash
# Contact sheet: 2 frames per second, 6 columns, rows sized to the video length.
#   bash scripts/contact.sh [video] [out]
set -euo pipefail
IN=${1:-out/final.mp4}
OUT=${2:-out/contact.png}
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
ROWS=$(python3 -c "import math; print(math.ceil(math.ceil($DUR * 2) / 6))")
ffmpeg -y -loglevel error -i "$IN" -vf "fps=2,scale=270:-1,tile=6x${ROWS}:padding=4:color=0x222222" -frames:v 1 "$OUT"
echo "✓ $OUT  (frame n is at n×0.5s, left→right, top→bottom)"
