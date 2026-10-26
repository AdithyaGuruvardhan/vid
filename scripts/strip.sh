#!/usr/bin/env bash
# 12 consecutive frames starting just before a timestamp, to inspect fast motion.
#   bash scripts/strip.sh 4.2 [video] [out]
set -euo pipefail
AT=${1:?usage: strip.sh <seconds> [video] [out]}
IN=${2:-out/final.mp4}
OUT=${3:-out/strip_${AT}.png}
START=$(python3 -c "print(max(0, $AT - 0.1))")
ffmpeg -y -loglevel error -ss "$START" -i "$IN" -vf "scale=320:-1,tile=12x1:padding=2:color=0x222222" -frames:v 1 "$OUT"
echo "✓ $OUT"
