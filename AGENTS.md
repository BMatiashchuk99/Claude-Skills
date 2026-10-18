# Motion Studio for any coding agent

This repo contains a skill that turns a prompt into a finished motion-graphics MP4.
Agents that don't load Claude-style skills automatically (Codex, Cursor, Antigravity,
Windsurf, Aider ...) can use it by following `skills/motion-studio/SKILL.md`.

When the user asks for a video:
1. Read `skills/motion-studio/SKILL.md` and `skills/motion-studio/references/storyboard.md`.
2. Write `<project>/storyboard.json`.
3. Run `python3 skills/motion-studio/scripts/build.py <project> --stills`, look at
   `<project>/build/contact_sheet.png`, fix problems.
4. Run `python3 skills/motion-studio/scripts/build.py <project>`; the result is in `<project>/out/`.

Cursor: copy this file's steps into `.cursor/rules/motion-studio.mdc` if you want it always on.
