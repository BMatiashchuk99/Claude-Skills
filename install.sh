#!/usr/bin/env bash
# Motion Studio installer
#   ./install.sh            -> installs for your user (~/.claude/skills/motion-studio)
#   ./install.sh --project  -> installs into ./.claude/skills of the current folder
#   ./install.sh --dir PATH -> installs into PATH/motion-studio (Codex, Cursor, other agents)
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/skills/motion-studio"
DEST="$HOME/.claude/skills"
case "${1:-}" in
  --project) DEST="$(pwd)/.claude/skills" ;;
  --dir) DEST="${2:?usage: ./install.sh --dir PATH}" ;;
esac

mkdir -p "$DEST"
rm -rf "$DEST/motion-studio"
cp -R "$SRC" "$DEST/motion-studio"
echo "✓ skill copied to $DEST/motion-studio"

cd "$DEST/motion-studio/scripts"
if command -v npm >/dev/null; then
  npm install --no-audit --no-fund --loglevel=error
  npx playwright install chromium || echo "! could not download Chromium; installed Chrome will be used if present"
else
  echo "! npm not found - install Node.js 18+ from https://nodejs.org, then run: cd \"$PWD\" && npm install"
fi

if command -v pip3 >/dev/null; then
  pip3 install --user edge-tts >/dev/null 2>&1 || pip3 install --break-system-packages edge-tts >/dev/null 2>&1 || true
fi

python3 doctor.py || true
echo
echo "Done. In Claude Code just ask: \"Make a 30 second vertical promo video for <your product>\""
