@echo off
echo =========================================
echo  Portal Site Deploy Script (MULTI-SITE MODE)
echo =========================================
echo.

:: --- CONFIGURATION ---
set GIT_PATH="C:\Program Files\Git\bin\git.exe"
:: PROJECT ID (The container project)
set FIREBASE_PROJECT=soccer-tracker-6288c
:: SITE ID (The specific site within the project)
set FIREBASE_SITE=partigiano2017-portal

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

:: 5. Deploy to Firebase (Specific Site)
echo [5/5] Deploying to Firebase Hosting (Site: %FIREBASE_SITE% in Project: %FIREBASE_PROJECT%)...
call npx firebase deploy --only hosting:%FIREBASE_SITE% --project %FIREBASE_PROJECT%
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Firebase deploy failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo =========================================
echo  SUCCESS! Site updated to https://%FIREBASE_SITE%.web.app
echo =========================================
pause
