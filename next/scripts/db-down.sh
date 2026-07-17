#!/usr/bin/env bash
set -euo pipefail

NAME="${ROSTER_PG_NAME:-roster-pg}"

if ! command -v container >/dev/null 2>&1; then
  echo "Apple container CLI not found."
  exit 1
fi

if container list --all 2>/dev/null | grep -q "$NAME"; then
  echo "Stopping $NAME..."
  container stop "$NAME" >/dev/null 2>&1 || true
  echo "Removing $NAME..."
  container rm "$NAME" >/dev/null 2>&1 || true
  echo "Done."
else
  echo "No container named $NAME."
fi
