@echo off
setlocal
cd /d "%~dp0"

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo ERROR: origin is not configured.
  echo Read README.md and finish the first-time GitHub setup.
  exit /b 1
)

git pull --rebase --autostash origin main
if errorlevel 1 exit /b 1

git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Update clinic timetable"
  if errorlevel 1 exit /b 1
)

git push origin main
if errorlevel 1 exit /b 1

echo Sync complete. GitHub Pages deployment has been triggered.
endlocal
