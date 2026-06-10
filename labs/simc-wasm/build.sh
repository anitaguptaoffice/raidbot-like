#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LAB_DIR="$ROOT_DIR/labs/simc-wasm"
SIMC_SRC_DIR="${SIMC_SRC_DIR:-$ROOT_DIR/.tools/simc-src}"
ENGINE_DIR="$SIMC_SRC_DIR/engine"
BUILD_DIR="$LAB_DIR/.build/simc-src"
OUT_DIR="$LAB_DIR/public/dist"
BUILD_JOBS="${SIMC_WASM_BUILD_JOBS:-}"
ENABLE_PTHREADS="${SIMC_WASM_PTHREADS:-1}"

if [[ -z "$BUILD_JOBS" ]]; then
  if command -v sysctl >/dev/null 2>&1; then
    BUILD_JOBS="$(sysctl -n hw.ncpu 2>/dev/null || true)"
  fi

  if [[ -z "$BUILD_JOBS" ]] && command -v nproc >/dev/null 2>&1; then
    BUILD_JOBS="$(nproc 2>/dev/null || true)"
  fi
fi

BUILD_JOBS="${BUILD_JOBS:-4}"

if ! command -v emcc >/dev/null 2>&1; then
  echo "emcc not found. Install and activate Emscripten SDK first:" >&2
  echo "  git clone https://github.com/emscripten-core/emsdk.git /tmp/emsdk" >&2
  echo "  /tmp/emsdk/emsdk install latest" >&2
  echo "  /tmp/emsdk/emsdk activate latest" >&2
  echo "  source /tmp/emsdk/emsdk_env.sh" >&2
  exit 1
fi

if [[ ! -f "$ENGINE_DIR/Makefile" ]]; then
  echo "SimulationCraft source not found at $SIMC_SRC_DIR." >&2
  echo "Run ./scripts/install-simc-macos.sh first, or set SIMC_SRC_DIR=/path/to/simc." >&2
  exit 1
fi

rm -rf "$BUILD_DIR" "$OUT_DIR"
mkdir -p "$(dirname "$BUILD_DIR")" "$OUT_DIR"

echo "Copying SimulationCraft source into lab build directory..."
rsync -a --delete \
  --exclude '.git' \
  --exclude 'engine/*.o' \
  --exclude 'engine/*.d' \
  --exclude 'engine/simc' \
  "$SIMC_SRC_DIR/" "$BUILD_DIR/"

echo "Patching Emscripten process priority handling..."
perl -0pi -e 's/#elif defined\(SC_OSX\) \|\| defined\(__unix__\)/#elif defined(__EMSCRIPTEN__)\nvoid computer_process::set_priority( priority_e )\n{\n  \/\/ Browser WASM cannot change OS process priority.\n}\n#elif defined(SC_OSX) || defined(__unix__)/' \
  "$BUILD_DIR/engine/util/concurrency.cpp"

echo "Building SimulationCraft with Emscripten using $BUILD_JOBS parallel jobs..."
COMMON_OPTS="-DSC_NO_NETWORKING -fexceptions -sNO_DISABLE_EXCEPTION_CATCHING=1"
COMMON_LINK_FLAGS="-fexceptions -sNO_DISABLE_EXCEPTION_CATCHING=1 -sENVIRONMENT=web,worker -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createSimcModule -sFORCE_FILESYSTEM=1 -sALLOW_MEMORY_GROWTH=1 -sEXIT_RUNTIME=1 -sINVOKE_RUN=0 -sEXPORTED_RUNTIME_METHODS=['FS','callMain']"

if [[ "$ENABLE_PTHREADS" == "1" ]]; then
  echo "WASM pthreads enabled. The site must serve COOP/COEP headers for SharedArrayBuffer."
  COMMON_OPTS="$COMMON_OPTS -pthread"
  COMMON_LINK_FLAGS="$COMMON_LINK_FLAGS -pthread -sUSE_PTHREADS=1 -sPTHREAD_POOL_SIZE=16 -sINITIAL_MEMORY=268435456"
else
  echo "WASM pthreads disabled."
fi

(
  cd "$BUILD_DIR/engine"
  emmake make clean || true
  emmake make -j "$BUILD_JOBS" \
    CXX=em++ \
    AR=emar \
    OS=UNIX \
    FLAVOR=Emscripten \
    SC_NO_NETWORKING=1 \
    NO_DEBUG=1 \
    MODULE=simc.js \
    "OPTS=$COMMON_OPTS" \
    "LINK_FLAGS=$COMMON_LINK_FLAGS" \
    "LINK_LIBS="
)

cp "$BUILD_DIR/engine/simc.js" "$OUT_DIR/simc.js"
if [[ -f "$BUILD_DIR/engine/simc.wasm" ]]; then
  cp "$BUILD_DIR/engine/simc.wasm" "$OUT_DIR/simc.wasm"
fi

echo "Compressing wasm artifacts..."
if [[ -f "$OUT_DIR/simc.wasm" ]]; then
  gzip -k -f -9 "$OUT_DIR/simc.wasm"

  if command -v brotli >/dev/null 2>&1; then
    brotli -f -q 11 "$OUT_DIR/simc.wasm"
  else
    echo "brotli not found; skipped .br artifact."
  fi
fi

echo "Built wasm experiment artifacts:"
find "$OUT_DIR" -maxdepth 1 -type f -print -exec ls -lh {} \;
