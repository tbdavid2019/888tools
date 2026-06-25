#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSET_DIR="$ROOT_DIR/public/models/meeting-captions-sensevoice"
REMOTE_BASE="https://csukuangfj-web-assembly-vad-asr-sherpa-onnx-zh-en-.ms.show"

mkdir -p "$ASSET_DIR"

echo "Downloading SenseVoice browser runtime into $ASSET_DIR"

curl -L "$REMOTE_BASE/sherpa-onnx-wasm-main-vad-asr.js" -o "$ASSET_DIR/sherpa-onnx-wasm-main-vad-asr.js"
curl -L "$REMOTE_BASE/sherpa-onnx-wasm-main-vad-asr.wasm" -o "$ASSET_DIR/sherpa-onnx-wasm-main-vad-asr.wasm"
curl -L "$REMOTE_BASE/sherpa-onnx-wasm-main-vad-asr.data" -o "$ASSET_DIR/sherpa-onnx-wasm-main-vad-asr.data"

ls -lh "$ASSET_DIR"/sherpa-onnx-wasm-main-vad-asr.*
