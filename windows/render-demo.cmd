@echo off
rem Same as render.cmd, but with a clean console for screen recordings: no folders, no user name.
setlocal
title AI VIDEO RENDER
prompt $G
mode con: cols=100 lines=28 >nul 2>nul
call "%~dp0_env.cmd"
set "PROJECT=%~1"
if "%PROJECT%"=="" (echo Usage: render-demo.cmd ^<project^> & pause & exit /b 1)
for /f "usebackq delims=" %%C in (`powershell -NoProfile -Command "(Get-CimInstance Win32_Processor | Select-Object -First 1).Name.Trim()"`) do set "CPUNAME=%%C"
set MS_DEMO=1
cls
echo.
echo   ===================================================
echo     AI VIDEO RENDER  ^|  LOCAL PC
if defined GPUNAME echo     GPU  : %GPUNAME%
echo     CPU  : %CPUNAME%
echo     MODE : %WORKERS% parallel workers %GPUFLAGS%
echo   ===================================================
echo.
echo   Press any key to start...
pause >nul
echo   Start:  %time:~0,8%
echo.
python "%MS%\build.py" "%PROJECTS%\%PROJECT%" --workers %WORKERS% %GPUFLAGS% --out "%OUTPUT%\%PROJECT%.mp4"
echo.
echo   Finish: %time:~0,8%
pause >nul
