@echo off
echo =========================================
echo  Portal Site Deploy Script (with GitHub Sync)
echo =========================================
echo.

set GIT_PATH="C:\Program Files\Git\bin\git.exe"

echo [1/5] Adding changes to Git...
%GIT_PATH% add .
if %errorlevel% neq 0 (
    echo [ERROR] Git add failed. Is Git installed?
    pause
    exit /b %errorlevel%
)

echo [2/5] Committing changes...
%GIT_PATH% commit -m "Update via deploy.bat: %date% %time%"
:: Commit failure usually means "nothing to commit", which is fine to ignore

echo [3/5] Pushing to GitHub...
%GIT_PATH% push origin main
if %errorlevel% neq 0 (
    echo [ERROR] Git push failed. Check your internet connection or GitHub credentials.
    pause
    exit /b %errorlevel%
)

echo [4/5] Building Project...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed.
    pause
    exit /b %errorlevel%
)

echo [5/5] Deploying to Firebase Hosting...
call npx firebase deploy --only hosting
if %errorlevel% neq 0 (
    echo [ERROR] Deployment failed.
    pause
    exit /b %errorlevel%
)

echo.
echo =========================================
echo  SUCCESS! Site updated & synced to GitHub.
echo =========================================
pause
