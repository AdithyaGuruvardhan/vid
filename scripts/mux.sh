#!/usr/bin/env bash
# Combine the silent render with procedural SFX (and optional music) into the final MP4.
#   bash scripts/mux.sh [video] [sfx] [out]
#   MUSIC=audio/song.wav bash scripts/mux.sh
set -euo pipefail
VIDEO=${1:-out/silent.mp4}
SFX=${2:-out/sfx.wav}
OUT=${3:-out/final.mp4}
MUSIC=${MUSIC:-}

if [[ -n "$MUSIC" ]]; then
  ffmpeg -y -loglevel error -i "$VIDEO" -i "$SFX" -i "$MUSIC" \
    -filter_complex "[2:a]volume=0.55[m];[1:a][m]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 320k -shortest -movflags +faststart "$OUT"
else
  ffmpeg -y -loglevel error -i "$VIDEO" -i "$SFX" \
    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest -movflags +faststart "$OUT"
fi
echo "✓ $OUT"
