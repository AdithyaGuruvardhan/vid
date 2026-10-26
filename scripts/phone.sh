#!/usr/bin/env bash
# Phone-size readability check: 1 frame per second at 360px wide.
#   bash scripts/phone.sh [video] [out]
set -euo pipefail
IN=${1:-out/final.mp4}
OUT=${2:-out/phone.png}
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
ROWS=$(python3 -c "import math; print(math.ceil(math.ceil($DUR) / 5))")
ffmpeg -y -loglevel error -i "$IN" -vf "fps=1,scale=360:-1,tile=5x${ROWS}:padding=4:color=0x222222" -frames:v 1 "$OUT"
echo "✓ $OUT  (frame n is at n s)"
