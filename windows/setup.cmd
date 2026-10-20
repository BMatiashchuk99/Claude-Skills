@echo off
setlocal
title AI Video Studio - setup
call "%~dp0_env.cmd"
echo.
echo   AI Video Studio - one-time setup
echo   ================================
echo.
set NEWTOOLS=0
call :need node    OpenJS.NodeJS.LTS  "Node.js"
call :need ffmpeg  Gyan.FFmpeg        "FFmpeg"
python -c "import sys" >nul 2>nul
if errorlevel 1 (
  echo   [..] Python not found - installing
  winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
  set NEWTOOLS=1
) else (echo   [ok] Python)
if "%NEWTOOLS%"=="1" (
  echo.
  echo   New tools were installed. Close this window and run setup.cmd once more
  echo   so Windows picks them up.
  pause
  exit /b 0
)
echo.
echo   Installing the renderer...
pushd "%MS%"
call npm install --no-audit --no-fund --loglevel=error || (echo   npm install failed & popd & pause & exit /b 1)
popd
if not defined CHROME_PATH (
  echo   No Chrome or Edge found - downloading Chromium for the renderer...
  pushd "%MS%" & call npx playwright install chromium & popd
)
echo.
if defined GPUNAME (echo   [ok] GPU: %GPUNAME%  - hardware rendering + NVENC enabled) else (echo   [--] No NVIDIA GPU found - CPU encoding will be used)
echo   [ok] %NUMBER_OF_PROCESSORS% CPU threads - %WORKERS% render workers
echo.
choice /c YN /n /m "  Also install the skill for Claude Code (%USERPROFILE%\.claude\skills)? [Y/N] "
if errorlevel 2 goto done
xcopy "%ROOT%skills\motion-studio" "%USERPROFILE%\.claude\skills\motion-studio\" /e /i /y /q >nul && echo   [ok] Skill installed for Claude Code
:done
python "%MS%\doctor.py"
echo.
echo   All set. Put a project folder into "projects" and run:  render.cmd ^<project^>
pause
exit /b 0

:need
where %1 >nul 2>nul
if errorlevel 1 (
  echo   [..] %~3 not found - installing
  winget install -e --id %2 --accept-package-agreements --accept-source-agreements
  rem winget returns 1603 / non-zero when the tool is already installed but not on PATH yet
  set NEWTOOLS=1
) else (echo   [ok] %~3)
exit /b 0
