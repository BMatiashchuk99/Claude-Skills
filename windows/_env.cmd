@rem Shared settings for the Windows helpers. Finds the skill, project and output folders,
@rem a browser for rendering and the GPU options. Called by the other .cmd files.
if exist "%~dp0skills\motion-studio\scripts\build.py" (set "ROOT=%~dp0") else (for %%I in ("%~dp0..") do set "ROOT=%%~fI\")
set "MS=%ROOT%skills\motion-studio\scripts"
set "PROJECTS=%ROOT%projects"
set "OUTPUT=%ROOT%output"
if not exist "%PROJECTS%" mkdir "%PROJECTS%"
if not exist "%OUTPUT%" mkdir "%OUTPUT%"
set PYTHONUTF8=1
if not defined CHROME_PATH (
  if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
)
if not defined CHROME_PATH (
  if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "CHROME_PATH=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
)
set "GPUFLAGS="
set "GPUNAME="
where nvidia-smi >nul 2>nul && (
  set "GPUFLAGS=--gpu --nvenc"
  for /f "usebackq delims=" %%G in (`nvidia-smi --query-gpu^=name --format^=csv^,noheader 2^>nul`) do if not defined GPUNAME set "GPUNAME=%%G"
)
if not defined GPUFLAGS set "GPUFLAGS=--gpu"
if defined MS_NO_GPU set "GPUFLAGS="
set /a WORKERS=%NUMBER_OF_PROCESSORS%/2
if %WORKERS% LSS 1 set WORKERS=1
if %WORKERS% GTR 8 set WORKERS=8
exit /b 0
