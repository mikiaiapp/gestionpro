@echo off
title Instalador GestionPro v3.0
echo ======================================================
echo           GESTIONPRO - INSTALADOR AUTOMATICO
echo ======================================================
echo.

:: Comprobar Winget
winget --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Winget no detectado. Instala "App Installer" desde la Microsoft Store.
    pause
    exit /b
)

:: Instalar Node.js si no existe
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [1/3] Node.js no detectado. Instalando version LTS...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
    echo. IMPORTANTE: Reinicia esta ventana de comandos despues de la instalacion.
) else (
    echo [1/3] Node.js ya esta instalado.
)

:: Instalar dependencias
echo [2/3] Instalando dependencias del proyecto (npm install)...
call npm install --no-audit --no-fund

:: Finalizar
echo.
echo ======================================================
echo [3/3] INSTALACION COMPLETADA
echo ======================================================
echo.
echo Para iniciar la aplicacion, usa el comando: npm run dev
echo.
pause
