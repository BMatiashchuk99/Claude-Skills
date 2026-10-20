#!/usr/bin/env bash
# Builds dist/AI-Video-Studio-Windows.zip: the Motion Studio skill + Windows helpers for local GPU rendering,
# an example project and a Claude app plugin file. Upload the zip to a GitHub release.
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=AI-Video-Studio-Windows
OUT=dist/$NAME
rm -rf "$OUT" "dist/$NAME.zip"
mkdir -p "$OUT/skills" "$OUT/projects" "$OUT/output"
cp -r skills/motion-studio "$OUT/skills/"
rm -rf "$OUT/skills/motion-studio/scripts/node_modules" "$OUT/skills/motion-studio/scripts/__pycache__"
cp windows/*.cmd "$OUT/"
cp -r examples/launch-teaser "$OUT/projects/"
cp windows/README.txt "$OUT/README.txt"
# Claude app (claude.ai / desktop) plugin with the same skill
P=$(mktemp -d)
mkdir -p "$P/.claude-plugin" "$P/skills"
cp -r "$OUT/skills/motion-studio" "$P/skills/"
cat > "$P/.claude-plugin/plugin.json" <<JSON
{ "name": "motion-studio", "version": "1.1.0", "description": "Turn one prompt into a finished motion-graphics video (MP4).", "author": { "name": "BMatiashchuk99" }, "repository": "https://github.com/BMatiashchuk99/Claude-Skills", "license": "MIT" }
JSON
(cd "$P" && zip -qr "$OLDPWD/$OUT/motion-studio.plugin" .)
rm -rf "$P"
(cd dist && zip -qr "$NAME.zip" "$NAME")
echo "dist/$NAME.zip  ($(du -h "dist/$NAME.zip" | cut -f1))"
