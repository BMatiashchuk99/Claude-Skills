@echo off
setlocal
call "%~dp0_env.cmd"
set "PROJECT=%~1"
if "%PROJECT%"=="" (
  echo Usage: render.cmd ^<project^>   - projects found:
  dir /b /ad "%PROJECTS%"
  pause
  exit /b 1
)
if not exist "%PROJECTS%\%PROJECT%\storyboard.json" (echo No storyboard.json in projects\%PROJECT% & pause & exit /b 1)
echo Rendering %PROJECT% - %WORKERS% workers %GPUFLAGS% %GPUNAME%
python "%MS%\build.py" "%PROJECTS%\%PROJECT%" --workers %WORKERS% %GPUFLAGS% --out "%OUTPUT%\%PROJECT%.mp4"
if errorlevel 1 (echo. & echo Render failed. If frames look broken, try:  set MS_NO_GPU=1 ^& render.cmd %PROJECT% & pause & exit /b 1)
echo.
echo Done: output\%PROJECT%.mp4
pause
