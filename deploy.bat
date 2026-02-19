@echo off
echo =========================================
echo  Portal Site Deploy Script (with GitHub Sync)
echo =========================================
echo.

:: --- CONFIGURATION ---
set GIT_PATH="C:\Program Files\Git\bin\git.exe"

:: 1. Add changes to Git
echo [1/5] Adding changes to Git...
%GIT_PATH% add .
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git add failed. Is Git installed?
    pause
    exit /b %ERRORLEVEL%
)

:: 2. Commit changes
echo [2/5] Committing changes...
set TIMESTAMP=%DATE% %TIME%
%GIT_PATH% commit -m "Update via deploy.bat: %TIMESTAMP%"
:: Commit might fail if nothing to commit, that is fine.

:: 3. Push to GitHub
echo [3/5] Pushing to GitHub...
%GIT_PATH% push origin main
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git push failed. Check your internet connection or GitHub credentials.
    pause
    exit /b %ERRORLEVEL%
)

:: 4. Build Project
echo [4/5] Building Project...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed.
    pause
    exit /b %ERRORLEVEL%
)

:: 5. Deploy to Firebase
echo [5/5] Deploying to Firebase Hosting...
call npx firebase deploy --only hosting
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Firebase deploy failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo =========================================
echo  SUCCESS! Site updated
echo =========================================
pause
