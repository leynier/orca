@echo off
setlocal
set "ROOT=%~dp0.."
for /f "delims=" %%v in ('node -p "require('%~dp0..\package.json').version" 2^>nul') do set "ORCA_VERSION=%%v"
if not defined ORCA_VERSION set "ORCA_VERSION=0.0.0-gpuix"
node "%ROOT%\out\gpuix\orca-gpuix.js" %*
endlocal
