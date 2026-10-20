@echo off
rem Re-mix the audio only (voice, sound effects, music) without rendering the frames again.
setlocal
call "%~dp0_env.cmd"
set "PROJECT=%~1"
if "%PROJECT%"=="" (echo Usage: mix.cmd ^<project^> & pause & exit /b 1)
pushd "%MS%"
python -c "import sys,pathlib,sfx,mix; p=pathlib.Path(sys.argv[1]).resolve(); sfx.main(p); mix.main(p, p/'build'/'video.mp4', pathlib.Path(sys.argv[2]).resolve())" "%PROJECTS%\%PROJECT%" "%OUTPUT%\%PROJECT%.mp4"
popd
echo Done: output\%PROJECT%.mp4
pause
