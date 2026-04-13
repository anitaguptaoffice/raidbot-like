#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="$ROOT_DIR/.tools"
SRC_DIR="$TOOLS_DIR/simc-src"
BIN_DIR="$TOOLS_DIR/bin"
SIMC_LINK="$BIN_DIR/simc"
SIMC_REPO="https://github.com/simulationcraft/simc.git"
SIMC_BRANCH="${SIMC_BRANCH:-thewarwithin}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script is only for macOS." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required." >&2
  exit 1
fi

if ! command -v make >/dev/null 2>&1; then
  echo "make is required." >&2
  exit 1
fi

mkdir -p "$TOOLS_DIR" "$BIN_DIR"

if [[ ! -d "$SRC_DIR/.git" ]]; then
  git clone --depth 1 --branch "$SIMC_BRANCH" "$SIMC_REPO" "$SRC_DIR"
else
  git -C "$SRC_DIR" fetch origin "$SIMC_BRANCH" --depth 1
  git -C "$SRC_DIR" checkout "$SIMC_BRANCH"
  git -C "$SRC_DIR" reset --hard "origin/$SIMC_BRANCH"
fi

make -C "$SRC_DIR/engine" optimized

ln -sf "$SRC_DIR/engine/simc" "$SIMC_LINK"

echo "SimulationCraft CLI is ready:"
echo "  $SIMC_LINK"
echo
echo "This project will auto-detect the local binary at .tools/bin/simc."
