AI VIDEO STUDIO - render motion-graphics videos on your own PC
==============================================================

1. Double-click  setup.cmd
   Installs Node.js, Python and FFmpeg (via winget) and the renderer. If it says new tools were
   installed, close the window and run setup.cmd once more.

2. Install the skill in Claude
   - Claude app: install the  motion-studio.plugin  file (open it with the Claude desktop app,
     or upload it where you manage plugins)
   - Claude Code: setup.cmd can copy it to %USERPROFILE%\.claude\skills for you

3. Ask Claude for a video, e.g.
   "Make a 30-second vertical promo for my app. Put the project in projects\my-promo."
   Claude writes the storyboard, voice-over and scenes.

4. Render it on your GPU:
      render.cmd my-promo
   The MP4 appears in  output\my-promo.mp4
   Try the included example:  render.cmd launch-teaser

Other helpers
   mix.cmd <project>          re-mix only the audio, no re-render
   render-demo.cmd <project>  clean console for screen recordings (no folders or user name)

Speed: NVIDIA RTX GPUs get hardware rendering + NVENC automatically. Without one it still works,
just slower. If frames ever look broken:  set MS_NO_GPU=1  and run render.cmd again.

Full guide and source: https://github.com/BMatiashchuk99/Claude-Skills
