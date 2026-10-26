#!/usr/bin/env bash
# Play the video twice back to back to inspect the loop seam.
#   bash scripts/loop.sh [video] [out]
set -euo pipefail
IN=${1:-out/final.mp4}
OUT=${2:-out/loop_check.mp4}
ffmpeg -y -loglevel error -stream_loop 1 -i "$IN" -c copy "$OUT"
echo "✓ $OUT  (watch the join at the original duration)"
