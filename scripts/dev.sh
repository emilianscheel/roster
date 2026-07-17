#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/next"
exec bash scripts/dev.sh
